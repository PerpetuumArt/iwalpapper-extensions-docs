// The Now Playing gradient, as the native wallpaper draws it: `MusicGradient.definition` (six points
// ringed around the artwork, each colour twice) drawn with `MeshGPU`'s formula, in WebGL, into a
// 352 × 220 canvas stretched over the screen, as the native layer is.
"use strict";

const MusicGradient = (() => {
  const NEUTRAL = { colors: ["#4A4560", "#6B5F7A", "#2F3446"], background: "#16151C" };
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16) / 255 || 0);
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  // Light colours brought down so the white text reads, softly above the knee, a little more saturated.
  function dimmed(hex, darken) {
    let v = rgb(hex);
    const knee = 0.3, lum = 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2];
    if (lum > knee) v = v.map((c) => c * (knee + (lum - knee) * 0.2) / lum);
    const grey = 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2];
    return v.map((c) => clamp(grey + (c - grey) * 1.3, 0, 1) * darken);
  }

  // `palette`: the bridge's `track.palette`; `s`: x, y (the artwork's centre), fill, dim, movement, swirl, speed.
  function definition(palette, s) {
    const colors = palette?.colors?.length ? palette.colors : NEUTRAL.colors;
    const weights = palette?.weights?.length === colors.length ? palette.weights : colors.map(() => 1 / colors.length);
    const flat = s.fill === "Main colour", darken = 1 - s.dim;
    const points = [0, 1, 2, 3, 4, 5].map((i) => {
      const angle = i / 6 * 2 * Math.PI + 0.5, reach = i % 2 === 0 ? 0.42 : 0.3;
      return {
        x: clamp(s.x + reach * Math.cos(angle), -0.2, 1.2), y: clamp(s.y + reach * Math.sin(angle), -0.2, 1.2),
        color: dimmed(flat ? colors[0] : colors[i % colors.length], darken),
        size: clamp((i % 2 === 0 ? 0.6 : 0.45) * (0.85 + 0.45 * weights[i % colors.length]), 0.1, 1.5),
        drift: clamp(0.14 * s.movement, 0, 0.5), cyclesX: 1 + i % 3, cyclesY: 1 + (i + 1) % 2, phase: i / 6,
      };
    });
    return {
      background: dimmed(flat ? colors[0] : palette?.background || NEUTRAL.background, darken), points,
      loopSeconds: clamp(150 / s.speed, 10, 1200), swirl: flat ? 0 : clamp(s.swirl, 0, 1),
      // ponytail: no grain live, as the native live gradient (Grain shows in its stills only); stretched from 352 pixels it would show as blocks.
    };
  }

  const FRAGMENT = `
    precision highp float;
    uniform vec2 size;
    uniform float aspect, swirl, turn;
    uniform vec3 points[6];
    uniform vec3 colors[6];
    uniform vec3 background;
    void main() {
      vec2 uv = vec2(gl_FragCoord.x / size.x, 1.0 - gl_FragCoord.y / size.y);
      float x = uv.x * aspect, y = uv.y;
      x += swirl * sin(5.0 * uv.y + turn) * aspect;
      y += swirl * cos(12.0 * uv.x + turn);
      vec3 sum = background * 0.04;
      float weight = 0.04;
      for (int i = 0; i < 6; i++) {
        float dx = x - points[i].x, dy = y - points[i].y;
        float q = (dx * dx + dy * dy) * points[i].z;
        float w = 1.0 / ((1.0 + q) * (1.0 + q));
        sum += colors[i] * w;
        weight += w;
      }
      vec3 c = sum / weight;
      gl_FragColor = vec4(sqrt(clamp(c, 0.0, 1.0)), 1.0);
    }`;

  // One canvas; `draw(target, phase, from, t)` blends from `from` to `target` by `t` (0...1).
  function renderer(canvas) {
    const gl = canvas.getContext("webgl", { antialias: false, depth: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const shader = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s; };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }"));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.bindAttribLocation(program, 0, "p");
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const at = (name) => gl.getUniformLocation(program, name);
    const u = { size: at("size"), aspect: at("aspect"), swirl: at("swirl"), turn: at("turn"),
                points: at("points"), colors: at("colors"), background: at("background") };
    const squared = (c) => c.map((v) => v * v);
    const mix = (a, b, t) => a + (b - a) * t;

    // Each point where the loop has it, in the shader's terms: x (times the aspect), y, 1/size², and its colour squared.
    const placed = (d, phase, aspect) => d.points.map((p) => [
      (p.x + p.drift * Math.sin(2 * Math.PI * (p.cyclesX * phase + p.phase))) * aspect,
      p.y + p.drift * Math.cos(2 * Math.PI * (p.cyclesY * phase + p.phase * 2)), p.size, squared(p.color),
    ]);

    return function draw(target, phase, from, t) {
      const aspect = canvas.width / canvas.height;
      let points = placed(target, phase, aspect), background = squared(target.background);
      if (from && t < 1) {
        // Mixed in the gamma-2 space the shader blends in; size through its reach.
        points = placed(from, phase, aspect).map((a, i) => {
          const b = points[i];
          return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t), a[3].map((c, k) => mix(c, b[3][k], t))];
        });
        background = squared(from.background).map((c, k) => mix(c, background[k], t));
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.size, canvas.width, canvas.height);
      gl.uniform1f(u.aspect, aspect);
      gl.uniform1f(u.swirl, target.swirl * 0.07);
      gl.uniform1f(u.turn, 2 * Math.PI * (phase - Math.floor(phase)));
      gl.uniform3fv(u.points, points.flatMap((p) => [p[0], p[1], 1 / (p[2] * p[2])]));
      gl.uniform3fv(u.colors, points.flatMap((p) => p[3]));
      gl.uniform3fv(u.background, background);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  }

  return { definition, renderer, NEUTRAL };
})();
