# Haunted Wall: Raspberry Pi projector kiosk

A self-contained Halloween show for a projector. The Pi boots straight into Chromium in kiosk mode and
plays 16 animated scenes in random order with jump scares every few minutes. No internet needed.
Party guests can upload photos from their phones; each photo is used as a jump scare up to two times. Guest-posted text messages behave the same way: each is shown on the message wall up to two times, then retired. The built-in spooky lines never expire.

## What is on the SD card

The card holds Raspberry Pi OS Trixie (64-bit, with desktop, 2026-10-06 release). The boot partition
(the small FAT partition, visible on a Mac as `bootfs`) carries these extras from the `boot/` folder:

- `user-data`: cloud-init configuration (this Raspberry Pi OS release uses cloud-init for first boot).
  It sets hostname `halloween`, creates user `pi`, enables SSH, runs `halloween-setup.sh`, then reboots.
- `halloween-setup.sh`: configures WiFi or a hotspot, installs the show, sets desktop autologin,
  disables screen blanking. Logs to `halloween-setup.log` on the boot partition.
- `halloween/`: the show (HTML, JavaScript, fonts, upload server, launcher).
- `halloween-wifi.txt`: optional WiFi credentials. See below.
- `ssh`: standard Raspberry Pi OS marker file that enables SSH.

## First boot

1. Connect the projector over HDMI (on a Pi 4 or 5 use the HDMI port nearest the power connector).
2. Insert the card and power up. The first boot resizes the filesystem, runs the cloud-init setup and
   `halloween-setup.sh`, then reboots. Allow 3 to 5 minutes. After that the show starts on every boot
   within about 30 seconds.
3. If the show does not appear, check `halloween-setup.log` on the boot partition (put the card back
   in the Mac). If that file is missing, cloud-init did not run the script; log in on the Pi
   (user pi, password halloween) and run `sudo bash /boot/firmware/halloween-setup.sh`.

Login: user `pi`, password `halloween`. SSH is enabled (`ssh pi@halloween.local`).

## Photo uploads from phones

Option A, home WiFi (phones keep internet): before first boot, edit `halloween-wifi.txt` on the
boot partition and fill in `SSID` and `PASSWORD` (keep the quotes). Then the upload page is at
http://halloween.local:8080 (or `http://<pi-ip>:8080`).

Option B, hotspot (nothing to configure): leave `SSID` empty. The Pi broadcasts a WiFi network called
`HauntedWall`, password `halloween2026`. Join it on the phone and open http://10.42.0.1:8080.
The phone has no internet while on the hotspot.

On the page: tap "Add photos from camera roll", pick one or more photos, done. The photo is shrunk on
the phone before upload. The first scare with a new photo happens 45 to 150 seconds after upload; the
second use comes at a later random scare slot. After `PHOTO_MAX_USES` (default 2) it is retired.
Anyone on the same network can upload; there is no login. The same page has a box for custom
messages that join the glitch-text scene.

Photos are stored in `/home/pi/halloween/photos/` on the Pi. Delete files there to remove them.
The use counter lives in the kiosk browser's local storage; reloading the page keeps it.

## Changing the show after it is running

Fastest loop (Pi on, SSH reachable):

1. Edit files in `boot/halloween/` on the Mac. `config.js` covers most tweaks
   (scene list, timing, brightness, messages).
2. Preview locally: `cd boot/halloween && python3 server.py 8089`, then open
   `http://localhost:8089/index.html`. Add `?scene=ouija` to pin one scene or
   `?scare=static` to fire one scare.
3. `./push.sh` (home WiFi, `halloween.local`) or `./push.sh 10.42.0.1` (hotspot).
   It copies the folder to the Pi, restarts the Python server and Chromium.
   The wall is back within about 5 seconds. Uploaded party photos are kept.

Run `ssh-copy-id pi@halloween.local` once (password `halloween`) so push.sh
does not ask for a password each time.

Slow path (no network): shut the Pi down, put the card in the Mac, copy
`boot/halloween/*` over `/Volumes/bootfs/halloween/`, then on the Pi run
`cp -r /boot/firmware/halloween/* ~/halloween/` and reboot. The setup script
only copies the folder on first boot, so the manual copy is needed.

Re-running setup from the card (no network needed): edit the files on
`bootfs`, then append this to the single line in `cmdline.txt`:

    systemd.run=/boot/firmware/halloween-setup.sh systemd.run_success_action=reboot systemd.run_failure_action=reboot systemd.unit=kernel-command-line.target

On the next boot systemd runs the script instead of the desktop, the script
removes that entry from cmdline.txt, applies WiFi, recopies the show (party
photos are kept) and reboots into it. Changing `instance_id` in `meta-data`
does not make cloud-init rerun on this image; tested 2026-10-30.

Keys on a keyboard plugged into the Pi: N next scene, S fire a scare,
R reload the page (picks up a config.js edit), F fullscreen.

## Settings

Edit `/home/pi/halloween/config.js` on the Pi (over SSH) and reboot, or edit
`halloween/config.js` on the boot partition before first boot. Main options:

