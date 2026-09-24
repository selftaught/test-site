/* ============================================================
   CQ Ham — interactive bits: bands, Morse code, phonetics, ticker
   Vanilla JS, no dependencies. 73!
   ============================================================ */

(() => {
  "use strict";

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Fun fact ticker ---------- */
  const FACTS = [
    "📡 There are over 3 million licensed hams worldwide.",
    "🛰️ Astronauts on the ISS chat with hams using callsign NA1SS.",
    "🌩️ Hams provide emergency comms when everything else fails.",
    "🌙 Moonbounce (EME) lets hams use the Moon as a passive reflector.",
    "⚡ '73' means best regards; '88' means love and kisses.",
    "🎙️ 'CQ' is a general call meaning 'seeking you' — anyone, come back!",
    "📶 The 20-meter band can span continents with only a few watts.",
    "🔋 A QRP station runs 5 watts or less — less than a night light.",
    "🌍 Special 'DXpeditions' activate rare islands just to be worked.",
    "👵 Guglielmo Marconi's early work inspired today's amateur radio.",
  ];
  const track = document.getElementById("tickerTrack");
  if (track) {
    const make = () =>
      FACTS.map((f) => `<span>${f}</span>`).join("");
    // duplicate content so the -50% scroll loops seamlessly
    track.innerHTML = make() + make();
  }

  /* ---------- Bands ---------- */
  const BANDS = [
    { name: "160m", freq: "1.8 MHz", desc: "The 'Top Band' — a nighttime workhorse for regional ragchews. Needs big antennas but rewards patience." },
    { name: "80m", freq: "3.5 MHz", desc: "Great after dark for nets and nearby contacts across your region and country." },
    { name: "40m", freq: "7 MHz", desc: "The reliable all-rounder: regional by day, continental (and beyond) by night." },
    { name: "20m", freq: "14 MHz", desc: "The DX superstar 🌎 — daytime long-haul contacts across oceans, even with low power." },
    { name: "15m", freq: "21 MHz", desc: "Opens up during high solar activity for exciting worldwide daytime DX." },
    { name: "10m", freq: "28 MHz", desc: "When the sun cooperates, tiny signals travel huge distances. Loved by newcomers." },
    { name: "2m", freq: "144 MHz", desc: "VHF for local FM repeaters, emergency nets, and satellite work. Handheld friendly!" },
    { name: "70cm", freq: "440 MHz", desc: "UHF for repeaters, data, and hitting ham satellites with a modest antenna." },
  ];
  const grid = document.getElementById("bandGrid");
  const detail = document.getElementById("bandDetail");
  if (grid && detail) {
    BANDS.forEach((b, i) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "band-chip";
      chip.setAttribute("role", "listitem");
      chip.innerHTML = `<div class="b-name">${b.name}</div><div class="b-freq">${b.freq}</div>`;
      chip.addEventListener("click", () => {
        document.querySelectorAll(".band-chip.active").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        detail.innerHTML = `<strong>${b.name} (${b.freq}):</strong> ${b.desc}`;
      });
      grid.appendChild(chip);
      if (i === 3) chip.click(); // default-highlight 20m, the crowd favorite
    });
  }

  /* ---------- Morse code ---------- */
  const MORSE = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
    H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
    O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
    V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
    0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....",
    6: "-....", 7: "--...", 8: "---..", 9: "----.",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
    "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
    ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
    '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
  };

  const toMorse = (text) =>
    text
      .toUpperCase()
      .split("")
      .map((ch) => {
        if (ch === " ") return "/";
        return MORSE[ch] || "";
      })
      .filter(Boolean)
      .join(" ")
      .replace(/\s*\/\s*/g, "   ");

  const morseInput = document.getElementById("morseInput");
  const morseOutput = document.getElementById("morseOutput");
  const playBtn = document.getElementById("playMorse");
  const stopBtn = document.getElementById("stopMorse");
  const wpmSlider = document.getElementById("wpm");
  const wpmVal = document.getElementById("wpmVal");
  const lamp = document.getElementById("lamp");

  const updateMorse = () => {
    if (!morseInput || !morseOutput) return;
    const val = morseInput.value.trim();
    morseOutput.textContent = val ? toMorse(val) : "";
  };
  if (morseInput) morseInput.addEventListener("input", updateMorse);

  if (wpmSlider && wpmVal) {
    wpmSlider.addEventListener("input", () => {
      wpmVal.textContent = `${wpmSlider.value} WPM`;
    });
  }

  /* --- Web Audio playback --- */
  let audioCtx = null;
  let playToken = 0; // increments to cancel in-flight playback

  const getCtx = () => {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  };

  const sleep = (ms, token) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => (token() ? resolve() : reject(new Error("cancelled"))), ms);
      // guard against long waits after cancel
      if (!token()) { clearTimeout(t); reject(new Error("cancelled")); }
    });

  async function playMorse() {
    const code = morseOutput ? morseOutput.textContent.trim() : "";
    if (!code) return;
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") await ctx.resume();

    const myToken = ++playToken;
    const active = () => myToken === playToken;

    // PARIS timing: unit (ms) = 1200 / WPM
    const wpm = wpmSlider ? Number(wpmSlider.value) : 15;
    const unit = 1200 / wpm;

    const beep = (durUnits) =>
      new Promise((resolve) => {
        const dur = durUnits * unit;
        if (ctx) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 600; // classic CW sidetone
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.005);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + dur / 1000);
        }
        if (lamp) lamp.classList.add("on");
        setTimeout(() => {
          if (lamp) lamp.classList.remove("on");
          resolve();
        }, dur);
      });

    try {
      if (playBtn) playBtn.disabled = true;
      for (const symbol of code.split("")) {
        if (!active()) break;
        if (symbol === ".") { await beep(1); await sleep(unit, active); }
        else if (symbol === "-") { await beep(3); await sleep(unit, active); }
        else if (symbol === " ") { await sleep(2 * unit, active); } // letter gap (1 already after symbol)
      }
    } catch (_) {
      /* cancelled — that's fine */
    } finally {
      if (lamp) lamp.classList.remove("on");
      if (playBtn && active()) playBtn.disabled = false;
      if (playBtn && !active()) playBtn.disabled = false;
    }
  }

  function stopMorse() {
    playToken++; // invalidate any running loop
    if (lamp) lamp.classList.remove("on");
    if (playBtn) playBtn.disabled = false;
  }

  if (playBtn) playBtn.addEventListener("click", playMorse);
  if (stopBtn) stopBtn.addEventListener("click", stopMorse);

  // seed the default output
  updateMorse();
  if (morseInput && !morseInput.value) {
    morseOutput.textContent = toMorse("HELLO WORLD");
  }

  /* ---------- Phonetic alphabet ---------- */
  const PHONETIC = {
    A: "Alfa", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
    G: "Golf", H: "Hotel", I: "India", J: "Juliett", K: "Kilo", L: "Lima",
    M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
    S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey",
    X: "X-ray", Y: "Yankee", Z: "Zulu",
    0: "Zero", 1: "One", 2: "Two", 3: "Three", 4: "Four",
    5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Niner",
  };
  const phoneticInput = document.getElementById("phoneticInput");
  const phoneticOutput = document.getElementById("phoneticOutput");

  const updatePhonetic = () => {
    if (!phoneticInput || !phoneticOutput) return;
    const val = (phoneticInput.value || "W1AW").toUpperCase();
    phoneticOutput.innerHTML = val
      .split("")
      .map((ch) => {
        if (ch === " ") return "";
        const word = PHONETIC[ch];
        if (!word) return "";
        return `<span class="ph-item"><span class="ph-letter">${ch}</span> <span class="ph-word">${word}</span></span>`;
      })
      .filter(Boolean)
      .join("");
  };
  if (phoneticInput) phoneticInput.addEventListener("input", updatePhonetic);
  updatePhonetic();

  /* ---------- Q-codes cheat sheet ---------- */
  const QCODES = [
    { code: "QRZ", mean: "Who is calling me?", note: "Also the name of a popular callsign lookup site." },
    { code: "QTH", mean: "My location is…", note: "\"What's your QTH?\" = where are you?" },
    { code: "QSL", mean: "I acknowledge receipt.", note: "A 'QSL card' confirms a contact by mail." },
    { code: "QSO", mean: "A two-way contact / conversation.", note: "\"I had a nice QSO with Japan.\"" },
    { code: "QRP", mean: "Low power (5 W or less).", note: "A fun challenge — go far on little." },
    { code: "QRO", mean: "High power.", note: "The opposite of QRP." },
    { code: "QRM", mean: "Man-made interference.", note: "Other stations, electrical noise." },
    { code: "QRN", mean: "Natural interference / static.", note: "Lightning and atmospheric noise." },
    { code: "QSB", mean: "Your signal is fading.", note: "Signal strength rising and falling." },
    { code: "QSY", mean: "Change frequency.", note: "\"Let's QSY up 5.\"" },
    { code: "QRT", mean: "I am stopping transmission.", note: "Shutting down / going off the air." },
    { code: "QRV", mean: "I am ready.", note: "\"Are you QRV?\" = ready to go?" },
    { code: "QRX", mean: "Stand by / wait.", note: "\"QRX 5 minutes.\"" },
    { code: "QRL", mean: "Is this frequency busy?", note: "Always ask before transmitting." },
    { code: "QTR", mean: "The correct time is…", note: "Exchanging the time of day." },
    { code: "QRA", mean: "The name of my station is…", note: "Station identity." },
  ];
  const qcodeTable = document.getElementById("qcodeTable");
  const qcodeSearch = document.getElementById("qcodeSearch");
  const qcodeEmpty = document.getElementById("qcodeEmpty");

  const renderQcodes = (filter = "") => {
    if (!qcodeTable) return;
    const q = filter.trim().toLowerCase();
    const matches = QCODES.filter(
      (x) =>
        !q ||
        x.code.toLowerCase().includes(q) ||
        x.mean.toLowerCase().includes(q) ||
        x.note.toLowerCase().includes(q)
    );
    qcodeTable.innerHTML = matches
      .map(
        (x) =>
          `<div class="qcode-row" role="listitem">
             <span class="qcode-code">${x.code}</span>
             <p class="qcode-mean">${x.mean}<small>${x.note}</small></p>
           </div>`
      )
      .join("");
    if (qcodeEmpty) qcodeEmpty.hidden = matches.length !== 0;
  };
  if (qcodeSearch) qcodeSearch.addEventListener("input", () => renderQcodes(qcodeSearch.value));
  renderQcodes();

  /* ---------- Propagation / space weather ---------- */
  // Illustrative typical values (NOT live data) so the page stays offline.
  const sfiEl = document.getElementById("sfiVal");
  const kEl = document.getElementById("kVal");
  const aEl = document.getElementById("aVal");
  if (sfiEl) sfiEl.textContent = "128";
  if (kEl) kEl.textContent = "2";
  if (aEl) aEl.textContent = "8";

  const propClock = document.getElementById("propClock");
  const bandConditions = document.getElementById("bandConditions");

  const renderConditions = () => {
    if (!bandConditions) return;
    const now = new Date();
    const hour = now.getHours();
    const isDay = hour >= 7 && hour < 19; // rough local daylight window
    if (propClock) {
      propClock.textContent =
        "· " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " local (" + (isDay ? "day" : "night") + ")";
    }

    // High bands favor daytime; low bands favor nighttime. Simple, educational.
    const bands = [
      { band: "80m", day: "poor", night: "good" },
      { band: "40m", day: "fair", night: "good" },
      { band: "20m", day: "good", night: "fair" },
      { band: "15m", day: "good", night: "poor" },
      { band: "10m", day: "fair", night: "poor" },
      { band: "2m",  day: "fair", night: "fair" },
    ];
    const label = { good: "Good", fair: "Fair", poor: "Poor" };
    bandConditions.innerHTML = bands
      .map((b) => {
        const cond = isDay ? b.day : b.night;
        return `<div class="cond-item" role="listitem">
                  <span class="cond-band">${b.band}</span>
                  <span class="cond-badge cond-${cond}">${label[cond]}</span>
                </div>`;
      })
      .join("");
  };
  renderConditions();
  // refresh the clock/conditions each minute
  setInterval(renderConditions, 60 * 1000);

  /* ---------- Repeater finder (sample data) ---------- */
  const REPEATERS = [
    { call: "W1AW",  band: "2m",   loc: "Newington, CT",     out: "146.760", offset: "-0.6 MHz", tone: "100.0" },
    { call: "K6FB",  band: "70cm", loc: "San Francisco, CA", out: "443.225", offset: "+5.0 MHz", tone: "82.5" },
    { call: "W7ARA", band: "2m",   loc: "Phoenix, AZ",       out: "147.360", offset: "+0.6 MHz", tone: "162.2" },
    { call: "N5XYZ", band: "70cm", loc: "Austin, TX",        out: "444.550", offset: "+5.0 MHz", tone: "88.5" },
    { call: "W9ABC", band: "2m",   loc: "Chicago, IL",       out: "145.230", offset: "-0.6 MHz", tone: "107.2" },
    { call: "K4JAX", band: "70cm", loc: "Jacksonville, FL",  out: "442.900", offset: "+5.0 MHz", tone: "94.8" },
    { call: "W0DEN", band: "2m",   loc: "Denver, CO",        out: "146.940", offset: "-0.6 MHz", tone: "103.5" },
    { call: "K7SEA", band: "70cm", loc: "Seattle, WA",       out: "441.800", offset: "+5.0 MHz", tone: "103.5" },
    { call: "W2NYC", band: "2m",   loc: "New York, NY",      out: "146.610", offset: "-0.6 MHz", tone: "114.8" },
    { call: "N8CLE", band: "70cm", loc: "Cleveland, OH",     out: "443.750", offset: "+5.0 MHz", tone: "110.9" },
  ];
  const repeaterList = document.getElementById("repeaterList");
  const repeaterSearch = document.getElementById("repeaterSearch");
  const repeaterBand = document.getElementById("repeaterBand");
  const repeaterEmpty = document.getElementById("repeaterEmpty");

  const renderRepeaters = () => {
    if (!repeaterList) return;
    const q = (repeaterSearch ? repeaterSearch.value : "").trim().toLowerCase();
    const band = repeaterBand ? repeaterBand.value : "";
    const matches = REPEATERS.filter((r) => {
      const bandOk = !band || r.band === band;
      const textOk =
        !q || r.call.toLowerCase().includes(q) || r.loc.toLowerCase().includes(q);
      return bandOk && textOk;
    });
    repeaterList.innerHTML = matches
      .map(
        (r) =>
          `<div class="rep-card" role="listitem">
             <div class="rep-top">
               <span class="rep-call">${r.call}</span>
               <span class="rep-band">${r.band}</span>
             </div>
             <p class="rep-loc">${r.loc}</p>
             <p class="rep-specs">${r.out} MHz · ${r.offset} · PL ${r.tone}</p>
           </div>`
      )
      .join("");
    if (repeaterEmpty) repeaterEmpty.hidden = matches.length !== 0;
  };
  if (repeaterSearch) repeaterSearch.addEventListener("input", renderRepeaters);
  if (repeaterBand) repeaterBand.addEventListener("change", renderRepeaters);
  renderRepeaters();
})();
