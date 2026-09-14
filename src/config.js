export const CONFIG = {
  version: "0.1.29-alpha",
  normalCount: 15,
  khanScale: 1.12,
  field: { width: 6.8, depth: 11.4, thickness: 0.28, wallHeight: 2.4, safeMargin: 0.6 },
  playArea: { width: 4.45, depth: 8.45, centerZ: -0.52, pieceMargin: 0.34, edgePadding: 0.08 },
  camera: { alpha: Math.PI / 2, beta: 0.44, radius: 16.5, targetY: 0, fov: 0.72 },
  piece: { width: 0.62, height: 1.18, depth: 0.44, spawnHeightMin: 4.6, spawnHeightMax: 6.4, spawnRadiusX: 2.4, spawnRadiusZ: 3.0 },
  physics: { gravity:-9.81,mass:.19,friction:.72,restitution:.08,linearDamping:.30,angularDamping:.46,sleepLinearThreshold:.09,sleepAngularThreshold:.12,stableFramesRequired:24 },
  layout: { minDistance:.58,maxOverlapsAllowed:2,requiredPairCount:1,maxRerolls:0 },
  flick: { minSpeed:2.2,maxSpeed:5.8,speedPerUnit:.82,upwardSpeed:.05,settleDelayMs:1250 },
  debug: { labels:true,showPairLines:false }
};