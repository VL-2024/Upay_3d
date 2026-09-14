export class PairSelector {
  constructor(scene, stateStore) {
    this.scene = scene;
    this.store = stateStore;
    this.rings = new Map();
  }

  clearSelection() {
    this.store.selected = null;
    this.store.validTargets = [];
    document.getElementById("selected").textContent = "—";
  }

  select(source, pieces, allowKhan=false) {
    if (!source || !source.metadata || source.metadata.isKhan || source.metadata.collected) return [];
    this.store.selected = source;
    const state = source.metadata.state;

    const targets = pieces.filter(p => {
      if (p === source || p.metadata?.collected) return false;
      if (allowKhan) return !!p.metadata?.isKhan;
      return !p.metadata?.isKhan && p.metadata?.state === state;
    });

    this.store.validTargets = targets;
    document.getElementById("selected").textContent = `${source.metadata.id} / ${source.metadata.state}`;
    this.updateVisuals(pieces);
    return targets;
  }

  isValidTarget(mesh) {
    return !!mesh && !mesh.metadata?.collected && this.store.validTargets.includes(mesh);
  }

  clearRings() {
    for (const r of this.rings.values()) r.dispose();
    this.rings.clear();
  }

  makeRing(piece, color) {
    const ring = BABYLON.MeshBuilder.CreateTorus(
      `ring_${piece.metadata.id}_${Math.random()}`,
      { diameter: piece.metadata?.isKhan ? 1.38 : 1.15, thickness: 0.085, tessellation: 32 },
      this.scene
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copyFrom(piece.position);
    ring.position.y = Math.max(0.10, piece.position.y + 0.03);
    ring.isPickable = false;
    const mat = new BABYLON.StandardMaterial(`ringMat_${piece.metadata.id}`, this.scene);
    mat.emissiveColor = color;
    mat.diffuseColor = color;
    mat.disableLighting = true;
    mat.alpha = 0.95;
    ring.material = mat;
    this.rings.set(piece, ring);
  }

  updateVisuals(pieces) {
    this.clearRings();
    for (const p of pieces) {
      const shell = p.metadata?.shell;
      if (!shell?.material) continue;
      shell.material.emissiveColor = p.metadata.isKhan
        ? new BABYLON.Color3(0.08, 0.05, 0.0)
        : new BABYLON.Color3(0, 0, 0);
      if (p.metadata?.collected) continue;

      if (p === this.store.selected) {
        shell.material.emissiveColor = new BABYLON.Color3(0.55, 0.34, 0.02);
        this.makeRing(p, new BABYLON.Color3(1.0, 0.72, 0.08));
      } else if (this.store.validTargets.includes(p)) {
        if (p.metadata?.isKhan) {
          shell.material.emissiveColor = new BABYLON.Color3(0.95, 0.55, 0.02);
          this.makeRing(p, new BABYLON.Color3(1.0, 0.68, 0.06));
        } else {
          shell.material.emissiveColor = new BABYLON.Color3(0.10, 0.72, 0.08);
          this.makeRing(p, new BABYLON.Color3(0.15, 1.0, 0.18));
        }
      }
    }
  }

  followRings() {
    for (const [piece, ring] of this.rings.entries()) {
      if (piece.metadata?.collected) { ring.setEnabled(false); continue; }
      ring.position.x = piece.position.x;
      ring.position.z = piece.position.z;
      ring.position.y = Math.max(0.10, piece.position.y + 0.03);
    }
  }
}
