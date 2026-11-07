(function () {
  var dialog, writer, currentText, replayTimer, autoReplay = true;
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'stroke-dialog';
    dialog.setAttribute('aria-labelledby', 'stroke-title');
    dialog.innerHTML = '<div class="stroke-head"><h2 id="stroke-title">Stroke order</h2><button class="stroke-close" type="button" aria-label="Close">×</button></div><div class="stroke-canvas"></div><div class="stroke-error" role="status" aria-live="polite"></div><div class="stroke-controls"><label class="stroke-auto"><input class="stroke-auto-toggle" type="checkbox" checked> Auto replay</label><button class="btn stroke-replay" type="button">↻ Replay</button><button class="btn stroke-next" type="button">Next character →</button></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('.stroke-close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) closeGuide(); });
    dialog.querySelector('.stroke-replay').addEventListener('click', animate);
    dialog.querySelector('.stroke-auto-toggle').addEventListener('change', function (event) { autoReplay = event.target.checked; });
    dialog.querySelector('.stroke-next').addEventListener('click', function () {
      if (!currentText) return;
      currentIndex = (currentIndex + 1) % Array.from(currentText).length;
      showCharacter(Array.from(currentText)[currentIndex]);
    });
    dialog.addEventListener('close', function () { stopWriter(); });
  }
  var currentIndex = 0;
  function stopWriter() {
    if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
    if (!writer) return;
    try { if (typeof writer.cancelAnimation === 'function') writer.cancelAnimation(); } catch (_) { /* closing the guide should never interrupt the app */ }
    writer = null;
  }
  function closeGuide() {
    if (dialog && dialog.open) dialog.close();
  }
  function animate() {
    if (!writer) return;
    if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
    var activeWriter = writer;
    activeWriter.animateCharacter({ onComplete: function () {
      if (autoReplay && writer === activeWriter && dialog && dialog.open) {
        replayTimer = setTimeout(function () { replayTimer = null; animate(); }, 700);
      }
    } });
  }
  function showCharacter(character) {
    var canvas = dialog.querySelector('.stroke-canvas');
    var error = dialog.querySelector('.stroke-error');
    stopWriter();
    canvas.replaceChildren(); error.textContent = '';
    dialog.querySelector('#stroke-title').textContent = 'Write ' + character;
    if (!window.HanziWriter) { error.textContent = 'The writing guide could not load. Check your internet connection.'; return; }
    writer = HanziWriter.create(canvas, character, {
      width: 240, height: 240, padding: 12, showOutline: true, showCharacter: false,
      strokeColor: '#31553d', outlineColor: '#dce8dc', drawingWidth: 8,
      charDataLoader: function (char, onLoad) {
        fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/' + encodeURIComponent(char) + '.json')
          .then(function (response) { if (!response.ok) throw new Error('Character data unavailable'); return response.json(); })
          .then(onLoad).catch(function () { error.textContent = 'Stroke data is not available for ' + char + '.'; });
      }
    });
    animate();
  }
  window.showStrokeGuide = function (text) {
    currentText = Array.from(String(text || '')).filter(function (char) { return /\p{Script=Han}/u.test(char); }).join('');
    if (!currentText) return;
    currentIndex = 0; ensureDialog(); showCharacter(Array.from(currentText)[currentIndex]);
    if (!dialog.open) dialog.showModal();
  };
})();
