#!/usr/bin/env python3
"""Watch a Sonos speaker and feed the wall creepy lines about whatever is playing.

Polls the speaker's local API for the current track (no Sonos account or cloud needed),
and when the track changes asks a local Ollama server for a few sinister one-liners that
play on the title. The lines are handed to the show through /api/music, which keeps them
separate from guest messages so they come and go with the song.

If Ollama is unreachable or slow, templates are used instead, so the wall never goes quiet.

Settings live in music.conf next to this file (see DEFAULTS); run with --once to test.
"""
import html
import json
import os
import re
import sys
import time
import socket
import threading
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CONF = os.path.join(HERE, 'music.conf')

DEFAULTS = {
    'SONOS_IP': '',             # e.g. 192.168.1.50; rediscovered by room if it moves
    'SONOS_ROOM': 'Den',        # Sonos room to re-find when SONOS_IP stops answering (DHCP moved it)
    'OLLAMA_URL': '',           # e.g. http://192.168.1.20:11434  (blank = templates only)
    'OLLAMA_MODEL': 'llama3.2:3b',
    'SHOW_URL': 'http://localhost:8080',
    'POLL_SECONDS': '5',
    'LINES_PER_TRACK': '8',     # statements about the song; these become the wall's message pool
    'QUESTIONS_PER_TRACK': '4', # questions the wall asks the room about the song
    'CLOCK_LINES': '4',         # captions for the clock scene when it strikes
}

# Used when there is no LLM, or it fails. {t} = title, {a} = artist.
TEMPLATES = [
    'WE KNOW WHAT YOU ARE PLAYING',
    'SOMEONE HERE REQUESTED {t}',
    '{t}. HOW APPROPRIATE.',
    '{a} CANNOT HELP YOU NOW',
    'THIS SONG WAS PLAYING WHEN IT HAPPENED',
    'TURN IT UP. THEY LIKE IT.',
    'WE HAVE HEARD {t} BEFORE',
    'KEEP DANCING',
]

PROMPT = (
    "A haunted wall at a Halloween party speaks to the guests.\n"
    "It can hear the song they are playing right now: \"{title}\" by {artist}.\n"
    "Write {n} short lines it says, making clear it knows exactly what is playing.\n"
    "\n"
    "Rules:\n"
    "- MOST LINES MUST CONTAIN THE SONG TITLE, or the most recognisable words from it.\n"
    "  A guest must instantly know the wall means THIS song.\n"
    "- 4 to 8 words. UPPERCASE. Plain, everyday words only.\n"
    "- Say something ABOUT the song: who put it on, what it means that they are playing it,\n"
    "  or what the wall will do about it. Be direct, not poetic.\n"
    "- Never write vague imagery like HEARTBEATS ARE MY PULSE or SHADOWS OF ETERNITY.\n"
    "- Creepy or darkly funny. Nothing gory. No real people. No lyrics. No quotes or numbering.\n"
    "- One line per row, nothing else.\n"
    "\n"
    "Examples for \"Thriller\" by Michael Jackson:\n"
    "SOMEONE HERE CHOSE THRILLER\n"
    "THRILLER WILL NOT SAVE YOU\n"
    "WE HAVE HEARD THRILLER BEFORE\n"
    "\n"
    "Examples for \"Ghostbusters\" by Ray Parker Jr:\n"
    "NO ONE IS COMING TO BUST US\n"
    "GHOSTBUSTERS CANNOT HELP YOU TONIGHT\n"
    "WHO YOU GONNA CALL? NO ONE.\n"
)

# Questions the wall asks the room about whatever is playing. Funny-creepy, not just creepy.
QUESTION_PROMPT = (
    "A haunted wall at a Halloween party teases the guests about their music.\n"
    "Right now they are playing \"{title}\" by {artist}.\n"
    "Write {n} short questions the wall asks the room about THIS song.\n"
    "\n"
    "Rules:\n"
    "- MOST QUESTIONS MUST NAME THE SONG TITLE or its most recognisable words.\n"
    "- 4 to 8 words, ending in a question mark. UPPERCASE. Plain, everyday words.\n"
    "- Funny and a bit sinister: judge their taste, ask who chose it, ask what they expect.\n"
    "- Never vague or poetic. A guest must know which song is meant.\n"
    "- Nothing gory, no real people, no lyrics, no emoji, no numbering.\n"
    "- One question per row, nothing else.\n"
    "\n"
    "Examples for \"Monster Mash\":\n"
    "WHO PUT ON MONSTER MASH?\n"
    "IS MONSTER MASH YOUR FINAL CHOICE?\n"
    "SHALL WE PLAY THIS FOREVER?\n"
    "\n"
    "Examples for \"Smooth Criminal\":\n"
    "ARE YOU OK? ARE YOU REALLY?\n"
    "WHO IS THE SMOOTH CRIMINAL HERE?\n"
)

