/*!
 * click-sparkle.js — WebGL particle effects for click & drag interactions
 * --------------------------------------------------------------------
 * Drop in via:
 *   <script src="/click-sparkle.js" defer
 *           data-sparkle-colour="#ffb86c"></script>
 *
 * Behaviour
 *   - Quick click (< HOLD_THRESHOLD_MS): no effect, normal click is preserved.
 *   - Hold still > HOLD_THRESHOLD_MS: charges a big explosion that scales
 *     with hold time, fires on mouseup. A glowing ring under the cursor
 *     indicates charge level.
 *   - Hold and drag > HOLD_THRESHOLD_MS: emits a trail of small sparkles at
 *     the cursor while dragging; nothing fires on release.
 *   - Particles bounce off the four viewport edges with damping & friction.
 *
 * Configuration
 *   data-sparkle-colour="<css colour>"   (or data-sparkle-color)
 *     Base colour for the particles. Accepts any valid CSS colour
 *     (#ffb86c, rgb(...), hsl(...), named colours, etc.). A small palette
 *     of brighter / dimmer / warmer / cooler variants plus white is derived
 *     automatically so explosions still look varied. Defaults to a warm
 *     white if the attribute is absent or unparseable.
 *
 * Browser support
 *   Any browser with WebGL1. Gracefully no-ops if WebGL is unavailable.
 *
 * Public API
 *   window.ClickSparkle.config
 *   window.ClickSparkle.palette
 *   window.ClickSparkle.setBaseColour(cssColour)
 *   window.ClickSparkle.spawnExplosion(x, y, colors, holdSeconds)
 *   window.ClickSparkle.spawnSparkles(x, y, colors, count)
 *   window.ClickSparkle.destroy()
 *
 * License: MIT
 */
