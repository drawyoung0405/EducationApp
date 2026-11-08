# Character Studio

A local-first workspace for creating an anime character bible and developing a visual reference sheet for future storyboard and film work.

## Run locally

Requires Python 3.10 or newer. No packages or build step are needed.

```powershell
cd 'D:\Project\Character Studio'
python server.py
```

Open <http://127.0.0.1:8765>. Projects, character versions, and generated images are stored in `data/` on this computer.

## Enable free local image generation

Character images now use local ComfyUI by default. This does not use a Gemini image API or incur a per-image API charge.

1. Install ComfyUI from its [official download page](https://www.comfy.org/download) and start it with its local server enabled (default address `http://127.0.0.1:8188`).
2. Download an anime checkpoint compatible with Stable Diffusion 1.5. Put the `.safetensors` file in `ComfyUI/models/checkpoints`.
3. Restart ComfyUI, then restart Character Studio. It will prefer a checkpoint with `anime` in its filename; otherwise it uses the first available checkpoint.
4. In Character Studio, open **Visual reference** and generate a sheet. The local workflow uses a 512 × 512 canvas to fit smaller GPUs.

The computer used for development has an RTX 5050 Laptop GPU with 4 GB VRAM. Model loading or generation may be slow, and some checkpoints may exceed that memory. If ComfyUI reports a VRAM error, use a smaller SD 1.5 checkpoint or lower the canvas settings in `server.py`.

Check the checkpoint's license before using generated designs in a commercial film. The license for a checkpoint may differ from ComfyUI's license.

To connect to a different local ComfyUI address, set `COMFYUI_URL`. To pin a checkpoint filename, set `COMFYUI_CHECKPOINT`. To use Gemini's paid image API instead, set `IMAGE_PROVIDER=gemini` before starting Character Studio.

## Enable AI character briefs

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey), then set it in the PowerShell session before starting the server:

```powershell
$env:GEMINI_API_KEY = 'your-key-here'
python server.py
```

The key stays on the server and is never sent to the browser. AI brief drafting is optional; projects, character bibles, image upload, and local ComfyUI generation work without a Gemini key. To choose different Gemini text models or the server port, set `GEMINI_TEXT_MODEL` or `CHARACTER_STUDIO_PORT` before launch.

## First workflow

1. Create a film project and a character.
2. Fill in the character idea or use **Draft character with AI**.
3. Review and save the character bible.
4. Generate a local visual reference sheet, upload an image made in another tool, or revise a generated image with a focused instruction.
5. Approve the design when it is ready to carry into storyboards.

Approving records a version; editing after approval returns the character to draft status. The version history records edits, AI drafts, generated images, and approvals.

## Notes

- This is a single-user local app. It binds to `127.0.0.1` and does not provide user accounts or remote access.
- AI calls use Google's Gemini Interactions API. Image generation uses a replaceable server-side function in `server.py` so a different provider can be added later.
- Keep generated design references and character briefs consistent with the rights you have to any source material you provide.
- Remove the `data/` folder only if you intend to delete all local projects, versions, and generated images.
