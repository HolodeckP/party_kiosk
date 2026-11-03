'use strict';
// Bootstrap: load fonts, build the show, wire keyboard/URL controls, photo uploads and wake lock.

class PhotoManager {
  constructor(show) {
    this.show = show; this.photos = new Map(); this.uses = {};
    try { this.uses = JSON.parse(localStorage.getItem('hw-photo-uses') || '{}'); } catch (e) {}
    this.knownMessages = new Set(CONFIG.MESSAGES);
    this.stockMessages = new Set(CONFIG.MESSAGES);  // the built-in spooky lines: never expire
    // Guest-posted lines live in a buffer: at most MESSAGE_BUFFER_MAX of them, each replaying
    // freely until MESSAGE_TTL_MINUTES after it was posted, then dropped. posted = [{m, at}].
    this.posted = [];
    this.ouijaDone = new Set();
    try { this.ouijaDone = new Set(JSON.parse(localStorage.getItem('hw-ouija-done') || '[]')); } catch (e) {}
    window.addEventListener('ouija-done', (e) => { this.ouijaDone.add(e.detail); try { localStorage.setItem('hw-ouija-done', JSON.stringify([...this.ouijaDone])); } catch (err) {} });
    this.firstPoll = true;
    // Lines about whatever is playing on the Sonos (see music.py). They belong to the current
    // track: shown a few times while it plays, then replaced when the song changes.
    this.musicTrack = ''; this.musicLines = []; this.musicQuestions = []; this.musicClock = [];
    this.musicPool = []; this.musicShown = 0;
    window.messageWall = this;
    this.poll(); setInterval(() => this.poll(), CONFIG.PHOTO_POLL_MS || 2000);
    this.pollMusic(); setInterval(() => this.pollMusic(), 5000);
  }
  async poll() {
    if (location.protocol === 'file:') return;
    try {
      const r = await fetch('/api/photos?ts=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      const listed = new Set(data.photos || []);
      // A photo the server no longer lists was deleted (admin page): drop it from the
      // rotation too. A scare already running with it simply finishes its few seconds.
      for (const name of [...this.photos.keys()]) if (!listed.has(name)) this.photos.delete(name);
      for (const name of data.photos || []) {
        if (this.photos.has(name)) continue;
        // Photos already on the server when the browser starts are OLD: they rejoin the
        // cycle quietly. Only a photo that appears later is a fresh upload worth jumping on.
        // (The flag must be captured here: by the time the image finishes loading,
        // firstPoll is false even for startup photos.)
        const p = { name, img: new Image(), ready: false, initial: this.firstPoll };
        p.img.onload = () => { p.ready = true; this.onNew(p); };
        p.img.src = '/photos/' + encodeURIComponent(name) + '?v=1';
        this.photos.set(name, p);
      }
      // The server owns message lifetime now (it stores the real post time, so a Pi reboot
      // doesn't restart every clock). We simply mirror whatever it still lists as live.
      const serverMsgs = data.messages || [];
      const fresh = [];
      const now = Date.now();
      for (const m of serverMsgs) if (!this.knownMessages.has(m)) {
        this.knownMessages.add(m);
        this.posted.push({ m, at: now });
        fresh.push(m);
      }
      // Anything the server has dropped is expired: take it out of the show too.
      const liveOnServer = new Set(serverMsgs);
      if (this.posted.some(p => !liveOnServer.has(p.m))) {
        this.posted = this.posted.filter(p => liveOnServer.has(p.m));
        for (const m of [...this.knownMessages]) {
          if (!liveOnServer.has(m) && !this.stockMessages.has(m)) this.knownMessages.delete(m);
        }
      }
      this.pruneExpired();          // local safety net: trims to the cap, drops stale entries
      if (CONFIG.OUIJA_POSTED) {
        for (const m of fresh) if (!this.ouijaDone.has(m)) CONFIG.OUIJA_QUEUE.push(m);
        // a message posted during the party: cut to the board so the sender sees it spelled out
        if (!this.firstPoll && fresh.length) this.show.queueScene('ouija', true);
      }
      // "Ask the spirits": new answered questions cut the show to the Ouija board.
      for (const qa of data.ouija || []) {
        if (qa.id > (this.lastOuijaId || 0)) {
          this.lastOuijaId = qa.id;
          CONFIG.OUIJA_QA.push({ q: qa.q, a: qa.a });
          this.show.queueScene('ouija', true);
        }
      }
      this.firstPoll = false;
    } catch (e) { /* server not running: photo feature simply stays off */ }
  }
  // --- music-aware lines ---
  async pollMusic() {
    if (location.protocol === 'file:') return;
    try {
      const r = await fetch('/api/music?ts=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const m = await r.json();
      const track = (m && m.title) ? m.title + '|' + (m.artist || '') : '';
      if (track !== this.musicTrack) {
        this.musicTrack = track;
        this.musicLines = (m && m.lines) ? m.lines.slice() : [];
        this.musicQuestions = (m && m.questions) ? m.questions.slice() : [];
        this.musicClock = (m && m.clock) ? m.clock.slice() : [];
        // Statements and questions together form this song's pool, shuffled so the wall
        // doesn't work through them in a predictable order.
        this.musicPool = shuffle(this.musicLines.concat(this.musicQuestions));
        this.musicShown = 0;
        // The song just changed: say something about it straight away, so the wall visibly
        // reacts to the new track rather than mentioning it a while later.
        this.musicNextAt = 0;
        this.musicAnnounce = true;
        if (this.musicPool.length && CONFIG.MUSIC_ANNOUNCE) {
          // Announce the new track: black screen, the line fades up soaked in blood, then
          // it drips. Flagged rather than fired once, because the cut is refused while a
          // scare or a transition is running; tryAnnounce() keeps trying until it lands.
          const line = this.takeMusicLine();
          if (line) { this.pendingAnnounce = line; this.tryAnnounce(); }
        }
      }
      this.firstMusicPoll = false;
    } catch (e) { /* no server: music feature simply stays off */ }
  }
  // The show asks for a song-aware line when it is time for one; null means "nothing to say".
  // While a song is playing most lines come from its pool, with the short menacing classics
  // still cutting in now and then so the wall never sounds like it only talks about music.
  takeMusicLine() {
    if (!this.musicPool.length) return null;
    if (this.show.time < (this.musicNextAt || 0)) return null;
    // The first line after a track change is guaranteed to be about the new song.
    if (this.musicAnnounce) {
      this.musicAnnounce = false;
      const line = this.musicPool[this.musicShown % this.musicPool.length];
      this.musicShown++;
      this.musicNextAt = this.show.time + rand(CONFIG.MUSIC_GAP_SECONDS[0], CONFIG.MUSIC_GAP_SECONDS[1]);
      return line;
    }
    if (Math.random() < CONFIG.MUSIC_LINE_SHARE) {
      const line = this.musicPool[this.musicShown % this.musicPool.length];
      this.musicShown++;
      this.musicNextAt = this.show.time + rand(CONFIG.MUSIC_GAP_SECONDS[0], CONFIG.MUSIC_GAP_SECONDS[1]);
      return line;
    }
    // let a stock menacing line through this time
    this.musicNextAt = this.show.time + rand(CONFIG.MUSIC_GAP_SECONDS[0], CONFIG.MUSIC_GAP_SECONDS[1]) * 0.5;
    return null;
  }
  // Cut to the blood-soaked announcement as soon as the show will allow it. A cut is refused
  // mid-scare and mid-transition, so this is retried every second until it takes (or the
  // track changes again, which simply replaces the pending line).
  tryAnnounce() {
    if (!this.pendingAnnounce) return;
    const s = this.show;
    const busy = s.scare || (s.transition && s.transition.state !== 'run');
    if (!busy && s.sceneName !== 'announce') {
      s.announceText = this.pendingAnnounce;
      this.pendingAnnounce = null;
      s.queueScene('announce', true);
      return;
    }
    clearTimeout(this._annTimer);
    this._annTimer = setTimeout(() => this.tryAnnounce(), 1000);
  }
  // Caption for the clock scene. The model usually returns only one or two usable captions,
  // so use them some of the time and let the scene's own list cover the rest; otherwise
  // every clock in the night would read the same.
  takeClockLine() {
    if (!this.musicClock.length) return null;
    if (Math.random() > 0.4) return null;      // most strikes use the stock list
    return pick(this.musicClock);
  }

  count(p) { return this.uses[p.name] || 0; }
  // Upload time is baked into the server's filename (YYYYmmdd-HHMMSS-mmm.ext), so
  // freshness survives reboots and needs no extra bookkeeping.
  photoTime(p) {
    const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/.exec(p.name);
    return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : 0;
  }
  isFresh(p) { return Date.now() - this.photoTime(p) < (CONFIG.PHOTO_FRESH_MINUTES || 10) * 60000; }
  // A photo still in its fresh window takes every other scare slot: visible boost for the
  // first PHOTO_FRESH_MINUTES, then it drops into the regular bag rotation automatically.
  freshBoost() {
    const fresh = this.available().filter(p => this.isFresh(p));
    if (!fresh.length) { this._boostedLast = false; return null; }
    if (this._boostedLast) { this._boostedLast = false; return null; }
    this._boostedLast = true;
    const least = Math.min(...fresh.map(q => this.count(q)));
    const p = pick(fresh.filter(q => this.count(q) === least));
    this.uses[p.name] = this.count(p) + 1;
    try { localStorage.setItem('hw-photo-uses', JSON.stringify(this.uses)); } catch (e) {}
    return new PhotoScare(this.show, p.img);
  }
  // Every shared photo stays in the cycle for the whole night (Paul: no caps - shared means in).
  available() { return [...this.photos.values()].filter(p => p.ready); }
  fresh() { return this.available().filter(p => this.count(p) === 0); }

  // --- guest-posted message buffer (stock lines never expire) ---
  // A posted message stays live until MESSAGE_TTL_MINUTES after it was posted; the buffer
  // holds at most MESSAGE_BUFFER_MAX, oldest dropped first. Messages replay freely while live.
  postedSet() { return new Set(this.posted.map(p => p.m)); }
  // The list a text scene should draw from: all stock lines plus still-live posted lines.
  liveMessages() { this.pruneExpired(); return CONFIG.MESSAGES.concat(this.posted.map(p => p.m)); }
  markShown(m) { /* no-op now: posted messages expire by time, not by view count */ }
  // Drop expired posted messages and trim to the cap; sync the Ouija queue.
  pruneExpired() {
    const ttl = (CONFIG.MESSAGE_TTL_MINUTES || 10) * 60000;
    const now = Date.now();
    const before = this.posted.length;
    this.posted = this.posted.filter(p => now - p.at < ttl);
    const cap = CONFIG.MESSAGE_BUFFER_MAX || 10;
    if (this.posted.length > cap) this.posted = this.posted.slice(this.posted.length - cap);
    // keep the Ouija queue free of anything no longer live
    const live = new Set(this.posted.map(p => p.m));
    for (let i = CONFIG.OUIJA_QUEUE.length - 1; i >= 0; i--) if (!live.has(CONFIG.OUIJA_QUEUE[i])) CONFIG.OUIJA_QUEUE.splice(i, 1);
  }
  onNew(p) {
    if (p.initial) return;   // was already there at startup: cycle member, not breaking news
    // A guest who just uploaded must see their photo almost immediately, or they assume it
    // failed. Fire it now, ahead of the scare schedule and ahead of the photo share cap;
    // afterwards it joins the normal rotation like any other photo.
    this.urgentPhoto = p;
    this.showUrgentPhoto();
  }
  // Put the just-uploaded photo on screen as soon as the show will allow it. A scare that is
  // already running is left to finish (a second or two), then this takes over.
  showUrgentPhoto() {
    const p = this.urgentPhoto;
    if (!p) return;
    const s = this.show;
    if (!p.ready || s.scare) { clearTimeout(this._urgT); this._urgT = setTimeout(() => this.showUrgentPhoto(), 400); return; }
    this.urgentPhoto = null;
    this.uses[p.name] = this.count(p) + 1;
    try { localStorage.setItem('hw-photo-uses', JSON.stringify(this.uses)); } catch (e) {}
    s.scare = new PhotoScare(s, p.img);
    s.scareName = 'photo';
    if (CONFIG.MIRROR_MODE === 'leader') s.publishState();
    s.scheduleScare();          // and resume the normal gap afterwards
  }
  // Called by the show whenever a scare slot comes up. Returns a PhotoScare or null.
  pickScare() {
    // This slot in the scare bag belongs to a photo, so always serve one. Least-shown
    // first, so every photo keeps taking even turns all night.
    const pool = this.available();
    if (!pool.length) return null;
    const least = Math.min(...pool.map(q => this.count(q)));
    const p = pick(pool.filter(q => this.count(q) === least));
    this.uses[p.name] = this.count(p) + 1;
    try { localStorage.setItem('hw-photo-uses', JSON.stringify(this.uses)); } catch (e) {}
    return new PhotoScare(this.show, p.img);
  }
}

(async function main() {
  try { await Promise.all(['Creepster', 'Nosifer', 'Eater'].map(f => document.fonts.load(`40px ${f}`))); } catch (e) {}
  const canvas = document.getElementById('c');
  const show = new Show(canvas);
  registerScenes(show); registerScenes3(show); registerScenes4(show); registerScares(show);
  const q = new URLSearchParams(location.search);
  if (q.get('scene')) show.forcedScene = q.get('scene');
  if (q.get('noscares')) CONFIG.SCARES = false;
  // Mirrored screens: ?mirror=follower copies the leader, ?mirror=leader publishes its state.
  const mirror = q.get('mirror');
  if (mirror === 'leader' || mirror === 'follower') CONFIG.MIRROR_MODE = mirror;
  const photos = new PhotoManager(show);
  show.scareHook = () => photos.pickScare();
  show.freshPhotoHook = () => photos.freshBoost();
  show.photoCount = () => photos.available().length;   // photos are entries in the scare cycle
  show.photoPick = () => { const a = photos.available(); return a.length ? pick(a).img : null; };
  show.start();
  if (CONFIG.MIRROR_MODE === 'follower') {
    // Poll the leader's state often enough that scene changes and scares land together.
    let lastN = -1;
    const syncLoop = async () => {
      try {
        const r = await fetch('/api/state?ts=' + Date.now(), { cache: 'no-store' });
        if (r.ok) {
          const s = await r.json();
          if (s && s.n !== lastN) { lastN = s.n; show.applyState(s); }
        }
      } catch (e) { /* leader not reachable: keep showing the current scene */ }
    };
    setInterval(syncLoop, 400);
    syncLoop();
  }
  if (q.get('scare')) setTimeout(() => show.startScare(q.get('scare')), parseFloat(q.get('after') || 2.5) * 1000);
  window.show = show; window.photos = photos;

  // Report which scares have fired to the server, so the log is readable over the network
  // (GET /api/state returns it) without needing a browser console on the Pi.
  setInterval(() => {
    try {
      fetch('/api/scarelog', { method: 'POST', cache: 'no-store',
        body: JSON.stringify({ host: location.search, log: show.scareLog() }) }).catch(() => {});
    } catch (e) {}
  }, 15000);

  const hint = document.getElementById('hint'); let hintTimer = 0;
  const showHint = (txt) => { hint.textContent = txt; hint.classList.add('show'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.remove('show'), 2500); };
  window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
      case 'n': show.nextScene(); showHint('next scene'); break;
      case 's': show.startScare(); showHint('scare'); break;
      case 'p': { const s = photos.pickScare(); if (s) show.scare = s; showHint(s ? 'photo scare' : 'no photos available'); break; }
      case 'f': if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); break;
      case 'r': location.reload(); break;
      case 'h': showHint(`scene: ${show.sceneName}  fps: ${show.fps.toFixed(0)}  scale: ${show.scale.toFixed(2)}  photos: ${photos.available().length} available`); break;
    }
  });

  // Keep the display awake (Chromium honours this on Wayland via idle-inhibit).
  const lock = async () => { try { if (navigator.wakeLock) await navigator.wakeLock.request('screen'); } catch (e) {} };
  lock(); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') lock(); });
})();
