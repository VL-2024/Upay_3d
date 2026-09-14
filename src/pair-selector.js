export class PairSelector {
  constructor(scene, stateStore) {
    this.scene = scene;
    this.store = stateStore;
    this.hl = new BABYLON.HighlightLayer("pairHighlight", scene, {
      blurHorizontalSize: 1.4,
      blurVerticalSize: 1.4
    });
    this.selectedColor = new BABYLON.Color3(1.0, 0.72, 0.05);
    this.targetColor = new BABYLON.Color3(0.05, 1.0, 0.30);
  }

  clearSelection() {
    this.store.selected = null;
    this.store.validTargets = [];
    document.getElementById("selected").textContent = "—";
    this.hl.removeAllMeshes();
  }

  select(source, pieces, allowKhan = false) {
    if (!source || !source.metadata || source.metadata.isKhan) return [];

    this.store.selected = source;
    const state = source.metadata.state;
    const targets = pieces.filter(p =>
      p !== source &&
      p.metadata?.state === state &&
      (allowKhan || !p.metadata?.isKhan)
    );

    this.store.validTargets = targets;
    document.getElementById("selected").textContent = `${source.metadata.id} / ${source.metadata.state}`;
    this.updateVisuals(pieces);
    return targets;
  }

  isValidTarget(mesh) {
    return this.store.validTargets.includes(mesh);
  }

  updateVisuals(pieces) {
    this.hl.removeAllMeshes();

    for (const p of pieces) {
      const shell = p.metadata?.shell;
      if (!shell?.material) continue;

      shell.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
      shell.scaling.setAll(1);

      if (p === this.store.selected) {
        shell.material.emissiveColor = new BABYLON.Color3(0.22, 0.13, 0.01);
        this.hl.addMesh(shell, this.selectedColor);
        shell.scaling.setAll(1.08);
      } else if (this.store.validTargets.includes(p)) {
        shell.material.emissiveColor = new BABYLON.Color3(0.02, 0.28, 0.04);
        this.hl.addMesh(shell, this.targetColor);
        shell.scaling.setAll(1.12);
      }
    }
  }
}
