// Live sync: follows a Lichess game and re-analyzes after every move.
var liveOn = false, liveTimer = null, liveId = null, liveCount = -1;
(function () {
  const info = document.getElementById('liveinfo');
  const say = t => { info.textContent = t; };

  function parseId(s) {
    s = s.trim();
    const m = s.match(/lichess\.org\/(?:embed\/)?([A-Za-z0-9]{8})/i) || s.match(/^([A-Za-z0-9]{8})(?:[A-Za-z0-9]{4})?$/);
    return m ? m[1] : null;
  }

  function sync(d, sans) {
    if (d.initialFen && d.initialFen !== 'startpos') g.load(d.initialFen); else g.reset();
    for (const san of sans) {
      if (!g.move(san, { sloppy: true })) { say('Could not apply move ' + san); break; }
    }
    const h = g.history({ verbose: true });
    lastMove = h[h.length - 1] || null;
    sel = null;
    liveCount = sans.length;
    refresh();
    if (lastMove) {
      const mine = lastMove.color === document.getElementById('side').value;
      say((mine ? 'You' : 'Enemy') + ' played ' + lastMove.san + '.');
    }
  }

  async function poll() {
    if (!liveOn) return;
    try {
      const url = 'https://lichess.org/game/export/' + liveId + '?moves=true&clocks=false&evals=false&opening=false';
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      if (d.variant && d.variant !== 'standard') { say('Only standard chess is supported (this game is ' + d.variant + ').'); stop(); return; }
      const sans = (d.moves || '').split(' ').filter(Boolean);
      if (sans.length !== liveCount) sync(d, sans);
      if (d.status && d.status !== 'started' && d.status !== 'created') {
        say('Game ended: ' + d.status + (d.winner ? ', ' + d.winner + ' won' : '') + '.');
        stop(); return;
      }
    } catch (e) {
      say('Live error: ' + e.message);
    }
    if (liveOn) liveTimer = setTimeout(poll, 2000);
  }

  function stop() {
    liveOn = false;
    clearTimeout(liveTimer);
  }

  document.getElementById('golive').onclick = () => {
    const id = parseId(document.getElementById('liveurl').value);
    if (!id) { say('Paste a Lichess game link.'); return; }
    stop();
    liveId = id; liveCount = -1; liveOn = true;
    say('Connecting to ' + id + '...');
    poll();
  };
  document.getElementById('stoplive').onclick = () => { stop(); say('Live sync stopped.'); };
})();
