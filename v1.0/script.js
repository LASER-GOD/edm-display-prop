(function () {
  "use strict";

  /* ---------- SCALE STAGE TO FIT SCREEN (1080p target) ---------- */
  const stage = document.querySelector(".stage");
  function fitStage() {
    const sx = window.innerWidth / 1920;
    const sy = window.innerHeight / 1080;
    stage.style.transform = "scale(" + Math.min(sx, sy) + ")";
  }
  window.addEventListener("resize", fitStage);
  fitStage();

  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- SPEED CHART (scrolling noisy waveform) ---------- */
  const speedCanvas = document.getElementById("speedChart");
  const speedCtx = speedCanvas.getContext("2d");
  let speedHistory = [];
  const SPEED_POINTS = 240;
  for (let i = 0; i < SPEED_POINTS; i++) speedHistory.push(200 + Math.random() * 40);

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
  }

  function drawSpeedChart() {
    resizeCanvas(speedCanvas);
    const w = speedCanvas.width, h = speedCanvas.height;
    speedCtx.clearRect(0, 0, w, h);

    // gridlines
    speedCtx.strokeStyle = "rgba(255,255,255,0.15)";
    speedCtx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const x = (w / 6) * i;
      speedCtx.beginPath(); speedCtx.moveTo(x, 0); speedCtx.lineTo(x, h); speedCtx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      speedCtx.beginPath(); speedCtx.moveTo(0, y); speedCtx.lineTo(w, y); speedCtx.stroke();
    }

    speedCtx.save();
    speedCtx.shadowColor = "rgba(255,59,48,0.7)";
    speedCtx.shadowBlur = 6 * devicePixelRatio;
    speedCtx.strokeStyle = "#ff3b30";
    speedCtx.lineWidth = 2 * devicePixelRatio;
    speedCtx.beginPath();
    const maxVal = 480; // scaled for visible motion; axis label is cosmetic
    speedHistory.forEach((v, i) => {
      const x = (i / (SPEED_POINTS - 1)) * w;
      const y = h - (v / maxVal) * h;
      if (i === 0) speedCtx.moveTo(x, y); else speedCtx.lineTo(x, y);
    });
    speedCtx.stroke();
    speedCtx.restore();
  }

  // wandering multi-wave signal so the trace visibly rises and falls,
  // not just jitters in place
  let speedT = 0;
  function tickSpeed() {
    speedT += 0.10;
    const target = 210
      + Math.sin(speedT) * 90
      + Math.sin(speedT * 0.41 + 1.3) * 35;
    const last = speedHistory[speedHistory.length - 1];
    let next = last + (target - last) * 0.18 + rand(-10, 10);
    next = Math.max(20, Math.min(400, next));
    speedHistory.push(next);
    speedHistory.shift();
  }

  /* ---------- DEPTH CHART (step-down settling curve) ---------- */
  const depthCanvas = document.getElementById("depthChart");
  const depthCtx = depthCanvas.getContext("2d");
  const DEPTH_POINTS = 90;
  let depthPhase = 0;

  function depthCurve(phase) {
    // builds a decaying curve from 0 -> settled value, phase shifts the settle point slightly
    const pts = [];
    const settle = 40 + Math.sin(phase / 22) * 9 + Math.sin(phase / 7) * 3;
    for (let i = 0; i < DEPTH_POINTS; i++) {
      const t = i / (DEPTH_POINTS - 1);
      let v;
      if (t < 0.35) {
        v = (t / 0.35) * settle * 0.15;
      } else if (t < 0.55) {
        const tt = (t - 0.35) / 0.2;
        v = settle * 0.15 + tt * settle * 0.75;
      } else {
        const tt = (t - 0.55) / 0.45;
        v = settle * 0.9 + tt * settle * 0.1
          + Math.sin(phase / 6 + i * 0.3) * 1.4
          + Math.sin(phase / 2.1 + i) * 0.5;
      }
      pts.push(v);
    }
    return pts;
  }

  function drawDepthChart() {
    resizeCanvas(depthCanvas);
    const w = depthCanvas.width, h = depthCanvas.height;
    depthCtx.clearRect(0, 0, w, h);

    depthCtx.strokeStyle = "rgba(255,255,255,0.15)";
    depthCtx.lineWidth = 1;
    for (let i = 1; i < 9; i++) {
      const x = (w / 9) * i;
      depthCtx.beginPath(); depthCtx.moveTo(x, 0); depthCtx.lineTo(x, h); depthCtx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      depthCtx.beginPath(); depthCtx.moveTo(0, y); depthCtx.lineTo(w, y); depthCtx.stroke();
    }

    const pts = depthCurve(depthPhase);
    const maxVal = 47.24;
    depthCtx.save();
    depthCtx.shadowColor = "rgba(255,59,48,0.7)";
    depthCtx.shadowBlur = 6 * devicePixelRatio;
    depthCtx.strokeStyle = "#ff3b30";
    depthCtx.lineWidth = 2 * devicePixelRatio;
    depthCtx.beginPath();
    pts.forEach((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = (v / maxVal) * h;
      if (i === 0) depthCtx.moveTo(x, y); else depthCtx.lineTo(x, y);
    });
    depthCtx.stroke();
    depthCtx.restore();
  }

  // scrolling x-axis + fluctuating H/R/T legend so the right chart reads as live
  let depthAxisBase = 8560;
  const depthAxisEls = document.querySelectorAll("#depthXLabels span");
  function scrollDepthAxis() {
    depthAxisBase += 10;
    depthAxisEls.forEach((el, i) => { el.textContent = depthAxisBase + i * 10; });
  }
  const depthLegendEl = document.getElementById("depthLegend");
  function tickDepthLegend() {
    const H = (47.244 + Math.sin(Date.now() / 6000) * 1.2).toFixed(4);
    const R = (11.027 + Math.cos(Date.now() / 5000) * 0.6).toFixed(4);
    const T = (501.23 + rand(-3, 3)).toFixed(2);
    depthLegendEl.textContent = "H=" + H + " - R=" + R + " - T= " + T;
  }

  /* ---------- ANALOG GAUGE DIAL ---------- */
  const dialTicks = document.getElementById("dialTicks");
  const dialLabels = document.getElementById("dialLabels");
  const cx = 150, cy = 150, rOuter = 122, rInner = 108, rLabel = 92;
  // single sweep speedometer style: 0 at lower-left, 0.045 at lower-right, going clockwise through top
  const SWEEP_START = -135, SWEEP_END = 135, MAX_VAL = 45;
  function valToAngle(v) { return SWEEP_START + (v / MAX_VAL) * (SWEEP_END - SWEEP_START); }

  for (let v = 0; v <= MAX_VAL; v++) {
    const angle = valToAngle(v);
    const rad = (angle - 90) * Math.PI / 180;
    const isMajor = v % 5 === 0;
    const r1 = rOuter;
    const r2 = isMajor ? rInner - 6 : rInner + 4;
    const x1 = cx + r1 * Math.cos(rad), y1 = cy + r1 * Math.sin(rad);
    const x2 = cx + r2 * Math.cos(rad), y2 = cy + r2 * Math.sin(rad);
    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", x1); tick.setAttribute("y1", y1);
    tick.setAttribute("x2", x2); tick.setAttribute("y2", y2);
    tick.setAttribute("class", "tick" + (isMajor ? " major" : ""));
    dialTicks.appendChild(tick);
  }
  for (let v = 0; v <= MAX_VAL; v += 5) {
    const angle = valToAngle(v);
    const rad = (angle - 90) * Math.PI / 180;
    const x = cx + rLabel * Math.cos(rad);
    const y = cy + rLabel * Math.sin(rad) + 5;
    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", x); txt.setAttribute("y", y);
    txt.setAttribute("class", "dial-num");
    txt.textContent = v === 0 ? "0" : "0." + String(v).padStart(3, "0");
    dialLabels.appendChild(txt);
  }

  const needle = document.getElementById("needle");

  /* ---------- LED DOT-MATRIX CLOCK (same look as the CA Lasers Digital Clock app) ---------- */
  const FONT_MINI = {
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
    "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
    "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
    "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
    ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
    " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."]
  };
  const DIM_DOT = "rgba(12,36,48,0.9)";
  const CORE_DOT = "rgb(185,250,255)";
  const GLOW_DOT = "rgba(0,200,255,0.9)";

  const ledCanvas = document.getElementById("ledClock");
  const ledCtx = ledCanvas.getContext("2d");
  const LED_DOT = 6, LED_GAP = 2, LED_CHARGAP = 6;

  function renderLedText(canvas, ctx, text) {
    const cp = LED_DOT + LED_GAP;
    const charW = 5 * cp;
    const w = text.length * charW + (text.length - 1) * LED_CHARGAP;
    const h = 7 * cp;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (let ci = 0; ci < text.length; ci++) {
      const pattern = FONT_MINI[text[ci]] || FONT_MINI[" "];
      const originX = ci * (charW + LED_CHARGAP);
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          const lit = pattern[row][col] === "#";
          const x = originX + col * cp + cp / 2;
          const y = row * cp + cp / 2;
          ctx.beginPath();
          if (lit) {
            ctx.save();
            ctx.shadowColor = GLOW_DOT;
            ctx.shadowBlur = 6;
            ctx.fillStyle = CORE_DOT;
            ctx.arc(x, y, LED_DOT / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            ctx.fillStyle = DIM_DOT;
            ctx.arc(x, y, LED_DOT * 0.42, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  function updateLedClock() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    const sep = d.getSeconds() % 2 === 0 ? ":" : " ";
    const text = pad(d.getHours()) + sep + pad(d.getMinutes()) + sep + pad(d.getSeconds());
    renderLedText(ledCanvas, ledCtx, text);
  }

  /* ---------- LIVE VALUE ELEMENTS ---------- */
  const elCoordX = document.getElementById("coordX");
  const elCoordY = document.getElementById("coordY");
  const elCoordZ = document.getElementById("coordZ");
  const elValSpeed = document.getElementById("valSpeed");
  const elValI = document.getElementById("valI");
  const elValTVB = document.getElementById("valTVB");
  const elMiniZm = document.getElementById("miniZm");
  const elZBig = document.getElementById("zBig");
  const elZOffset = document.getElementById("zOffset");
  const elStatusPulse = document.getElementById("statusPulse");
  const elLampRed = document.getElementById("lampRed");

  let pulse = 80115963;
  let baseX = 123.456, baseY = 123.456, baseZ = 123.456;

  function fmt6(n) { return n.toFixed(6); }

  function tickValues() {
    baseX += rand(-0.02, 0.02);
    baseY += rand(-0.02, 0.02);
    baseZ += rand(-0.02, 0.02);
    elCoordX.textContent = baseX.toFixed(3);
    elCoordY.textContent = baseY.toFixed(3);
    elCoordZ.textContent = baseZ.toFixed(3);

    elValSpeed.textContent = fmt6(5197.259627 + rand(-8, 8));
    elValI.textContent = (5.1 + rand(-0.15, 0.15)).toFixed(2);
    elValTVB.textContent = (39.4 + rand(-0.5, 0.5)).toFixed(1);

    const zm = -1.02563 + rand(-0.02, 0.02);
    elMiniZm.textContent = (zm >= 0 ? "+" : "-") + Math.abs(zm).toFixed(6).padStart(9, "0");

    const zBig = -2.574528 + Math.sin(Date.now() / 4000) * 0.4;
    elZBig.textContent = (zBig >= 0 ? "+" : "-") + Math.abs(zBig).toFixed(6).padStart(9, "0");
    const zOs = 29.531591 + Math.cos(Date.now() / 5000) * 0.3;
    elZOffset.textContent = "Zos+" + zOs.toFixed(6);

    pulse += Math.floor(rand(1, 40));
    elStatusPulse.textContent = String(pulse).padStart(9, "0");

    // gauge needle follows the same signal, mapped across the 0-0.045 sweep
    const gaugeVal = 22.5 + Math.sin(Date.now() / 4000) * 20; // 0..45ish in thousandths units
    needle.style.transform = "rotate(" + valToAngle(gaugeVal) + "deg)";
  }

  /* ---------- BLINKING RED LAMP ---------- */
  setInterval(() => {
    elLampRed.classList.toggle("on");
  }, 900);

  /* ---------- LOG TICKER ---------- */
  const logMessages = [
    "SRV I #0000: First Spark",
    "SRV I #0000: End Eros:108 um",
    "SRV I #0000: Servo gain adjusted",
    "SRV I #0000: Flushing pressure nominal",
    "SRV I #0000: Wire tension stable",
    "SRV I #0000: Depth control locked",
    "SRV I #0000: Dielectric level OK",
    "SRV I #0000: Cycle checkpoint saved",
    "SRV I #0000: Short circuit cleared",
    "SRV I #0000: Erosion rate nominal"
  ];
  const line1 = document.getElementById("logLine1");
  const line2 = document.getElementById("logLine2");

  function timestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return pad(d.getDate()) + "-" + pad(d.getMonth() + 1) + "-" + d.getFullYear() + " " +
      pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function pushLog() {
    const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
    line2.textContent = line1.textContent;
    line1.textContent = timestamp() + "  " + msg;
  }
  line1.textContent = timestamp() + "  " + logMessages[0];
  line2.textContent = timestamp() + "  " + logMessages[1];

  /* ---------- AUTO-UPDATE ----------
     Kiosk/TV displays run this page for days at a time. Poll version.json
     (bump its "version" field on every deploy) and reload the page the
     moment a newer build is published, so the screen self-updates with
     no one touching it. */
  const CURRENT_VERSION = document.querySelector('meta[name="app-version"]').content;
  async function checkForUpdate() {
    try {
      const res = await fetch("version.json?_=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== CURRENT_VERSION) {
        window.location.reload();
      }
    } catch (e) {
      // offline or not served over http(s) - just retry on the next interval
    }
  }
  setInterval(checkForUpdate, 5 * 60 * 1000);

  /* ---------- MAIN LOOPS ---------- */
  function animate() {
    drawSpeedChart();
    drawDepthChart();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  setInterval(() => { tickSpeed(); }, 120);
  setInterval(() => { depthPhase++; }, 200);
  setInterval(tickValues, 200);
  setInterval(pushLog, 4000);
  setInterval(scrollDepthAxis, 3000);
  setInterval(tickDepthLegend, 500);
  setInterval(updateLedClock, 1000);
  updateLedClock();

})();
