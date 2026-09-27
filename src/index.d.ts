export interface ParticleBreathConfig {
  /** Default #111111. Use an opaque CSS color to keep the background opaque. */
  backgroundColor?: string;
  /** Default #e0dfd8. */
  dotColor?: string;
  /** 40–125 (%), default 100. */
  scale?: number;
  /** 0.5–2 (px), default 1. */
  particleSize?: number;
  /** 1500–16000, default 8500. Approximate surface sample count. */
  particleCount?: number;
  /** 0–1, default 1. Opacity of the complete graphic layer. */
  opacity?: number;
  /** 0–3, default 1. */
  speed?: number;
  /** 0–150 (%), default 75. */
  breathStrength?: number;
}
export interface BreathParticle {
  u: number;
  v: number;
  r: number;
  a: number;
}
export const defaultConfig: Readonly<Required<ParticleBreathConfig>>;
export function createBreathParticles(count: number): BreathParticle[];
export function breathPoint(
  particle: BreathParticle,
  time: number,
  amplitude: number,
): { x: number; y: number; z: number };
export function drawParticleBreath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  time?: number,
  config?: ParticleBreathConfig,
): void;
export function mountParticleBreath(
  canvas: HTMLCanvasElement,
  config?: ParticleBreathConfig | (() => ParticleBreathConfig),
): () => void;
