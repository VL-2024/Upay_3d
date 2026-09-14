export const CONFIG = {
  version: "0.1.39-alpha",
  normalCount: 15,
  khanScale: 1.12,
  field: { width: 6.8, depth: 11.4, thickness: 0.28, wallHeight: 2.4, safeMargin: 0.6 },
  playArea: {
    width: 4.45,
    depth: 6.55,
    centerZ: -0.55,
    pieceMargin: 0.72,
    edgePadding: 0.10
  },
  camera: { alpha: Math.PI / 2, beta: 0.44, radius: 16.5, targetY: 0, fov: 0.72 },
  piece: { modelLength:.84, modelHeight:.57, modelDepth:.66, width:0.62, height:1.18, depth:0.44, spawnHeightMin:2.8, spawnHeightMax:3.7, spawnRadiusX:2.4, spawnRadiusZ:3.0 },
  physics: { gravity:-9.81,mass:.19,friction:.72,restitution:.08,linearDamping:.34,angularDamping:.50,sleepLinearThreshold:.09,sleepAngularThreshold:.12,stableFramesRequired:24 },
  layout: { minDistance:.58,maxOverlapsAllowed:2,requiredPairCount:1,maxRerolls:0 },
  flick: { minSpeed:2.2,maxSpeed:5.8,speedPerUnit:.82,upwardSpeed:.05,settleDelayMs:1250 },
  debug: { labels:true,showPairLines:false }
};