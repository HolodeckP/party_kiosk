#!/usr/bin/env python3
"""Tiny web server for the Haunted Wall kiosk.

Serves the show itself (index.html and friends), an upload page for phones, and a small API:
  GET  /api/photos        -> {"photos": [...names...], "messages": [...]}
  POST /api/upload        -> body is a raw JPEG/PNG/WebP; saved under photos/
  POST /api/message       -> {"message": "..."}; added to the glitch-text scene
Standard library only, so nothing needs installing on the Pi.
"""
import http.server, json, os, random, re, sys, threading, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(ROOT, 'photos')
MSGFILE = os.path.join(PHOTOS, 'messages.json')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
MAX_BYTES = 25 * 1024 * 1024
IMAGE_EXT = ('.jpg', '.jpeg', '.png', '.webp')

# Current scene/scare on the leader screen, for mirrored mode (in memory only).
SHOW_STATE = {}
SCARE_LOG = {}

# What's playing on the Sonos plus the creepy lines music.py made for it. In memory only:
# these belong to the current track, so a restart simply clears them until the next song.
MUSIC = {'title': '', 'artist': '', 'lines': [], 'questions': [], 'clock': [], 'at': 0}
os.makedirs(PHOTOS, exist_ok=True)


def sniff(b):
    if b[:3] == b'\xff\xd8\xff': return '.jpg'
    if b[:8] == b'\x89PNG\r\n\x1a\n': return '.png'
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP': return '.webp'
    return None


# Guest messages are stored with the time they were posted, so they expire on the server.
# Expiring here (not in the browser) means a Pi reboot doesn't restart every message's clock.
# On disk: [{"m": "TEXT", "at": 1699999999.0}, ...]. Older files holding plain strings are
# read as "posted now", so an upgrade doesn't throw away what's already there.
MESSAGE_TTL_SECONDS = 10 * 60
MESSAGE_MAX = 10

def _read_conf():
    """music.conf as a dict, so the whole show is configured in one file."""
    conf = {}
    try:
        with open(os.path.join(ROOT, 'music.conf')) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    conf[k.strip()] = v.strip()
    except OSError:
        pass
    return conf


# Key for the admin page (remove unwanted photos/messages mid-party).
# Set ADMIN_KEY=yourkey in music.conf, then open http://<pi>:8080/admin?key=yourkey
# on a phone. Change it there if the kids find it.
ADMIN_KEY = _read_conf().get('ADMIN_KEY', 'changeme')

# --- "Ask the spirits": guests type a question on the upload page, the wall's Ouija board
# answers it. Answers come from the local Ollama when it is awake, else from a seance list.
OUIJA_QA = []          # [{'q','a','id','at'}], newest last; served while younger than 3 min
OUIJA_LOCK = threading.Lock()
OUIJA_SEQ = [0]
OUIJA_FALLBACK = [
    'YES', 'NO', 'NEVER', 'SOON', 'PERHAPS', 'NOT TONIGHT', 'ASK AGAIN',
    'BEHIND YOU', 'DO NOT ASK', 'THE DEAD KNOW', 'BEWARE', 'IT WATCHES',
    'ONLY IF YOU RUN', 'TOO LATE', 'IT IS DECIDED', 'WE SHALL SEE',
]


def _local_subnet():
    import socket as _sk
    try:
        k = _sk.socket(_sk.AF_INET, _sk.SOCK_DGRAM)
        k.connect(('8.8.8.8', 80)); ip = k.getsockname()[0]; k.close()
        return ip.rsplit('.', 1)[0]
    except OSError:
        return None


OLLAMA_FOUND = {'url': '', 'at': 0}


def _find_ollama():
    """Scan the /24 for an Ollama port. Python often cannot resolve .local names
    (getaddrinfo has no mDNS), and DHCP moves the Mac, so the address is hunted down."""
    import socket as _sk
    net = _local_subnet()
    if not net:
        return ''
    hits = []
    lock = threading.Lock()
    def probe(ip):
        try:
            c = _sk.create_connection((ip, 11434), timeout=0.4); c.close()
            with lock: hits.append(ip)
        except OSError:
            pass
    th = [threading.Thread(target=probe, args=('%s.%d' % (net, i),)) for i in range(2, 255)]
    for t in th: t.start()
    for t in th: t.join()
    return 'http://%s:11434' % hits[0] if hits else ''


def _ollama_conf():
    """OLLAMA_URL / OLLAMA_MODEL from music.conf, so there is one place to configure it."""
    conf = _read_conf()
    return conf.get('OLLAMA_URL', ''), conf.get('OLLAMA_MODEL', 'llama3.2:3b')


def _clean_answer(text):
    text = re.sub(r'[^A-Z0-9 ]', '', str(text).upper().replace('\n', ' '))
    text = re.sub(r' +', ' ', text).strip()
    words = text.split(' ')
    if not text or len(words) > 6 or len(text) > 30:
        return None
    return text


