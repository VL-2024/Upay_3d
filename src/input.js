import { GameState } from "./game-state.js";

export class InputController {
  constructor(scene, canvas, store, selector, getPieces, onFlick, canTargetKhan=()=>false) {
    this.scene = scene;
    this.canvas = canvas;
    this.store = store;
    this.selector = selector;
    this.getPieces = getPieces;
    this.onFlick = onFlick;
    this.canTargetKhan = canTargetKhan;
    this.down = null;
    this.install();
  }

  install() {
    this.scene.onPointerObservable.add(pi => {
      if (this.store.state !== GameState.READY) return;

      if (pi.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        const hit = this.pickPiece();
        this.down = { x: this.scene.pointerX, y: this.scene.pointerY, mesh: hit };
      }

      if (pi.type === BABYLON.PointerEventTypes.POINTERUP) {
        const upX = this.scene.pointerX;
        const upY = this.scene.pointerY;
        const moved = this.down ? Math.hypot(upX - this.down.x, upY - this.down.y) : 0;
        const upMesh = this.pickPiece();
        const allowKhan = !!this.canTargetKhan();

        if (moved < 22) {
          if (!this.store.selected) {
            if (upMesh && !upMesh.metadata.isKhan && !upMesh.metadata.collected) {
              this.selector.select(upMesh, this.getPieces(), allowKhan);
            }
          } else if (upMesh && this.selector.isValidTarget(upMesh)) {
            this.onFlick(this.store.selected, upMesh);
          } else if (upMesh && !upMesh.metadata.isKhan && !upMesh.metadata.collected) {
            this.selector.select(upMesh, this.getPieces(), allowKhan);
          } else {
            this.selector.clearSelection();
            this.selector.updateVisuals(this.getPieces());
          }
        } else if (this.store.selected || this.down?.mesh) {
          const source = this.store.selected || this.down.mesh;
          if (source?.metadata?.collected || source?.metadata?.isKhan) {
            this.down = null;
            return;
          }
          if (source && !this.store.selected) {
            this.selector.select(source, this.getPieces(), allowKhan);
          }
          const target = this.bestTargetBySwipe(source, upX - this.down.x, upY - this.down.y);
          if (target) this.onFlick(source, target);
        }
        this.down = null;
      }
    });
  }

  pickPiece() {
    const pick = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY,
      mesh => !!mesh?.metadata?.id || !!mesh?.metadata?.physicsMesh
    );
    if (!pick?.hit || !pick.pickedMesh) return null;
    const piece = pick.pickedMesh.metadata?.physicsMesh || pick.pickedMesh;
    return piece?.metadata?.collected ? null : piece;
  }

  bestTargetBySwipe(source, dx, dy) {
    const targets = this.store.validTargets.filter(t => !t.metadata?.collected);
    if (!source || source.metadata?.collected || targets.length === 0) return null;
    const mag = Math.hypot(dx, dy);
    if (mag < 10) return null;
    const sx = dx / mag, sy = dy / mag;
    const vp = this.scene.activeCamera.viewport.toGlobal(
      this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight()
    );
    const sp = BABYLON.Vector3.Project(
      source.getAbsolutePosition(), BABYLON.Matrix.Identity(), this.scene.getTransformMatrix(), vp
    );
    let best = null, bestScore = -Infinity;
    for (const t of targets) {
      const tp = BABYLON.Vector3.Project(
        t.getAbsolutePosition(), BABYLON.Matrix.Identity(), this.scene.getTransformMatrix(), vp
      );
      const vx = tp.x - sp.x, vy = tp.y - sp.y;
      const vm = Math.hypot(vx, vy) || 1;
      const score = sx * (vx / vm) + sy * (vy / vm);
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return bestScore > 0.35 ? best : null;
  }
}
