function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
var _React = React,
  useEffect = _React.useEffect,
  useMemo = _React.useMemo,
  useState = _React.useState;
var STORAGE_VERSION = '2021-band2';
var seed = [].concat(_toConsumableArray(window.HSK1_DATA || []), _toConsumableArray(window.HSK2_DATA || []));
var oldVersion = ['2021', '2021-band2'].includes(localStorage.getItem('hanamiDatasetVersion'));
var oldWords = function () {
  try {
    return JSON.parse(localStorage.getItem('hanamiWords') || 'null');
  } catch (_unused) {
    return null;
  }
}();
var seedIds = new Set(seed.map(function (w) {
  return w.id;
}));
var initialWords = oldVersion && oldWords ? [].concat(_toConsumableArray(seed), _toConsumableArray(oldWords.filter(function (w) {
  return !seedIds.has(w.id);
}))) : seed;
var readSet = function readSet(key) {
  try {
    return new Set(oldVersion ? JSON.parse(localStorage.getItem(key) || '[]') : []);
  } catch (_unused2) {
    return new Set();
  }
};
var todayKey = function todayKey() {
  var date = new Date();
  return "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, '0'), "-").concat(String(date.getDate()).padStart(2, '0'));
};
var dayGap = function dayGap(from, to) {
  if (!from || !to) return Infinity;
  var start = Date.parse("".concat(from, "T00:00:00Z"));
  var end = Date.parse("".concat(to, "T00:00:00Z"));
  return Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / 86400000) : Infinity;
};
var startingReviewed = oldVersion && localStorage.getItem('hanamiTodayDate') === todayKey() ? Number(localStorage.getItem('hanamiToday') || 0) : 0;
var startingStreak = oldVersion ? Number(localStorage.getItem('hanamiStreak') || 0) : 0;
var startingLastStudy = oldVersion ? localStorage.getItem('hanamiLastStudy') || '' : '';
var dateLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
}).toUpperCase();
function App() {
  var _useState = useState(initialWords),
    _useState2 = _slicedToArray(_useState, 2),
    words = _useState2[0],
    setWords = _useState2[1];
  var _useState3 = useState(function () {
      return readSet('hanamiSaved');
    }),
    _useState4 = _slicedToArray(_useState3, 2),
    saved = _useState4[0],
    setSaved = _useState4[1];
  var _useState5 = useState(function () {
      return readSet('hanamiKnown');
    }),
    _useState6 = _slicedToArray(_useState5, 2),
    known = _useState6[0],
    setKnown = _useState6[1];
  var _useState7 = useState(startingReviewed),
    _useState8 = _slicedToArray(_useState7, 2),
    reviewed = _useState8[0],
    setReviewed = _useState8[1];
  var _useStateStreak = useState(startingStreak),
    _useStateStreak2 = _slicedToArray(_useStateStreak, 2),
    streak = _useStateStreak2[0],
    setStreak = _useStateStreak2[1];
  var _useStateLastStudy = useState(startingLastStudy),
    _useStateLastStudy2 = _slicedToArray(_useStateLastStudy, 2),
    lastStudy = _useStateLastStudy2[0],
    setLastStudy = _useStateLastStudy2[1];
  var _useState9 = useState(1),
    _useState0 = _slicedToArray(_useState9, 2),
    band = _useState0[0],
    setBand = _useState0[1];
  var _useState1 = useState('all'),
    _useState10 = _slicedToArray(_useState1, 2),
    filter = _useState10[0],
    setFilter = _useState10[1];
  var _studySourceState = useState('new'),
    _studySourceState2 = _slicedToArray(_studySourceState, 2),
    studySource = _studySourceState2[0],
    setStudySource = _studySourceState2[1];
  var _studyListHistoryState = useState([]),
    _studyListHistoryState2 = _slicedToArray(_studyListHistoryState, 2),
    studyListHistory = _studyListHistoryState2[0],
    setStudyListHistory = _studyListHistoryState2[1];
  var _useState11 = useState(''),
    _useState12 = _slicedToArray(_useState11, 2),
    query = _useState12[0],
    setQuery = _useState12[1];
  var _useState13 = useState(false),
    _useState14 = _slicedToArray(_useState13, 2),
    revealed = _useState14[0],
    setRevealed = _useState14[1];
  var _useState15 = useState(''),
    _useState16 = _slicedToArray(_useState15, 2),
    toast = _useState16[0],
    setToast = _useState16[1];
  var _useState17 = useState(30),
    _useState18 = _slicedToArray(_useState17, 2),
    pageSize = _useState18[0],
    setPageSize = _useState18[1];
  var _useState19 = useState(0),
    _useState20 = _slicedToArray(_useState19, 2),
    sessionKnown = _useState20[0],
    setSessionKnown = _useState20[1];
  var _sessionLearnedState = useState(function () { return new Set(); }),
    _sessionLearnedState2 = _slicedToArray(_sessionLearnedState, 2),
    sessionLearned = _sessionLearnedState2[0],
    setSessionLearned = _sessionLearnedState2[1];
  var _studyDoneState = useState(function () { return new Set(); }),
    _studyDoneState2 = _slicedToArray(_studyDoneState, 2),
    studyDone = _studyDoneState2[0],
    setStudyDone = _studyDoneState2[1];
  var _batchHistoryState = useState([]),
    _batchHistoryState2 = _slicedToArray(_batchHistoryState, 2),
    batchHistory = _batchHistoryState2[0],
    setBatchHistory = _batchHistoryState2[1];
  var _futureBatchesState = useState([]),
    _futureBatchesState2 = _slicedToArray(_futureBatchesState, 2),
    futureBatches = _futureBatchesState2[0],
    setFutureBatches = _futureBatchesState2[1];
  var practiceCache = React.useRef({});
  var _useState21 = useState(function () {
      return initialWords.filter(function (w) {
        return +w.band === 1 && !readSet('hanamiKnown').has(w.id);
      }).slice(0, 10);
    }),
    _useState22 = _slicedToArray(_useState21, 2),
    deck = _useState22[0],
    setDeck = _useState22[1];
  var _useState23 = useState(0),
    _useState24 = _slicedToArray(_useState23, 2),
    idx = _useState24[0],
    setIdx = _useState24[1];
  var current = deck.length ? deck[(idx % deck.length + deck.length) % deck.length] : null;
  var sessionTotal = deck.length;
  var streakGap = dayGap(lastStudy, todayKey());
  var activeStreak = streakGap >= 0 && streakGap <= 1 ? streak : 0;
  var buildStudyDeck = function buildStudyDeck(source, targetBand, done) {
    var skipped = done || new Set();
    return words.filter(function (w) { return +w.band === +targetBand && (source === 'new' ? !known.has(w.id) : source === 'saved' ? saved.has(w.id) : source === 'learned' ? known.has(w.id) : true) && !skipped.has(w.id); }).slice(0, 10);
  };
  useEffect(function () {
    localStorage.setItem('hanamiDatasetVersion', STORAGE_VERSION);
    localStorage.setItem('hanamiWords', JSON.stringify(words));
    localStorage.setItem('hanamiSaved', JSON.stringify(_toConsumableArray(saved)));
    localStorage.setItem('hanamiKnown', JSON.stringify(_toConsumableArray(known)));
    localStorage.setItem('hanamiToday', String(reviewed));
    localStorage.setItem('hanamiTodayDate', todayKey());
    localStorage.setItem('hanamiStreak', String(streak));
    localStorage.setItem('hanamiLastStudy', lastStudy);
  }, [words, saved, known, reviewed, streak, lastStudy]);
  useEffect(function () {
    if (!toast) return;
    var id = setTimeout(function () {
      return setToast('');
    }, 2100);
    return function () {
      return clearTimeout(id);
    };
  }, [toast]);
  useEffect(function () {
    setPageSize(30);
  }, [query, filter, band]);
  var filtered = useMemo(function () {
    return words.filter(function (w) {
      return (filter === 'saved' ? saved.has(w.id) : filter === 'learned' ? known.has(w.id) : true) && +w.band === band && (!query || [w.hanzi, w.pinyin, w.meaning].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
    });
  }, [words, saved, known, filter, band, query]);
  var visible = filtered.slice(0, pageSize);
  var say = function say(w) {
    if (!(w !== null && w !== void 0 && w.hanzi)) return;
    if (!('speechSynthesis' in window)) {
      setToast('Speech playback is not supported in this browser');
      return;
    }
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(w.hanzi);
    utterance.lang = 'zh-CN';
    utterance.rate = .85;
    var voice = window.speechSynthesis.getVoices().find(function (v) {
      return /^zh(-|_)?(CN|Hans)?/i.test(v.lang);
    }) || window.speechSynthesis.getVoices().find(function (v) {
      return /^zh/i.test(v.lang);
    });
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };
  var persistDeck = function persistDeck() {
    var b = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : band;
    return words.filter(function (w) {
      return +w.band === +b && !known.has(w.id);
    }).slice(0, 10);
  };
  var toggleSave = function toggleSave(id) {
    return setSaved(function (prev) {
      var next = new Set(prev);
      next.has(id) ? next["delete"](id) : next.add(id);
      return next;
    });
  };
  var savePracticePosition = function savePracticePosition() { practiceCache.current[''.concat(band, ':', studySource)] = { deck: deck, idx: idx, sessionKnown: sessionKnown, sessionLearned: _toConsumableArray(sessionLearned), studyDone: _toConsumableArray(studyDone), batchHistory: batchHistory, futureBatches: futureBatches }; };
  var restorePractice = function restorePractice(source, targetBand) { var savedSession = practiceCache.current[''.concat(targetBand, ':', source)]; setStudySource(source); setBand(targetBand); setDeck(savedSession ? savedSession.deck : buildStudyDeck(source, targetBand, new Set())); setIdx(savedSession ? savedSession.idx : 0); setSessionKnown(savedSession ? savedSession.sessionKnown : 0); setSessionLearned(new Set(savedSession ? savedSession.sessionLearned : [])); setStudyDone(new Set(savedSession ? savedSession.studyDone : [])); setBatchHistory(savedSession ? savedSession.batchHistory || [] : []); setFutureBatches(savedSession ? savedSession.futureBatches || [] : []); setRevealed(false); };
  var changeBand = function changeBand(value) { var b = Number(value); if (b === band) return; savePracticePosition(); restorePractice(studySource, b); };
  var changeStudySource = function changeStudySource(value) { if (value === studySource) return; savePracticePosition(); setStudyListHistory(function (prev) { return prev.concat([studySource]); }); restorePractice(value, band); };
  var returnToPreviousStudyList = function returnToPreviousStudyList() { if (!studyListHistory.length) return; savePracticePosition(); var previous = studyListHistory[studyListHistory.length - 1]; setStudyListHistory(function (prev) { return prev.slice(0, -1); }); restorePractice(previous, band); };
  var restoreBatch = function restoreBatch(batch) { setDeck(batch.deck); setIdx(Math.max(0, Math.min(batch.idx, batch.deck.length - 1))); setSessionLearned(new Set(batch.learned)); setSessionKnown(batch.learned.length); setRevealed(false); };
  var showPreviousBatch = function showPreviousBatch() { if (!batchHistory.length) return; var currentBatch = { deck: deck, learned: _toConsumableArray(sessionLearned), idx: idx }; var previous = batchHistory[batchHistory.length - 1]; setBatchHistory(function (prev) { return prev.slice(0, -1); }); setFutureBatches(function (prev) { return prev.concat([currentBatch]); }); restoreBatch(previous); };
  var showNextBatch = function showNextBatch() { if (!futureBatches.length) return; var next = futureBatches[futureBatches.length - 1]; var currentBatch = { deck: deck, learned: _toConsumableArray(sessionLearned), idx: idx }; setFutureBatches(function (prev) { return prev.slice(0, -1); }); setBatchHistory(function (prev) { return prev.concat([currentBatch]); }); restoreBatch(next); };
  var move = function move(amount) {
    if (!deck.length) return;
    setIdx(function (i) {
      return (i + amount + deck.length) % deck.length;
    });
    setRevealed(false);
  };
  var markKnown = function markKnown() {
    if (!current) return;
    if (studyDone.has(current.id)) { move(1); return; }
    var nextDone = new Set(studyDone); nextDone.add(current.id);
    var nextLearned = new Set(sessionLearned); nextLearned.add(current.id);
    setStudyDone(nextDone); setSessionLearned(nextLearned); setKnown(function (prev) { return new Set(prev).add(current.id); });
    setReviewed(function (n) { return n + 1; });
    var studyDay = todayKey();
    if (lastStudy !== studyDay) { setStreak(dayGap(lastStudy, studyDay) === 1 ? function (value) { return value + 1; } : 1); setLastStudy(studyDay); }
    setSessionKnown(nextLearned.size); setRevealed(false);
    if (nextLearned.size >= sessionTotal) { setBatchHistory(function (prev) { return prev.concat([{ deck: deck, learned: _toConsumableArray(nextLearned), idx: sessionTotal - 1 }]); }); setFutureBatches([]); var remaining = buildStudyDeck(studySource, band, nextDone); if (remaining.length) { setDeck(remaining); setIdx(0); setSessionKnown(0); setSessionLearned(new Set()); } else { setDeck([]); setIdx(0); setToast('You finished this practice list. Use Previous session to review or choose another list.'); } }
    else { var nextIndex = (idx + 1) % sessionTotal, scanned = 0; while (scanned < sessionTotal && nextLearned.has(deck[nextIndex].id)) { nextIndex = (nextIndex + 1) % sessionTotal; scanned++; } setIdx(nextIndex); }
  };
  var onCardKey = function onCardKey(event) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      setRevealed(function (v) {
        return !v;
      });
    } else if (event.key === 'ArrowRight') move(1);else if (event.key === 'ArrowLeft') move(-1);
  };
  var changeFilter = function changeFilter(next) {
    var _document$querySelect;
    setFilter(next);
    (_document$querySelect = document.querySelector('#vocabulary')) === null || _document$querySelect === void 0 || _document$querySelect.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };
  var importWords = function importWords(event) {
    var _event$target$files;
    var file = (_event$target$files = event.target.files) === null || _event$target$files === void 0 ? void 0 : _event$target$files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var text = String(reader.result);
        var incoming;
        if (file.name.toLowerCase().endsWith('.json')) {
          var parsed = JSON.parse(text);
          incoming = Array.isArray(parsed) ? parsed : parsed.words;
        } else {
          var lines = text.split(/\r?\n/).filter(Boolean);
          var headers = lines.shift().split(',').map(function (s) {
            return s.trim().toLowerCase().replace(/^"|"$/g, '');
          });
          var parseLine = function parseLine(line) {
            var cols = [];
            var value = '',
              quoted = false;
            for (var i = 0; i < line.length; i++) {
              var ch = line[i];
              if (ch === '"' && line[i + 1] === '"' && quoted) {
                value += '"';
                i++;
              } else if (ch === '"') quoted = !quoted;else if (ch === ',' && !quoted) {
                cols.push(value);
                value = '';
              } else value += ch;
            }
            cols.push(value);
            return cols;
          };
          incoming = lines.map(function (line) {
            var cols = parseLine(line),
              row = {};
            headers.forEach(function (h, i) {
              return row[h] = cols[i] || '';
            });
            return row;
          });
        }
        if (!Array.isArray(incoming)) throw Error('The JSON file must contain a word list.');
        var added = incoming.map(function (w, i) {
          return {
            id: 'i' + Date.now() + i,
            hanzi: w.hanzi || w.word || w.chinese,
            pinyin: w.pinyin || w.py,
            meaning: w.meaning || w.translation || w.english || w.definition,
            type: w.type || w.pos || w.part_of_speech || 'word',
            example: w.example || '',
            band: Number(w.band || w.level || w.hsk || band)
          };
        }).filter(function (w) {
          return w.hanzi && w.pinyin && w.meaning;
        });
        if (!added.length) throw Error('Include hanzi, pinyin, and meaning for each word.');
        setWords(function (prev) {
          return [].concat(_toConsumableArray(prev), _toConsumableArray(added));
        });
        setToast("Imported ".concat(added.length, " words"));
      } catch (error) {
        setToast(error.message || 'Could not read this file');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };
  var exportWords = function exportWords() {
    var csv = 'hanzi,pinyin,meaning,type,band,example\n' + words.map(function (w) {
      return [w.hanzi, w.pinyin, w.meaning, w.type, w.band, w.example].map(function (x) {
        return '"' + String(x || '').replaceAll('"', '""') + '"';
      }).join(',');
    }).join('\n');
    var url = URL.createObjectURL(new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    }));
    var a = document.createElement('a');
    a.href = url;
    a.download = 'nhu-hoa-hsk-vocabulary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "app-shell"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-mark"
  }, "\u6C49"), /*#__PURE__*/React.createElement("div", {
    className: "brand-copy"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-title"
  }, "Nh\u01B0 H\xF2a \xB7 HSK"), /*#__PURE__*/React.createElement("div", {
    className: "brand-sub"
  }, "VOCABULARY STUDIO"))), /*#__PURE__*/React.createElement("div", {
    className: "nav-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav-label"
  }, "YOUR SPACE"), /*#__PURE__*/React.createElement("nav", {
    className: "nav",
    "aria-label": "Main navigation"
  }, /*#__PURE__*/React.createElement("button", {
    className: "active",
    onClick: function onClick() {
      return window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "nav-icon"
  }, "\u2302"), /*#__PURE__*/React.createElement("span", null, "Overview")), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _document$querySelect2;
      return (_document$querySelect2 = document.querySelector('#study')) === null || _document$querySelect2 === void 0 ? void 0 : _document$querySelect2.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "nav-icon"
  }, "\u25A4"), /*#__PURE__*/React.createElement("span", null, "Study cards")), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      return changeFilter('saved');
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "nav-icon"
  }, "\u2606"), /*#__PURE__*/React.createElement("span", null, "Saved words")), /*#__PURE__*/React.createElement("button", {
    onClick: function onClick() {
      var _document$querySelect3;
      setFilter('all');
      (_document$querySelect3 = document.querySelector('#vocabulary')) === null || _document$querySelect3 === void 0 || _document$querySelect3.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "nav-icon"
  }, "\u5B57"), /*#__PURE__*/React.createElement("span", null, "Vocabulary")))), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-bottom"
  }, /*#__PURE__*/React.createElement("div", {
    className: "streak-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "streak-number"
  }, "\u2726 ", activeStreak, " ", activeStreak === 1 ? 'day' : 'days'), /*#__PURE__*/React.createElement("div", {
    className: "streak-note"
  }, lastStudy === todayKey() ? 'You studied today — keep it going' : activeStreak ? 'Study today to keep it going' : 'Start a new learning streak')))), /*#__PURE__*/React.createElement("main", {
    className: "main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "YOUR LEARNING SPACE"), /*#__PURE__*/React.createElement("div", {
    className: "topbar-right"
  }, /*#__PURE__*/React.createElement("span", {
    className: "date"
  }, dateLabel), /*#__PURE__*/React.createElement("div", {
    className: "avatar",
    "aria-label": "Learner"
  }, "\u4F60"))), /*#__PURE__*/React.createElement("section", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "HSK 3.0 \xB7 2021 STANDARD \xB7 BANDS 1\u20132"), /*#__PURE__*/React.createElement("h1", null, "\u4F60\u597D, learner."), /*#__PURE__*/React.createElement("p", null, "A little Chinese every day adds up.")), /*#__PURE__*/React.createElement("label", {
    className: "level-select"
  }, "\u25C9 HSK ", /*#__PURE__*/React.createElement("select", {
    "aria-label": "Choose HSK band",
    value: band,
    onChange: function onChange(e) {
      return changeBand(e.target.value);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "1"
  }, "1"), /*#__PURE__*/React.createElement("option", {
    value: "2"
  }, "2")), /*#__PURE__*/React.createElement("span", null, "/ 2"))), /*#__PURE__*/React.createElement("section", {
    className: "stats",
    "aria-label": "Learning summary"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "WORDS LEARNED",
    value: known.size.toLocaleString(),
    detail: "/ ".concat(words.length.toLocaleString()),
    icon: "\u2197"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "IN YOUR LIBRARY",
    value: words.length.toLocaleString(),
    detail: "words",
    icon: "\u2727"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "STUDY STREAK",
    value: activeStreak,
    detail: activeStreak === 1 ? "day" : "days",
    icon: "\u2197"
  })), /*#__PURE__*/React.createElement("div", {
    className: "dashboard"
  }, /*#__PURE__*/React.createElement("section", {
    className: "panel",
    id: "study"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "Today's practice"), /*#__PURE__*/React.createElement("span", {
    className: "panel-hint"
  }, current ? "CARD ".concat(String(idx + 1).padStart(2, '0'), " / ").concat(String(deck.length).padStart(2, '0')) : 'SESSION COMPLETE')), /*#__PURE__*/React.createElement("div", {
    className: "study-body"
  }, /*#__PURE__*/React.createElement("div", { className: "practice-head-actions" }, /*#__PURE__*/React.createElement("label", { className: "panel-hint", htmlFor: "practice-list" }, "PRACTICE LIST"), /*#__PURE__*/React.createElement("select", { className: "filter-select", id: "practice-list", "aria-label": "Choose today's practice list", value: studySource, onChange: function (event) { changeStudySource(event.target.value); } }, /*#__PURE__*/React.createElement("option", { value: "new" }, "New words"), /*#__PURE__*/React.createElement("option", { value: "saved" }, "Saved words"), /*#__PURE__*/React.createElement("option", { value: "learned" }, "Learned words"), /*#__PURE__*/React.createElement("option", { value: "all" }, "All words")), studyListHistory.length > 0 && /*#__PURE__*/React.createElement("button", { className: "btn", onClick: returnToPreviousStudyList }, "\u2190 Back to ", studyListHistory[studyListHistory.length - 1] === "new" ? "New words" : studyListHistory[studyListHistory.length - 1] === "saved" ? "Saved words" : studyListHistory[studyListHistory.length - 1] === "learned" ? "Learned words" : "All words", " list"), /*#__PURE__*/React.createElement("span", { className: "practice-help" }, "Switch lists to return where you left off."), /*#__PURE__*/React.createElement("span", { className: "practice-context" }, (studySource === 'new' ? 'New words' : studySource === 'saved' ? 'Saved words' : studySource === 'learned' ? 'Learned words' : 'All words'), " \xB7 HSK ", band)), /*#__PURE__*/React.createElement("div", {
    className: "flashcard ".concat(revealed ? 'revealed' : ''),
    onClick: function onClick() {
      return setRevealed(function (v) {
        return !v;
      });
    },
    onKeyDown: onCardKey,
    role: "button",
    tabIndex: "0",
    "aria-label": revealed ? 'Hide word meaning' : 'Reveal word meaning'
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-tag"
  }, "HSK ", (current === null || current === void 0 ? void 0 : current.band) || band, " \xB7 ", studySource === 'new' ? 'NEW WORDS' : studySource === 'saved' ? 'SAVED WORDS' : studySource === 'learned' ? 'LEARNED WORDS' : 'ALL WORDS'), current && /*#__PURE__*/React.createElement("button", {
    className: "icon-button card-star ".concat(saved.has(current.id) ? 'saved' : ''),
    "aria-label": saved.has(current.id) ? 'Remove from saved words' : 'Save word',
    onClick: function onClick(e) {
      e.stopPropagation();
      toggleSave(current.id);
    }
  }, saved.has(current.id) ? '★' : '☆'), /*#__PURE__*/React.createElement("div", {
    className: "hanzi"
  }, (current === null || current === void 0 ? void 0 : current.hanzi) || '完成'), /*#__PURE__*/React.createElement("div", {
    className: "pinyin"
  }, (current === null || current === void 0 ? void 0 : current.pinyin) || 'No new words'), (revealed || !current) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "meaning"
  }, (current === null || current === void 0 ? void 0 : current.meaning) || 'No words are available in this practice list.'), (current === null || current === void 0 ? void 0 : current.example) && /*#__PURE__*/React.createElement("div", {
    className: "example"
  }, current.example)), current && !revealed && /*#__PURE__*/React.createElement("div", {
    className: "reveal-note"
  }, "TAP OR PRESS SPACE TO REVEAL")), /*#__PURE__*/React.createElement("div", {
    className: "controls"
  }, batchHistory.length > 0 && /*#__PURE__*/React.createElement("button", { className: "btn", onClick: showPreviousBatch }, "\u2190 \xA0 Previous set"), futureBatches.length > 0 && /*#__PURE__*/React.createElement("button", { className: "btn", onClick: showNextBatch }, "Next session \xA0\u2192"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: function onClick() { return move(-1); },
    disabled: !deck.length
  }, "\u2190 \xA0 Previous"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: function onClick() { return setRevealed(function (v) { return !v; }); },
    disabled: !current
  }, revealed ? 'Hide meaning' : 'Reveal meaning'), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sound",
    onClick: function onClick() { return say(current); },
    disabled: !current, title: "Play pronunciation", "aria-label": "Play pronunciation"
  }, "\u25D6))"), /*#__PURE__*/React.createElement("button", { className: "btn", onClick: function onClick() { return move(1); }, disabled: !deck.length }, "Next \xA0\u2192"), /*#__PURE__*/React.createElement("button", { className: "btn btn-primary", onClick: markKnown, disabled: !current }, "Mark learned \xA0\u2713")), /*#__PURE__*/React.createElement("div", {    className: "progress-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "progress-fill",
    style: {
      width: "".concat(sessionTotal ? Math.min(100, sessionKnown / sessionTotal * 100) : 100, "%")
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "progress-copy"
  }, /*#__PURE__*/React.createElement("span", null, "LEARNED IN THIS SET"), /*#__PURE__*/React.createElement("span", null, Math.min(sessionKnown, sessionTotal), " / ", sessionTotal || 10)))), /*#__PURE__*/React.createElement("div", {
    className: "right-column"
  }, /*#__PURE__*/React.createElement("section", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "Learning today"), /*#__PURE__*/React.createElement("span", {
    className: "panel-hint"
  }, "DAILY GOAL")), /*#__PURE__*/React.createElement("div", {
    className: "session-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "session-count"
  }, Math.min(reviewed, 10), " ", /*#__PURE__*/React.createElement("span", null, "/ 10")), /*#__PURE__*/React.createElement("div", {
    className: "session-caption"
  }, "words marked learned today"), /*#__PURE__*/React.createElement("div", {
    className: "goal-dots",
    "aria-label": "".concat(Math.min(reviewed, 10), " of 10 words reviewed")
  }, Array.from({
    length: 10
  }, function (_, i) {
    return /*#__PURE__*/React.createElement("i", {
      key: i,
      className: i < Math.min(reviewed, 10) ? 'done' : ''
    });
  })), /*#__PURE__*/React.createElement("div", {
    className: "goal-meta"
  }, /*#__PURE__*/React.createElement("span", null, "DAILY GOAL"), /*#__PURE__*/React.createElement("strong", null, reviewed >= 10 ? 'Goal reached ✓' : 'In progress')), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary session-start",
    onClick: function onClick() {
      var _document$querySelect4;
      return (_document$querySelect4 = document.querySelector('#study')) === null || _document$querySelect4 === void 0 ? void 0 : _document$querySelect4.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, "Continue studying \xA0\u2192"))), /*#__PURE__*/React.createElement("section", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "A small study tip"), /*#__PURE__*/React.createElement("span", {
    className: "tip-icon"
  }, "\u2733")), /*#__PURE__*/React.createElement("div", {
    className: "session-body"
  }, /*#__PURE__*/React.createElement("p", {
    className: "tip-copy"
  }, "Say each word out loud before you reveal the meaning. Connecting sound, character, and meaning helps words stick."))))), /*#__PURE__*/React.createElement("section", {
    className: "panel vocabulary-panel",
    id: "vocabulary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "vocab-head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "list-title"
  }, "Your vocabulary ", /*#__PURE__*/React.createElement("span", {
    className: "title-count"
  }, filtered.length.toLocaleString(), " words")), /*#__PURE__*/React.createElement("div", {
    className: "filters"
  }, /*#__PURE__*/React.createElement("label", {
    className: "search-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "search-icon"
  }, "\u2315"), /*#__PURE__*/React.createElement("input", {
    className: "search",
    type: "search",
    placeholder: "Search words...",
    value: query,
    onChange: function onChange(e) {
      return setQuery(e.target.value);
    },
    "aria-label": "Search vocabulary"
  })), /*#__PURE__*/React.createElement("select", {
    className: "filter-select",
    "aria-label": "Filter by HSK band",
    value: band,
    onChange: function onChange(e) {
      return changeBand(e.target.value);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "1"
  }, "HSK 1"), /*#__PURE__*/React.createElement("option", {
    value: "2"
  }, "HSK 2")), /*#__PURE__*/React.createElement("button", {
    className: "filter-btn ".concat(filter === 'all' ? 'active' : ''),
    onClick: function onClick() {
      return setFilter('all');
    }
  }, "All"), /*#__PURE__*/React.createElement("button", {
    className: "filter-btn ".concat(filter === 'saved' ? 'active' : ''),
    onClick: function onClick() {
      return setFilter('saved');
    }
  }, "\u2606 Saved"), /*#__PURE__*/React.createElement("button", {
    className: "filter-btn ".concat(filter === 'learned' ? 'active' : ''),
    onClick: function onClick() {
      return setFilter('learned');
    }
  }, "\u2713 Learned"), /*#__PURE__*/React.createElement("label", {
    className: "import-label",
    title: "Import CSV or JSON"
  }, "\uFF0B Import", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".csv,.json,.txt",
    onChange: importWords
  })))), /*#__PURE__*/React.createElement("div", {
    className: "table-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "word-row header"
  }, /*#__PURE__*/React.createElement("span", null, "WORD"), /*#__PURE__*/React.createElement("span", null, "MEANING"), /*#__PURE__*/React.createElement("span", null, "WRITE"), /*#__PURE__*/React.createElement("span", null, "LEVEL \xB7 TYPE"), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)), visible.map(function (w) {
    return /*#__PURE__*/React.createElement("div", {
      className: "word-row",
      key: w.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "word-cell"
    }, /*#__PURE__*/React.createElement("span", {
      className: "word-zh"
    }, w.hanzi), /*#__PURE__*/React.createElement("span", {
      className: "word-py"
    }, w.pinyin)), /*#__PURE__*/React.createElement("span", {
      className: "word-meaning"
    }, w.meaning, " ", known.has(w.id) && /*#__PURE__*/React.createElement("span", {
      className: "learned-tag"
    }, "\xB7 \u2713 Learned")), /*#__PURE__*/React.createElement("button", { className: "write-btn", type: "button", "aria-label": "Practice writing ".concat(w.hanzi), title: "Show stroke order", onClick: function onClick() { return window.showStrokeGuide(w.hanzi); } }, "Write"), /*#__PURE__*/React.createElement("span", {
      className: "word-level"
    }, "HSK ", w.band || 1, " \xB7 ", w.type || 'word'), /*#__PURE__*/React.createElement("button", {
      className: "speak-btn",
      type: "button",
      "aria-label": "Play pronunciation for ".concat(w.hanzi),
      title: "Play pronunciation",
      onClick: function onClick() {
        return say(w);
      }
    }, "\u25D6))"), /*#__PURE__*/React.createElement("button", {
      className: "save-btn ".concat(saved.has(w.id) ? 'saved' : ''),
      "aria-label": saved.has(w.id) ? "Unsave ".concat(w.hanzi) : "Save ".concat(w.hanzi),
      onClick: function onClick() {
        return toggleSave(w.id);
      }
    }, saved.has(w.id) ? '★' : '☆'));
  }), !visible.length && /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, "No words found. Try another search or filter.")), filtered.length > visible.length && /*#__PURE__*/React.createElement("button", {
    className: "btn load-more",
    onClick: function onClick() {
      return setPageSize(function (n) {
        return n + 50;
      });
    }
  }, "Show more words \xB7 ", filtered.length - visible.length, " remaining"), /*#__PURE__*/React.createElement("div", {
    className: "list-footer"
  }, /*#__PURE__*/React.createElement("span", null, "HSK 3.0 \xB7 2021 STANDARD \xB7 BANDS 1\u20132 \xB7 ", words.length.toLocaleString(), " WORDS"), /*#__PURE__*/React.createElement("button", {
    className: "link-button",
    onClick: exportWords
  }, "Export CSV \u2193"))), /*#__PURE__*/React.createElement("p", {
    className: "credits"
  }, "NH\u01AF H\xD2A \xB7 HSK VOCABULARY", /*#__PURE__*/React.createElement("br", null), "Vocabulary: ", /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/ayman-ezz/hsk-3.0-word-list",
    target: "_blank",
    rel: "noreferrer"
  }, "HSK University HSK 3.0 Bands 1\u20132"), ", CC BY 4.0 \xB7 based on standard GF 0025-2021", /*#__PURE__*/React.createElement("br", null), "Band 2 English glosses: ", /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/LightChinese/HSK-3.0-words-list",
    target: "_blank",
    rel: "noreferrer"
  }, "Mani's HSK 3.0 list"), ", ", /*#__PURE__*/React.createElement("a", {
    href: "https://creativecommons.org/licenses/by-sa/4.0/",
    target: "_blank",
    rel: "noreferrer"
  }, "CC BY-SA 4.0"), ", using CC-CEDICT")), /*#__PURE__*/React.createElement("div", {
    className: "toast ".concat(toast ? 'show' : ''),
    role: "status",
    "aria-live": "polite"
  }, toast));
}
function Stat(_ref) {
  var label = _ref.label,
    value = _ref.value,
    detail = _ref.detail,
    icon = _ref.icon;
  return /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-head"
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("span", {
    className: "stat-icon"
  }, icon)), /*#__PURE__*/React.createElement("div", {
    className: "stat-value"
  }, value, " ", /*#__PURE__*/React.createElement("small", null, detail)));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));