(() => {
  if (window.ClickSparkle?.__installed) return;

  const CONFIG = {
    HOLD_THRESHOLD_MS: 250,
    STILL_RADIUS_PX: 6,
    DRAG_DEMOTE_PX: 12,
    MAX_HOLD_S: 2.0,
    PARTICLE_POOL: 20000,
    GRAVITY: 1400,
    AIR_DRAG: 0.995,
    RESTITUTION: 0.55,
    EDGE_FRICTION: 0.82,
    COLOR_BRIGHTNESS: 2.4,
  };

  const FALLBACK_BASE = [1.0, 0.9, 0.7];
  const PALETTE_LIGHTER_T = 0.35;
  const PALETTE_HOT_T = 0.65;

  function parseCssColour(str) {
    if (!str) return null;
    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = str;
    if (!probe.style.color) return null;
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    const m = computed.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(",").map((s) => Number.parseFloat(s.trim()));
    return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
  }

  function buildPalette(base) {
    const [r, g, b] = base;
    const mix = (a, c, t) => [
      a[0] * (1 - t) + c[0] * t,
      a[1] * (1 - t) + c[1] * t,
      a[2] * (1 - t) + c[2] * t,
    ];
    const W = [1, 1, 1];
    return [
      base,
      mix(base, W, PALETTE_LIGHTER_T),
      mix(base, W, PALETTE_HOT_T),
      [
        Math.min(1, r * 1.1 + 0.08),
        Math.min(1, g * 0.95),
        Math.min(1, b * 0.85),
      ],
      [
        Math.min(1, r * 0.85),
        Math.min(1, g * 0.95),
        Math.min(1, b * 1.1 + 0.08),
      ],
      [1, 1, 1],
    ];
  }

  const getSparkleAttr = (s) =>
    s.getAttribute("data-sparkle-colour") ||
    s.getAttribute("data-sparkle-color");

  function readBaseColourAttr() {
    const tagged = document.querySelectorAll(
      "script[data-sparkle-colour], script[data-sparkle-color]",
    );
    const candidates = document.currentScript
      ? [document.currentScript, ...tagged]
      : [...tagged];
    for (const s of candidates) {
      const v = getSparkleAttr(s);
      if (v) return v;
    }
    return null;
  }

  let palette = null;
  function setBaseColour(cssColour) {
    const parsed = parseCssColour(cssColour);
    palette = buildPalette(parsed || FALLBACK_BASE);
  }
  setBaseColour(readBaseColourAttr());

  const canvas = document.createElement("canvas");
  canvas.dataset.clickSparkle = "canvas";
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "999999",
  });
  const ring = document.createElement("div");
  ring.dataset.clickSparkle = "ring";
  Object.assign(ring.style, {
    position: "fixed",
    width: "0px",
    height: "0px",
    border: "2px solid rgba(255,255,255,0.85)",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: "999998",
    transform: "translate(-50%, -50%)",
    boxShadow: "0 0 12px rgba(255,255,255,0.6)",
    display: "none",
    transition: "opacity 120ms",
  });
  function appendOverlays() {
    if (!canvas.isConnected) document.body.appendChild(canvas);
    if (!ring.isConnected) document.body.appendChild(ring);
  }
  if (document.body) appendOverlays();
  else document.addEventListener("DOMContentLoaded", appendOverlays);

  const dpr = () => window.devicePixelRatio || 1;
  function resize() {
    canvas.width = window.innerWidth * dpr();
    canvas.height = window.innerHeight * dpr();
  }
  resize();
  window.addEventListener("resize", resize);

  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: false,
  });
  if (!gl) {
    window.ClickSparkle = {
      __installed: true,
      destroy() {
        // WebGL unavailable; nothing was set up to clean up
      },
    };
    return;
  }

  const VS = `
    attribute vec2 a_pos;
    attribute vec3 a_color;
    attribute float a_alpha;
    attribute float a_size;
    uniform vec2 u_resolution;
    varying vec3 v_color;
    varying float v_alpha;
    void main() {
      vec2 c = (a_pos / u_resolution) * 2.0 - 1.0;
      c.y = -c.y;
      gl_Position = vec4(c, 0.0, 1.0);
      gl_PointSize = a_size;
      v_color = a_color;
      v_alpha = a_alpha;
    }
  `;
  const FS = `
    precision mediump float;
    varying vec3 v_color;
    varying float v_alpha;
    uniform float u_brightness;
    void main() {
      vec2 d = gl_PointCoord - 0.5;
      float r = length(d);
      if (r > 0.5) discard;
      float core = smoothstep(0.5, 0.0, r);
      float glow = pow(core, 2.2);
      vec3 col = mix(v_color, vec3(1.0), glow * 0.65) * u_brightness;
      float a = core * v_alpha;
      gl_FragColor = vec4(col * a, a);
    }
  `;
  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(
        `[click-sparkle] shader compile failed: ${gl.getShaderInfoLog(sh)}`,
      );
    }
    return sh;
  }
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(program);
  gl.useProgram(program);

  const STRIDE = 7;
  const FSIZE = 4;
  const drawData = new Float32Array(CONFIG.PARTICLE_POOL * STRIDE);
  const px = new Float32Array(CONFIG.PARTICLE_POOL);
  const py = new Float32Array(CONFIG.PARTICLE_POOL);
  const vx = new Float32Array(CONFIG.PARTICLE_POOL);
  const vy = new Float32Array(CONFIG.PARTICLE_POOL);
  const cr = new Float32Array(CONFIG.PARTICLE_POOL);
  const cg = new Float32Array(CONFIG.PARTICLE_POOL);
  const cb = new Float32Array(CONFIG.PARTICLE_POOL);
  const lifeArr = new Float32Array(CONFIG.PARTICLE_POOL);
  const maxLife = new Float32Array(CONFIG.PARTICLE_POOL);
  const baseSize = new Float32Array(CONFIG.PARTICLE_POOL);
  const alive = new Uint8Array(CONFIG.PARTICLE_POOL);

  const writeAt = (arr, i, value) => arr.fill(value, i, i + 1);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, drawData.byteLength, gl.DYNAMIC_DRAW);
  function bindAttr(name, size, offset) {
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(
      loc,
      size,
      gl.FLOAT,
      false,
      STRIDE * FSIZE,
      offset * FSIZE,
    );
  }
  bindAttr("a_pos", 2, 0);
  bindAttr("a_color", 3, 2);
  bindAttr("a_alpha", 1, 5);
  bindAttr("a_size", 1, 6);
  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_brightness = gl.getUniformLocation(program, "u_brightness");
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  const runtime = {
    palette,
    head: 0,
    lastT: performance.now(),
    rafId: 0,
  };

  function writeNewParticle(idx, fields) {
    writeAt(px, idx, fields.px);
    writeAt(py, idx, fields.py);
    writeAt(vx, idx, fields.vx);
    writeAt(vy, idx, fields.vy);
    writeAt(cr, idx, fields.cr);
    writeAt(cg, idx, fields.cg);
    writeAt(cb, idx, fields.cb);
    writeAt(maxLife, idx, fields.maxLife);
    writeAt(lifeArr, idx, fields.maxLife);
    writeAt(baseSize, idx, fields.size);
    writeAt(alive, idx, 1);
  }

  function spawnExplosion(x, y, colors, holdSeconds) {
    const cols = colors || palette;
    const d = dpr();
    const t = Math.min(holdSeconds, CONFIG.MAX_HOLD_S) / CONFIG.MAX_HOLD_S;
    const count = Math.floor(80 + t * 600);
    const speedBase = 100 + t * 500;
    const lifeBase = 0.9 + t * 1.6;
    const sizeBase = 6 + t * 6;
    for (let i = 0; i < count; i++) {
      const idx = runtime.head % CONFIG.PARTICLE_POOL;
      const a = Math.random() * Math.PI * 2;
      const sp = (speedBase * 0.4 + Math.random() * speedBase) * d;
      const ub = -180 * d * (0.5 + 0.5 * t);
      const c = cols[(Math.random() * cols.length) | 0];
      writeNewParticle(idx, {
        px: x * d,
        py: y * d,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + ub,
        cr: c[0],
        cg: c[1],
        cb: c[2],
        maxLife: lifeBase * (0.7 + Math.random() * 0.6),
        size: sizeBase * (0.7 + Math.random() * 0.7),
      });
      runtime.head++;
    }
  }

  function spawnSparkles(x, y, colors, count) {
    const cols = colors || palette;
    const d = dpr();
    for (let i = 0; i < count; i++) {
      const idx = runtime.head % CONFIG.PARTICLE_POOL;
      const a = Math.random() * Math.PI * 2;
      const sp = (40 + Math.random() * 120) * d;
      const c = cols[(Math.random() * cols.length) | 0];
      writeNewParticle(idx, {
        px: (x + (Math.random() - 0.5) * 4) * d,
        py: (y + (Math.random() - 0.5) * 4) * d,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30 * d,
        cr: c[0],
        cg: c[1],
        cb: c[2],
        maxLife: 0.5 + Math.random() * 0.4,
        size: 4 + Math.random() * 4,
      });
      runtime.head++;
    }
  }

  function bounceX(i, w) {
    if (px[i] < 0) {
      writeAt(px, i, 0);
      writeAt(vx, i, -vx[i] * CONFIG.RESTITUTION);
      vy[i] *= CONFIG.EDGE_FRICTION;
    } else if (px[i] > w) {
      writeAt(px, i, w);
      writeAt(vx, i, -vx[i] * CONFIG.RESTITUTION);
      vy[i] *= CONFIG.EDGE_FRICTION;
    }
  }

  function bounceY(i, h) {
    if (py[i] < 0) {
      writeAt(py, i, 0);
      writeAt(vy, i, -vy[i] * CONFIG.RESTITUTION);
      vx[i] *= CONFIG.EDGE_FRICTION;
    } else if (py[i] > h) {
      writeAt(py, i, h);
      writeAt(vy, i, -vy[i] * CONFIG.RESTITUTION);
      vx[i] *= CONFIG.EDGE_FRICTION;
    }
  }

  function stepParticle(i, dt, gd, w, h) {
    if (!alive[i]) return false;
    lifeArr[i] -= dt;
    if (lifeArr[i] <= 0) {
      writeAt(alive, i, 0);
      return false;
    }
    vy[i] += gd * dt;
    vx[i] *= CONFIG.AIR_DRAG;
    vy[i] *= CONFIG.AIR_DRAG;
    px[i] += vx[i] * dt;
    py[i] += vy[i] * dt;
    bounceX(i, w);
    bounceY(i, h);
    return true;
  }

  function writeDrawData(i, slot) {
    const t01 = lifeArr[i] / maxLife[i];
    const o = slot * STRIDE;
    writeAt(drawData, o, px[i]);
    writeAt(drawData, o + 1, py[i]);
    writeAt(drawData, o + 2, cr[i]);
    writeAt(drawData, o + 3, cg[i]);
    writeAt(drawData, o + 4, cb[i]);
    writeAt(drawData, o + 5, Math.max(0, t01));
    writeAt(drawData, o + 6, baseSize[i] * (0.4 + 0.6 * t01));
  }

  function simulate(dt, gd, w, h) {
    const counter = { live: 0 };
    for (let i = 0; i < CONFIG.PARTICLE_POOL; i++) {
      if (stepParticle(i, dt, gd, w, h)) {
        writeDrawData(i, counter.live);
        counter.live++;
      }
    }
    return counter.live;
  }

  function emitTrail() {
    if (state.mode !== "scatter" || !state.holding) return;
    const speed = Math.hypot(
      state.curX - state.lastEmitX,
      state.curY - state.lastEmitY,
    );
    const n = 1 + Math.min(5, Math.floor(speed * 0.15));
    spawnSparkles(state.curX, state.curY, palette, n);
    state.lastEmitX = state.curX;
    state.lastEmitY = state.curY;
  }

  function drawSparkles(live, w, h) {
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u_resolution, w, h);
    gl.uniform1f(u_brightness, CONFIG.COLOR_BRIGHTNESS);
    if (live > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, drawData.subarray(0, live * STRIDE));
      gl.drawArrays(gl.POINTS, 0, live);
    }
  }

  function sparkleTick(now) {
    const dt = Math.min(0.05, (now - runtime.lastT) / 1000);
    runtime.lastT = now;
    const gd = dpr() * CONFIG.GRAVITY;
    const live = simulate(dt, gd, canvas.width, canvas.height);
    emitTrail();
    drawSparkles(live, canvas.width, canvas.height);
    runtime.rafId = requestAnimationFrame(sparkleTick);
  }
  runtime.rafId = requestAnimationFrame((t) => {
    runtime.lastT = t;
    sparkleTick(t);
  });

  // mode: 'idle' | 'pending' | 'charging' | 'scatter'
  const state = {
    mode: "idle",
    holding: false,
    downX: 0,
    downY: 0,
    curX: 0,
    curY: 0,
    chargeStart: 0,
    lastEmitX: 0,
    lastEmitY: 0,
    promoteTimer: 0,
    chargeRAF: 0,
  };

  function showRing() {
    ring.style.display = "block";
    ring.style.opacity = "1";
  }
  function hideRing() {
    ring.style.opacity = "0";
    setTimeout(() => {
      if (state.mode !== "charging") ring.style.display = "none";
    }, 150);
  }
  function updateRing() {
    if (state.mode !== "charging") return;
    const h = (performance.now() - state.chargeStart) / 1000;
    const t = Math.min(h, CONFIG.MAX_HOLD_S) / CONFIG.MAX_HOLD_S;
    const sz = 14 + t * 90;
    ring.style.width = `${sz}px`;
    ring.style.height = `${sz}px`;
    ring.style.left = `${state.downX}px`;
    ring.style.top = `${state.downY}px`;
    ring.style.borderColor = `rgba(255,${Math.floor(255 - t * 80)},${Math.floor(180 - t * 120)},${0.4 + t * 0.5})`;
    ring.style.boxShadow = `0 0 ${10 + t * 30}px rgba(255,200,120,${0.4 + t * 0.5})`;
    state.chargeRAF = requestAnimationFrame(updateRing);
  }
  function promote() {
    if (state.mode !== "pending" || !state.holding) return;
    const dx = state.curX - state.downX;
    const dy = state.curY - state.downY;
    if (Math.hypot(dx, dy) > CONFIG.STILL_RADIUS_PX) {
      state.mode = "scatter";
      state.lastEmitX = state.curX;
      state.lastEmitY = state.curY;
    } else {
      state.mode = "charging";
      state.chargeStart = performance.now();
      ring.style.left = `${state.downX}px`;
      ring.style.top = `${state.downY}px`;
      showRing();
      cancelAnimationFrame(state.chargeRAF);
      state.chargeRAF = requestAnimationFrame(updateRing);
    }
  }
  function onDown(e) {
    if (e.button !== 0) return;
    state.holding = true;
    state.mode = "pending";
    state.downX = e.clientX;
    state.downY = e.clientY;
    state.curX = state.downX;
    state.curY = state.downY;
    clearTimeout(state.promoteTimer);
    state.promoteTimer = setTimeout(promote, CONFIG.HOLD_THRESHOLD_MS);
  }
  function onMove(e) {
    state.curX = e.clientX;
    state.curY = e.clientY;
    if (state.mode === "charging") {
      const dx = state.curX - state.downX;
      const dy = state.curY - state.downY;
      if (Math.hypot(dx, dy) > CONFIG.DRAG_DEMOTE_PX) {
        state.mode = "scatter";
        state.lastEmitX = state.curX;
        state.lastEmitY = state.curY;
        cancelAnimationFrame(state.chargeRAF);
        hideRing();
      }
    }
  }
  function onUp(e) {
    if (!state.holding) return;
    state.holding = false;
    clearTimeout(state.promoteTimer);
    cancelAnimationFrame(state.chargeRAF);
    if (state.mode === "charging") {
      const held = (performance.now() - state.chargeStart) / 1000;
      spawnExplosion(e.clientX, e.clientY, palette, held);
    }
    state.mode = "idle";
    hideRing();
  }
  function onLeave() {
    state.holding = false;
    clearTimeout(state.promoteTimer);
    cancelAnimationFrame(state.chargeRAF);
    state.mode = "idle";
    hideRing();
  }

  document.addEventListener("mousedown", onDown, true);
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("mouseup", onUp, true);
  document.addEventListener("mouseleave", onLeave);

  window.ClickSparkle = {
    __installed: true,
    config: CONFIG,
    get palette() {
      return palette;
    },
    setBaseColour(cssColour) {
      setBaseColour(cssColour);
    },
    spawnExplosion: spawnExplosion,
    spawnSparkles: spawnSparkles,
    destroy() {
      cancelAnimationFrame(runtime.rafId);
      cancelAnimationFrame(state.chargeRAF);
      clearTimeout(state.promoteTimer);
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onUp, true);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", resize);
      if (canvas.isConnected) canvas.remove();
      if (ring.isConnected) ring.remove();
      window.ClickSparkle = undefined;
    },
  };
})();