# Captions stamped on the clock face when it strikes a random hour.
CLOCK_PROMPT = (
    "Write {n} short creepy captions for a haunted clock striking {hour} o'clock.\n"
    "\n"
    "Rules:\n"
    "- 1 to 4 words each. UPPERCASE. Ominous and final.\n"
    "- About time running out, the hour arriving, or something waking.\n"
    "- Do not always say MIDNIGHT. No quotes, emoji or numbering.\n"
    "- One caption per row, nothing else.\n"
    "\n"
    "Good examples:\n"
    "THE HOUR HAS COME\n"
    "TOO LATE\n"
    "IT IS AWAKE\n"
)

BANNED = re.compile(
    r'\b(kill|rape|suicide|die bitch|nazi|slur)\b', re.I
)

# Things the model sometimes emits that aren't usable on a wall: dates, meta-commentary,
# and anything that reads like it is talking about the task rather than to the guests.
JUNK = re.compile(
    r'^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\b'
    r'|^(HERE ARE|SURE|OKAY|CAPTION|LINE|QUESTION|EXAMPLE)\b'
    r'|\bSONG TITLE\b|\bHALLOWEEN PARTY\b',
    re.I
)


def load_conf():
    cfg = dict(DEFAULTS)
    try:
        with open(CONF) as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, v = line.split('=', 1)
                cfg[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return cfg


def local_subnet():
    """The /24 this machine sits on, learned from the route to a public address (no traffic sent)."""
    try:
        sk = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sk.connect(('8.8.8.8', 80))
        ip = sk.getsockname()[0]
        sk.close()
        return ip.rsplit('.', 1)[0]
    except OSError:
        return None


def sonos_room_name(ip, timeout=2):
    """The Sonos room name at ip, or None if it is not a Sonos."""
    try:
        with urllib.request.urlopen('http://%s:1400/xml/device_description.xml' % ip, timeout=timeout) as r:
            m = re.search(r'<roomName>([^<]*)</roomName>', r.read().decode('utf-8', 'replace'))
            return html.unescape(m.group(1)).strip() if m else None
    except Exception:
        return None


def find_sonos(room):
    """Scan the local /24 for port 1400 and return the IP whose Sonos room matches `room`.

    Needed because a router reboot can hand every speaker a new DHCP lease, which
    silently kills the music watcher if it only knows a fixed IP."""
    net = local_subnet()
    if not net:
        return None
    hits = []
    lock = threading.Lock()

    def probe(ip):
        try:
            sk = socket.create_connection((ip, 1400), timeout=0.4)
            sk.close()
        except OSError:
            return
        name = sonos_room_name(ip)
        if name:
            with lock:
                hits.append((name, ip))

    threads = [threading.Thread(target=probe, args=('%s.%d' % (net, i),)) for i in range(2, 255)]
    for t in threads: t.start()
    for t in threads: t.join()
    want = room.strip().lower()
    for name, ip in hits:
        if name.lower() == want:
            return ip
    for name, ip in hits:          # fall back to a partial match ("Den" in "The Den")
        if want and want in name.lower():
            return ip
    return hits[0][1] if hits else None


def sonos_track(ip, timeout=4):
    """Return (title, artist) for what the speaker is playing, or (None, None)."""
    body = (
        '<?xml version="1.0"?>'
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" '
        's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>'
        '<u:GetPositionInfo xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">'
        '<InstanceID>0</InstanceID></u:GetPositionInfo></s:Body></s:Envelope>'
    ).encode()
    req = urllib.request.Request(
        'http://%s:1400/MediaRenderer/AVTransport/Control' % ip,
        data=body,
        headers={
            'Content-Type': 'text/xml; charset="utf-8"',
            'SOAPACTION': '"urn:schemas-upnp-org:service:AVTransport:1#GetPositionInfo"',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            xml = r.read().decode('utf-8', 'replace')
    except Exception:
        return None, None
    m = re.search(r'<TrackMetaData>(.*?)</TrackMetaData>', xml, re.S)
    if not m:
        return None, None
    meta = html.unescape(m.group(1))
    t = re.search(r'<dc:title>(.*?)</dc:title>', meta, re.S)
    a = re.search(r'<dc:creator>(.*?)</dc:creator>', meta, re.S)
    title = html.unescape(t.group(1)).strip() if t else ''
    artist = html.unescape(a.group(1)).strip() if a else ''
    # Radio streams and silence put junk here; treat anything without a title as nothing.
    if not title or title.lower().startswith(('x-sonos', 'zpstr_')):
        return None, None
    return title, artist


def title_words(title):
    """The distinctive words of a song title, for checking a line actually references it."""
    stop = {'THE', 'A', 'AN', 'OF', 'IN', 'ON', 'AT', 'TO', 'AND', 'OR', 'MY', 'YOUR',
            'IS', 'ARE', 'IT', 'ITS', 'FOR', 'VERSION', 'REMIX', 'FEAT', 'LIVE', 'EDIT'}
    words = re.findall(r"[A-Z0-9']+", (title or '').upper())
    return [w for w in words if len(w) > 2 and w not in stop]


def prefer_on_topic(lines, title, keep_min=2):
    """Put lines that name the song first; drop obscure ones if we have enough on-topic."""
    if not title:
        return lines
    key = title_words(title)
    if not key:
        return lines
    on = [l for l in lines if any(w in l for w in key)]
    off = [l for l in lines if l not in on]
    # if plenty of lines actually name the song, discard the vague ones entirely
    return on if len(on) >= keep_min else on + off


def clean_lines(text, n):
    out = []
    for raw in (text or '').splitlines():
        s = raw.strip().strip('"').strip("'")
        s = re.sub(r'^\s*[-*\d.)\]]+\s*', '', s)      # strip bullets/numbering
        s = s.replace('"', '').replace(chr(8220), '').replace(chr(8221), '')
        s = re.sub(r'\s+', ' ', s).upper()
        if not (2 <= len(s.split()) <= 10):
            continue
        if len(s) > 60 or BANNED.search(s) or JUNK.search(s):
            continue
        if s not in out:
            out.append(s)
        if len(out) >= n:
            break
    return out


OLLAMA_FOUND = {'url': '', 'at': 0}


def find_ollama():
    """Scan the /24 for port 11434. Python's resolver has no mDNS, so a .local OLLAMA_URL
    may not resolve, and DHCP can move the Mac; hunting the port down covers both."""
    net = local_subnet()
    if not net:
        return ''
    hits, lock = [], threading.Lock()
    def probe(ip):
        try:
            c = socket.create_connection((ip, 11434), timeout=0.4); c.close()
            with lock: hits.append(ip)
        except OSError:
            pass
    th = [threading.Thread(target=probe, args=('%s.%d' % (net, i),)) for i in range(2, 255)]
    for t in th: t.start()
    for t in th: t.join()
    return 'http://%s:11434' % hits[0] if hits else ''


def _ollama_once(url, cfg, prompt, n, predict):
    payload = json.dumps({
        'model': cfg['OLLAMA_MODEL'],
        'prompt': prompt,
        'stream': False,
        'options': {'temperature': 0.9, 'num_predict': predict},
    }).encode()
    req = urllib.request.Request(url.rstrip('/') + '/api/generate', data=payload,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = json.load(r)
    return clean_lines(data.get('response', ''), n)


def ollama(cfg, prompt, n, predict=400):
    """Ask the local model for n short lines. Returns [] if it is unreachable or unusable.
    If the configured address fails, scan for the Ollama port (rate-limited) and retry."""
    url = cfg['OLLAMA_URL'].rstrip('/')
    if not url:
        return []
    for candidate in ([OLLAMA_FOUND['url']] if OLLAMA_FOUND['url'] else []) + [url]:
        try:
            return _ollama_once(candidate, cfg, prompt, n, predict)
        except Exception as e:
            err = e
    if time.time() - OLLAMA_FOUND['at'] > 120:
        OLLAMA_FOUND['at'] = time.time()
        found = find_ollama()
        if found:
            print('ollama moved: using %s' % found, flush=True)
            OLLAMA_FOUND['url'] = found
            try:
                return _ollama_once(found, cfg, prompt, n, predict)
            except Exception as e:
                err = e
    print('ollama failed (%s); using templates' % err, flush=True)
    return []


def ollama_lines(cfg, title, artist, n):
    """Small models often stop after a few lines, so ask repeatedly until we have enough."""
    out = []
    for _ in range(3):
        want = n - len(out)
        if want <= 0:
            break
        got = ollama(cfg, PROMPT.format(title=title, artist=artist or 'an unknown artist',
                                        n=max(3, want)), max(3, want))
        if not got:
            break
        for g in got:
            if g not in out:
                out.append(g)
    return prefer_on_topic(out, title)[:n]


def ollama_questions(cfg, title, artist, n):
    if n <= 0:
        return []
    out = ollama(cfg, QUESTION_PROMPT.format(title=title, artist=artist or 'an unknown artist', n=n), n)
    return prefer_on_topic([q for q in out if q.endswith('?')], title, keep_min=1)


def ollama_clock(cfg, n):
    if n <= 0:
        return []
    import random
    hour = random.choice(['ONE', 'TWO', 'THREE', 'MIDNIGHT', 'ELEVEN'])
    return ollama(cfg, CLOCK_PROMPT.format(hour=hour, n=n), n, predict=90)


def template_lines(title, artist, n):
    import random
    picks = random.sample(TEMPLATES, min(n, len(TEMPLATES)))
    return [p.format(t=title.upper(), a=(artist or 'THEY').upper())[:60] for p in picks]


def push(cfg, title, artist, lines, questions=None, clock=None):
    payload = json.dumps({'title': title, 'artist': artist, 'lines': lines,
                          'questions': questions or [], 'clock': clock or []}).encode()
    req = urllib.request.Request(cfg['SHOW_URL'].rstrip('/') + '/api/music',
                                 data=payload, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            r.read()
        return True
    except Exception as e:
        print('could not reach the show: %s' % e, flush=True)
        return False


def handle_track(cfg, title, artist):
    n = max(1, int(cfg.get('LINES_PER_TRACK', 8)))
    nq = int(cfg.get('QUESTIONS_PER_TRACK', 4))
    nc = int(cfg.get('CLOCK_LINES', 4))
    lines = ollama_lines(cfg, title, artist, n) or template_lines(title, artist, n)
    questions = ollama_questions(cfg, title, artist, nq)
    clock = ollama_clock(cfg, nc)
    print('%s - %s -> %d lines, %d questions, %d clock' %
          (artist, title, len(lines), len(questions), len(clock)), flush=True)
    for l in lines + questions:
        print('   %s' % l, flush=True)
    push(cfg, title, artist, lines, questions, clock)


def main():
    cfg = load_conf()
    if not cfg['SONOS_IP']:
        print('No SONOS_IP set in %s; nothing to watch.' % CONF, flush=True)
        return 1
    once = '--once' in sys.argv
    poll = max(2, int(cfg['POLL_SECONDS']))
    last = None
    misses = 0          # consecutive polls with no answer from the speaker
    rescan_at = 0       # don't scan the subnet more than once every 2 minutes
    while True:
        title, artist = sonos_track(cfg['SONOS_IP'])
        if title is None and artist is None:
            misses += 1
            # ~30s of silence from the configured IP usually means DHCP moved the
            # speaker after a router reboot: go find the room again by name.
            if misses >= 6 and time.time() >= rescan_at:
                rescan_at = time.time() + 120
                found = find_sonos(cfg['SONOS_ROOM'])
                if found and found != cfg['SONOS_IP']:
                    print('Sonos "%s" moved: %s -> %s' % (cfg['SONOS_ROOM'], cfg['SONOS_IP'], found), flush=True)
                    cfg['SONOS_IP'] = found
                    misses = 0
        else:
            misses = 0
        key = (title, artist)
        if title and key != last:
            last = key
            handle_track(cfg, title, artist)
        elif not title and last is not None:
            last = None
            push(cfg, '', '', [], [], [])   # music stopped: clear the lines
        if once:
            return 0
        time.sleep(poll)


if __name__ == '__main__':
    sys.exit(main() or 0)