// Character foundations: introduce common components before showing characters built from them.
(function () {
  var waitForApp = window.setInterval(function () {
    if (!document.querySelector('.nav') || !document.querySelector('.main')) return;
    window.clearInterval(waitForApp);
    installCharacterSection();
  }, 25);
  function installCharacterSection() {
  var characterData = window.HSK_CHARACTER_DATA || [];
  var lessonsByLevel = {};
  characterData.forEach(function (character) { (lessonsByLevel[character.level] || (lessonsByLevel[character.level] = [])).push(character); });
  var level = 0;
  var lessons = lessonsByLevel[level] || [];
  var viewMode = 'all';
  var query = '';
  var pageSize = 48;
  var style = document.createElement('style');
  style.textContent = '.char-nav{margin-top:5px}.char-view{display:none}.char-view.active{display:block}.char-intro{margin:0 0 18px;color:#718174;font-size:14px;line-height:1.7}.char-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(250px,.75fr);gap:18px}.char-card{min-height:310px;padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:radial-gradient(circle at 50% 40%,#fbfdf7,#edf4e9);border:1px solid #dce8dc;border-radius:17px}.char-glyph{font:500 100px/1.2 "Noto Serif SC",serif;color:#284632}.char-pron{margin-top:8px;color:#6d806f}.char-name{margin-top:10px;font-size:17px;font-weight:600;color:#2d4e35}.char-role{max-width:540px;color:#758174;font-size:13px;line-height:1.7;margin:12px 0 0}.char-builds{margin-top:15px;padding:12px 14px;border-radius:10px;background:#fffefa;color:#536653;font-size:12px;line-height:1.8}.char-controls{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}.char-side{padding:20px}.char-side h2{font-size:15px;margin:0 0 10px}.char-side p{font-size:12px;line-height:1.7;color:#778175}.char-step-list{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin-top:12px;max-height:370px;overflow:auto}.char-step{position:relative;border:1px solid var(--line);border-radius:8px;background:#fffefa;padding:7px 4px;color:#5f685d;text-align:center;font:20px "Noto Serif SC",serif}.char-step.current{border-color:#6f9a72;background:#edf4eb;color:#31553d}.char-step.done:after{content:"\\2713";position:absolute;right:2px;top:0;color:#426c50;font:9px Arial}.char-progress{font:10px "DM Mono",monospace;color:#8c9588;margin:10px 0}.char-tools{display:flex;gap:7px;align-items:center;margin-top:12px}.char-tools .search{width:100%;min-width:0}.char-tools .filter-select{max-width:125px}.char-component{border:1px solid #dce8dc;border-radius:7px;background:#f7faf5;color:#31553d;padding:3px 8px;margin:2px;font:20px "Noto Serif SC",serif}.char-example{display:inline-block;margin:2px 5px 2px 0;padding:4px 7px;border-radius:6px;background:#f4f6f0;color:#5a6859}.char-footer{font-size:11px;color:#8b9388;margin-top:14px;line-height:1.7}@media(max-width:760px){.char-layout{grid-template-columns:1fr}.char-card{min-height:260px}.char-glyph{font-size:82px}.char-step-list{grid-template-columns:repeat(8,minmax(0,1fr))}}';
  document.head.appendChild(style);
  var nav = document.querySelector('.nav');
  var vocabMain = document.querySelector('.main');
  var charNav = document.createElement('button');
  charNav.className = 'char-nav'; charNav.innerHTML = '<span class="nav-icon">部</span><span>Characters</span>';
  nav.appendChild(charNav);
  var view = document.createElement('main'); view.className = 'main char-view';
  view.innerHTML = `<div class="topbar"><div class="eyebrow">YOUR LEARNING SPACE</div><div class="topbar-right"><span class="date">HSK 3.0 &middot; 2021 STANDARD</span><div class="avatar">&#23383;</div></div></div><section class="hero"><div><div class="eyebrow">FULL CHARACTER PATH &middot; LEVELS 1&#8211;3</div><h1>Build from the roots.</h1><p>Start with foundations, then explore every character in the HSK 3.0 (2021) levels 1&#8211;3 vocabulary.</p><label class="level-select">Study set <select id="char-level" aria-label="Choose HSK character level"><option value="0">Foundations</option><option value="1">HSK 1</option><option value="2">HSK 2</option><option value="3">HSK 3</option></select></label></div></section><p class="char-intro">The path includes all 899 distinct Han characters found in HSK 3.0 (2021) vocabulary levels 1&#8211;3, plus 286 recursive building components. Each entry includes pinyin, meaning, radical, component breakdown, and vocabulary examples.</p><div class="char-layout"><section class="panel"><div class="panel-head"><h2 id="char-heading">Character 1</h2><span class="panel-hint" id="char-band">FOUNDATIONS</span></div><div class="study-body"><div class="char-card"><div class="char-glyph" id="char-glyph"></div><div class="char-pron" id="char-pron"></div><div class="char-name" id="char-name"></div><p class="char-role" id="char-role"></p><div class="char-builds"><div><strong>Structure:</strong> <span id="char-decomp"></span></div><div><strong>Radical:</strong> <span id="char-radical"></span></div><div><strong>Stroke count (Unicode):</strong> <span id="char-strokes"></span></div><div><strong>Unicode reading:</strong> <span id="char-unihan-reading"></span></div><div><strong>Unicode radical/strokes:</strong> <span id="char-unihan-rs"></span></div><div><strong>Components:</strong> <span id="char-components"></span></div><div style="margin-top:8px"><strong>In HSK vocabulary:</strong><div id="char-examples"></div></div></div></div><div class="char-controls"><button class="btn" id="char-prev">&larr; Previous</button><button class="btn btn-primary" id="char-next">Mark learned &amp; next &rarr;</button></div></div></section><aside class="panel char-side"><h2>Character library</h2><p>Browse foundations first or search all characters in this level. Select any character to study its parts and examples.</p><div class="char-progress" id="char-progress"></div><div class="char-tools"><label class="search-wrap"><span class="search-icon">&#8981;</span><input class="search" id="char-search" type="search" placeholder="Search character or meaning" aria-label="Search characters"></label><select class="filter-select" id="char-mode" aria-label="Choose character view"><option value="all">All characters</option><option value="foundations">Foundations only</option></select></div><div class="char-step-list" id="char-steps"></div><button class="btn load-more" id="char-more">Show more</button><p class="char-footer">Character meanings, pinyin, and decomposition: <a href="https://github.com/skishore/makemeahanzi" target="_blank" rel="noreferrer">Make Me a Hanzi</a>, derived from Unihan and CJKlib (LGPL-3.0-or-later). Stroke counts and radical-stroke references: <a href="https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip" target="_blank" rel="noreferrer">Unicode Unihan 18.0</a> (Unicode License v3). Vocabulary examples: <a href="https://github.com/ayman-ezz/hsk-3.0-word-list" target="_blank" rel="noreferrer">HSK University HSK 3.0 (2021)</a>, CC BY 4.0.</p></aside></div>`;
  vocabMain.parentNode.appendChild(view);
  var index = 0, learned = new Set();
  try { learned = new Set(JSON.parse(localStorage.getItem('hanamiKnownComponents') || '[]')); } catch (_) {}
  var validCharacters = new Set(characterData.map(function (item) { return item.character; }));
  var migrated = new Set(Array.from(learned).filter(function (key) { return validCharacters.has(key); }));
  lessonsByLevel[1].forEach(function (item) { if (learned.has('1:' + item.character)) migrated.add(item.character); });
  learned = migrated;
  function activeDeck() {
    var deck = lessons.filter(function (item) { return viewMode !== 'foundations' || item.foundation; });
    if (query) deck = deck.filter(function (item) { return [item.character,item.pinyin,item.meaning,item.radical,item.decomposition].join(' ').toLowerCase().includes(query.toLowerCase()); });
    return deck;
  }
  function render() {
    var deck = activeDeck();
    if (index >= deck.length) index = Math.max(0, deck.length - 1);
    var item = deck[index];
    if (!item) { view.querySelector('#char-heading').textContent = 'No matching characters'; view.querySelector('#char-glyph').textContent = ''; view.querySelector('#char-pron').textContent = ''; view.querySelector('#char-name').textContent = ''; view.querySelector('#char-role').textContent = ''; view.querySelector('#char-steps').replaceChildren(); view.querySelector('#char-more').hidden = true; return; }
    view.querySelector('#char-heading').textContent = 'Character ' + (index + 1) + ' of ' + deck.length;
    view.querySelector('#char-band').textContent = item.level ? 'FIRST IN HSK ' + item.level : 'FOUNDATION COMPONENT';
    view.querySelector('#char-glyph').textContent = item.character;
    view.querySelector('#char-pron').textContent = item.pinyin || 'Reading unavailable';
    view.querySelector('#char-name').textContent = item.meaning || 'Meaning unavailable';
    view.querySelector('#char-role').textContent = item.etymology || (item.foundation ? 'A foundational character used to build or recognize other forms.' : 'Study its component pattern and see it in the HSK examples below.');
    view.querySelector('#char-decomp').textContent = item.decomposition || '\u2014';
    view.querySelector('#char-radical').textContent = item.radical || '\u2014';
    view.querySelector('#char-strokes').textContent = item.strokeCount || '\u2014';
    view.querySelector('#char-unihan-reading').textContent = item.unicodePinyin || '\u2014';
    view.querySelector('#char-unihan-rs').textContent = item.unicodeRadicalStrokes || '\u2014';
    var components = view.querySelector('#char-components');
    components.replaceChildren();
    if (item.components && item.components.length) item.components.forEach(function (component) {
      var button = document.createElement('button'); button.className = 'char-component'; button.textContent = component;
      button.setAttribute('aria-label', 'Study component ' + component);
      button.addEventListener('click', function () { var target = characterData.find(function (entry) { return entry.character === component; }); if (target) { level = target.level; lessons = lessonsByLevel[level]; view.querySelector('#char-level').value = String(level); viewMode = 'all'; view.querySelector('#char-mode').value = 'all'; query = ''; view.querySelector('#char-search').value = ''; index = lessons.findIndex(function (entry) { return entry.character === component; }); render(); } });
      components.appendChild(button);
    }); else components.textContent = 'Base character';
    var examples = view.querySelector('#char-examples'); examples.replaceChildren();
    (item.examples || []).forEach(function (example) { var tag = document.createElement('span'); tag.className = 'char-example'; tag.textContent = example.word + ' \u00b7 ' + example.pinyin + (example.meaning ? ' \u00b7 ' + example.meaning : ''); examples.appendChild(tag); });
    view.querySelector('#char-progress').textContent = learned.size + ' / ' + characterData.length + ' characters learned';
    var list = view.querySelector('#char-steps'); list.replaceChildren();
    var matches = activeDeck();
    matches.slice(0,pageSize).forEach(function (entry) { var entryIndex = deck.indexOf(entry); var button = document.createElement('button'); button.className = 'char-step' + (entry === item ? ' current' : '') + (learned.has(entry.character) ? ' done' : ''); button.textContent = entry.character; button.title = entry.character + ' \u00b7 ' + (entry.level ? 'HSK ' + entry.level : 'Foundation') + ' \u00b7 ' + entry.meaning; button.setAttribute('aria-label', button.title); button.addEventListener('click', function () { index = entryIndex; render(); }); list.appendChild(button); });
    view.querySelector('#char-more').hidden = matches.length <= pageSize;
    view.querySelector('#char-more').textContent = 'Show more (' + (matches.length - pageSize) + ' remaining)';
    view.querySelector('#char-prev').disabled = deck.length < 2;
    view.querySelector('#char-next').disabled = !deck.length;
  }
  function selectView(chars) {
    vocabMain.style.display = chars ? 'none' : '';
    view.classList.toggle('active', chars);
    charNav.classList.toggle('active', chars);
    nav.querySelectorAll('button:not(.char-nav)').forEach(function (button) { button.classList.toggle('active', !chars && button.textContent.indexOf('Overview') >= 0); });
    window.scrollTo({top:0,behavior:'smooth'});
  }
  charNav.addEventListener('click', function () { selectView(true); });
  view.querySelector('#char-level').addEventListener('change', function (event) { level = Number(event.target.value); lessons = lessonsByLevel[level] || []; index = 0; pageSize = 48; view.querySelector('#char-band').textContent = level ? 'HSK ' + level : 'FOUNDATIONS'; render(); });
  view.querySelector('#char-search').addEventListener('input', function (event) { query = event.target.value.trim(); index = 0; pageSize = 48; render(); });
  view.querySelector('#char-mode').addEventListener('change', function (event) { viewMode = event.target.value; index = 0; render(); });
  view.querySelector('#char-more').addEventListener('click', function () { pageSize += 48; render(); });
  nav.querySelectorAll('button:not(.char-nav)').forEach(function (button) { button.addEventListener('click', function () { selectView(false); }); });
  view.querySelector('#char-next').addEventListener('click', function () { var item = activeDeck()[index]; if (!item) return; learned.add(item.character); localStorage.setItem('hanamiKnownComponents', JSON.stringify(Array.from(learned))); index = (index + 1) % activeDeck().length; render(); });
  view.querySelector('#char-prev').addEventListener('click', function () { var deck = activeDeck(); index = (index + deck.length - 1) % deck.length; render(); });
  render();
  }
})();