| Setting | Meaning |
| --- | --- |
| `ROTATE` | 0, 90, 180, 270. Use 180 if the projector hangs upside down. |
| `MIRROR` | true for rear projection. |
| `BRIGHTNESS`, `CONTRAST` | Multipliers; raise BRIGHTNESS to 1.2 or 1.3 in a bright room. |
| `SCENE_SECONDS` | Range of seconds each scene runs. Some scenes have a fixed length instead. |
| `FADE_SECONDS` | Length of the black fade between scenes. Half of the changes are static bursts or hard cuts instead. |
| `SCARES`, `SCARE_MINUTES` | Jump scares on/off and the random gap between them. Every scare opens with a strobe hit. |
| `MICRO_SCARES`, `MICRO_SECONDS` | Short jolts between the big scares (static burst, light flicker, one-frame face, picture tearing, blackout) and the gap between them. |
| `OUIJA_POSTED` | Messages posted from phones are spelled out on the Ouija board. The wall cuts to the board when one arrives. |
| `FLASHES` | false removes full-screen white flashes (gentler for guests sensitive to flashing). |
| `SCENES` | Array of scene names to restrict the rotation, or null for all. |
| `PHOTO_MAX_USES` | Times each uploaded photo may appear. |
| `MESSAGE_TTL_MINUTES` | Minutes a guest-posted message stays in rotation after it was posted, then drops (stock lines never expire). |
| `MESSAGE_BUFFER_MAX` | Most guest-posted messages held at once; oldest drops first. |
| `MESSAGES`, `OUIJA_WORDS` | Text used by the message scene and the Ouija board. |

Scene names (the dark set, on by default): static, messages, blood, bloodwords, scratch, counter,
ouija, surveillance, stalker, heartbeat, eyewall, smokeskull, eyes, hands, skulls, clock, spiders.
Off by default: graveyard, vortex, batmoon, pumpkins, ghosts, house, wisps, candles.
Each one is described next to the `SCENES` list in `config.js`.

Bundled imagery lives in `boot/halloween/img/` (smoke-skull mirror, two carved-pumpkin close-ups). The `smokeskull` scene and `pumpkin` scare use them; the hooded-figure silhouette in the hallway and stalker scenes is drawn, not a photo.

Scare names for `?scare=`: face, eyes, hand, spider, static, text, lightning, shadow, blood, borg (Borg takeover: green glitch, red laser lock-on, RESISTANCE IS FUTILE), pumpkin (full-screen carved-pumpkin close-up slam).

Keyboard, if a keyboard is plugged in: N next scene, S jump scare, P photo scare, H show status,
R reload, F toggle fullscreen (desktop testing). URL parameters for testing: `?scene=eyes`,
`?scare=face`, `?noscares=1`.

Flash warning: scares and lightning use brief full-screen white flashes, at most a few per scare.
Set `FLASHES: false` to remove them.

## Projector tips

- Black does not project. Every scene is designed with bright elements on dark, but in a lit room
  expect the dark backgrounds to disappear and the bright elements to float on the wall.
- If the projector shows nothing at all (no desktop either), the Pi may not detect it. Add
  `video=HDMI-A-1:1920x1080@60D` to the start of the single line in `cmdline.txt` on the boot partition.
- Performance: a Pi 4 or 5 runs everything at full resolution. On a Pi 3 the show measures its frame
  rate and automatically lowers the render resolution if it drops below 22 fps.

## Testing on a Mac

    cd boot/halloween && python3 server.py 8089
    open http://localhost:8089/index.html

## Rebuilding the card

Flash Raspberry Pi OS Trixie (64-bit, with desktop) with Raspberry Pi Imager without any
customisation, then copy everything from `boot/` onto the boot partition, replacing `user-data`.
If Imager's command line is used, note that its `--sha256` option expects the hash of the
uncompressed image, not of the `.img.xz` download.

## Licenses

Fonts Creepster, Nosifer and Eater are from Google Fonts under the SIL Open Font License 1.1.
Everything else in this folder was written for this project.

## Two screens (mirrored)

A second Pi can run the same show, mirrored to the first.

- The **primary** Pi runs the web server and the show. Its kiosk opens `?mirror=leader`,
  so it POSTs its current scene/scare and their random seeds to `/api/state`.
- The **secondary** Pi has a `kiosk-url.txt` in `~/halloween/` holding the primary's URL
  (e.g. `http://192.168.1.50:8080/index.html`). `kiosk.sh` sees that file, skips starting a
  local server, and opens that URL with `?mirror=follower` appended.
- The follower polls `/api/state` and adopts the leader's scene, scare and seeds. Because
  every `rand()`/`pick()` runs through one seedable generator (`seedRandom()` in `util.js`),
  the same seed reproduces the same scene exactly, so both screens match.
- Uploaded photos and messages come from the primary, so one upload reaches both screens.
- The secondary depends on the primary: boot the primary first. If the primary is down the
  secondary holds its last scene until it returns.
- `MIRROR_LEADER=0` in the environment turns off leader publishing on the primary.
- To make the second screen independent again, delete its `kiosk-url.txt` and reboot.
  `push.sh` excludes that file, so pushes never clobber it.
