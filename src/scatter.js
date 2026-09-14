import { CONFIG } from "./config.js";
import { createChuko, disposeChuko } from "./chuko.js";

export class ScatterSystem {
  constructor(scene) {
    this.scene = scene;
    this.pieces = [];
  }

  clear() {
    for (const p of this.pieces) disposeChuko(p);
    this.pieces = [];
  }

  scatter() {
    this.clear();
    for (let i = 0; i < CONFIG.normalCount; i++) {
      const p = createChuko(this.scene, i, false);
      this.placeSpawn(p, i);
      this.pieces.push(p);
    }
    const khan = createChuko(this.scene, CONFIG.normalCount, true);
    this.placeSpawn(khan, CONFIG.normalCount);
    this.pieces.push(khan);
    document.getElementById("pieceCount").textContent = CONFIG.normalCount;
    return this.pieces;
  }

  placeSpawn(mesh, i) {
    // Stratified 4x4 scatter instead of a radial pile. Each piece gets its own
    // cell plus jitter, so the settled board fills the field in 2D rather than
    // collapsing visually into one narrow line.
    const cols = 4;
    const rows = 4;
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const xMin = -2.75, xMax = 2.75;
    const zMin = -3.85, zMax = 2.65;
    const cellX = (xMax - xMin) / (cols - 1);
    const cellZ = (zMax - zMin) / (rows - 1);
    const x = xMin + col * cellX + rand(-0.42, 0.42);
    const z = zMin + row * cellZ + rand(-0.52, 0.52);

    mesh.position.set(
      x,
      rand(CONFIG.piece.spawnHeightMin, CONFIG.piece.spawnHeightMax) + i * 0.02,
      z
    );
    mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const body = mesh.metadata.aggregate.body;
    body.applyImpulse(
      new BABYLON.Vector3(rand(-0.12, 0.12), 0, rand(-0.12, 0.12)),
      mesh.getAbsolutePosition()
    );
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }
