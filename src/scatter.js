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

    const total = CONFIG.normalCount + 1;
    const cells = this.buildCells(total);

    for (let i = 0; i < CONFIG.normalCount; i++) {
      const p = createChuko(this.scene, i, false, this.makeSpawn(cells[i], i));
      this.applyScatterImpulse(p);
      this.pieces.push(p);
    }

    const khan = createChuko(
      this.scene,
      CONFIG.normalCount,
      true,
      this.makeSpawn(cells[CONFIG.normalCount], CONFIG.normalCount)
    );
    this.applyScatterImpulse(khan);
    this.pieces.push(khan);

    document.getElementById("pieceCount").textContent = CONFIG.normalCount;
    return this.pieces;
  }

  buildCells(total) {
    // Keep all spawn cells comfortably inside the visible rug. The old outer
    // columns were too close to the physical walls, so rotating pieces could
    // settle half outside the field.
    const cells = [];
    const xs = [-2.35, -0.78, 0.78, 2.35];
    const zs = [-3.25, -1.35, 0.55, 2.30];
    for (const z of zs) for (const x of xs) cells.push({ x, z });

    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells.slice(0, total);
  }

  makeSpawn(cell, i) {
    return {
      position: new BABYLON.Vector3(
        cell.x + rand(-0.22, 0.22),
        rand(CONFIG.piece.spawnHeightMin, CONFIG.piece.spawnHeightMax) + i * 0.018,
        cell.z + rand(-0.26, 0.26)
      ),
      rotationQuaternion: BABYLON.Quaternion.RotationYawPitchRoll(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )
    };
  }

  applyScatterImpulse(mesh) {
    const body = mesh.metadata.aggregate.body;
    body.applyImpulse(
      new BABYLON.Vector3(rand(-0.07, 0.07), 0, rand(-0.07, 0.07)),
      mesh.getAbsolutePosition()
    );
  }
}

function rand(a, b) { return a + Math.random() * (b - a); }
