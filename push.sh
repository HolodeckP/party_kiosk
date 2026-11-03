#!/bin/bash
# Push the show from this Mac to the running Pi and restart it. Takes ~5 seconds.
#   ./push.sh                  -> pi@halloween.local  (home WiFi)
#   ./push.sh 10.42.0.1        -> Pi hotspot "HauntedWall"
#   ./push.sh host --no-restart   just copy, don't restart (press R on a keyboard plugged into the Pi)
set -e
HOST="${1:-halloween.local}"; RESTART=1; [ "$2" = "--no-restart" ] && RESTART=0
SRC="$(cd "$(dirname "$0")" && pwd)/boot/halloween/"
# Dedicated passphrase-free key for this Pi (the personal id_ed25519 is passphrase-locked).
KEY="$HOME/.ssh/halloween_pi"
SSHOPTS="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=5"
[ -f "$KEY" ] && SSHOPTS="$SSHOPTS -o IdentitiesOnly=yes -i $KEY"
SSH="ssh $SSHOPTS pi@$HOST"

echo "-> copying show to pi@$HOST:~/halloween"
# kiosk-url.txt is per-machine (it marks a second screen), so --delete must not remove it.
if ! rsync -az --delete --exclude photos --exclude messages.json --exclude __pycache__ --exclude kiosk-url.txt \
     -e "ssh $SSHOPTS" "$SRC" "pi@$HOST:~/halloween/" 2>/dev/null; then
  echo "   (rsync unavailable, using tar over ssh)"
  tar -C "$SRC" --exclude __pycache__ -cf - . | $SSH "mkdir -p ~/halloween && tar -C ~/halloween -xf -"
fi
$SSH "chmod +x ~/halloween/kiosk.sh"

if [ $RESTART = 1 ]; then
  echo "-> restarting server and browser"
  # setsid + </dev/null fully detaches the server from this SSH session, so it keeps
  # running after we disconnect (a plain nohup & was being killed when SSH closed).
  # Just kill the old server and old Chromium. kiosk.sh supervises both and restarts
  # them within ~2s with the freshly-copied code, without depending on this SSH session.
  # pkill -o only kills the OLDEST chromium, which repeatedly left the real kiosk
  # browser alive running stale JS. Kill them all, hard, then let kiosk.sh respawn.
  # pkill -o only killed the OLDEST chromium, repeatedly leaving the real kiosk browser
  # alive on stale JS. Kill them all. `|| true` on the ssh itself because pkill matching
  # this very command makes ssh exit non-zero, which set -e would treat as fatal.
  # pkill -o only killed the OLDEST chromium, repeatedly leaving the real kiosk browser
  # alive on stale JS. Kill them all -- but `pkill -f chromium` also matches this very
  # ssh command's own shell, so the connection dies before anything after it runs.
  # Fix: hand the kill to a detached shell that waits for us to disconnect first.
  # pkill -o only killed the OLDEST chromium, repeatedly leaving the real kiosk browser
  # alive on stale JS. Kill them all -- but `pkill -f chromium` also matches this very
  # ssh command's own shell, so a plain pkill severs the connection first. Use -P1 style
  # targeting via the kiosk's own pids instead: resolve the pids, then kill by number,
  # which matches nothing in our own command line.
  # pkill -o only killed the OLDEST chromium, so the real kiosk browser kept running
  # stale JS after a push. Killing them all is correct, but any pattern containing
  # "chromium" also matches THIS ssh command's own shell, which then kills itself
  # before reaching the browser. So: match on the real binary path and exclude our
  # own pid and parent pid.
  # The browser kill lives in restart-browser.sh ON THE PI: any "chromium" pattern
  # typed into an ssh command also matches that command's own shell, so the shell
  # killed itself and left the stale browser running. See that script for detail.
  $SSH 'pkill -f "server.py" || true; chmod +x ~/halloween/restart-browser.sh 2>/dev/null; ~/halloween/restart-browser.sh' || true
  # kiosk.sh respawns the browser on its own schedule, so poll for a genuinely fresh
  # one rather than guessing a fixed delay (a fixed sleep gave false warnings).
  AGE=""
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    sleep 5
    AGE=$($SSH 'ps -o etimes= -p $(pgrep -f "chromium.*kiosk" | head -1) 2>/dev/null | tr -d " "' 2>/dev/null || true)
    if [ -n "$AGE" ] && [ "$AGE" -lt 60 ] 2>/dev/null; then break; fi
  done
  if [ -n "$AGE" ] && [ "$AGE" -lt 60 ] 2>/dev/null; then
    echo "   browser restarted (age ${AGE}s, running the code just pushed)"
  else
    echo "   WARNING: browser age '${AGE:-none}'s - it may still be running stale code"
  fi
  # A follower screen (kiosk-url.txt present) runs no server of its own by design,
  # so only warn about a missing server on the primary.
  $SSH 'if [ -f ~/halloween/kiosk-url.txt ]; then echo "   follower screen (no local server by design)"; elif ss -ltn | grep -q ":8080 "; then echo "   server back up"; else echo "   WARNING: server not yet up (kiosk.sh should bring it back shortly)"; fi'
fi
echo "done. Server log: ssh pi@$HOST tail /tmp/haunted-wall-server.log"
