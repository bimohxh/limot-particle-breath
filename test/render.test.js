import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import {
  createBreathParticles,
  breathPoint,
  defaultConfig,
  drawParticleBreath,
  mountParticleBreath,
} from "../src/index.js";

// The native test canvas implements the same 2D API without a DOM.
globalThis.OffscreenCanvas = class {
  constructor(w, h) {
    return createCanvas(w, h);
  }
};

function pixels(time, config = {}, width = 480, height = 270) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  drawParticleBreath(ctx, width, height, time, config);
  return ctx.getImageData(0, 0, width, height).data;
}

test("surface samples and geometry stay deterministic and finite", () => {
  const points = createBreathParticles(8500);
  assert.deepEqual(points, createBreathParticles(8500));
  assert.ok(points.length > 8000 && points.length < 9000);
  for (const point of points) {
    for (const time of [0, 3, 30]) {
      assert.ok(
        Object.values(breathPoint(point, time, 1)).every(Number.isFinite),
      );
    }
  }
});

test("equal timestamps reproduce frames; breathing visibly changes the frame", () => {
  const first = pixels(0);
  assert.deepEqual(first, pixels(0));
  const later = pixels(3);
  let changedPixels = 0;
  for (let i = 0; i < first.length; i += 4)
    if (first[i] !== later[i]) changedPixels++;
  assert.ok(changedPixels > 1500, `Only ${changedPixels} pixels changed`);
  assert.deepEqual(pixels(0, { speed: 0 }), pixels(30, { speed: 0 }));
});

test("opacity composites the entire layer once and keeps the background opaque", () => {
  const config = { backgroundColor: "#ffffff", dotColor: "#000000" };
  const full = pixels(2, config);
  const half = pixels(2, { ...config, opacity: 0.5 });
  const zero = pixels(2, { ...config, opacity: 0 });
  for (let i = 0; i < full.length; i += 4) {
    assert.ok(Math.abs(half[i] - (255 + full[i]) / 2) <= 2);
    assert.equal(half[i + 3], 255);
    assert.equal(zero[i], 255);
    assert.equal(zero[i + 3], 255);
  }
  assert.ok(full.some((value, index) => index % 4 === 0 && value < 64));
});

test("DPR transforms and context state survive drawing at partial opacity", () => {
  const canvas = createCanvas(960, 540);
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#ff0000";
  drawParticleBreath(ctx, 480, 270, 0, { opacity: 0.5 });
  assert.equal(ctx.getTransform().a, 2);
  assert.ok(Math.abs(ctx.globalAlpha - 0.7) < 0.01);
  assert.equal(ctx.getImageData(959, 539, 1, 1).data[3], 255);
  // Check actual restored paint; the native canvas fillStyle getter can be stale.
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 0, 2, 2);
  assert.deepEqual([...ctx.getImageData(0, 0, 1, 1).data], [255, 0, 0, 255]);
});

test("invalid numeric options use defaults and values outside ranges are clamped", () => {
  assert.deepEqual(
    pixels(1),
    pixels(1, { speed: NaN, particleCount: Infinity, scale: undefined }),
  );
  assert.deepEqual(pixels(1, { opacity: -1 }), pixels(1, { opacity: 0 }));
  assert.deepEqual(pixels(1, { scale: 1000 }), pixels(1, { scale: 125 }));
  assert.equal(defaultConfig.particleCount, 8500);
});

test("mount reads live settings, resizes, and cleans up safely twice", () => {
  const canvas = createCanvas(1, 1);
  let callback,
    resize,
    disconnected = false,
    cancelled = false;
  let width = 200;
  let config = { backgroundColor: "#000000", opacity: 0 };
  canvas.parentElement = {
    getBoundingClientRect: () => ({ width, height: 100 }),
  };
  canvas.ownerDocument = {
    createElement: () => createCanvas(1, 1),
    defaultView: {
      devicePixelRatio: 2,
      performance: { now: () => 0 },
      ResizeObserver: class {
        constructor(fn) {
          resize = fn;
        }
        observe() {}
        disconnect() {
          disconnected = true;
        }
      },
      requestAnimationFrame: (fn) => {
        callback = fn;
        return 1;
      },
      cancelAnimationFrame: () => {
        cancelled = true;
      },
    },
  };
  const stop = mountParticleBreath(canvas, () => config);
  callback(0);
  assert.equal(canvas.width, 400);
  assert.equal(canvas.getContext("2d").getImageData(0, 0, 1, 1).data[0], 0);
  config = { backgroundColor: "#ffffff", opacity: 0 };
  callback(1000);
  assert.equal(canvas.getContext("2d").getImageData(0, 0, 1, 1).data[0], 255);
  width = 300;
  resize();
  assert.equal(canvas.width, 600);
  stop();
  stop();
  assert.ok(disconnected && cancelled);
});
