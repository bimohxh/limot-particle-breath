import {
  mountParticleBreath,
  drawParticleBreath,
  defaultConfig,
  createBreathParticles,
  breathPoint,
} from "limot-particle-breath";
const canvas = document.createElement("canvas");
const stop: () => void = mountParticleBreath(canvas, () => ({ speed: 0.5 }));
drawParticleBreath(canvas.getContext("2d")!, 1280, 720, 2, defaultConfig);
breathPoint(createBreathParticles(8500)[0], 1, 1);
stop();
