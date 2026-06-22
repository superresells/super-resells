BACKGROUND MUSIC — how to use your own track
============================================

Right now the site plays a built-in DEMO BEAT (synthesized in the
browser) so you can hear the player working. To swap in a real song:

1. Get a ROYALTY-FREE / licensed-for-web hip hop track.
   Do NOT use a commercial song (Drake, Travis Scott, etc.) — that's
   copyright infringement and can get the site taken down.
   Good free sources (search "trap" or "lofi hip hop"):
     • https://pixabay.com/music/
     • https://uppbeat.io/
     • https://www.chosic.com/free-music/
   Check the license says commercial / website use is allowed.

2. Save the file in this folder as exactly:
     track.mp3

3. Open  script.js , find the MUSIC config near the bottom, and change:
     placeholder: true,   ->   placeholder: false,

Done. The floating button (bottom-left) now plays your track on a loop.
It stays OFF until the visitor taps it, and remembers their choice as
they move between pages.
