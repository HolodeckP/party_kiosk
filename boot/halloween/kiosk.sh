#!/bin/bash
# Starts the Haunted Wall: local web server + Chromium in kiosk mode. Restarts Chromium if it dies.
DIR="$(cd "$(dirname "$0")" && pwd)"
exec 9>/tmp/haunted-wall.lock
flock -n 9 || exit 0            # only one instance, even if several autostart hooks fire

PORT=8080
cd "$DIR"

# Second-screen mode: if kiosk-url.txt exists, this Pi is a secondary display. It does NOT
# run its own server; it points Chromium at the URL in that file (the primary Pi's server),
# so both screens share one photo/message feed. Without the file, this is the primary Pi:
# it runs and supervises the local server, as normal.
if [ -f "$DIR/kiosk-url.txt" ]; then
  URL=$(tr -d " \t\r\n" <"$DIR/kiosk-url.txt")
  # Mirrored screens: this one follows the primary unless the URL already says otherwise.
  case "$URL" in *mirror=*) ;; *\?*) URL="$URL&mirror=follower" ;; *) URL="$URL?mirror=follower" ;; esac
else
  # Supervise the upload server: if it dies or is killed (e.g. by push.sh for a reload),
  # bring it straight back. This loop lives under kiosk.sh, which is daemonized at boot,
  # so the server never depends on an SSH session staying open.
  (
    while true; do
      if ! python3 -c "import socket,sys; s=socket.socket(); s.settimeout(0.5); sys.exit(0 if s.connect_ex(('127.0.0.1',$PORT))==0 else 1)" 2>/dev/null; then
        python3 "$DIR/server.py" $PORT >>/tmp/haunted-wall-server.log 2>&1
      fi
      sleep 2
    done
  ) &
  for i in $(seq 1 40); do
    if python3 -c "import socket,sys; s=socket.socket(); s.settimeout(0.5); sys.exit(0 if s.connect_ex(('127.0.0.1',$PORT))==0 else 1)" 2>/dev/null; then break; fi
    sleep 0.25
  done
  URL="http://localhost:$PORT/index.html"
  python3 -c "import socket,sys; s=socket.socket(); s.settimeout(0.5); sys.exit(0 if s.connect_ex(('127.0.0.1',$PORT))==0 else 1)" 2>/dev/null || URL="file://$DIR/index.html"
  # Primary screen: publish scene/scare state so any follower screens can mirror it.
  # Harmless when there is no follower; MIRROR_LEADER=0 turns it off.
  if [ "${MIRROR_LEADER:-1}" = "1" ] && [ "${URL#file://}" = "$URL" ]; then URL="$URL?mirror=leader"; fi

  # Watch the Sonos and feed the wall lines about whatever is playing. Only runs on the
  # primary (it posts to this Pi's server) and only when music.conf names a speaker.
  if [ -f "$DIR/music.conf" ] && grep -q '^SONOS_IP=[^[:space:]]' "$DIR/music.conf"; then
    ( while true; do python3 "$DIR/music.py" >>/tmp/haunted-wall-music.log 2>&1; sleep 10; done ) &
  fi
fi

# X11 fallback (older images): disable blanking
if [ -n "$DISPLAY" ] && command -v xset >/dev/null; then xset s off; xset -dpms; xset s noblank; fi 2>/dev/null

BIN=$(command -v chromium || command -v chromium-browser)
sleep 2
# Park the pointer in the bottom-right corner so no cursor sits over the show.
# The page already sets cursor:none, but the compositor still draws its own
# pointer wherever the mouse last was until something moves it.
hide_pointer() {
  for _ in 1 2 3; do
    sleep 6
    if command -v wlrctl >/dev/null 2>&1; then wlrctl pointer move 20000 20000 2>/dev/null
    elif command -v ydotool >/dev/null 2>&1; then ydotool mousemove -a -x 20000 -y 20000 2>/dev/null
    fi
  done
}
hide_pointer &
while true; do
  "$BIN" --kiosk --noerrdialogs --disable-infobars --no-first-run --incognito \
    --disable-session-crashed-bubble --disable-features=TranslateUI,Translate \
    --check-for-update-interval=31536000 --disable-pinch --overscroll-history-navigation=0 \
    --password-store=basic --force-device-scale-factor=1 --autoplay-policy=no-user-gesture-required \
    --user-data-dir="$HOME/.config/haunted-wall-chromium" "$URL" >>/tmp/haunted-wall-chromium.log 2>&1
  sleep 2
done