def _ask_model(url, model, prompt):
    req = urllib.request.Request(
        url.rstrip('/') + '/api/generate',
        data=json.dumps({'model': model, 'prompt': prompt, 'stream': False,
                         'options': {'temperature': 0.9, 'num_predict': 24}}).encode(),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=8) as r:
        return _clean_answer(json.loads(r.read().decode())['response'])


def _answer(question):
    url, model = _ollama_conf()
    if url:
        prompt = (
            'A guest at a Halloween seance asks the spirit board: "%s"\n'
            'Reply as the spirit with ONE short cryptic answer of 1 to 4 words that fits the '
            'question. Spooky and playful, PG-13, no profanity. Plain answers like YES, NO, '
            'NEVER, SOON are good when they fit. Reply with only the answer, in capitals.'
            % question
        )
        for candidate in [OLLAMA_FOUND['url'] or url, url]:
            try:
                ans = _ask_model(candidate, model, prompt)
                if ans:
                    return ans
                break                      # model answered but unusably: no point retrying
            except Exception:
                continue
        # Configured address dead (name didn't resolve, or DHCP moved the Mac): hunt it down,
        # at most once every 2 minutes.
        if time.time() - OLLAMA_FOUND['at'] > 120:
            OLLAMA_FOUND['at'] = time.time()
            found = _find_ollama()
            if found:
                OLLAMA_FOUND['url'] = found
                try:
                    ans = _ask_model(found, model, prompt)
                    if ans:
                        return ans
                except Exception:
                    pass
    return random.choice(OUIJA_FALLBACK)


def ouija_ask(question):
    """Answer in a background thread so the phone gets an instant reply."""
    def work():
        ans = _answer(question)
        with OUIJA_LOCK:
            OUIJA_SEQ[0] += 1
            OUIJA_QA.append({'q': question, 'a': ans, 'id': OUIJA_SEQ[0], 'at': time.time()})
            del OUIJA_QA[:-10]
    threading.Thread(target=work, daemon=True).start()


def ouija_live():
    cutoff = time.time() - 180
    with OUIJA_LOCK:
        return [{'q': e['q'], 'a': e['a'], 'id': e['id']} for e in OUIJA_QA if e['at'] > cutoff]


def _read_raw():
    try:
        with open(MSGFILE) as f:
            data = json.load(f)
    except Exception:
        return []
    out, now = [], time.time()
    for item in data if isinstance(data, list) else []:
        if isinstance(item, str):
            out.append({'m': item, 'at': now})
        elif isinstance(item, dict) and isinstance(item.get('m'), str):
            try:
                out.append({'m': item['m'], 'at': float(item.get('at', now))})
            except (TypeError, ValueError):
                out.append({'m': item['m'], 'at': now})
    return out


def _live(entries):
    cutoff = time.time() - MESSAGE_TTL_SECONDS
    kept = [e for e in entries if e['at'] > cutoff]
    return kept[-MESSAGE_MAX:]


def load_msgs():
    """Messages still within their lifetime, newest last. Prunes the file as a side effect."""
    entries = _read_raw()
    kept = _live(entries)
    if len(kept) != len(entries):
        save_entries(kept)
    return [e['m'] for e in kept]


def save_entries(entries):
    os.makedirs(PHOTOS, exist_ok=True)
    with open(MSGFILE, 'w') as f:
        json.dump(entries, f)


