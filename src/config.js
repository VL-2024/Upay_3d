export const CONFIG = {
  version: "0.1.8-alpha",
  normalCount: 15,
  khanScale: 1.12,

  field: { width: 8.4, depth: 12.6, thickness: 0.28, wallHeight: 2.4, safeMargin: 0.6 },
  camera: { alpha: Math.PI / 2, beta: 0.44, radius: 16.5, targetY: 0, fov: 0.72 },
  piece: {
    width: 0.62, height: 1.18, depth: 0.44,
    spawnHeightMin: 4.6, spawnHeightMax: 6.4,
    spawnRadiusX: 3.35, spawnRadiusZ: 3.35
  },
  physics: {
    gravity: -9.81,
    mass: 0.19,
    friction: 0.72,
    restitution: 0.08,
    linearDamping: 0.30,
    angularDamping: 0.46,
    sleepLinearThreshold: 0.09,
    sleepAngularThreshold: 0.12,
    stableFramesRequired: 24
  },
  layout: {
    minDistance: 0.58,
    maxOverlapsAllowed: 2,
    requiredPairCount: 1,
    maxRerolls: 0
  },
  flick: {
    minSpeed: 2.2,
    maxSpeed: 5.8,
    speedPerUnit: 0.82,
    upwardSpeed: 0.05,
    settleDelayMs: 1250
  },
  debug: { labels: true, showPairLines: false }
};
