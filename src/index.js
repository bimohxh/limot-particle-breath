// Particle Breath by Limot — https://limot.dev — MIT License
import {
  createBreathParticles,
  breathPoint,
  renderParticles,
} from "./geometry.js";

export { createBreathParticles, breathPoint };

export const defaultConfig = Object.freeze({
  backgroundColor: "#111111",
  dotColor: "#e0dfd8",
  scale: 100,
  particleSize: 1,
  particleCount: 8500,
  opacity: 1,
  speed: 1,
  breathStrength: 75,
});

const states = new WeakMap();
const bounds = {
  scale: [40, 125],
  particleSize: [0.5, 2],
  particleCount: [1500, 16000],
  opacity: [0, 1],
  speed: [0, 3],
  breathStrength: [0, 150],
};

function resolveConfig(options = {}) {
  const config = { ...defaultConfig, ...options };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const value = config[key];
    config[key] = Number.isFinite(value)
      ? Math.max(min, Math.min(max, value))
      : defaultConfig[key];
  }
  config.backgroundColor ||= defaultConfig.backgroundColor;
  config.dotColor ||= defaultConfig.dotColor;
  return config;
}

/** Render one deterministic frame. Width/height are logical pixels; time is seconds. */
export function drawParticleBreath(ctx, width, height, time = 0, options = {}) {
  if (!(width > 0 && height > 0) || !Number.isFinite(time)) return;
  const config = resolveConfig(options);
  let state = states.get(ctx);
  if (!state) {
    state = {};
    states.set(ctx, state);
  }
  if (state.count !== config.particleCount) {
    state.points = createBreathParticles(config.particleCount);
    state.count = config.particleCount;
  }
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    if (config.opacity === 0) return;
    if (config.opacity === 1) {
      renderParticles(ctx, width, height, time, config, state.points);
      return;
    }
    // Composite the complete graphic once, preserving overlap and the opaque background.
    if (!state.layer) {
      state.layer =
        ctx.canvas.ownerDocument?.createElement("canvas") ??
        new OffscreenCanvas(ctx.canvas.width, ctx.canvas.height);
      state.layerContext = state.layer.getContext("2d");
    }
    const layer = state.layer;
    if (layer.width !== ctx.canvas.width) layer.width = ctx.canvas.width;
    if (layer.height !== ctx.canvas.height) layer.height = ctx.canvas.height;
    const layerContext = state.layerContext;
    layerContext.setTransform(1, 0, 0, 1, 0, 0);
    layerContext.clearRect(0, 0, layer.width, layer.height);
    layerContext.setTransform(ctx.getTransform());
    renderParticles(layerContext, width, height, time, config, state.points);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = config.opacity;
    ctx.drawImage(layer, 0, 0);
  } finally {
    ctx.restore();
  }
}

/** Mount a responsive animation; call the returned function to release all resources. */
export function mountParticleBreath(canvas, configOrProvider = {}) {
  const ctx = canvas.getContext("2d");
  const host = canvas.parentElement;
  if (!ctx || !host)
    throw new Error(
      "Particle Breath needs a 2D canvas inside a sized container.",
    );
  const view = canvas.ownerDocument.defaultView;
  const getConfig =
    typeof configOrProvider === "function"
      ? configOrProvider
      : () => configOrProvider;
  let width = 1,
    height = 1,
    dpr = 1,
    frame = 0,
    disposed = false;
  const start = view.performance.now();
  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(view.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };
  const observer = new view.ResizeObserver(resize);
  observer.observe(host);
  resize();
  const render = (now) => {
    if (disposed) return;
    if (dpr !== Math.min(view.devicePixelRatio || 1, 2)) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawParticleBreath(ctx, width, height, (now - start) / 1000, getConfig());
    frame = view.requestAnimationFrame(render);
  };
  frame = view.requestAnimationFrame(render);
  return () => {
    if (disposed) return;
    disposed = true;
    view.cancelAnimationFrame(frame);
    observer.disconnect();
    states.delete(ctx);
  };
}
