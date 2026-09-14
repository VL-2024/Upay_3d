export class CollectorSystem {
  constructor(scene) {
    this.scene = scene;
    this.collected = [];
  }

  reset() {
    this.collected = [];
    this.updateHud();
  }

  get activeCount() {
    return this.collected.length;
  }

  getSlot(index) {
    // Two three-piece racks near the lower edge of the field.
    const slots = [
      new BABYLON.Vector3(-3.00, 0.28, 4.55),
      new BABYLON.Vector3(-2.25, 0.28, 4.55),
      new BABYLON.Vector3(-1.50, 0.28, 4.55),
      new BABYLON.Vector3(1.50, 0.28, 4.55),
      new BABYLON.Vector3(2.25, 0.28, 4.55),
      new BABYLON.Vector3(3.00, 0.28, 4.55)
    ];
    return slots[Math.min(index, slots.length - 1)].clone();
  }

  collect(piece, onDone) {
    if (!piece || piece.metadata?.collected) {
      onDone?.(null);
      return false;
    }

    const index = this.collected.length;
    if (index >= 6) {
      onDone?.({ total: 6, unit: 2, unitComplete: true, allComplete: true });
      return false;
    }

    piece.metadata.collected = true;
    piece.metadata.label?.dispose?.();
    piece.metadata.label = null;

    const start = piece.getAbsolutePosition().clone();
    const end = this.getSlot(index);
    const startQ = piece.rotationQuaternion
      ? piece.rotationQuaternion.clone()
      : BABYLON.Quaternion.FromEulerAngles(piece.rotation.x, piece.rotation.y, piece.rotation.z);
    const endQ = BABYLON.Quaternion.FromEulerAngles(0, 0, Math.PI / 2);

    // Remove the collected piece from Havok. From this point it is a display piece,
    // so it cannot interfere with the next legal flick.
    piece.metadata.aggregate?.dispose?.();
    piece.metadata.aggregate = null;

    const duration = 620;
    const t0 = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const p = BABYLON.Vector3.Lerp(start, end, e);
      p.y += Math.sin(Math.PI * t) * 0.85;
      piece.position.copyFrom(p);
      piece.rotationQuaternion = BABYLON.Quaternion.Slerp(startQ, endQ, e);

      if (t >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        piece.position.copyFrom(end);
        piece.rotationQuaternion.copyFrom(endQ);
        this.collected.push(piece);
        this.updateHud();

        const total = this.collected.length;
        const unit = total <= 3 ? 1 : 2;
        const unitComplete = total === 3 || total === 6;
        onDone?.({
          total,
          unit,
          unitComplete,
          allComplete: total === 6,
          progressInUnit: total <= 3 ? total : total - 3
        });
      }
    });

    return true;
  }

  updateHud() {
    const total = this.collected.length;
    const one = Math.min(total, 3);
    const two = Math.max(0, Math.min(total - 3, 3));
    const upay1 = document.getElementById("upay1Count");
    const upay2 = document.getElementById("upay2Count");
    const tray1 = document.getElementById("upay1");
    const tray2 = document.getElementById("upay2");

    if (upay1) upay1.textContent = one >= 3 ? "1 УПАЙ" : `${one}/3`;
    if (upay2) upay2.textContent = two >= 3 ? "2 УПАЙ" : `${two}/3`;
    tray1?.classList.toggle("complete", one >= 3);
    tray2?.classList.toggle("complete", two >= 3);
  }
}
