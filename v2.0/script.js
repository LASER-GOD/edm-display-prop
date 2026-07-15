(function () {
  "use strict";

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const svgNS = "http://www.w3.org/2000/svg";
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const svgEl = (tag, attrs) => {
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  /* ---------- SCALE STAGE TO FIT SCREEN ---------- */
  const stage = document.getElementById("stage");
  function fitStage() {
    const sx = window.innerWidth / 1920;
    const sy = window.innerHeight / 1080;
    stage.style.transform = "scale(" + Math.min(sx, sy) + ")";
  }
  window.addEventListener("resize", fitStage);
  fitStage();

  /* =========================================================
     LCD TILE BLOCK
     ========================================================= */
  const LCD_ROWS = [
    [{ lbl: "Barometer", val: 993, unit: "mbar", hi: true, drift: 0.3 },
     { lbl: "Outside Temp", val: 54.2, unit: "°F", drift: 0.15 },
     { lbl: "Water Temp", val: 60.4, unit: "°F", drift: 0.1 },
     { lbl: "Wind Speed", val: 6.9, unit: "knots", drift: 0.8, link: "wind" }],
    [{ lbl: "5m Max Pitch", val: 0.5, unit: "deg", drift: 0.1 },
     { lbl: "5m Max Roll", val: 1.0, unit: "deg", drift: 0.1 },
     { lbl: "Battery Temp", val: 79.0, unit: "°F", drift: 0.05 },
     { lbl: "Water Depth", val: 13.8, unit: "feet", hi: true, drift: 0.2 }],
    [{ lbl: "Engine Room Temp", val: 80.6, unit: "°F", drift: 0.1 },
     { lbl: "Laz Temp", val: 89.6, unit: "°F", drift: 0.05 },
     { lbl: "Furnace Temp", val: 174, unit: "°F", drift: 0.4 },
     { lbl: "Laz Freezer Temp", val: 2.7, unit: "°F", drift: 0.05 }],
    [{ lbl: "Gen Tach", val: 1778, unit: "RPM", drift: 2, int: true },
     { lbl: "Gen Oil Pres", val: 57.8, unit: "psi", drift: 0.2 },
     { lbl: "Gen Temp", val: 185, unit: "°F", drift: 0.3 },
     { lbl: "Gen Time", val: "00:08", unit: "hr:mm", static: true }],
    [{ lbl: "Shore 2 Total kWh", val: 2326, unit: "Kilowatt-hours", drift: 0.02, int: true, upOnly: true },
     { lbl: "Shore 2 Volts", val: 1.0, unit: "Volts", drift: 0.02 },
     { lbl: "Shore 1 Total kWh", val: 21852, unit: "Kilowatt-hours", drift: 0.02, int: true, upOnly: true },
     { lbl: "Shore 1 Volts", val: 1.0, unit: "Volts", drift: 0.02 }],
    [{ lbl: "House Bank Volts", val: 28.0, unit: "Volts", drift: 0.08 },
     { lbl: "Main Start Bank Volts", val: 26.3, unit: "Volts", drift: 0.08 },
     { lbl: "Wing/Gen Bat Volts", val: 26.8, unit: "Volts", drift: 0.08 },
     { lbl: "Generator Total kWh", val: 17306, unit: "Kilowatt-hours", drift: 0.02, int: true, upOnly: true }]
  ];
  const lcdEntries = [];
  function buildLCDBlock() {
    const host = document.getElementById("lcdBlock");
    LCD_ROWS.forEach(row => {
      row.forEach(item => {
        const tile = el("div", "lcd-tile" + (item.hi ? " hi" : ""));
        tile.appendChild(el("div", "lbl", item.lbl));
        const valEl = el("div", "val", formatLcd(item));
        tile.appendChild(valEl);
        tile.appendChild(el("div", "unit", item.unit));
        host.appendChild(tile);
        lcdEntries.push({ item, valEl });
      });
    });
  }
  function formatLcd(item) {
    if (item.static) return item.val;
    if (item.int) return Math.round(item.val).toLocaleString();
    return Number(item.val).toFixed(item.val < 10 && !Number.isInteger(item.val) ? 1 : 1);
  }
  function tickLcd() {
    lcdEntries.forEach(({ item, valEl }) => {
      if (item.static || !item.drift) return;
      if (item.upOnly) {
        if (Math.random() < 0.15) item.val += rand(0, item.drift * 5);
      } else {
        item.val += rand(-item.drift, item.drift);
      }
      if (item.link === "wind") windSpeedShared.val = item.val;
      valEl.textContent = formatLcd(item);
    });
  }
  const windSpeedShared = { val: 6.9 };

  /* =========================================================
     GAUGES
     ========================================================= */
  const GAUGE_CONFIGS = [
    { id: "gauge-inv110", label: "110V Inverter Amps", min: 0, max: 40, value: 9.0,
      bands: [{ to: 25, color: "var(--green)" }, { to: 35, color: "var(--yellow)" }, { to: 40, color: "var(--red)" }],
      unit: "Amps", walk: 3 },
    { id: "gauge-inv240", label: "240V Inverter Amps", min: 0, max: 35, value: 0.0,
      bands: [{ to: 20, color: "var(--green)" }, { to: 30, color: "var(--yellow)" }, { to: 35, color: "var(--red)" }],
      unit: "Amps", walk: 0.6 },
    { id: "gauge-housebat", label: "House Bat Amps", min: -300, max: 300, value: 198,
      bands: [{ to: -100, color: "var(--blue)" }, { to: 100, color: "var(--green)" }, { to: 250, color: "var(--yellow)" }, { to: 300, color: "var(--red)" }],
      unit: "Amps (Charge)", walk: 20 },
    { id: "gauge-wind", label: "Wind Speed", min: 0, max: 80, value: 7.0,
      bands: [{ to: 30, color: "var(--green)" }, { to: 55, color: "var(--yellow)" }, { to: 80, color: "var(--red)" }],
      unit: "knots", walk: 4 },
    { id: "gauge-gen", label: "Gen Amps", min: 0, max: 50, value: 34.0,
      bands: [{ to: 30, color: "var(--green)" }, { to: 40, color: "var(--yellow)" }, { to: 50, color: "var(--red)" }],
      unit: "Amps", walk: 5 },
    { id: "gauge-shore1", label: "Shore 1 Amps", min: 0, max: 32, value: 0.0,
      bands: [{ to: 19, color: "var(--green)" }, { to: 26, color: "var(--yellow)" }, { to: 32, color: "var(--red)" }],
      unit: "Amps", walk: 0.4 },
    { id: "gauge-shore2", label: "Shore 2 Amps", min: 0, max: 32, value: 0.0,
      bands: [{ to: 19, color: "var(--green)" }, { to: 26, color: "var(--yellow)" }, { to: 32, color: "var(--red)" }],
      unit: "Amps", walk: 0.4 }
  ];
  const SWEEP_START = -135, SWEEP_END = 135;
  function bandColorFor(cfg, v) {
    for (const b of cfg.bands) if (v <= b.to) return b.color;
    return cfg.bands[cfg.bands.length - 1].color;
  }
  function valToAngle(cfg, v) {
    const f = (v - cfg.min) / (cfg.max - cfg.min);
    return SWEEP_START + f * (SWEEP_END - SWEEP_START);
  }
  const gaugeRegistry = [];
  function buildGaugeTile(cfg) {
    const host = document.getElementById(cfg.id);
    host.appendChild(el("div", "panel-label", cfg.label));
    host.appendChild(el("div", "gauge-reset", "Reset"));

    const svg = svgEl("svg", { viewBox: "0 0 130 130", class: "gauge-svg" });
    svg.appendChild(svgEl("circle", { cx: 65, cy: 65, r: 62, fill: "#050505", stroke: "#2a2a2a" }));

    const cx = 65, cy = 65, rOuter = 58, rInner = 50;
    const TICKS = 46;
    for (let i = 0; i <= TICKS; i++) {
      const v = cfg.min + (i / TICKS) * (cfg.max - cfg.min);
      const angle = valToAngle(cfg, v);
      const rad = (angle - 90) * Math.PI / 180;
      const isMajor = i % (TICKS / 6 | 0 || 1) === 0;
      const r1 = rOuter, r2 = isMajor ? rInner - 5 : rInner + 2;
      const x1 = cx + r1 * Math.cos(rad), y1 = cy + r1 * Math.sin(rad);
      const x2 = cx + r2 * Math.cos(rad), y2 = cy + r2 * Math.sin(rad);
      svg.appendChild(svgEl("line", {
        x1, y1, x2, y2, class: "band-tick",
        style: "stroke:" + bandColorFor(cfg, v)
      }));
    }
    // major numeric labels at 0, mid, max
    [cfg.min, (cfg.min + cfg.max) / 2, cfg.max].forEach(v => {
      const angle = valToAngle(cfg, v);
      const rad = (angle - 90) * Math.PI / 180;
      const x = cx + (rInner - 16) * Math.cos(rad);
      const y = cy + (rInner - 16) * Math.sin(rad) + 3;
      const t = svgEl("text", { x, y, class: "gauge-num" });
      t.textContent = Math.round(v);
      svg.appendChild(t);
    });

    const needle = svgEl("line", { x1: cx, y1: cy, x2: cx, y2: cy - 40, class: "needle" });
    svg.appendChild(needle);
    svg.appendChild(svgEl("circle", { cx, cy, r: 5, class: "gauge-hub" }));
    host.appendChild(svg);

    const valueEl = el("div", "gauge-value", cfg.value.toFixed(1));
    host.appendChild(valueEl);
    host.appendChild(el("div", "gauge-unit", cfg.unit));
    host.appendChild(el("div", "gauge-dot"));

    needle.style.transform = "rotate(" + valToAngle(cfg, cfg.value) + "deg)";
    gaugeRegistry.push({ cfg, needle, valueEl });
  }
  function tickGauges() {
    gaugeRegistry.forEach(({ cfg, needle, valueEl }) => {
      cfg.value = clamp(cfg.value + rand(-cfg.walk, cfg.walk) * 0.2, cfg.min, cfg.max);
      needle.style.transform = "rotate(" + valToAngle(cfg, cfg.value) + "deg)";
      valueEl.textContent = cfg.value.toFixed(1);
    });
  }

  /* =========================================================
     CHARTS
     ========================================================= */
  const CHART_CONFIGS = [
    { id: "chart-bar", label: "Barometric Pressure", unit: "mbar", yMax: "1033", yMin: "980", curVal: () => "993", baseline: 60, drift: 0.02, noise: 0.4, spike: 0 },
    { id: "chart-inv110", label: "110V Inverter Amps", unit: "Amps", yMax: "30.0", yMin: "0.0", curVal: () => "9.0", baseline: 15, drift: 0.15, noise: 3, spike: 0.03 },
    { id: "chart-inv240", label: "240V Inverter Amps", unit: "Amps", yMax: "35.0", yMin: "0.0", curVal: () => "0.0", baseline: 4, drift: 0.05, noise: 1, spike: 0.01 },
    { id: "chart-wind", label: "Wind Speed", unit: "knots", yMax: "80.0", yMin: "-0.0", curVal: () => windSpeedShared.val.toFixed(1), baseline: 40, drift: 0.1, noise: 6, spike: 0.02 },
    { id: "chart-gen", label: "Gen Amps", unit: "Amps", yMax: "50.0", yMin: "12.5", curVal: () => "34.0", baseline: 55, drift: 0.1, noise: 4, spike: 0.05 },
    { id: "chart-shore1", label: "Shore 1 Amps", unit: "Amps", yMax: "32.0", yMin: "0.0", curVal: () => "0.0", baseline: 5, drift: 0.03, noise: 0.8, spike: 0.005 },
    { id: "chart-shore2", label: "Shore 2 Amps", unit: "Amps", yMax: "32.0", yMin: "0.0", curVal: () => "0.0", baseline: 5, drift: 0.03, noise: 0.8, spike: 0.005 }
  ];
  const POINTS = 160;
  const chartRegistry = [];
  function buildChartTile(cfg) {
    const host = document.getElementById(cfg.id);
    host.appendChild(el("div", "panel-label", cfg.label));
    const curEl = el("div", "chart-current", "Current Value: " + cfg.curVal());
    host.appendChild(curEl);

    const wrap = el("div", "chart-canvas-wrap");
    const canvas = document.createElement("canvas");
    wrap.appendChild(canvas);
    host.appendChild(wrap);

    const yaxis = el("div", "chart-yaxis");
    yaxis.appendChild(el("span", null, cfg.yMax));
    yaxis.appendChild(el("span", null, cfg.yMin));
    host.appendChild(yaxis);

    const xaxis = el("div", "chart-xaxis");
    ["-12h", "-9h", "-6h", "-3h", "-0h"].forEach(t => xaxis.appendChild(el("span", null, t)));
    host.appendChild(xaxis);

    const controls = el("div", "chart-controls");
    controls.appendChild(el("span", "arrow", "▼"));
    controls.appendChild(el("span", null, "12 Hours"));
    controls.appendChild(el("span", "arrow", "▲"));
    host.appendChild(controls);

    host.appendChild(el("div", "chart-unit", cfg.unit));

    const history = [];
    for (let i = 0; i < POINTS; i++) history.push(cfg.baseline);
    chartRegistry.push({ cfg, canvas, ctx: canvas.getContext("2d"), history, curEl, t: Math.random() * 100 });
  }
  function tickCharts() {
    chartRegistry.forEach(c => {
      c.t += 0.05;
      let target = c.cfg.baseline + Math.sin(c.t) * c.cfg.noise * 2;
      if (Math.random() < c.cfg.spike) target += rand(10, 25);
      const last = c.history[c.history.length - 1];
      let next = last + (target - last) * c.cfg.drift + rand(-c.cfg.noise, c.cfg.noise) * 0.3;
      next = clamp(next, 0, 100);
      c.history.push(next);
      c.history.shift();
      c.curEl.textContent = "Current Value: " + c.cfg.curVal();
    });
  }
  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, rect.width * devicePixelRatio);
    canvas.height = Math.max(1, rect.height * devicePixelRatio);
  }
  function drawCharts() {
    chartRegistry.forEach(c => {
      resizeCanvas(c.canvas);
      const w = c.canvas.width, h = c.canvas.height;
      const ctx = c.ctx;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#4a4416";
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const x = (w / 8) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = "rgba(255,42,42,0.6)";
      ctx.shadowBlur = 4 * devicePixelRatio;
      ctx.strokeStyle = "#ff2a2a";
      ctx.lineWidth = 1.6 * devicePixelRatio;
      ctx.beginPath();
      c.history.forEach((v, i) => {
        const x = (i / (POINTS - 1)) * w;
        const y = h - (v / 100) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    });
  }

  /* =========================================================
     COMPASS
     ========================================================= */
  let compassHeading = 255;
  function buildCompass() {
    const host = document.getElementById("compass");
    host.appendChild(el("div", "compass-title", "Wind Direction"));
    const svg = svgEl("svg", { viewBox: "0 0 150 150", class: "compass-svg" });
    svg.appendChild(svgEl("circle", { cx: 75, cy: 75, r: 70, class: "compass-face" }));
    const letters = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
    letters.forEach(([txt, deg]) => {
      const rad = (deg - 90) * Math.PI / 180;
      const x = 75 + 54 * Math.cos(rad), y = 75 + 54 * Math.sin(rad) + 5;
      const t = svgEl("text", { x, y, class: "compass-letter" });
      t.textContent = txt;
      svg.appendChild(t);
    });
    for (let d = 0; d < 360; d += 30) {
      if (d % 90 === 0) continue;
      const rad = (d - 90) * Math.PI / 180;
      const x = 75 + 60 * Math.cos(rad), y = 75 + 60 * Math.sin(rad) + 3;
      const t = svgEl("text", { x, y, class: "compass-deg" });
      t.textContent = d;
      svg.appendChild(t);
    }
    for (let d = 0; d < 360; d += 10) {
      const rad = (d - 90) * Math.PI / 180;
      const r1 = 70, r2 = d % 30 === 0 ? 63 : 66;
      const x1 = 75 + r1 * Math.cos(rad), y1 = 75 + r1 * Math.sin(rad);
      const x2 = 75 + r2 * Math.cos(rad), y2 = 75 + r2 * Math.sin(rad);
      svg.appendChild(svgEl("line", { x1, y1, x2, y2, stroke: "#3a3a3a", "stroke-width": 1 }));
    }
    const needle = svgEl("g", { id: "compassNeedle" });
    needle.appendChild(svgEl("polygon", { points: "75,20 70,75 80,75", class: "compass-needle-n" }));
    needle.appendChild(svgEl("polygon", { points: "75,130 70,75 80,75", class: "compass-needle-s" }));
    needle.setAttribute("style", "transform-origin:75px 75px;");
    svg.appendChild(needle);
    svg.appendChild(svgEl("circle", { cx: 75, cy: 75, r: 5, fill: "#cfcfcf" }));
    host.appendChild(svg);
    host.appendChild(el("div", "compass-label", "Degrees (true)"));
    window.__compassNeedle = needle;
  }
  function tickCompass() {
    compassHeading = (compassHeading + rand(-1.5, 1.5) + 360) % 360;
    if (window.__compassNeedle) window.__compassNeedle.style.transform = "rotate(" + compassHeading + "deg)";
  }

  /* =========================================================
     TANKS
     ========================================================= */
  const TANK_DATA = [
    { lbl: "Fresh", val: 178, max: 300, unit: "gal/US" },
    { lbl: "Gray", val: 43, max: 110, unit: "gal/US" },
    { lbl: "Black", val: 14, max: 120, unit: "gal/US" },
    { lbl: "Total Fuel", val: 599, max: 1750, unit: "gal" },
    { lbl: "Port", val: 216, max: 675, unit: "gal/US" },
    { lbl: "Stbd", val: 315, max: 675, unit: "gal/US" },
    { lbl: "Wing", val: 15, max: 18, unit: "gal" },
    { lbl: "Supply", val: 54, max: 65, unit: "gal/US" }
  ];
  const tankRegistry = [];
  function buildTankRow() {
    const host = document.getElementById("tankRow");
    TANK_DATA.forEach(t => {
      const tile = el("div", "tank-tile");
      tile.appendChild(el("div", "tank-lbl", t.lbl));
      const barWrap = el("div", "tank-bar-wrap");
      const fill = el("div", "tank-bar-fill");
      barWrap.appendChild(fill);
      tile.appendChild(barWrap);
      const valEl = el("div", "tank-val", t.val);
      tile.appendChild(valEl);
      tile.appendChild(el("div", "tank-unit", t.unit));
      host.appendChild(tile);
      tankRegistry.push({ t, fill, valEl });
    });
  }
  function tankColor(pct) {
    if (pct < 0.15) return "#ff2a2a";
    if (pct < 0.35) return "#f4d51e";
    return "#2ecc55";
  }
  function renderTanks() {
    tankRegistry.forEach(({ t, fill, valEl }) => {
      const pct = clamp(t.val / t.max, 0, 1);
      fill.style.height = (pct * 100) + "%";
      fill.style.background = tankColor(pct);
      valEl.textContent = Math.round(t.val);
    });
  }
  function tickTanks() {
    tankRegistry.forEach(({ t }) => {
      if (Math.random() < 0.3) t.val = clamp(t.val + rand(-0.6, 0.4), 0, t.max);
    });
    renderTanks();
  }

  /* =========================================================
     MISC PANEL (water heater / vsat / twilight times / graph controls)
     ========================================================= */
  function buildMiscPanel() {
    const host = document.getElementById("miscPanel");
    const topRow = el("div", "misc-top-row");
    ["Reset All/Ma..n", "Contract Graphs", "Expand Graphs"].forEach(t => topRow.appendChild(el("div", "misc-btn", t)));
    host.appendChild(topRow);

    const lcdRow = el("div", "misc-lcd-row");
    const wh = el("div", "misc-lcd");
    wh.appendChild(el("div", "val", "138°"));
    wh.appendChild(el("div", "lbl", "Water Heater Temp"));
    const vs = el("div", "misc-lcd");
    vs.appendChild(el("div", "val", "8.0°"));
    vs.appendChild(el("div", "lbl", "VSAT Signal"));
    lcdRow.appendChild(wh); lcdRow.appendChild(vs);
    host.appendChild(lcdRow);

    const times = el("div", "misc-times");
    [["03:43", "Dawn"], ["10:27", "Twilight AM"], ["12:04", "Noon"], ["01:05", "Twilight PM"], ["09:43", "Wkg Element"]]
      .forEach(([t, lbl]) => {
        const d = el("div", "misc-time");
        d.appendChild(el("div", "t", t));
        d.appendChild(document.createTextNode(lbl));
        times.appendChild(d);
      });
    host.appendChild(times);
  }

  /* =========================================================
     BUTTON BAR
     ========================================================= */
  const BUTTON_ROWS = [
    [["Config", "off"], ["Boiler", "off"], ["Heat*", "off"], ["A/C*", "off"], ["W/H*", "on"], ["Dfst*", "off"], ["Shr#1", "off"], ["Shr#2", "off"]],
    [["WiFi", "on"], ["Cell", "on"], ["VSAT", "white"], ["Gas", "off"], ["110i", "on"], ["Gen", "on"], ["AutoS", "on"], ["HbatV", "off"],
     ["Heat", "white"], ["A/C", "off"], ["W/H", "off"], ["uWave", "off"], ["InvFan", "on"], ["~Alm", "off"], ["L Frz", "on"], ["Main", "off"],
     ["Hyd H", "off"], ["StrtAlt", "off"], ["SeaFir", "on"], ["Fire", "off"]],
    [["Mode", "on"], ["IndR", "off"], ["Fuel", "off"], ["240Ip", "off"], ["240i", "off"], ["Sbat", "on"], ["WGbat", "hi"], ["HbatC", "off"],
     ["G RPM", "on"], ["Chg#1", "on"], ["Chg#2", "off"], ["ERfan", "off"], ["xAlm", "off"], ["Alm", "off"], ["Hot W", "off"], ["Wing", "off"],
     ["Hyd L", "off"], ["WGAlt", "on"], ["Waste", "off"], ["Bilge", "off"]]
  ];
  function buildButtonBar() {
    const host = document.getElementById("buttonBar");
    host.appendChild(el("div", "chk-btn", "CHK"));
    const rows = el("div", "btn-rows");
    BUTTON_ROWS.forEach(row => {
      const rowEl = el("div", "btn-row");
      row.forEach(([label, state]) => {
        rowEl.appendChild(el("div", "btn" + (state !== "off" ? " " + state : ""), label));
      });
      rows.appendChild(rowEl);
    });
    host.appendChild(rows);

    const trim = el("div", "boat-trim");
    trim.appendChild(el("div", "lbl", "Boat Trim"));
    const trimVal = el("div", "val", "-0.8°");
    trim.appendChild(trimVal);
    host.appendChild(trim);
    window.__trimVal = trimVal;
  }
  let trim = -0.8;
  function tickTrim() {
    trim = clamp(trim + rand(-0.1, 0.1), -5, 5);
    if (window.__trimVal) window.__trimVal.textContent = trim.toFixed(1) + "°";
  }

  /* ---------- AUTO-UPDATE ---------- */
  const CURRENT_VERSION = document.querySelector('meta[name="app-version"]').content;
  async function checkForUpdate() {
    try {
      const res = await fetch("version.json?_=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== CURRENT_VERSION) window.location.reload();
    } catch (e) { /* retry next interval */ }
  }
  setInterval(checkForUpdate, 5 * 60 * 1000);

  /* ---------- BUILD + RUN ---------- */
  buildLCDBlock();
  GAUGE_CONFIGS.forEach(buildGaugeTile);
  CHART_CONFIGS.forEach(buildChartTile);
  buildCompass();
  buildTankRow(); renderTanks();
  buildMiscPanel();
  buildButtonBar();

  function animate() {
    drawCharts();
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  setInterval(tickCharts, 150);
  setInterval(tickGauges, 250);
  setInterval(tickLcd, 700);
  setInterval(tickCompass, 400);
  setInterval(tickTanks, 2500);
  setInterval(tickTrim, 600);

})();
