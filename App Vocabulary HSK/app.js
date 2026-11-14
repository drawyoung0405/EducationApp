const { useEffect, useMemo, useState } = React;
const STORAGE_VERSION = "2021-band2";
const countries = [["\u8D8A\u5357", "Yu\xE8n\xE1n", "Vietnam"], ["\u6CF0\u56FD", "T\xE0igu\xF3", "Thailand"], ["\u65E5\u672C", "R\xECb\u011Bn", "Japan"], ["\u97E9\u56FD", "H\xE1ngu\xF3", "South Korea"], ["\u7F8E\u56FD", "M\u011Bigu\xF3", "United States"], ["\u82F1\u56FD", "Y\u012Bnggu\xF3", "United Kingdom"], ["\u6CD5\u56FD", "F\u01CEgu\xF3", "France"], ["\u5FB7\u56FD", "D\xE9gu\xF3", "Germany"], ["\u52A0\u62FF\u5927", "Ji\u0101n\xE1d\xE0", "Canada"], ["\u6FB3\u5927\u5229\u4E9A", "\xC0od\xE0l\xECy\xE0", "Australia"], ["\u5370\u5EA6", "Y\xECnd\xF9", "India"], ["\u65B0\u52A0\u5761", "X\u012Bnji\u0101p\u014D", "Singapore"]].map(([hanzi, pinyin, meaning]) => ({ id: "country-" + hanzi, hanzi, pinyin, meaning, type: "country", band: 0 }));
const seed = [...countries, ...window.HSK1_DATA || [], ...window.HSK2_DATA || [], ...window.HSK3_DATA || []];
const oldVersion = ["2021", "2021-band2"].includes(localStorage.getItem("hanamiDatasetVersion"));
const oldWords = (() => {
  try {
    return JSON.parse(localStorage.getItem("hanamiWords") || "null");
  } catch {
    return null;
  }
})();
const seedIds = new Set(seed.map((w) => w.id));
const initialWords = oldVersion && oldWords ? [...seed, ...oldWords.filter((w) => !seedIds.has(w.id) && !String(w.id).startsWith("country-?"))] : seed;
const readSet = (key) => {
  try {
    return new Set(oldVersion ? JSON.parse(localStorage.getItem(key) || "[]") : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
};
const todayKey = () => {
  const date = /* @__PURE__ */ new Date();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
};
const dayGap = (from, to) => {
  if (!from || !to) return Infinity;
  const start = Date.parse(from + "T00:00:00Z"), end = Date.parse(to + "T00:00:00Z");
  return Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / 864e5) : Infinity;
};
const startingReviewed = oldVersion && localStorage.getItem("hanamiTodayDate") === todayKey() ? Number(localStorage.getItem("hanamiToday") || 0) : 0;
const startingStreak = oldVersion ? Number(localStorage.getItem("hanamiStreak") || 0) : 0;
const startingLastStudy = oldVersion ? localStorage.getItem("hanamiLastStudy") || "" : "";
const dateLabel = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
function App() {
  const [words, setWords] = useState(initialWords);
  const [saved, setSaved] = useState(() => readSet("hanamiSaved"));
  const [known, setKnown] = useState(() => readSet("hanamiKnown"));
  const [reviewed, setReviewed] = useState(startingReviewed);
  const [streak, setStreak] = useState(startingStreak);
  const [lastStudy, setLastStudy] = useState(startingLastStudy);
  const [band, setBand] = useState(1);
  const [filter, setFilter] = useState("all");
  const [listBand, setListBand] = useState("all");
  const [studySource, setStudySource] = useState("new");
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [toast, setToast] = useState("");
  const [pageSize, setPageSize] = useState(30);
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionLearned, setSessionLearned] = useState(() => /* @__PURE__ */ new Set());
  const [studyDone, setStudyDone] = useState(() => /* @__PURE__ */ new Set());
  const [batchHistory, setBatchHistory] = useState([]);
  const [futureBatches, setFutureBatches] = useState([]);
  const [studyListHistory, setStudyListHistory] = useState([]);
  const practiceCache = React.useRef({});
  const [deck, setDeck] = useState(() => initialWords.filter((w) => +w.band === 1 && !readSet("hanamiKnown").has(w.id)).slice(0, 10));
  const [idx, setIdx] = useState(0);
  const current = deck.length ? deck[(idx % deck.length + deck.length) % deck.length] : null;
  const sessionTotal = deck.length;
  const streakGap = dayGap(lastStudy, todayKey());
  const activeStreak = streakGap >= 0 && streakGap <= 1 ? streak : 0;
  const buildStudyDeck = (source = studySource, b = band, done = /* @__PURE__ */ new Set()) => words.filter((w) => +w.band === +b && (source === "new" ? !known.has(w.id) : source === "saved" ? saved.has(w.id) : source === "learned" ? known.has(w.id) : true) && !done.has(w.id)).slice(0, 10);
  useEffect(() => {
    localStorage.setItem("hanamiDatasetVersion", STORAGE_VERSION);
    localStorage.setItem("hanamiWords", JSON.stringify(words));
    localStorage.setItem("hanamiSaved", JSON.stringify([...saved]));
    localStorage.setItem("hanamiKnown", JSON.stringify([...known]));
    localStorage.setItem("hanamiToday", String(reviewed));
    localStorage.setItem("hanamiTodayDate", todayKey());
    localStorage.setItem("hanamiStreak", String(streak));
    localStorage.setItem("hanamiLastStudy", lastStudy);
  }, [words, saved, known, reviewed, streak, lastStudy]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2100);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    setPageSize(30);
  }, [query, filter, listBand]);
  const filtered = useMemo(() => words.filter((w) => (filter === "saved" ? saved.has(w.id) : filter === "learned" ? known.has(w.id) : true) && (listBand === "all" || (listBand === "countries" ? w.type === "country" : String(w.band) === listBand)) && (!query || [w.hanzi, w.pinyin, w.meaning].join(" ").toLowerCase().includes(query.trim().toLowerCase()))), [words, saved, known, filter, listBand, query]);
  const visible = filtered.slice(0, pageSize);
  const say = (w) => {
    if (!w?.hanzi) return;
    if (!("speechSynthesis" in window)) {
      setToast("Speech playback is not supported in this browser");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(w.hanzi);
    utterance.lang = "zh-CN";
    utterance.rate = 0.85;
    const voice = window.speechSynthesis.getVoices().find((v) => /^zh(-|_)?(CN|Hans)?/i.test(v.lang)) || window.speechSynthesis.getVoices().find((v) => /^zh/i.test(v.lang));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };
  const persistDeck = (b = band) => words.filter((w) => +w.band === +b && !known.has(w.id)).slice(0, 10);
  const toggleSave = (id) => setSaved((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const savePracticePosition = () => {
    practiceCache.current[`${band}:${studySource}`] = { deck, idx, sessionKnown, sessionLearned: [...sessionLearned], studyDone: [...studyDone], batchHistory, futureBatches };
  };
  const restorePractice = (source, b) => {
    const savedSession = practiceCache.current[`${b}:${source}`];
    setStudySource(source);
    setBand(b);
    setDeck(savedSession ? savedSession.deck : buildStudyDeck(source, b, /* @__PURE__ */ new Set()));
    setIdx(savedSession ? savedSession.idx : 0);
    setSessionKnown(savedSession ? savedSession.sessionKnown : 0);
    setSessionLearned(new Set(savedSession ? savedSession.sessionLearned : []));
    setStudyDone(new Set(savedSession ? savedSession.studyDone : []));
    setBatchHistory(savedSession ? savedSession.batchHistory || [] : []);
    setFutureBatches(savedSession ? savedSession.futureBatches || [] : []);
    setRevealed(false);
  };
  const changeBand = (value) => {
    const b = Number(value);
    if (b === band) return;
    savePracticePosition();
    restorePractice(studySource, b);
  };
  const changeStudySource = (value) => {
    if (value === studySource) return;
    savePracticePosition();
    setStudyListHistory((prev) => [...prev, studySource]);
    restorePractice(value, band);
  };
  const returnToPreviousStudyList = () => {
    if (!studyListHistory.length) return;
    savePracticePosition();
    const previous = studyListHistory[studyListHistory.length - 1];
    setStudyListHistory((prev) => prev.slice(0, -1));
    restorePractice(previous, band);
  };
  const restoreBatch = (batch) => {
    setDeck(batch.deck);
    setIdx(Math.max(0, Math.min(batch.idx, batch.deck.length - 1)));
    setSessionLearned(new Set(batch.learned));
    setSessionKnown(batch.learned.length);
    setRevealed(false);
  };
  const showPreviousBatch = () => {
    if (!batchHistory.length) return;
    const currentBatch = { deck, learned: [...sessionLearned], idx };
    const previous = batchHistory[batchHistory.length - 1];
    setBatchHistory((prev) => prev.slice(0, -1));
    setFutureBatches((prev) => [...prev, currentBatch]);
    restoreBatch(previous);
  };
  const showNextBatch = () => {
    if (!futureBatches.length) return;
    const next = futureBatches[futureBatches.length - 1];
    const currentBatch = { deck, learned: [...sessionLearned], idx };
    setFutureBatches((prev) => prev.slice(0, -1));
    setBatchHistory((prev) => [...prev, currentBatch]);
    restoreBatch(next);
  };
  const move = (amount) => {
    if (!deck.length) return;
    setIdx((i) => (i + amount + deck.length) % deck.length);
    setRevealed(false);
  };
  const markKnown = () => {
    if (!current) return;
    if (studyDone.has(current.id)) {
      move(1);
      return;
    }
    const nextDone = new Set(studyDone).add(current.id);
    const nextLearned = new Set(sessionLearned).add(current.id);
    setStudyDone(nextDone);
    setSessionLearned(nextLearned);
    setKnown((prev) => new Set(prev).add(current.id));
    setReviewed((n) => n + 1);
    const studyDay = todayKey();
    if (lastStudy !== studyDay) {
      setStreak(dayGap(lastStudy, studyDay) === 1 ? (value) => value + 1 : 1);
      setLastStudy(studyDay);
    }
    setSessionKnown(nextLearned.size);
    setRevealed(false);
    if (nextLearned.size >= sessionTotal) {
      setBatchHistory((prev) => [...prev, { deck, learned: [...nextLearned], idx: sessionTotal - 1 }]);
      setFutureBatches([]);
      const remaining = buildStudyDeck(studySource, band, nextDone);
      if (remaining.length) {
        setDeck(remaining);
        setIdx(0);
        setSessionKnown(0);
        setSessionLearned(/* @__PURE__ */ new Set());
      } else {
        setDeck([]);
        setIdx(0);
        setToast("You finished this practice list. Use Previous set to review or choose another list.");
      }
    } else {
      let nextIndex = (idx + 1) % sessionTotal;
      while (nextIndex !== idx && nextLearned.has(deck[nextIndex].id)) nextIndex = (nextIndex + 1) % sessionTotal;
      setIdx(nextIndex);
    }
  };
  const onCardKey = (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setRevealed((v) => !v);
    } else if (event.key === "ArrowRight") move(1);
    else if (event.key === "ArrowLeft") move(-1);
  };
  const changeFilter = (next) => {
    setFilter(next);
    document.querySelector("#vocabulary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const importWords = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        let incoming;
        if (file.name.toLowerCase().endsWith(".json")) {
          const parsed = JSON.parse(text);
          incoming = Array.isArray(parsed) ? parsed : parsed.words;
        } else {
          const lines = text.split(/\r?\n/).filter(Boolean);
          const headers = lines.shift().split(",").map((s) => s.trim().toLowerCase().replace(/^"|"$/g, ""));
          const parseLine = (line) => {
            const cols = [];
            let value = "", quoted = false;
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"' && line[i + 1] === '"' && quoted) {
                value += '"';
                i++;
              } else if (ch === '"') quoted = !quoted;
              else if (ch === "," && !quoted) {
                cols.push(value);
                value = "";
              } else value += ch;
            }
            cols.push(value);
            return cols;
          };
          incoming = lines.map((line) => {
            const cols = parseLine(line), row = {};
            headers.forEach((h, i) => row[h] = cols[i] || "");
            return row;
          });
        }
        if (!Array.isArray(incoming)) throw Error("The JSON file must contain a word list.");
        const added = incoming.map((w, i) => ({ id: "i" + Date.now() + i, hanzi: w.hanzi || w.word || w.chinese, pinyin: w.pinyin || w.py, meaning: w.meaning || w.translation || w.english || w.definition, type: w.type || w.pos || w.part_of_speech || "word", example: w.example || "", band: Number(w.band || w.level || w.hsk || band) })).filter((w) => w.hanzi && w.pinyin && w.meaning);
        if (!added.length) throw Error("Include hanzi, pinyin, and meaning for each word.");
        setWords((prev) => [...prev, ...added]);
        setToast(`Imported ${added.length} words`);
      } catch (error) {
        setToast(error.message || "Could not read this file");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };
  const exportWords = () => {
    const csv = "hanzi,pinyin,meaning,type,band,example\n" + words.map((w) => [w.hanzi, w.pinyin, w.meaning, w.type, w.band, w.example].map((x) => '"' + String(x || "").replaceAll('"', '""') + '"').join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "nhu-hoa-hsk-vocabulary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "app-shell" }, /* @__PURE__ */ React.createElement("aside", { className: "sidebar" }, /* @__PURE__ */ React.createElement("div", { className: "brand" }, /* @__PURE__ */ React.createElement("div", { className: "brand-mark" }, "\u6C49"), /* @__PURE__ */ React.createElement("div", { className: "brand-copy" }, /* @__PURE__ */ React.createElement("div", { className: "brand-title" }, "Nh\u01B0 H\xF2a \xB7 HSK"), /* @__PURE__ */ React.createElement("div", { className: "brand-sub" }, "VOCABULARY STUDIO"))), /* @__PURE__ */ React.createElement("div", { className: "nav-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "nav-label" }, "YOUR SPACE"), /* @__PURE__ */ React.createElement("nav", { className: "nav", "aria-label": "Main navigation" }, /* @__PURE__ */ React.createElement("button", { className: "active", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) }, /* @__PURE__ */ React.createElement("span", { className: "nav-icon" }, "\u2302"), /* @__PURE__ */ React.createElement("span", null, "Overview")), /* @__PURE__ */ React.createElement("button", { onClick: () => document.querySelector("#study")?.scrollIntoView({ behavior: "smooth" }) }, /* @__PURE__ */ React.createElement("span", { className: "nav-icon" }, "\u25A4"), /* @__PURE__ */ React.createElement("span", null, "Study cards")), /* @__PURE__ */ React.createElement("button", { onClick: () => changeFilter("saved") }, /* @__PURE__ */ React.createElement("span", { className: "nav-icon" }, "\u2606"), /* @__PURE__ */ React.createElement("span", null, "Saved words")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setFilter("all");
    document.querySelector("#vocabulary")?.scrollIntoView({ behavior: "smooth" });
  } }, /* @__PURE__ */ React.createElement("span", { className: "nav-icon" }, "\u5B57"), /* @__PURE__ */ React.createElement("span", null, "Vocabulary")))), /* @__PURE__ */ React.createElement("div", { className: "sidebar-bottom" }, /* @__PURE__ */ React.createElement("div", { className: "streak-card" }, /* @__PURE__ */ React.createElement("div", { className: "streak-number" }, "\u2726 ", activeStreak, " ", activeStreak === 1 ? "day" : "days"), /* @__PURE__ */ React.createElement("div", { className: "streak-note" }, lastStudy === todayKey() ? "You studied today \u2014 keep it going" : activeStreak ? "Study today to keep it going" : "Start a new learning streak")))), /* @__PURE__ */ React.createElement("main", { className: "main" }, /* @__PURE__ */ React.createElement("div", { className: "topbar" }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "YOUR LEARNING SPACE"), /* @__PURE__ */ React.createElement("div", { className: "topbar-right" }, /* @__PURE__ */ React.createElement("span", { className: "date" }, dateLabel), /* @__PURE__ */ React.createElement("div", { className: "avatar", "aria-label": "Learner" }, "\u4F60"))), /* @__PURE__ */ React.createElement("section", { className: "hero" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "HSK 3.0 \xB7 2021 STANDARD \xB7 BANDS 1\u20132"), /* @__PURE__ */ React.createElement("h1", null, "\u4F60\u597D, learner."), /* @__PURE__ */ React.createElement("p", null, "A little Chinese every day adds up.")), /* @__PURE__ */ React.createElement("label", { className: "level-select" }, "\u25C9 HSK ", /* @__PURE__ */ React.createElement("select", { "aria-label": "Choose HSK band", value: band, onChange: (e) => changeBand(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "1" }, "1"), /* @__PURE__ */ React.createElement("option", { value: "2" }, "2"), /* @__PURE__ */ React.createElement("option", { value: "3" }, "3")), /* @__PURE__ */ React.createElement("span", null, "/ 3"))), /* @__PURE__ */ React.createElement("section", { className: "stats", "aria-label": "Learning summary" }, /* @__PURE__ */ React.createElement(Stat, { label: "WORDS LEARNED", value: known.size.toLocaleString(), detail: `/ ${words.length.toLocaleString()}`, icon: "\u2197" }), /* @__PURE__ */ React.createElement(Stat, { label: "IN YOUR LIBRARY", value: words.length.toLocaleString(), detail: "words", icon: "\u2727" }), /* @__PURE__ */ React.createElement(Stat, { label: "STUDY STREAK", value: activeStreak, detail: activeStreak === 1 ? "day" : "days", icon: "\u2197" })), /* @__PURE__ */ React.createElement("div", { className: "dashboard" }, /* @__PURE__ */ React.createElement("section", { className: "panel", id: "study" }, /* @__PURE__ */ React.createElement("div", { className: "panel-head practice-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, "Today's practice"), /* @__PURE__ */ React.createElement("div", { className: "practice-context" }, studySource === "new" ? "New words" : studySource === "saved" ? "Saved words" : studySource === "learned" ? "Learned words" : "All words", " \xB7 HSK ", band)), /* @__PURE__ */ React.createElement("div", { className: "practice-head-actions" }, /* @__PURE__ */ React.createElement("label", { className: "panel-hint", htmlFor: "practice-list" }, "PRACTICE LIST"), /* @__PURE__ */ React.createElement("select", { className: "filter-select", id: "practice-list", "aria-label": "Choose today's practice list", value: studySource, onChange: (e) => changeStudySource(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "new" }, "New words"), /* @__PURE__ */ React.createElement("option", { value: "saved" }, "Saved words"), /* @__PURE__ */ React.createElement("option", { value: "learned" }, "Learned words"), /* @__PURE__ */ React.createElement("option", { value: "all" }, "All words")), studyListHistory.length > 0 && /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: returnToPreviousStudyList }, "\u2190 Back to ", studyListHistory[studyListHistory.length - 1], " list"), /* @__PURE__ */ React.createElement("span", { className: "practice-help" }, "Switch lists to return where you left off."), /* @__PURE__ */ React.createElement("span", { className: "panel-hint" }, current ? `CARD ${String(idx + 1).padStart(2, "0")} / ${String(deck.length).padStart(2, "0")}` : "LIST COMPLETE"))), /* @__PURE__ */ React.createElement("div", { className: "study-body" }, /* @__PURE__ */ React.createElement("div", { className: `flashcard ${revealed ? "revealed" : ""}`, onClick: () => setRevealed((v) => !v), onKeyDown: onCardKey, role: "button", tabIndex: "0", "aria-label": revealed ? "Hide word meaning" : "Reveal word meaning" }, /* @__PURE__ */ React.createElement("div", { className: "card-tag" }, "HSK ", current?.band || band, " \xB7 ", studySource === "new" ? "NEW WORDS" : studySource === "saved" ? "SAVED WORDS" : studySource === "learned" ? "LEARNED WORDS" : "ALL WORDS"), current && /* @__PURE__ */ React.createElement("button", { className: `icon-button card-star ${saved.has(current.id) ? "saved" : ""}`, "aria-label": saved.has(current.id) ? "Remove from saved words" : "Save word", onClick: (e) => {
    e.stopPropagation();
    toggleSave(current.id);
  } }, saved.has(current.id) ? "\u2605" : "\u2606"), /* @__PURE__ */ React.createElement("div", { className: "hanzi" }, current?.hanzi || "\u5B8C\u6210"), /* @__PURE__ */ React.createElement("div", { className: "pinyin" }, current?.pinyin || "No new words"), (revealed || !current) && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "meaning" }, current?.meaning || "You have learned all words in this band."), current?.example && /* @__PURE__ */ React.createElement("div", { className: "example" }, current.example)), current && !revealed && /* @__PURE__ */ React.createElement("div", { className: "reveal-note" }, "TAP OR PRESS SPACE TO REVEAL")), /* @__PURE__ */ React.createElement("div", { className: "controls" }, batchHistory.length > 0 && /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: showPreviousBatch }, "\u2190 \xA0 Previous session"), futureBatches.length > 0 && /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: showNextBatch }, "Next session \xA0\u2192"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: () => move(-1), disabled: !deck.length }, "\u2190 \xA0 Previous"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: () => setRevealed((v) => !v), disabled: !current }, revealed ? "Hide meaning" : "Reveal meaning"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-sound", onClick: () => say(current), disabled: !current, title: "Play pronunciation", "aria-label": "Play pronunciation" }, "\u25D6))"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: () => move(1), disabled: !deck.length }, "Next \xA0\u2192"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: markKnown, disabled: !current }, "Mark learned \xA0\u2713")), /* @__PURE__ */ React.createElement("div", { className: "progress-track" }, /* @__PURE__ */ React.createElement("div", { className: "progress-fill", style: { width: `${sessionTotal ? Math.min(100, sessionKnown / sessionTotal * 100) : 100}%` } })), /* @__PURE__ */ React.createElement("div", { className: "progress-copy" }, /* @__PURE__ */ React.createElement("span", null, "LEARNED IN THIS SET"), /* @__PURE__ */ React.createElement("span", null, Math.min(sessionKnown, sessionTotal), " / ", sessionTotal || 10)))), /* @__PURE__ */ React.createElement("div", { className: "right-column" }, /* @__PURE__ */ React.createElement("section", { className: "panel" }, /* @__PURE__ */ React.createElement("div", { className: "panel-head" }, /* @__PURE__ */ React.createElement("h2", null, "Learning today"), /* @__PURE__ */ React.createElement("span", { className: "panel-hint" }, "DAILY GOAL")), /* @__PURE__ */ React.createElement("div", { className: "session-body" }, /* @__PURE__ */ React.createElement("div", { className: "session-count" }, Math.min(reviewed, 10), " ", /* @__PURE__ */ React.createElement("span", null, "/ 10")), /* @__PURE__ */ React.createElement("div", { className: "session-caption" }, "words marked learned today"), /* @__PURE__ */ React.createElement("div", { className: "goal-dots", "aria-label": `${Math.min(reviewed, 10)} of 10 words reviewed` }, Array.from({ length: 10 }, (_, i) => /* @__PURE__ */ React.createElement("i", { key: i, className: i < Math.min(reviewed, 10) ? "done" : "" }))), /* @__PURE__ */ React.createElement("div", { className: "goal-meta" }, /* @__PURE__ */ React.createElement("span", null, "DAILY GOAL"), /* @__PURE__ */ React.createElement("strong", null, reviewed >= 10 ? "Goal reached \u2713" : "In progress")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary session-start", onClick: () => document.querySelector("#study")?.scrollIntoView({ behavior: "smooth" }) }, "Continue studying \xA0\u2192"))), /* @__PURE__ */ React.createElement("section", { className: "panel" }, /* @__PURE__ */ React.createElement("div", { className: "panel-head" }, /* @__PURE__ */ React.createElement("h2", null, "A small study tip"), /* @__PURE__ */ React.createElement("span", { className: "tip-icon" }, "\u2733")), /* @__PURE__ */ React.createElement("div", { className: "session-body" }, /* @__PURE__ */ React.createElement("p", { className: "tip-copy" }, "Say each word out loud before you reveal the meaning. Connecting sound, character, and meaning helps words stick."))))), /* @__PURE__ */ React.createElement("section", { className: "panel vocabulary-panel", id: "vocabulary" }, /* @__PURE__ */ React.createElement("div", { className: "vocab-head" }, /* @__PURE__ */ React.createElement("h2", { className: "list-title" }, "Your vocabulary ", /* @__PURE__ */ React.createElement("span", { className: "title-count" }, filtered.length.toLocaleString(), " words")), /* @__PURE__ */ React.createElement("div", { className: "filters" }, /* @__PURE__ */ React.createElement("label", { className: "search-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "search-icon" }, "\u2315"), /* @__PURE__ */ React.createElement("input", { className: "search", type: "search", placeholder: "Search words...", value: query, onChange: (e) => setQuery(e.target.value), "aria-label": "Search vocabulary" })), /* @__PURE__ */ React.createElement("select", { className: "filter-select", "aria-label": "Filter by HSK band", value: listBand, onChange: (e) => setListBand(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "All HSK 1-3"), /* @__PURE__ */ React.createElement("option", { value: "1" }, "HSK 1"), /* @__PURE__ */ React.createElement("option", { value: "2" }, "HSK 2"), /* @__PURE__ */ React.createElement("option", { value: "3" }, "HSK 3"), /* @__PURE__ */ React.createElement("option", { value: "countries" }, "Countries")), /* @__PURE__ */ React.createElement("button", { className: `filter-btn ${filter === "all" ? "active" : ""}`, onClick: () => setFilter("all") }, "All"), /* @__PURE__ */ React.createElement("button", { className: `filter-btn ${filter === "saved" ? "active" : ""}`, onClick: () => setFilter("saved") }, "\u2606 Saved"), /* @__PURE__ */ React.createElement("button", { className: `filter-btn ${filter === "learned" ? "active" : ""}`, onClick: () => setFilter("learned") }, "\u2713 Learned"), /* @__PURE__ */ React.createElement("label", { className: "import-label", title: "Import CSV or JSON" }, "\uFF0B Import", /* @__PURE__ */ React.createElement("input", { type: "file", accept: ".csv,.json,.txt", onChange: importWords })))), /* @__PURE__ */ React.createElement("div", { className: "table-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "word-row header" }, /* @__PURE__ */ React.createElement("span", null, "WORD"), /* @__PURE__ */ React.createElement("span", null, "MEANING"), /* @__PURE__ */ React.createElement("span", null, "WRITE"), /* @__PURE__ */ React.createElement("span", null, "LEVEL \xB7 TYPE"), /* @__PURE__ */ React.createElement("span", null), /* @__PURE__ */ React.createElement("span", null)), visible.map((w) => /* @__PURE__ */ React.createElement("div", { className: "word-row", key: w.id }, /* @__PURE__ */ React.createElement("div", { className: "word-cell" }, /* @__PURE__ */ React.createElement("span", { className: "word-zh" }, w.hanzi), /* @__PURE__ */ React.createElement("span", { className: "word-py" }, w.pinyin)), /* @__PURE__ */ React.createElement("span", { className: "word-meaning" }, w.meaning, " ", known.has(w.id) && /* @__PURE__ */ React.createElement("span", { className: "learned-tag" }, "\xB7 \u2713 Learned")), /* @__PURE__ */ React.createElement("button", { className: "write-btn", type: "button", "aria-label": `Practice writing ${w.hanzi}`, title: "Show stroke order", onClick: () => window.showStrokeGuide(w.hanzi) }, "\u270E Write"), /* @__PURE__ */ React.createElement("span", { className: "word-level" }, "HSK ", w.band || 1, " \xB7 ", w.type || "word"), /* @__PURE__ */ React.createElement("button", { className: "speak-btn", type: "button", "aria-label": `Play pronunciation for ${w.hanzi}`, title: "Play pronunciation", onClick: () => say(w) }, "\u25D6))"), /* @__PURE__ */ React.createElement("button", { className: `save-btn ${saved.has(w.id) ? "saved" : ""}`, "aria-label": saved.has(w.id) ? `Unsave ${w.hanzi}` : `Save ${w.hanzi}`, onClick: () => toggleSave(w.id) }, saved.has(w.id) ? "\u2605" : "\u2606"))), !visible.length && /* @__PURE__ */ React.createElement("div", { className: "empty" }, "No words found. Try another search or filter.")), filtered.length > visible.length && /* @__PURE__ */ React.createElement("button", { className: "btn load-more", onClick: () => setPageSize((n) => n + 50) }, "Show more words \xB7 ", filtered.length - visible.length, " remaining"), /* @__PURE__ */ React.createElement("div", { className: "list-footer" }, /* @__PURE__ */ React.createElement("span", null, "HSK 3.0 \xB7 2021 STANDARD \xB7 BANDS 1\u20132 \xB7 ", words.length.toLocaleString(), " WORDS"), /* @__PURE__ */ React.createElement("button", { className: "link-button", onClick: exportWords }, "Export CSV \u2193"))), /* @__PURE__ */ React.createElement("p", { className: "credits" }, "NH\u01AF H\xD2A \xB7 HSK VOCABULARY", /* @__PURE__ */ React.createElement("br", null), "Vocabulary: ", /* @__PURE__ */ React.createElement("a", { href: "https://github.com/ayman-ezz/hsk-3.0-word-list", target: "_blank", rel: "noreferrer" }, "HSK University HSK 3.0 Bands 1\u20132"), ", CC BY 4.0 \xB7 based on standard GF 0025-2021", /* @__PURE__ */ React.createElement("br", null), "Band 2 English glosses: ", /* @__PURE__ */ React.createElement("a", { href: "https://github.com/LightChinese/HSK-3.0-words-list", target: "_blank", rel: "noreferrer" }, "Mani's HSK 3.0 list"), ", ", /* @__PURE__ */ React.createElement("a", { href: "https://creativecommons.org/licenses/by-sa/4.0/", target: "_blank", rel: "noreferrer" }, "CC BY-SA 4.0"), ", using CC-CEDICT; Band 3 English glosses: ", /* @__PURE__ */ React.createElement("a", { href: "https://www.mdbg.net/chinese/dictionary?page=cc-cedict", target: "_blank", rel: "noreferrer" }, "CC-CEDICT"), ", CC BY-SA 4.0")), /* @__PURE__ */ React.createElement("div", { className: `toast ${toast ? "show" : ""}`, role: "status", "aria-live": "polite" }, toast));
}
function Stat({ label, value, detail, icon }) {
  return /* @__PURE__ */ React.createElement("div", { className: "stat-card" }, /* @__PURE__ */ React.createElement("div", { className: "stat-head" }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("span", { className: "stat-icon" }, icon)), /* @__PURE__ */ React.createElement("div", { className: "stat-value" }, value, " ", /* @__PURE__ */ React.createElement("small", null, detail)));
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
