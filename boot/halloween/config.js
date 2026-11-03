// Haunted Wall configuration. Edit and reboot the Pi (or press R in the browser) to apply.
// On the Pi this file lives at /home/pi/halloween/config.js
const CONFIG = {
  ROTATE: 0,               // Rotate the picture: 0, 90, 180 or 270. Use 180 if the projector is mounted upside down.
  MIRROR: false,           // true for rear projection (flips left/right).
  BRIGHTNESS: 1.1,         // >1 brightens everything; useful in a room with ambient light. 1.0 = normal.
  CONTRAST: 1.05,

  SCENE_SECONDS: [15, 30], // each scene runs for a random time in this range
  FADE_SECONDS: 0.5,       // black fade between scenes. Some changes are hard cuts or static bursts instead.
  SCARES: true,            // jump scares on/off
  SCARE_MINUTES: [1.5, 3.5], // random gap between jump scares
  SCARE_WEIGHTS: { borg: 2 }, // extra turns per cycle for named scares (borg: Patrick Stewart tribute)
  FIRST_SCARE_MINUTES: 1,  // first scare after at least this long
  MICRO_SCARES: true,      // short jolts between the big scares: static bursts, light flicker, single-frame faces
  MICRO_SECONDS: [25, 55], // random gap between those jolts
  FLASHES: true,           // allow full-screen white flashes (lightning, scares). false = gentler.

  // Party photos uploaded from phones (see upload page). Each photo is shown at most this many times.
  PHOTO_POLL_MS: 2000,      // how often to look for new uploads (a new photo shows at once)
  PHOTO_FRESH_MINUTES: 10,  // a just-uploaded photo takes every other scare slot this long, then joins regular rotation
  // Mirrored screens: 'leader' publishes its scene/scare, 'follower' copies the leader's.
  // null (default) = independent show. Set by kiosk-url.txt presence on a second Pi.
  MIRROR_MODE: null,
  // When a song is playing, how often a wall message is about that song rather than one of
  // the stock menacing lines (GET OUT, REDRUM...). 0 = never, 1 = always.
  MUSIC_ANNOUNCE: true,          // cut to a blood-soaked line the moment the song changes
  MUSIC_LINE_SHARE: 0.8,
  MUSIC_GAP_SECONDS: [12, 30],   // how long between song-aware lines
  MESSAGE_TTL_MINUTES: 10,          // a guest-posted message replays freely until this many minutes after it was posted, then drops
  MESSAGE_BUFFER_MAX: 10,           // at most this many guest-posted messages held at once; oldest drops first (stock lines never expire)
  OUIJA_POSTED: true,              // messages posted from phones are spelled out on the Ouija board; the wall cuts to the board when one arrives

  FOG: true,               // drifting fog overlay
  RENDER_SCALE: 1.0,       // canvas resolution multiplier. Lowered automatically if the Pi is slow.
  AUTO_QUALITY: true,

  // Scenes to include (null = all). All names:
  //   static       TV static with faces in the noise             messages     glitching static + threatening text
  //   blood        red drips running down the wall               bloodwords   words written in blood, letter by letter
  //   scratch      phrases scratched into the wall               counter      a guest count that keeps changing
  //   ouija        planchette spelling words and posted messages surveillance CCTV corridor, something approaches
  //   stalker      lightning reveals a figure getting closer     heartbeat    red pulse and ECG that races, then stops
  //   eyewall      dozens of eyes in the dark turn to look       eyes         a few large blinking eyes
  //   hands        hands clawing up from below                   skulls       tumbling skulls
  //   clock        clock striking midnight                       spiders      spiders on webs descending
  //   graveyard    tombstones, lightning, rising figures         vortex       spinning portal (has pumpkins and bats)
  //   batmoon      moon and bat swarm                            pumpkins     flickering jack-o-lanterns
  //   ghosts       drifting ghosts                               house        haunted house silhouette
  //   wisps        floating lights                               candles      candles that blow out
  // Dark set. Set to null to get everything back.
  SCENES: ['static', 'messages', 'blood', 'bloodwords', 'scratch', 'counter', 'ouija', 'surveillance',
           'stalker', 'heartbeat', 'eyewall', 'smokeskull', 'eyes', 'hands', 'skulls', 'clock', 'spiders',
           // OLED set: long stretches of true black, then something arrives
           'thedark', 'powercut', 'breath', 'countdown', 'approach', 'blinkcloser',
           'photoflash', 'interference', 'match', 'tally', 'orb', 'borgscene'],

  // Messages used by the glitch-text scene and the Ouija board.
  MESSAGES: [
    'WE SEE YOU', "DON'T TURN AROUND", "IT'S BEHIND YOU", 'HAPPY HALLOWEEN', 'THE DEAD ARE RESTLESS',
    'SOMETHING IS IN THE WALLS', 'DID YOU HEAR THAT?', 'RUN', "YOU SHOULDN'T HAVE COME", "THEY'RE HERE",
    'STAY OUT OF THE BASEMENT', 'KNOCK KNOCK', 'WHO INVITED THEM?', 'COUNT THE GUESTS AGAIN',
    'THE LIGHTS WILL GO OUT', 'ONE OF YOU IS NOT ALIVE', 'LOOK UP', 'IT KNOWS YOUR NAME',
    // short, blunt and menacing: these keep working even when the wall is talking about the music
    'GET OUT', 'REDRUM', 'LET ME IN', 'NO ONE LEAVES', 'YOU ARE NEXT', 'BEHIND YOU',
    'HELP US', 'WE NEVER LEFT', 'TOO LATE', 'IT IS IN THE ROOM', 'LOCK THE DOOR',
    'DO NOT SLEEP', 'SAY OUR NAMES', 'YOU BROUGHT IT HOME', 'WE COUNTED YOU',
  ],
  OUIJA_QUEUE: [],         // filled at runtime with messages posted from phones
  OUIJA_QA: [],            // filled at runtime with {q, a} pairs from "ask the spirits"
  OUIJA_WORDS: ['HELLO', 'LEAVE', 'BEHIND YOU', 'RUN', 'WE ARE HERE', 'IT IS COLD', 'HELP ME', 'GOODBYE', 'NOT ALONE', 'LET US IN', 'PICARD'],
};
