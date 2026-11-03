#!/bin/bash
# Kill every Chromium belonging to the kiosk so kiosk.sh respawns it with freshly
# pushed code. Lives on the Pi so push.sh needn't quote this through ssh.
#
# Why not `pkill -f chromium`: that pattern also matches the ssh command running it,
# so the shell kills itself before reaching the browser and the push silently leaves
# stale JS on screen. Match the real binary and exclude our own process tree.
ME=$$
SELF_TREE="$ME $PPID"
PIDS=""
for p in $(pgrep -f '/usr/lib/chromium' 2>/dev/null); do
  case " $SELF_TREE " in *" $p "*) continue ;; esac
  PIDS="$PIDS $p"
done
N=$(echo $PIDS | wc -w)
echo "killed:$N"
if [ -n "$PIDS" ]; then
  # Report BEFORE killing, and detach the kill: Chromium's process tree can include
  # this script's ssh parent, so killing inline can cut the connection before the
  # caller ever sees the result, which looks like a failed restart.
  setsid sh -c "sleep 1; kill -9 $PIDS 2>/dev/null" >/dev/null 2>&1 < /dev/null &
fi
exit 0