def add_msg(text):
    entries = _live(_read_raw())
    entries = [e for e in entries if e['m'] != text]   # re-posting refreshes rather than duplicates
    entries.append({'m': text, 'at': time.time()})
    entries = entries[-MESSAGE_MAX:]
    save_entries(entries)
    return [e['m'] for e in entries]


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        # self.path is absent on malformed/aborted requests; guard so logging never raises.
        p = getattr(self, 'path', '') or ''
        if p.startswith('/api/upload') or p.startswith('/api/message'):
            sys.stderr.write('%s %s\n' % (time.strftime('%H:%M:%S'), fmt % args))

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == '/api/photos':
            os.makedirs(PHOTOS, exist_ok=True)
            photos = sorted(f for f in os.listdir(PHOTOS) if f.lower().endswith(IMAGE_EXT))
            return self.send_json({'photos': photos, 'messages': load_msgs(), 'ouija': ouija_live()})
        if path == '/api/state':
            # Mirrored mode: the leader screen POSTs what it is showing; followers GET it.
            # Kept in memory only, so a restart simply means followers re-sync on the next change.
            return self.send_json(SHOW_STATE)
        if path == '/api/music':
            return self.send_json(MUSIC)
        if path == '/api/scarelog':
            # Which scares have actually fired on each screen, reported by the browser.
            return self.send_json(SCARE_LOG)
        if path == '/admin':
            self.path = '/admin.html'
        elif path in ('/', '/upload'):
            self.path = '/upload.html'
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        n = int(self.headers.get('Content-Length') or 0)
        if n > MAX_BYTES:
            return self.send_json({'error': 'file too large'}, 413)
        body = self.rfile.read(n)
        if path == '/api/upload':
            ext = sniff(body)
            if not ext:
                return self.send_json({'error': 'not a JPEG, PNG or WebP image'}, 400)
            name = time.strftime('%Y%m%d-%H%M%S') + '-%03d' % (int(time.time() * 1000) % 1000) + ext
            os.makedirs(PHOTOS, exist_ok=True)
            with open(os.path.join(PHOTOS, name), 'wb') as f:
                f.write(body)
            return self.send_json({'ok': True, 'name': name})
        if path == '/api/state':
            try:
                st = json.loads(body.decode('utf-8'))
                if not isinstance(st, dict):
                    raise ValueError
            except Exception:
                return self.send_json({'error': 'bad request'}, 400)
            SHOW_STATE.clear()
            # only keep the fields followers use, so a stray POST can't bloat this
            for k in ('scene', 'sceneSeed', 'scare', 'scareSeed', 'n'):
                if k in st:
                    SHOW_STATE[k] = st[k]
            SHOW_STATE['at'] = time.time()
            return self.send_json({'ok': True})
        if path == '/api/ouija':
            try:
                q = json.loads(body.decode('utf-8'))['question']
            except Exception:
                return self.send_json({'error': 'bad request'}, 400)
            q = re.sub(r'\s+', ' ', str(q)).strip().upper()[:80]
            q = re.sub(r'[^A-Z0-9 ?.,!\'-]', '', q)
            if not q:
                return self.send_json({'error': 'empty'}, 400)
            ouija_ask(q)
            return self.send_json({'ok': True})
        if path == '/api/admin':
            # One endpoint, three actions: delete a photo, delete a message, clear messages.
            try:
                d = json.loads(body.decode('utf-8'))
                if not isinstance(d, dict) or d.get('key') != ADMIN_KEY:
                    return self.send_json({'error': 'wrong key'}, 403)
            except Exception:
                return self.send_json({'error': 'bad request'}, 400)
            act = d.get('action')
            if act == 'delphoto':
                name = os.path.basename(str(d.get('name', '')))
                target = os.path.join(PHOTOS, name)
                if name.lower().endswith(IMAGE_EXT) and os.path.isfile(target):
                    os.remove(target)
                    return self.send_json({'ok': True})
                return self.send_json({'error': 'no such photo'}, 404)
            if act == 'delmsg':
                m = str(d.get('m', ''))
                entries = [e for e in _read_raw() if e['m'] != m]
                save_entries(entries)
                return self.send_json({'ok': True})
            if act == 'clearmsgs':
                save_entries([])
                return self.send_json({'ok': True})
            return self.send_json({'error': 'unknown action'}, 400)
        if path == '/api/scarelog':
            try:
                d = json.loads(body.decode('utf-8'))
                log = d.get('log') if isinstance(d, dict) else None
                if not isinstance(log, dict):
                    raise ValueError
            except Exception:
                return self.send_json({'error': 'bad request'}, 400)
            # cap the keys so a stray POST can't grow this without bound
            SCARE_LOG.clear()
            for k in list(log)[:64]:
                v = log[k]
                if isinstance(v, dict):
                    SCARE_LOG[str(k)[:40]] = {'n': v.get('n'), 'first': v.get('first'), 'last': v.get('last')}
            SCARE_LOG['at'] = time.time()
            return self.send_json({'ok': True})
        if path == '/api/music':
            # music.py posts the current track and its generated lines; empty lines clears it.
            try:
                d = json.loads(body.decode('utf-8'))
                if not isinstance(d, dict):
                    raise ValueError
            except Exception:
                return self.send_json({'error': 'bad request'}, 400)
            clip = lambda key, cap: [str(x)[:60] for x in (d.get(key) or [])][:cap]
            lines, questions, clock = clip('lines', 12), clip('questions', 8), clip('clock', 8)
            MUSIC.update({'title': str(d.get('title', ''))[:120],
                          'artist': str(d.get('artist', ''))[:120],
                          'lines': lines, 'questions': questions, 'clock': clock,
                          'at': time.time()})
            return self.send_json({'ok': True, 'lines': len(lines),
                                   'questions': len(questions), 'clock': len(clock)})
        if path == '/api/message':
            try:
                msg = json.loads(body.decode('utf-8'))['message']
            except Exception:
                return self.send_json({'error': 'bad request'}, 400)
            msg = re.sub(r'\s+', ' ', str(msg)).strip().upper()[:60]
            if not msg:
                return self.send_json({'error': 'empty'}, 400)
            msgs = add_msg(msg)
            return self.send_json({'ok': True, 'messages': msgs})
        return self.send_json({'error': 'not found'}, 404)


if __name__ == '__main__':
    srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print('Haunted Wall server on port %d, photos in %s' % (PORT, PHOTOS), flush=True)
    srv.serve_forever()
