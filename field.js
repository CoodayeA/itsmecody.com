// The field: beagles, flowers, bees and a tennis ball, drawn on a character grid.
// Everything snaps to cells so it reads like a terminal that learned to garden.
(() => {
  const canvas = document.getElementById("field-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- sprite ----------
  // Right-facing tricolor beagle. K saddle, T tan, W white, E ear, N nose, O eye.
  // Rows 0-8 are the body; legs are added per frame below.
  const BODY = [
    ".W....................",
    ".W.............TTTT...",
    ".K............TTTTTT..",
    "..K..........ETTTTOT..",
    "..KKKKKKKKKKEETTTTTWWN",
    "..KKKKKKKKKKEETTTWWWW.",
    "..TKKKKKKKKKEEWWWW....",
    "..TTKKKKKKKTEEWW......",
    "..TTTTTTWWWWTEW.......",
    "..TTTT....WWWW........",
  ];
  const HEAD_COL = 12; // columns at or right of this (above the chest) belong to the head
  const HEAD_ROWS = 8;
  // Leg frames as [row, col, char] for the near legs: reaching, standing, gathered.
  const leg = (back, front) => [
    ...back.map(([r, c], i) => [r, c, i >= back.length - 1 ? "W" : "T"]),
    ...front.map(([r, c], i) => [r, c, i >= front.length - 2 ? "W" : "T"]),
  ];
  const LEGS = [
    leg(
      [[10, 2], [10, 3], [11, 1], [11, 2], [12, 0], [12, 1], [13, 0]],
      [[10, 12], [10, 13], [11, 13], [11, 14], [12, 14], [12, 15], [13, 15], [13, 16]],
    ),
    leg(
      [[10, 3], [10, 4], [11, 3], [11, 4], [12, 3], [12, 4], [13, 3], [13, 4]],
      [[10, 11], [10, 12], [11, 11], [11, 12], [12, 11], [12, 12], [13, 11], [13, 12]],
    ),
    leg(
      [[10, 4], [10, 5], [11, 5], [11, 6], [12, 6], [12, 7], [13, 7]],
      [[10, 10], [10, 11], [11, 9], [11, 10], [12, 8], [12, 9], [13, 7], [13, 8]],
    ),
  ];
  const legFrame = (f) => LEGS[[0, 1, 2, 1][f & 3]];
  const SPRITE_W = 22;
  const SPRITE_H = 14;

  // ---------- palette ----------
  let theme = {};
  const readTheme = () => {
    const dark = document.documentElement.dataset.theme !== "light";
    const css = getComputedStyle(document.documentElement);
    theme = {
      dark,
      bg: css.getPropertyValue("--bg").trim() || (dark ? "#1a1917" : "#f6f1e8"),
      grass: dark ? [104, 146, 72] : [96, 136, 64],
      grassA: dark ? 0.6 : 0.62,
      dog: {
        K: dark ? [74, 66, 58] : [52, 46, 40],
        T: [196, 128, 62],
        W: dark ? [232, 225, 212] : [252, 249, 242],
        E: [128, 74, 34],
        N: [20, 18, 16],
        O: [20, 18, 16],
        F: dark ? [130, 84, 44] : [160, 104, 54], // far legs
      },
      shadow: dark ? [0, 0, 0] : [90, 80, 60],
      bee: [242, 190, 60],
      stripe: dark ? [30, 26, 22] : [40, 34, 28],
      wing: dark ? [220, 220, 230] : [120, 130, 150],
      ball: [206, 224, 72],
      ink: dark ? [236, 230, 218] : [40, 36, 30],
    };
  };
  const FLOWER_COLORS = [
    [242, 193, 78], // buttercup
    [232, 138, 166], // clover pink
    [166, 138, 217], // lavender
    [239, 233, 223], // daisy
    [233, 138, 74], // poppy
  ];
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // ---------- state ----------
  let W = 0, H = 0, dpr = 1, C = 9, cols = 0, rows = 0;
  let grass = [], flowers = [], flowerAt = new Map();
  let dogs = [], bees = [], petals = [], barks = [], ball = null;
  let avoid = [];
  let fetched = 0;
  const pointer = { x: -999, y: -999, vx: 0, vy: 0, t: 0 };
  let time = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (i) => {
    let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    return ((Math.imul(x, 0xc2b2ae35) ^ (x >>> 16)) >>> 0) / 4294967296;
  };

  const counters = {
    dogs: document.querySelector("[data-count-dogs]"),
    fetched: document.querySelector("[data-count-fetched]"),
  };
  const setFetched = () => {
    if (!counters.fetched) return;
    counters.fetched.textContent = fetched;
    counters.fetched.classList.remove("bump");
    void counters.fetched.offsetWidth;
    counters.fetched.classList.add("bump");
  };

  // ---------- layout ----------
  function measureAvoid() {
    const hr = hero.getBoundingClientRect();
    avoid = [...hero.querySelectorAll("[data-field-avoid]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { x0: r.left - hr.left - 14, y0: r.top - hr.top - 10, x1: r.right - hr.left + 14, y1: r.bottom - hr.top + 10 };
    });
  }
  const underText = (x, y) => {
    for (const r of avoid) if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true;
    return false;
  };

  function resize() {
    const r = hero.getBoundingClientRect();
    const oldW = W || r.width, oldH = H || r.height;
    W = r.width;
    H = r.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    C = clamp(Math.round(Math.min(W, H * 1.4) / 120), 6, 10);
    cols = Math.ceil(W / C);
    rows = Math.ceil(H / C);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `500 ${Math.round(C * 1.15)}px "Geist Mono", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    seedField();
    measureAvoid();
    const want = W < 640 ? 2 : 3;
    while (dogs.length < want) dogs.push(makeDog());
    dogs.length = want;
    for (const d of dogs) {
      d.x *= W / oldW;
      d.y = clamp(d.y * (H / oldH), minY(), maxY());
    }
    const beeCount = W < 640 ? 4 : 7;
    while (bees.length < beeCount) bees.push(makeBee());
    bees.length = beeCount;
    if (counters.dogs) counters.dogs.textContent = dogs.length;
  }

  function seedField() {
    grass = [];
    flowers = [];
    flowerAt = new Map();
    for (let r = 0; r < rows; r++) {
      // the meadow thickens toward the bottom of the screen
      const depth = r / rows;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const h = hash(i);
        const patch = 0.5 + 0.5 * Math.sin(c * 0.11 + Math.sin(r * 0.07) * 2) * Math.sin(r * 0.13 - c * 0.04);
        if (h < (0.04 + depth * depth * 0.42) * (0.45 + patch)) {
          const tallness = hash(i + 7919) * (0.25 + depth);
          grass.push({ c, r, h: tallness, s: hash(i + 104729) });
        }
      }
    }
    const patches = Math.round((cols * rows) / 380);
    for (let p = 0; p < patches; p++) {
      const pc = Math.floor(Math.random() * cols);
      const pr = Math.floor(rows * (0.18 + 0.82 * Math.sqrt(Math.random())));
      const color = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)];
      const n = 3 + Math.floor(Math.random() * 7);
      for (let k = 0; k < n; k++) {
        const c = pc + Math.round(rand(-5, 5));
        const r = pr + Math.round(rand(-3, 3));
        if (c < 0 || r < 1 || c >= cols || r >= rows) continue;
        const key = r * cols + c;
        if (flowerAt.has(key) || flowerAt.has(key - 1) || flowerAt.has(key + 1)) continue;
        const f = { c, r, color, glyph: "*@o+*"[Math.floor(Math.random() * 5)], bent: 0, glow: 0 };
        flowers.push(f);
        flowerAt.set(key, f);
      }
    }
  }

  const minY = () => H * 0.22;
  const maxY = () => H - SPRITE_H * C - 6;

  // ---------- dogs ----------
  function makeDog() {
    return {
      x: rand(0.1, 0.8) * (W || 1200),
      y: rand(0.35, 0.9) * (H || 800),
      vx: 0,
      vy: 0,
      face: Math.random() < 0.5 ? 1 : -1,
      state: "trot",
      tx: rand(0, 1) * (W || 1200),
      ty: rand(0.3, 0.9) * (H || 800),
      until: rand(2, 6),
      stride: 0,
      speed: rand(90, 130),
      head: 0,
      wag: rand(0, 6),
      hasBall: false,
      sniffPuff: 0,
    };
  }

  function pickWander(d) {
    d.tx = rand(-0.05, 1.05) * W;
    d.ty = rand(minY(), maxY());
    d.state = Math.random() < 0.35 ? "run" : "trot";
    d.speed = d.state === "run" ? rand(170, 230) : rand(70, 110);
    d.until = time + rand(3, 7);
  }

  function updateDog(d, dt) {
    const dx = d.tx - d.x, dy = d.ty - d.y;
    const dist = Math.hypot(dx, dy);

    if (d.state === "sniff") {
      d.head = Math.min(2, d.head + dt * 6);
      d.vx *= Math.exp(-dt * 8);
      d.vy *= Math.exp(-dt * 8);
      if ((d.sniffPuff -= dt) < 0) {
        d.sniffPuff = rand(0.25, 0.6);
        const nose = noseOf(d);
        petals.push({ x: nose.x + d.face * C, y: nose.y + C * 2, vx: d.face * 12, vy: -10, life: 0.7, max: 0.7, color: theme.ink, glyph: "·" });
      }
      if (time > d.until) pickWander(d);
    } else if (d.state === "chase" && ball) {
      d.tx = ball.x - d.face * SPRITE_W * C * 0.45;
      d.ty = clamp(ball.y - SPRITE_H * C * 0.6, minY(), maxY());
      d.speed = 250 + d.eager * 40;
      d.head = Math.max(0, d.head - dt * 6);
      if (ball.z < 4 && !ball.holder && dist < 26) {
        ball.holder = d;
        d.hasBall = true;
        d.until = time + rand(3.5, 5.5);
        d.state = "proud";
        fetched++;
        setFetched();
        bark(d, ["got it!", "mine", "fetched"][Math.floor(Math.random() * 3)]);
        for (const o of dogs) if (o !== d && o.state === "chase") pickWander(o);
        pickProudTarget(d);
      }
    } else {
      d.head = Math.max(0, d.head - dt * 6);
      if (dist < 20 || time > d.until) {
        if (d.state === "proud") {
          if (time > d.until) dropBall(d);
          else pickProudTarget(d);
        } else if (Math.random() < 0.45) {
          d.state = "sniff";
          d.until = time + rand(1.5, 3.5);
        } else pickWander(d);
      }
    }

    if (d.state !== "sniff") {
      const sp = dist > 1 ? d.speed : 0;
      const ax = (dx / (dist || 1)) * sp, ay = (dy / (dist || 1)) * sp * 0.5;
      const k = 1 - Math.exp(-dt * 3.5);
      d.vx += (ax - d.vx) * k;
      d.vy += (ay - d.vy) * k;
    }
    d.x += d.vx * dt;
    d.y = clamp(d.y + d.vy * dt, minY(), maxY());
    if (Math.abs(d.vx) > 12) d.face = d.vx > 0 ? 1 : -1;
    const moving = Math.hypot(d.vx, d.vy);
    d.stride += moving * dt;
    d.wag += dt * (d.hasBall ? 22 : moving > 40 ? 10 : 5);

    // wrap around if a beagle wanders all the way off screen
    const span = SPRITE_W * C;
    if (d.x < -span * 1.2) d.x = W + span * 0.2;
    if (d.x > W + span * 1.2) d.x = -span * 0.2;

    if (ball && ball.holder === d) {
      const n = noseOf(d);
      ball.x = n.x + d.face * C * 0.5;
      ball.y = n.y + C * 1.5;
      ball.z = 0;
    }
  }

  function pickProudTarget(d) {
    d.tx = clamp(d.x + rand(-1, 1) * W * 0.4, 0, W);
    d.ty = rand(minY(), maxY());
    d.speed = rand(80, 120);
  }

  function dropBall(d) {
    d.hasBall = false;
    if (ball && ball.holder === d) {
      ball.holder = null;
      ball.fade = 1.5;
    }
    pickWander(d);
  }

  function noseOf(d) {
    const col = SPRITE_W - 1;
    const x = d.face > 0 ? d.x + col * C : d.x + (SPRITE_W - 1 - col) * C;
    return { x, y: d.y + (4 + d.head) * C };
  }

  function bark(d, text) {
    const n = noseOf(d);
    barks.push({ x: n.x, y: d.y - C, text, life: 1.3, max: 1.3 });
  }

  function dogCells(d) {
    const cells = [];
    const f = Math.floor(d.stride / (C * 2.4)) & 3;
    const standing = Math.hypot(d.vx, d.vy) < 18;
    const bob = !standing && f === 2 ? -1 : 0;
    const drop = Math.round(d.head);
    const wag = Math.sin(d.wag) > 0 ? 0 : 1;
    const far = standing ? LEGS[1] : legFrame(f + 2);
    const near = standing ? LEGS[1] : legFrame(f);
    for (const [r, c, ch] of far) cells.push([r + bob, c + 1, ch === "W" ? "W" : "F"]);
    for (let r = 0; r < BODY.length; r++) {
      const row = BODY[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === ".") continue;
        let rr = r + bob, cc = c;
        if (c >= HEAD_COL && r < HEAD_ROWS) rr += drop;
        if (r < 3 && c < 3) cc = c - wag; // tail
        cells.push([rr, cc, ch]);
      }
    }
    for (const [r, c, ch] of near) cells.push([r + bob, c, ch]);
    return cells;
  }

  // ---------- bees ----------
  function makeBee() {
    const f = flowers.length ? flowers[Math.floor(Math.random() * flowers.length)] : null;
    return {
      x: rand(0, 1) * (W || 1200),
      y: rand(0.1, 0.9) * (H || 800),
      vx: 0,
      vy: 0,
      target: f,
      hover: 0,
      trail: [],
      lastTrail: 0,
      phase: rand(0, 6),
    };
  }

  function updateBee(b, dt) {
    b.phase += dt * 3;
    let ax = 0, ay = 0;
    if (b.hover > 0) {
      b.hover -= dt;
      if (b.target) {
        b.target.glow = 1;
        ax = (b.target.c * C + C / 2 - b.x) * 6;
        ay = (b.target.r * C - C - b.y + Math.sin(b.phase * 3) * 3) * 6;
      }
      if (b.hover <= 0) b.target = flowers[Math.floor(Math.random() * flowers.length)];
    } else if (b.target) {
      const tx = b.target.c * C + C / 2, ty = b.target.r * C - C;
      const dx = tx - b.x, dy = ty - b.y, dist = Math.hypot(dx, dy) || 1;
      ax = (dx / dist) * 260 + Math.cos(b.phase * 1.7) * 220;
      ay = (dy / dist) * 260 + Math.sin(b.phase * 2.3) * 220;
      if (dist < C * 1.5) b.hover = rand(1, 3);
    }
    // bees do not love cursors, or beagles
    const px = b.x - pointer.x, py = b.y - pointer.y, pd = Math.hypot(px, py);
    if (pd < 90) {
      ax += (px / (pd || 1)) * 2400;
      ay += (py / (pd || 1)) * 2400;
      b.hover = 0;
    }
    b.vx += ax * dt;
    b.vy += ay * dt;
    const damp = Math.exp(-dt * 2.6);
    b.vx *= damp;
    b.vy *= damp;
    const sp = Math.hypot(b.vx, b.vy), max = 260;
    if (sp > max) {
      b.vx *= max / sp;
      b.vy *= max / sp;
    }
    b.x = clamp(b.x + b.vx * dt, 0, W);
    b.y = clamp(b.y + b.vy * dt, C * 6, H);
    if (time - b.lastTrail > 0.05) {
      b.lastTrail = time;
      b.trail.push({ x: b.x, y: b.y, t: time });
      if (b.trail.length > 14) b.trail.shift();
    }
  }

  // ---------- ball ----------
  function throwBall(x, y) {
    if (ball && ball.holder) dropBall(ball.holder);
    const landY = clamp(y, minY() + SPRITE_H * C * 0.6, H - C * 2);
    ball = { x, y: landY, z: 150, vz: 0, vx: rand(-30, 30), bounces: 0, holder: null, fade: 0 };
    dogs.forEach((d) => {
      d.state = "chase";
      d.hasBall = false;
      d.eager = Math.random();
      d.until = time + 12;
    });
    const loud = dogs[Math.floor(Math.random() * dogs.length)];
    if (loud) bark(loud, ["woof!", "ball!!", "bork"][Math.floor(Math.random() * 3)]);
  }

  function updateBall(dt) {
    if (!ball || ball.holder) return;
    if (ball.fade > 0) {
      ball.fade -= dt;
      if (ball.fade <= 0) ball = null;
      return;
    }
    ball.vz -= 900 * dt;
    ball.z += ball.vz * dt;
    if (ball.z <= 0) {
      ball.z = 0;
      if (ball.bounces < 3 && ball.vz < -60) {
        ball.vz = -ball.vz * 0.45;
        ball.bounces++;
      } else ball.vz = 0;
    }
    ball.x = clamp(ball.x + ball.vx * dt, C, W - C);
    ball.vx *= Math.exp(-dt * 1.5);
  }

  // ---------- drawing ----------
  function cell(px, py, color, alpha, inset = 0.5) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(px + inset, py + inset, C - inset * 2, C - inset * 2);
  }
  function glyph(ch, px, py, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(ch, px + C / 2, py + C / 2);
  }

  const wind = (c, r) =>
    Math.sin(c * 0.09 + time * 1.3 + Math.sin(r * 0.05 + time * 0.4)) * 0.9 + Math.sin(c * 0.023 - r * 0.031 + time * 0.6) * 0.6;

  function drawGrass() {
    const pc = pointer.x / C, pr = pointer.y / C;
    const gust = clamp(Math.hypot(pointer.vx, pointer.vy) / 900, 0, 1.2);
    const green = rgb(theme.grass);
    ctx.fillStyle = green;
    for (const g of grass) {
      let w = wind(g.c, g.r) + (g.s - 0.5) * 0.6;
      const dc = g.c - pc, dr = g.r - pr, d2 = dc * dc + dr * dr;
      if (d2 < 120) w += Math.sign(dc) * gust * (1 - d2 / 120) * 2.2;
      const tall = g.h > 0.75;
      const ch = tall
        ? w < -0.35 ? "\\" : w > 0.35 ? "/" : "|"
        : g.h > 0.4 ? (w < -0.4 ? "(" : w > 0.4 ? ")" : "v")
        : w < -0.5 ? "`" : w > 0.5 ? "," : g.h < 0.15 ? "." : "'";
      const px = g.c * C, py = g.r * C;
      let a = theme.grassA * (0.45 + g.h * 0.75) * (0.55 + (g.r / rows) * 0.6);
      if (underText(px, py)) a *= 0.22;
      ctx.globalAlpha = a;
      ctx.fillText(ch, px + C / 2, py + C / 2);
    }
  }

  function drawFlowers(dt) {
    for (const f of flowers) {
      const px = f.c * C, py = f.r * C;
      const dim = underText(px, py) ? 0.22 : 1;
      f.bent = Math.max(0, f.bent - dt * 0.8);
      f.glow = Math.max(0, f.glow - dt * 0.6);
      const sway = wind(f.c, f.r) > 0.7 ? 1 : wind(f.c, f.r) < -0.7 ? -1 : 0;
      glyph(f.bent > 0.3 ? "," : "|", px, py + C, rgb(theme.grass), 0.7 * dim);
      if (f.bent > 0.3) {
        glyph(".", px + C * 0.6, py + C * 0.6, rgb(f.color), 0.8 * dim);
      } else {
        glyph(f.glyph, px + sway * 1.5, py, rgb(f.color), (0.82 + f.glow * 0.18) * dim);
      }
    }
  }

  function drawShadow(d) {
    const sx = d.x + 2 * C, sw = (SPRITE_W - 5) * C, sy = d.y + (SPRITE_H - 0.3) * C;
    for (let x = sx; x < sx + sw; x += C) {
      const t = (x - sx) / sw;
      const a = (theme.dark ? 0.35 : 0.14) * Math.sin(t * Math.PI);
      const cx = Math.round(x / C) * C, cy = Math.round(sy / C) * C;
      cell(cx, cy, rgb(theme.shadow), a, 0);
    }
  }

  function drawDog(d) {
    const ox = Math.round(d.x / C) * C, oy = Math.round(d.y / C) * C;
    for (const [r, c, ch] of dogCells(d)) {
      const col = d.face > 0 ? c : SPRITE_W - 1 - c;
      const px = ox + col * C, py = oy + r * C;
      const base = theme.dog[ch];
      if (!base) continue;
      // per-cell grain so the coat doesn't look like a flat fill
      const n = 0.88 + hash((r * 31 + c) * 7 + (d.face > 0 ? 1 : 2)) * 0.2;
      const col3 = [Math.min(255, base[0] * n), Math.min(255, base[1] * n), Math.min(255, base[2] * n)];
      let a = 1;
      if (underText(px, py)) a = 0.2;
      cell(px, py, theme.bg, a, 0);
      cell(px, py, rgb(col3), a, ch === "O" || ch === "N" ? 1 : 0.5);
      if (ch === "O") cell(px + C * 0.3, py + C * 0.15, "rgba(255,255,255,1)", 0.65 * a, C * 0.28);
    }
    // trample flowers under the paws
    if (Math.hypot(d.vx, d.vy) > 50) {
      const pr = Math.round(d.y / C) + SPRITE_H - 1;
      for (let c = 0; c < SPRITE_W; c++) {
        const f = flowerAt.get(pr * cols + Math.round(d.x / C) + c);
        if (f && f.bent < 0.2) {
          f.bent = 1.6;
          if (Math.random() < 0.6)
            petals.push({ x: f.c * C, y: f.r * C, vx: rand(-30, 30) - d.vx * 0.1, vy: rand(-60, -25), life: 1.2, max: 1.2, color: f.color, glyph: "'" });
        }
      }
    }
  }

  function drawBee(b) {
    for (const p of b.trail) {
      const age = time - p.t;
      const a = Math.max(0, 0.35 - age * 0.5);
      if (a > 0) glyph("·", Math.round(p.x / C) * C, Math.round(p.y / C) * C, rgb(theme.ink), a);
    }
    const bx = Math.round(b.x / C) * C, by = Math.round(b.y / C) * C;
    const dir = b.vx >= 0 ? 1 : -1;
    cell(bx, by, rgb(theme.bee), 1, 0.5);
    cell(bx - dir * C, by, rgb(theme.stripe), 1, 0.5);
    cell(bx - dir * C + C * 0.25, by + C * 0.25, rgb(theme.bee), 1, C * 0.32);
    const flap = Math.floor(time * 28 + b.phase) & 1;
    glyph(flap ? "^" : "~", bx - dir * C * 0.5, by - C * 0.8, rgb(theme.wing), 0.75);
  }

  function drawBall() {
    if (!ball) return;
    const a = ball.fade > 0 ? ball.fade / 1.5 : 1;
    const gx = Math.round(ball.x / C) * C, gy = Math.round(ball.y / C) * C;
    if (!ball.holder) {
      const s = clamp(1 - ball.z / 200, 0.3, 1);
      cell(gx, gy + C, rgb(theme.shadow), (theme.dark ? 0.45 : 0.2) * s * a, 0);
    }
    const by = Math.round((ball.y - ball.z) / C) * C;
    ctx.globalAlpha = a;
    ctx.fillStyle = rgb(theme.ball);
    ctx.beginPath();
    ctx.arc(gx + C / 2, by + C / 2, C * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 * a;
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gx + C * 0.1, by + C / 2, C * 0.5, -0.9, 0.9);
    ctx.stroke();
  }

  function drawParticles(dt) {
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.life -= dt;
      if (p.life <= 0) {
        petals.splice(i, 1);
        continue;
      }
      p.vy += 50 * dt;
      p.vx += wind(p.x / C, p.y / C) * 30 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      glyph(p.glyph, Math.round(p.x / C) * C, Math.round(p.y / C) * C, rgb(p.color), p.life / p.max);
    }
    ctx.font = `500 ${Math.round(C * 1.35)}px "Geist Mono", ui-monospace, monospace`;
    for (let i = barks.length - 1; i >= 0; i--) {
      const b = barks[i];
      b.life -= dt;
      if (b.life <= 0) {
        barks.splice(i, 1);
        continue;
      }
      const t = 1 - b.life / b.max;
      ctx.globalAlpha = Math.min(1, b.life * 2) * 0.9;
      ctx.fillStyle = rgb(theme.ink);
      ctx.fillText(b.text, b.x, b.y - t * C * 3);
    }
    ctx.font = `500 ${Math.round(C * 1.15)}px "Geist Mono", ui-monospace, monospace`;
  }

  function frame(dt) {
    time += dt;
    pointer.vx *= Math.exp(-dt * 6);
    pointer.vy *= Math.exp(-dt * 6);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    for (const d of dogs) updateDog(d, dt);
    for (const b of bees) updateBee(b, dt);
    updateBall(dt);

    drawGrass();
    drawFlowers(dt);
    const order = [...dogs].sort((a, b) => a.y - b.y);
    for (const d of order) drawShadow(d);
    // ball sits between dogs by depth
    let ballDrawn = !ball || ball.holder;
    for (const d of order) {
      if (!ballDrawn && ball.y < d.y + SPRITE_H * C * 0.8) {
        drawBall();
        ballDrawn = true;
      }
      drawDog(d);
      if (ball && ball.holder === d) drawBall();
    }
    if (!ballDrawn) drawBall();
    for (const b of bees) drawBee(b);
    drawParticles(dt);
    ctx.globalAlpha = 1;
  }

  // ---------- loop ----------
  let last = 0, raf = 0, visible = true;
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    frame(dt);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (reduced || raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // ---------- events ----------
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const now = performance.now(), dt = Math.max(16, now - pointer.t) / 1000;
    if (pointer.t) {
      pointer.vx = (x - pointer.x) / dt;
      pointer.vy = (y - pointer.y) / dt;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.t = now;
  });
  hero.addEventListener("pointerleave", () => {
    pointer.x = pointer.y = -999;
    pointer.t = 0;
  });
  hero.addEventListener("click", (e) => {
    if (e.target.closest("a, button, [data-field-avoid]")) return;
    const r = hero.getBoundingClientRect();
    throwBall(e.clientX - r.left, e.clientY - r.top);
    if (reduced) frame(0.016);
  });

  new ResizeObserver(() => {
    resize();
    if (reduced) staticFrame();
  }).observe(hero);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
  }).observe(hero);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  new MutationObserver(() => {
    readTheme();
    if (reduced) staticFrame();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  addEventListener("scroll", measureAvoid, { passive: true });

  function staticFrame() {
    for (const d of dogs) {
      d.vx = d.vy = 0;
      d.state = "sniff";
      d.until = Infinity;
    }
    frame(0);
  }

  readTheme();
  resize();
  // Fonts change glyph metrics, so re-measure once Geist Mono arrives.
  document.fonts?.ready.then(() => {
    resize();
    if (reduced) staticFrame();
  });
  if (reduced) staticFrame();
  else start();
})();
