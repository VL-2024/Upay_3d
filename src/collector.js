export class CollectorSystem {
  constructor(scene) {
    this.scene = scene;
    this.collected = [];
    this.ensureHud();
    this.createTrayVisuals();
  }

  ensureHud() {
    if (document.getElementById("upayBoard")) return;
    const app = document.getElementById("app") || document.body;
    const board = document.createElement("div");
    board.id = "upayBoard";
    board.style.cssText = "position:absolute;right:10px;top:58px;z-index:12;display:flex;flex-direction:column;gap:7px;pointer-events:none";
    board.innerHTML = `
      <div id="upay1" style="min-width:104px;padding:8px 10px;border-radius:12px;background:rgba(6,18,31,.72);border:1px solid rgba(255,255,255,.18);color:#fff;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.18)">
        <div style="font-size:10px;letter-spacing:.12em;opacity:.8">УПАЙ 1</div>
        <div id="upay1Count" style="font-size:15px;font-weight:900;margin-top:2px">0/3</div>
      </div>
      <div id="upay2" style="min-width:104px;padding:8px 10px;border-radius:12px;background:rgba(6,18,31,.72);border:1px solid rgba(255,255,255,.18);color:#fff;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.18)">
        <div style="font-size:10px;letter-spacing:.12em;opacity:.8">УПАЙ 2</div>
        <div id="upay2Count" style="font-size:15px;font-weight:900;margin-top:2px">0/3</div>
      </div>`;
    app.appendChild(board);
  }

  createTrayVisuals() {
    if (this.scene.getMeshByName("upayTray1")) return;

    const makeTray = (name, x) => {
      const tray = BABYLON.MeshBuilder.CreateBox(name, {
        width: 3.25,
        height: 0.035,
        depth: 1.30
      }, this.scene);
      tray.position.set(x, 0.025, 4.55);
      tray.isPickable = false;
      const mat = new BABYLON.StandardMaterial(`${name}Mat`, this.scene);
      mat.diffuseColor = new BABYLON.Color3(0.08, 0.20, 0.27);
      mat.emissiveColor = new BABYLON.Color3(0.02, 0.06, 0.08);
      mat.alpha = 0.72;
      tray.material = mat;
      return tray;
    };

    makeTray("upayTray1", -2.20);
    makeTray("upayTray2", 2.20);
  }

  reset() {
    this.collected = [];
    this.updateHud();
  }

  getSlot(index) {
    // Two explicit three-piece trays in the reserved lower strip of the field.
    const slots = [
      new BABYLON.Vector3(-3.00, 0.30, 4.55),
      new BABYLON.Vector3(-2.20, 0.30, 4.55),
      new BABYLON.Vector3(-1.40, 0.30, 4.55),
      new BABYLON.Vector3(1.40, 0.30, 4.55),
      new BABYLON.Vector3(2.20, 0.30, 4.55),
      new BABYLON.Vector3(3.00, 0.30, 4.55)
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

    // Stop the target exactly where it was hit before removing Havok.
    const body = piece.metadata?.aggregate?.body;
    try {
      body?.setLinearVelocity(BABYLON.Vector3.Zero());
      body?.setAngularVelocity(BABYLON.Vector3.Zero());
    } catch (_) {}

    const start = piece.getAbsolutePosition().clone();
    const end = this.getSlot(index);
    const startQ = piece.rotationQuaternion
      ? piece.rotationQuaternion.clone()
      : BABYLON.Quaternion.FromEulerAngles(piece.rotation.x, piece.rotation.y, piece.rotation.z);
    const endQ = BABYLON.Quaternion.FromEulerAngles(0, 0, Math.PI / 2);

    piece.metadata.aggregate?.dispose?.();
    piece.metadata.aggregate = null;

    const duration = 560;
    const t0 = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const p = BABYLON.Vector3.Lerp(start, end, e);
      p.y += Math.sin(Math.PI * t) * 0.70;
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
        onDone?.({
          total,
          unit,
          unitComplete: total === 3 || total === 6,
          allComplete: total === 6,
          progressInUnit: total <= 3 ? total : total - 3
        });
      }
    });

    return true;
  }

  updateHud() {
    this.ensureHud();
    const total = this.collected.length;
    const one = Math.min(total, 3);
    const two = Math.max(0, Math.min(total - 3, 3));
    const upay1 = document.getElementById("upay1Count");
    const upay2 = document.getElementById("upay2Count");
    const tray1 = document.getElementById("upay1");
    const tray2 = document.getElementById("upay2");

    if (upay1) upay1.textContent = one >= 3 ? "1 УПАЙ" : `${one}/3`;
    if (upay2) upay2.textContent = two >= 3 ? "2 УПАЙ" : `${two}/3`;

    if (tray1) {
      tray1.style.borderColor = one >= 3 ? "#e7c36a" : "rgba(255,255,255,.18)";
      tray1.style.boxShadow = one >= 3 ? "0 0 18px rgba(231,195,106,.42)" : "0 6px 18px rgba(0,0,0,.18)";
    }
    if (tray2) {
      tray2.style.borderColor = two >= 3 ? "#e7c36a" : "rgba(255,255,255,.18)";
      tray2.style.boxShadow = two >= 3 ? "0 0 18px rgba(231,195,106,.42)" : "0 6px 18px rgba(0,0,0,.18)";
    }
  }
}
