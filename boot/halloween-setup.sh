#!/bin/bash
# Haunted Wall first-boot setup. Run once as root by cloud-init (runcmd in user-data), which then
# reboots. Everything it needs is on the boot partition. Safe to re-run by hand: sudo bash /boot/firmware/halloween-setup.sh
set +e
BOOT=/boot/firmware; [ -d "$BOOT" ] || BOOT=/boot
LOG=$BOOT/halloween-setup.log
exec >>"$LOG" 2>&1
echo "=== halloween-setup $(date) ==="
# If we were started from the kernel command line (systemd.run=...), remove that trigger first so the
# Pi never loops into this script, even if something below fails.
if grep -q 'systemd.run=' "$BOOT/cmdline.txt" 2>/dev/null; then
  sed -i -E 's/ systemd\.(run|run_success_action|run_failure_action|unit)=[^ ]*//g' "$BOOT/cmdline.txt"
  echo "removed systemd.run trigger from cmdline.txt"
fi

# hostname
if [ -f /usr/lib/raspberrypi-sys-mods/imager_custom ]; then
  /usr/lib/raspberrypi-sys-mods/imager_custom set_hostname halloween
else
  CUR=$(tr -d " \t\n\r" </etc/hostname); echo halloween >/etc/hostname
  sed -i "s/127.0.1.1.*$CUR/127.0.1.1\thalloween/g" /etc/hosts
fi

# ssh
if [ -f /usr/lib/raspberrypi-sys-mods/imager_custom ]; then /usr/lib/raspberrypi-sys-mods/imager_custom enable_ssh; else systemctl enable ssh; fi

# user pi: create if missing, and ALWAYS (re)set the password from userconf.txt
if [ -f "$BOOT/userconf.txt" ]; then
  HASH=$(cut -d: -f2- "$BOOT/userconf.txt" 2>/dev/null)
  if ! getent passwd pi >/dev/null; then
    if [ -f /usr/lib/userconf-pi/userconf ]; then
      /usr/lib/userconf-pi/userconf pi "$HASH"
    else
      FIRSTUSER=$(getent passwd 1000 | cut -d: -f1)
      echo "$FIRSTUSER:$HASH" | chpasswd -e
      usermod -l pi "$FIRSTUSER"; usermod -m -d /home/pi pi; groupmod -n pi "$FIRSTUSER"
    fi
  else
    echo "pi:$HASH" | chpasswd -e    # user already exists: restore a known password every run
  fi
fi
rm -f "$BOOT/userconf.txt"

# install the push SSH key for passwordless access, if staged on the boot partition
if [ -f "$BOOT/halloween-authorized_key.pub" ] && getent passwd pi >/dev/null; then
  install -d -m 700 -o pi -g pi /home/pi/.ssh
  KEY=$(cat "$BOOT/halloween-authorized_key.pub")
  touch /home/pi/.ssh/authorized_keys
  grep -qxF "$KEY" /home/pi/.ssh/authorized_keys 2>/dev/null || echo "$KEY" >> /home/pi/.ssh/authorized_keys
  chown pi:pi /home/pi/.ssh/authorized_keys; chmod 600 /home/pi/.ssh/authorized_keys
  rm -f "$BOOT/halloween-authorized_key.pub"
fi

# wifi: join home network if configured, otherwise make a hotspot
SSID=""; PASSWORD=""; COUNTRY="US"
[ -f "$BOOT/halloween-wifi.txt" ] && eval "$(grep -E '^(SSID|PASSWORD|COUNTRY)=' "$BOOT/halloween-wifi.txt")"
[ -n "$COUNTRY" ] || COUNTRY=US
raspi-config nonint do_wifi_country "$COUNTRY" 2>/dev/null
rfkill unblock wifi 2>/dev/null
if [ -n "$SSID" ]; then
  echo "joining wifi $SSID"
  rm -f /etc/NetworkManager/system-connections/HauntedWall.nmconnection   # drop the hotspot if it was made on an earlier run
  # Written directly (NetworkManager may not be running yet when this script runs at boot).
  mkdir -p /etc/NetworkManager/system-connections
  cat >/etc/NetworkManager/system-connections/preconfigured.nmconnection <<NM
[connection]
id=preconfigured
type=wifi
autoconnect=true
autoconnect-priority=10
[wifi]
mode=infrastructure
ssid=$SSID
[wifi-security]
key-mgmt=wpa-psk
psk=$PASSWORD
[ipv4]
method=auto
[ipv6]
method=auto
NM
  chmod 600 /etc/NetworkManager/system-connections/preconfigured.nmconnection
else
  echo "no wifi configured; creating hotspot HauntedWall"
  mkdir -p /etc/NetworkManager/system-connections
  cat >/etc/NetworkManager/system-connections/HauntedWall.nmconnection <<NM
[connection]
id=HauntedWall
type=wifi
autoconnect=true
interface-name=wlan0
[wifi]
mode=ap
ssid=HauntedWall
band=bg
[wifi-security]
key-mgmt=wpa-psk
psk=halloween2026
[ipv4]
method=shared
address1=10.42.0.1/24
[ipv6]
method=ignore
NM
  chmod 600 /etc/NetworkManager/system-connections/HauntedWall.nmconnection
fi

# the show (keep uploaded party photos from an earlier run)
[ -d /home/pi/halloween/photos ] && mv /home/pi/halloween/photos /tmp/hw-photos-keep
rm -rf /home/pi/halloween
cp -r "$BOOT/halloween" /home/pi/halloween
[ -d /tmp/hw-photos-keep ] && mv /tmp/hw-photos-keep /home/pi/halloween/photos
chmod +x /home/pi/halloween/kiosk.sh /home/pi/halloween/server.py
mkdir -p /home/pi/.config/autostart /home/pi/.config/labwc
cp /home/pi/halloween/halloween.desktop /home/pi/.config/autostart/halloween.desktop
grep -q kiosk.sh /home/pi/.config/labwc/autostart 2>/dev/null || echo '/home/pi/halloween/kiosk.sh &' >>/home/pi/.config/labwc/autostart
chown -R pi:pi /home/pi/halloween /home/pi/.config

# desktop autologin, no screen blanking, no welcome wizard, no splash
raspi-config nonint do_boot_behaviour B4
raspi-config nonint do_blanking 1
raspi-config nonint do_boot_splash 1 2>/dev/null
rm -f /etc/xdg/autostart/piwiz.desktop
# hide the mouse pointer when idle is handled by the page (cursor:none); nothing else needed

echo "=== halloween-setup done $(date) ==="
exit 0
