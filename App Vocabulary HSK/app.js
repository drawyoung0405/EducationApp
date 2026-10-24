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
  var changeBand = function changeBand(value) {
    var b = Number(value);
    setBand(b);
    setDeck(words.filter(function (w) {
      return +w.band === b && !known.has(w.id);
    }).slice(0, 10));
    setIdx(0);
    setSessionKnown(0);
    setRevealed(false);
  };
  var move = function move(amount) {
    if (!deck.length) return;
    setIdx(function (i) {
      return (i + amount + deck.length) % deck.length;
    });
    setRevealed(false);
  };
  var markKnown = function markKnown() {
    if (!current) {
      setToast('No new words left in this band.');
      return;
    }
    setKnown(function (prev) {
      return new Set(prev).add(current.id);
    });
    setReviewed(function (n) {
      return n + 1;
    });
    var studyDay = todayKey();
    if (lastStudy !== studyDay) {
      setStreak(dayGap(lastStudy, studyDay) === 1 ? function (value) {
        return value + 1;
      } : 1);
      setLastStudy(studyDay);
    }
    var progress = sessionKnown + 1;
    setSessionKnown(progress);
    setRevealed(false);
    if (progress >= sessionTotal) {
      var remaining = words.filter(function (w) {
        return +w.band === band && !known.has(w.id) && w.id !== current.id;
      }).slice(0, 10);
      if (remaining.length) {
        setDeck(remaining);
        setIdx(0);
        setSessionKnown(0);
      } else {
        setDeck([]);
        setIdx(0);
        setToast('You learned all the words in this band!');
      }
    } else setIdx(function (i) {
      return (i + 1) % sessionTotal;
    });
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
  }, /*#__PURE__*/React.createElement("div", {
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
  }, "HSK ", (current === null || current === void 0 ? void 0 : current.band) || band, " \xB7 ", (current === null || current === void 0 ? void 0 : current.type) || 'WORD'), current && /*#__PURE__*/React.createElement("button", {
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
  }, (current === null || current === void 0 ? void 0 : current.meaning) || 'You have learned all words in this band.'), (current === null || current === void 0 ? void 0 : current.example) && /*#__PURE__*/React.createElement("div", {
    className: "example"
  }, current.example)), current && !revealed && /*#__PURE__*/React.createElement("div", {
    className: "reveal-note"
  }, "TAP OR PRESS SPACE TO REVEAL")), /*#__PURE__*/React.createElement("div", {
    className: "controls"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: function onClick() {
      return move(-1);
    },
    disabled: !deck.length
  }, "\u2190 \xA0 Prev"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: function onClick() {
      return setRevealed(function (v) {
        return !v;
      });
    },
    disabled: !current
  }, revealed ? 'Hide' : 'Reveal'), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sound",
    onClick: function onClick() {
      return say(current);
    },
    disabled: !current,
    title: "Play pronunciation",
    "aria-label": "Play pronunciation"
  }, "\u25D6))"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: markKnown,
    disabled: !current
  }, "Got it \xA0\u2713")), /*#__PURE__*/React.createElement("div", {
    className: "progress-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "progress-fill",
    style: {
      width: "".concat(sessionTotal ? Math.min(100, sessionKnown / sessionTotal * 100) : 100, "%")
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "progress-copy"
  }, /*#__PURE__*/React.createElement("span", null, "SESSION PROGRESS"), /*#__PURE__*/React.createElement("span", null, Math.min(sessionKnown, sessionTotal), " / ", sessionTotal || 10)))), /*#__PURE__*/React.createElement("div", {
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
  }, "words reviewed today"), /*#__PURE__*/React.createElement("div", {
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
  }, /*#__PURE__*/React.createElement("span", null, "WORD"), /*#__PURE__*/React.createElement("span", null, "MEANING"), /*#__PURE__*/React.createElement("span", null, "LEVEL \xB7 TYPE"), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)), visible.map(function (w) {
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
    }, "\xB7 \u2713 Learned")), /*#__PURE__*/React.createElement("span", {
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
