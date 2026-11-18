"""Small local API for Character Studio. Uses only the Python standard library."""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import time


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
MEDIA = DATA / "media"
DB_PATH = DATA / "studio.sqlite3"
PORT = int(os.environ.get("CHARACTER_STUDIO_PORT", "8765"))
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
TEXT_MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-3.8-flash")
IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
IMAGE_PROVIDER = os.environ.get("IMAGE_PROVIDER", "comfyui").strip().lower()
COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8188").rstrip("/")
COMFYUI_CHECKPOINT = os.environ.get("COMFYUI_CHECKPOINT", "").strip()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    DATA.mkdir(exist_ok=True)
    MEDIA.mkdir(exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def init_db() -> None:
    with connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', age TEXT NOT NULL DEFAULT '',
                personality TEXT NOT NULL DEFAULT '', backstory TEXT NOT NULL DEFAULT '',
                appearance TEXT NOT NULL DEFAULT '', clothing TEXT NOT NULL DEFAULT '',
                palette TEXT NOT NULL DEFAULT '', signature_details TEXT NOT NULL DEFAULT '',
                art_style TEXT NOT NULL DEFAULT 'anime character design', status TEXT NOT NULL DEFAULT 'draft',
                image_path TEXT NOT NULL DEFAULT '', interaction_id TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT, character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                snapshot TEXT NOT NULL, created_at TEXT NOT NULL, event TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS film_plans (
                project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                logline TEXT NOT NULL DEFAULT '', outline TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS scenes (
                id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                title TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS shots (
                id TEXT PRIMARY KEY, scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
                description TEXT NOT NULL DEFAULT '', duration TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'planned',
                sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
        """)


FIELDS = ("name", "role", "age", "personality", "backstory", "appearance", "clothing", "palette", "signature_details", "art_style")


def row_dict(row: sqlite3.Row) -> dict:
    value = dict(row)
    value["image_url"] = f"/media/{Path(value['image_path']).name}" if value.get("image_path") else ""
    return value


def snapshot(db: sqlite3.Connection, character_id: str, event: str) -> None:
    row = db.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
    if row:
        db.execute("INSERT INTO versions(character_id,snapshot,created_at,event) VALUES(?,?,?,?)",
                   (character_id, json.dumps(dict(row), ensure_ascii=False), now(), event))


def require_model() -> None:
    if not GEMINI_API_KEY:
        raise ValueError("Add GEMINI_API_KEY to your environment, then restart Character Studio to use AI generation.")


def gemini_interaction(body: dict) -> dict:
    require_model()
    payload = json.dumps(body).encode("utf-8")
    req = Request("https://generativelanguage.googleapis.com/v1beta/interactions", data=payload,
                  headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}, method="POST")
    try:
        with urlopen(req, timeout=180) as response:
            return json.loads(response.read())
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1200]
        raise ValueError(f"Image/AI provider returned HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise ValueError(f"Could not reach Gemini API: {exc.reason}") from exc


def comfy_request(path: str, payload: dict | None = None, timeout: int = 20) -> bytes:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = Request(f"{COMFYUI_URL}{path}", data=body,
                  headers={"Content-Type": "application/json"} if body is not None else {},
                  method="POST" if body is not None else "GET")
    try:
        with urlopen(req, timeout=timeout) as response:
            return response.read()
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1200]
        raise ValueError(f"ComfyUI returned HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise ValueError("ComfyUI is not running. Start it locally, then retry. "
                         f"Expected server at {COMFYUI_URL} ({exc.reason}).") from exc


def comfy_checkpoints() -> list[str]:
    try:
        result = json.loads(comfy_request("/models/checkpoints", timeout=3))
        return [item if isinstance(item, str) else item.get("name", "") for item in result]
    except Exception:
        return []


def comfy_running() -> bool:
    try:
        comfy_request("/system_stats", timeout=3)
        return True
    except Exception:
        return False


def comfy_upload_image(image_path: Path) -> dict:
    boundary = f"----CharacterStudio{uuid.uuid4().hex}"
    raw = image_path.read_bytes()
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"type\"\r\n\r\ninput\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{image_path.name}\"\r\n"
            f"Content-Type: {mimetypes.guess_type(image_path.name)[0] or 'image/png'}\r\n\r\n").encode("utf-8") + raw + f"\r\n--{boundary}--\r\n".encode("ascii")
    req = Request(f"{COMFYUI_URL}/upload/image", data=body,
                  headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}, method="POST")
    try:
        with urlopen(req, timeout=30) as response:
            return json.loads(response.read())
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1200]
        raise ValueError(f"ComfyUI could not load the existing reference image: {detail}") from exc
    except URLError as exc:
        raise ValueError(f"Could not upload the reference image to ComfyUI: {exc.reason}") from exc


def comfy_image(prompt: str, reference_path: Path | None = None) -> tuple[bytes, str, str]:
    available = comfy_checkpoints()
    checkpoint = COMFYUI_CHECKPOINT or next((name for name in available if "anime" in name.lower()), "")
    checkpoint = checkpoint or (available[0] if available else "")
    if not checkpoint:
        raise ValueError("ComfyUI is running, but it has no checkpoint model. Add an anime SD 1.5 checkpoint "
                         "to ComfyUI/models/checkpoints, then restart ComfyUI.")
    latent_image = ["5", 0]
    denoise = 1
    workflow = {
        "3": {"class_type": "KSampler", "inputs": {"seed": uuid.uuid4().int % (2**32), "steps": 20,
            "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": denoise,
            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": latent_image}},
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 512, "height": 512, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "low quality, blurry, text, watermark, extra limbs, malformed hands", "clip": ["4", 1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "CharacterStudio", "images": ["8", 0]}},
    }
    if reference_path and reference_path.is_file():
        loaded = comfy_upload_image(reference_path)
        workflow["10"] = {"class_type": "LoadImage", "inputs": {"image": loaded["name"]}}
        workflow["11"] = {"class_type": "ImageScale", "inputs": {"image": ["10", 0], "upscale_method": "bicubic",
                             "width": 512, "height": 512, "crop": "center"}}
        workflow["12"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["11", 0], "vae": ["4", 2]}}
        workflow["3"]["inputs"]["latent_image"] = ["12", 0]
        workflow["3"]["inputs"]["denoise"] = 0.55
    response = json.loads(comfy_request("/prompt", {"prompt": workflow}, timeout=30))
    prompt_id = response.get("prompt_id")
    if not prompt_id:
        raise ValueError(f"ComfyUI could not queue this workflow: {json.dumps(response)[:1200]}")
    deadline = datetime.now(timezone.utc).timestamp() + 600
    while datetime.now(timezone.utc).timestamp() < deadline:
        history = json.loads(comfy_request(f"/history/{prompt_id}", timeout=15))
        item = history.get(prompt_id, {})
        for node in item.get("outputs", {}).values():
            images = node.get("images", [])
            if images:
                image = images[0]
                query = urlencode({"filename": image.get("filename", ""), "subfolder": image.get("subfolder", ""),
                                   "type": image.get("type", "output")})
                return comfy_request("/view?" + query, timeout=60), "image/png", prompt_id
        if item.get("status", {}).get("status_str") == "error":
            raise ValueError("ComfyUI could not complete the image workflow. Check its console for model or VRAM errors.")
        time.sleep(1)
    raise ValueError("ComfyUI image generation timed out after 10 minutes. Try again at 512 × 512 or check its console.")


CHARACTER_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {key: {"type": "string", "description": f"Character {key.replace('_', ' ')}"} for key in FIELDS},
    "required": list(FIELDS),
}


class Handler(BaseHTTPRequestHandler):
    server_version = "CharacterStudio/0.1"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def send_json(self, value: dict | list, status: int = 200) -> None:
        raw = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length > 24_000_000:
            raise ValueError("Request is too large (maximum 24 MB).")
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        try:
            if path == "/api/status":
                running = comfy_running() if IMAGE_PROVIDER == "comfyui" else False
                ready = bool(comfy_checkpoints()) if IMAGE_PROVIDER == "comfyui" else bool(GEMINI_API_KEY)
                self.send_json({"ok": True, "ai_configured": bool(GEMINI_API_KEY), "image_provider": IMAGE_PROVIDER,
                                "image_ready": ready, "comfy_running": running, "image_model": IMAGE_MODEL,
                                "checkpoint": COMFYUI_CHECKPOINT or None})
                return
            if path == "/api/projects":
                with connect() as db:
                    rows = db.execute("""SELECT p.*, COUNT(c.id) AS character_count FROM projects p
                        LEFT JOIN characters c ON c.project_id=p.id GROUP BY p.id ORDER BY p.updated_at DESC""").fetchall()
                self.send_json([dict(row) for row in rows]); return
            match = re.fullmatch(r"/api/projects/([\w-]+)/film-plan", path)
            if match:
                project_id = match.group(1)
                with connect() as db:
                    project = db.execute("SELECT 1 FROM projects WHERE id=?", (project_id,)).fetchone()
                    if not project: raise ValueError("Project not found.")
                    plan = db.execute("SELECT * FROM film_plans WHERE project_id=?", (project_id,)).fetchone()
                    scenes = db.execute("SELECT * FROM scenes WHERE project_id=? ORDER BY sort_order,created_at", (project_id,)).fetchall()
                    result = {"logline": plan["logline"] if plan else "", "outline": plan["outline"] if plan else "",
                              "scenes": []}
                    for scene in scenes:
                        item = dict(scene)
                        item["shots"] = [dict(shot) for shot in db.execute("SELECT * FROM shots WHERE scene_id=? ORDER BY sort_order,created_at", (scene["id"],)).fetchall()]
                        result["scenes"].append(item)
                self.send_json(result); return
            match = re.fullmatch(r"/api/projects/([\w-]+)/characters", path)
            if match:
                with connect() as db:
                    rows = db.execute("SELECT * FROM characters WHERE project_id=? ORDER BY updated_at DESC", (match.group(1),)).fetchall()
                self.send_json([row_dict(row) for row in rows]); return
            match = re.fullmatch(r"/api/characters/([\w-]+)/versions", path)
            if match:
                with connect() as db:
                    rows = db.execute("SELECT id, snapshot, created_at, event FROM versions WHERE character_id=? ORDER BY id DESC", (match.group(1),)).fetchall()
                self.send_json([dict(row) for row in rows]); return
            if path.startswith("/media/"):
                name = Path(path.removeprefix("/media/")).name
                file_path = (MEDIA / name).resolve()
                if file_path.parent != MEDIA.resolve() or not file_path.is_file():
                    self.send_error(404); return
                raw = file_path.read_bytes()
                self.send_response(200); self.send_header("Content-Type", mimetypes.guess_type(file_path)[0] or "application/octet-stream")
                self.send_header("Content-Length", str(len(raw))); self.send_header("Cache-Control", "public, max-age=3600"); self.end_headers(); self.wfile.write(raw)
                return
            if path in ("/", "/index.html"):
                file_path = ROOT / "index.html"
            elif path in ("/app.js", "/styles.css"):
                file_path = ROOT / path.lstrip("/")
            else:
                self.send_error(404); return
            raw = file_path.read_bytes()
            self.send_response(200); self.send_header("Content-Type", mimetypes.guess_type(file_path)[0] + "; charset=utf-8")
            self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)

    def do_POST(self) -> None:
        try:
            data = self.body()
            if self.path == "/api/projects":
                name = clean(data.get("name"), 100)
                if not name: raise ValueError("Project name is required.")
                project_id = str(uuid.uuid4())
                with connect() as db:
                    db.execute("INSERT INTO projects(id,name,description,created_at,updated_at) VALUES(?,?,?,?,?)",
                               (project_id, name, clean(data.get("description"), 1000), now(), now()))
                self.send_json({"id": project_id, "name": name}); return
            match = re.fullmatch(r"/api/projects/([\w-]+)/film-plan", self.path)
            if match:
                project_id = match.group(1)
                with connect() as db:
                    if not db.execute("SELECT 1 FROM projects WHERE id=?", (project_id,)).fetchone(): raise ValueError("Project not found.")
                    db.execute("INSERT INTO film_plans(project_id,logline,outline,updated_at) VALUES(?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET logline=excluded.logline,outline=excluded.outline,updated_at=excluded.updated_at",
                               (project_id, clean(data.get("logline"), 1000), clean(data.get("outline"), 12000), now()))
                self.send_json({"ok": True}); return
            match = re.fullmatch(r"/api/projects/([\w-]+)/scenes", self.path)
            if match:
                project_id = match.group(1); scene_id = str(uuid.uuid4()); stamp = now()
                with connect() as db:
                    if not db.execute("SELECT 1 FROM projects WHERE id=?", (project_id,)).fetchone(): raise ValueError("Project not found.")
                    order = db.execute("SELECT COUNT(*) FROM scenes WHERE project_id=?", (project_id,)).fetchone()[0]
                    db.execute("INSERT INTO scenes(id,project_id,title,summary,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
                               (scene_id, project_id, clean(data.get("title"), 120) or "New scene", clean(data.get("summary"), 3000), order, stamp, stamp))
                self.send_json({"id": scene_id}, 201); return
            match = re.fullmatch(r"/api/scenes/([\w-]+)/shots", self.path)
            if match:
                scene_id = match.group(1); shot_id = str(uuid.uuid4()); stamp = now()
                with connect() as db:
                    if not db.execute("SELECT 1 FROM scenes WHERE id=?", (scene_id,)).fetchone(): raise ValueError("Scene not found.")
                    order = db.execute("SELECT COUNT(*) FROM shots WHERE scene_id=?", (scene_id,)).fetchone()[0]
                    db.execute("INSERT INTO shots(id,scene_id,description,duration,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                               (shot_id, scene_id, clean(data.get("description"), 2000) or "New shot", clean(data.get("duration"), 40), "planned", order, stamp, stamp))
                self.send_json({"id": shot_id}, 201); return
            match = re.fullmatch(r"/api/projects/([\w-]+)/characters", self.path)
            if match:
                project_id = match.group(1); character_id = str(uuid.uuid4()); stamp = now()
                with connect() as db:
                    if not db.execute("SELECT 1 FROM projects WHERE id=?", (project_id,)).fetchone(): raise ValueError("Project not found.")
                    values = {field: clean(data.get(field), 4000 if field in ("backstory", "appearance") else 1000) for field in FIELDS}
                    if not values["name"]: values["name"] = "Untitled character"
                    cols = ",".join(FIELDS)
                    marks = ",".join("?" for _ in FIELDS)
                    db.execute(f"INSERT INTO characters(id,project_id,{cols},created_at,updated_at) VALUES(?,?,{marks},?,?)",
                               (character_id, project_id, *(values[field] for field in FIELDS), stamp, stamp))
                    snapshot(db, character_id, "Created character")
                    row = db.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
                self.send_json(row_dict(row), 201); return
            match = re.fullmatch(r"/api/characters/([\w-]+)/(draft|generate|approve|revise)", self.path)
            if match:
                character_id, action = match.groups()
                if action == "draft": self.draft_character(character_id, data); return
                if action in ("generate", "revise"): self.generate_image(character_id, data, action == "revise"); return
                if action == "approve":
                    with connect() as db:
                        cur = db.execute("UPDATE characters SET status='approved',updated_at=? WHERE id=?", (now(), character_id))
                        if not cur.rowcount: raise ValueError("Character not found.")
                        snapshot(db, character_id, "Approved design")
                    self.send_json({"ok": True, "status": "approved"}); return
            match = re.fullmatch(r"/api/characters/([\w-]+)/upload", self.path)
            if match:
                self.upload_image(match.group(1), data); return
            self.send_error(404)
        except ValueError as exc:
            self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)

    def do_PATCH(self) -> None:
        match = re.fullmatch(r"/api/(scenes|shots)/([\w-]+)", self.path)
        if match:
            kind, item_id = match.groups()
            try:
                data = self.body()
                allowed = {"title": 120, "summary": 3000} if kind == "scenes" else {"description": 2000, "duration": 40, "status": 30}
                values = {key: clean(data[key], limit) for key, limit in allowed.items() if key in data}
                if not values: raise ValueError("No fields were provided.")
                if kind == "shots" and "status" in values and values["status"] not in ("planned", "boarding", "ready", "done"):
                    raise ValueError("Choose a valid shot status.")
                with connect() as db:
                    assignments = ",".join(f"{key}=?" for key in values)
                    cur = db.execute(f"UPDATE {kind} SET {assignments},updated_at=? WHERE id=?", (*values.values(), now(), item_id))
                    if not cur.rowcount: raise ValueError(f"{kind[:-1].title()} not found.")
                self.send_json({"ok": True})
            except ValueError as exc: self.send_json({"error": str(exc)}, 400)
            except Exception as exc: self.send_json({"error": str(exc)}, 500)
            return
        match = re.fullmatch(r"/api/characters/([\w-]+)", self.path)
        if not match: self.send_error(404); return
        try:
            data = self.body(); character_id = match.group(1)
            allowed = {field: clean(data[field], 4000 if field in ("backstory", "appearance") else 1000) for field in FIELDS if field in data}
            if not allowed: raise ValueError("No character fields were provided.")
            with connect() as db:
                exists = db.execute("SELECT 1 FROM characters WHERE id=?", (character_id,)).fetchone()
                if not exists: raise ValueError("Character not found.")
                assignments = ",".join(f"{field}=?" for field in allowed)
                db.execute(f"UPDATE characters SET {assignments},status='draft',updated_at=? WHERE id=?",
                           (*allowed.values(), now(), character_id))
                snapshot(db, character_id, "Edited character")
                row = db.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
            self.send_json(row_dict(row))
        except ValueError as exc: self.send_json({"error": str(exc)}, 400)
        except Exception as exc: self.send_json({"error": str(exc)}, 500)

    def draft_character(self, character_id: str, data: dict) -> None:
        require_model()
        with connect() as db:
            row = db.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
        if not row: raise ValueError("Character not found.")
        current = {field: row[field] for field in FIELDS}
        seed = clean(data.get("idea", ""), 4000)
        prompt = "Create a distinctive original anime character for a film project. Use the user's idea as the source of truth. " \
                 "Keep all fields useful for artists; use concise concrete descriptions; avoid referencing existing copyrighted characters. " \
                 "Fill every field, including values the user did not specify.\n\n" \
                 f"User idea: {seed}\nExisting character data to improve, preserving intentional details: {json.dumps(current, ensure_ascii=False)}"
        result = gemini_interaction({"model": TEXT_MODEL, "input": prompt,
            "response_format": {"type": "text", "mime_type": "application/json", "schema": CHARACTER_SCHEMA}})
        output = result.get("output_text") or ""
        try: fields = json.loads(output)
        except json.JSONDecodeError: raise ValueError("AI returned an invalid character brief. Try again or edit the brief manually.")
        fields = {field: clean(fields.get(field), 4000 if field in ("backstory", "appearance") else 1000) for field in FIELDS}
        if not fields["name"]: fields["name"] = current["name"] or "Untitled character"
        with connect() as db:
            assignments = ",".join(f"{field}=?" for field in FIELDS)
            db.execute(f"UPDATE characters SET {assignments},status='draft',updated_at=? WHERE id=?",
                       (*(fields[field] for field in FIELDS), now(), character_id))
            snapshot(db, character_id, "AI character brief")
            updated = db.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
        self.send_json(row_dict(updated))

    def generate_image(self, character_id: str, data: dict, revise: bool) -> None:
        with connect() as db:
            row = db.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
        if not row: raise ValueError("Character not found.")
        reference = "Use a clean professional anime production-design sheet: one large full-body front view, " \
                    "a face close-up with three small expressions, a compact color palette, and a small back/side view. " \
                    "Keep panels orderly on a plain light background. No text, no watermark, no logos."
        details = "; ".join(f"{label}: {row[key]}" for label, key in (("name", "name"), ("role", "role"), ("age", "age"), ("appearance", "appearance"), ("clothing", "clothing"), ("palette", "palette"), ("distinctive details", "signature_details"), ("style", "art_style")))
        if row["personality"]: details += f"; personality: {row['personality']}"
        if row["backstory"]: details += f"; story context: {row['backstory']}"
        edit = clean(data.get("instruction", ""), 1000)
        prompt = f"Create an original anime character reference sheet. Character bible: {details}. {reference}"
        if revise and edit: prompt += f"\nRequested revision: {edit}. Preserve all other approved identity traits and design features."
        body = {"model": IMAGE_MODEL, "input": prompt, "response_format": {"type": "image", "mime_type": "image/png", "aspect_ratio": "3:2", "image_size": "2K"}}
        if revise and row["interaction_id"]: body["previous_interaction_id"] = row["interaction_id"]
        if IMAGE_PROVIDER == "comfyui":
            previous_image = MEDIA / Path(row["image_path"]).name if revise and row["image_path"] else None
            raw, mime_type, provider_id = comfy_image(prompt, previous_image)
        elif IMAGE_PROVIDER == "gemini":
            result = gemini_interaction(body)
            image = result.get("output_image") or find_image(result)
            if not image or not image.get("data"):
                raise ValueError("The image provider returned no image. Try again or check the model setting.")
            try: raw = base64.b64decode(image["data"], validate=True)
            except Exception as exc: raise ValueError("The image provider returned unreadable image data.") from exc
            mime_type = image.get("mime_type", "image/png")
            provider_id = result.get("id", row["interaction_id"])
        else:
            raise ValueError("Unknown IMAGE_PROVIDER. Set it to 'comfyui' or 'gemini'.")
        if len(raw) > 20_000_000: raise ValueError("Generated image exceeded the 20 MB limit.")
        ext = "jpg" if mime_type == "image/jpeg" else "webp" if mime_type == "image/webp" else "png"
        filename = f"{character_id}-{uuid.uuid4().hex[:10]}.{ext}"
        (MEDIA / filename).write_bytes(raw)
        with connect() as db:
            db.execute("UPDATE characters SET image_path=?,interaction_id=?,status='draft',updated_at=? WHERE id=?",
                       (filename, provider_id, now(), character_id))
            snapshot(db, character_id, "Generated reference sheet" if not revise else "Revised reference sheet")
            updated = db.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
        self.send_json(row_dict(updated))

    def upload_image(self, character_id: str, data: dict) -> None:
        encoded = data.get("data_url", "")
        match = re.fullmatch(r"data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)", encoded)
        if not match:
            raise ValueError("Choose a PNG, JPEG, or WebP image.")
        mime_type, payload = match.groups()
        try: raw = base64.b64decode(payload, validate=True)
        except Exception as exc: raise ValueError("Could not read that image. Choose a valid PNG, JPEG, or WebP file.") from exc
        if not raw or len(raw) > 16_000_000:
            raise ValueError("Image must be between 1 byte and 16 MB.")
        ext = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[mime_type]
        with connect() as db:
            if not db.execute("SELECT 1 FROM characters WHERE id=?", (character_id,)).fetchone():
                raise ValueError("Character not found.")
            filename = f"{character_id}-{uuid.uuid4().hex[:10]}.{ext}"
            (MEDIA / filename).write_bytes(raw)
            db.execute("UPDATE characters SET image_path=?,status='draft',updated_at=? WHERE id=?", (filename, now(), character_id))
            snapshot(db, character_id, "Uploaded reference image")
            updated = db.execute("SELECT * FROM characters WHERE id=?", (character_id,)).fetchone()
        self.send_json(row_dict(updated))


def find_image(result: dict) -> dict | None:
    for step in result.get("steps", []):
        for item in step.get("content", []):
            if item.get("type") == "image": return item
    return None


def clean(value, limit: int) -> str:
    if not isinstance(value, (str, int, float)): return ""
    return str(value).strip()[:limit]


if __name__ == "__main__":
    init_db()
    print(f"Character Studio is running at http://127.0.0.1:{PORT}")
    print(f"Image provider: {IMAGE_PROVIDER} ({COMFYUI_URL if IMAGE_PROVIDER == 'comfyui' else IMAGE_MODEL})")
    print("Gemini character drafting is ready." if GEMINI_API_KEY else "Gemini character drafting is off; the manual editor and local image workflow remain available.")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
