import { CONFIG } from "./config.js";
import { createChuko, disposeChuko } from "./chuko.js";

export class ScatterSystem {
  constructor(scene) { this.scene = scene; this.pieces = []; }
  clear() { for (const p of this.pieces) disposeChuko(p); this.pieces = []; }

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
    // Precomputed 3x6 layout fully inside the blue play-area boundary.
    // Wider spacing prevents falling pieces from colliding hard enough to
    // cross the border and then being visibly corrected a second later.
    const a = CONFIG.playArea;
    const margin = Math.max(a.pieceMargin ?? 0.34, 0.68);
    const minX = -a.width / 2 + margin;
    const maxX =  a.width / 2 - margin;
    const minZ = (a.centerZ ?? 0) - a.depth / 2 + margin;
    const maxZ = (a.centerZ ?? 0) + a.depth / 2 - margin;

    const xs = linspace(minX, maxX, 3);
    const zs = linspace(minZ, maxZ, 6);
    const cells = [];
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
        cell.x + rand(-0.07, 0.07),
        rand(3.4, 4.8) + i * 0.012,
        cell.z + rand(-0.09, 0.09)
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
    // Almost no lateral impulse: the visual scatter now comes mostly from
    // falling/rotating, while the final landing stays inside the play area.
    body.applyImpulse(
      new BABYLON.Vector3(rand(-0.008, 0.008), 0, rand(-0.012, 0.012)),
      mesh.getAbsolutePosition()
    );
  }
}

function linspace(a, b, n) {
  if (n <= 1) return [(a + b) / 2];
  const out = [];
  for (let i = 0; i < n; i++) out.push(a + (b - a) * (i / (n - 1)));
  return out;
}
function rand(a, b) { return a + Math.random() * (b - a); }
