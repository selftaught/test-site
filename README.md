# 📻 CQ Ham — A Fun Guide to Amateur Radio

CQ CQ CQ! A lightweight, dependency-free **static website** that makes amateur
(ham) radio approachable and fun. It explains what ham radio is, lets you
explore the HF/VHF/UHF bands, translate text into **Morse code** (with real
sidetone audio and a blinking lamp), spell words with the **NATO phonetic
alphabet**, and walk through how to get licensed.

Everything is plain **HTML, CSS, and vanilla JavaScript** — no build step, no
frameworks. It's served in production by **nginx** from a tiny Docker image.

## Features

- 🌊 **Interactive band explorer** — tap a band to learn its personality
- 📟 **Morse code translator** — Web Audio sidetone at adjustable WPM (PARIS timing)
- 🔤 **NATO phonetic speller** — type your callsign, see it spelled out
- 🔎 **Q-code cheat sheet** — searchable list of common radio shorthand
- ☀️ **Space weather & propagation** — SFI/K/A gauges plus a day/night band-condition
  guide computed from your local time (illustrative, no live feed)
- 🗼 **Repeater finder** — search a sample directory by city, callsign, or band
- 📰 **Fun-fact ticker** and retro "radio dial" styling
- ♿ Respects `prefers-reduced-motion`, keyboard-friendly, responsive

## Project structure

```
.
├── index.html        # the whole page
├── css/styles.css    # retro-radio styling
├── js/main.js        # bands, Morse, phonetics, ticker (no deps)
├── nginx.conf        # server config (caching, gzip, security headers)
├── Dockerfile        # nginx:alpine image serving the static content
├── .dockerignore
└── .gitignore
```

## Run locally (no Docker)

Any static file server works. For example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Run with Docker 🐳

Build the image and serve it with nginx:

```bash
docker build -t ham-radio-site .
docker run --rm -p 8080:80 ham-radio-site
```

Then open <http://localhost:8080>.

The image is `nginx:1.27-alpine` with the static files baked in and a small
healthcheck that pings the served page.

## Development notes

- Morse timing uses the standard **PARIS** method: `unit_ms = 1200 / WPM`.
- Audio uses the **Web Audio API** (a 600 Hz sine sidetone). Playback starts on
  a user click so browsers allow the audio context to resume.
- No external requests, fonts, or trackers — it works fully offline.

## License

Educational fan project. Not affiliated with the FCC, ARRL, or any regulatory
body. Use, remix, and share freely. **73!**
