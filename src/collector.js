export class CollectorSystem {
  constructor(scene) {
    this.scene = scene;
    this.collected = [];
    this.trayMaterials = [];
    this.slotMarkers = [];
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
      <div id="upay1" style="min-width:104px;padding:8px 10px;border-radius:12px;background:rgba(6,18,31,.72);border:1px solid rgba(255,255,255,.18);color:#fff;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.18);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease">
        <div style="font-size:10px;letter-spacing:.12em;opacity:.8">УПАЙ 1</div>
        <div id="upay1Count" style="font-size:15px;font-weight:900;margin-top:2px">0/3</div>
      </div>
      <div id="upay2" style="min-width:104px;padding:8px 10px;border-radius:12px;background:rgba(6,18,31,.72);border:1px solid rgba(255,255,255,.18);color:#fff;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.18);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease">
        <div style="font-size:10px;letter-spacing:.12em;opacity:.8">УПАЙ 2</div>
        <div id="upay2Count" style="font-size:15px;font-weight:900;margin-top:2px">0/3</div>
      </div>`;
    app.appendChild(board);
  }

  createTrayVisuals() {
    if (this.scene.getMeshByName("upayTray1")) return;

    const makeTray = (name, x) => {
      const tray = BABYLON.MeshBuilder.CreateBox(name, {
        width: 2.85,
        height: 0.035,
        depth: 1.10
      }, this.scene);
      tray.position.set(x, 0.025, 3.75);
      tray.isPickable = false;

      const mat = new BABYLON.StandardMaterial(`${name}Mat`, this.scene);
      mat.diffuseColor = new BABYLON.Color3(0.08, 0.20, 0.27);
      mat.emissiveColor = new BABYLON.Color3(0.02, 0.06, 0.08);
      mat.alpha = 0.72;
      tray.material = mat;
      this.trayMaterials.push(mat);
      return tray;
    };

    makeTray("upayTray1", -1.85);
    makeTray("upayTray2", 1.85);

    // Six subtle markers make it visually clear that each UPAI is exactly 3 chuko.
    for (let i = 0; i < 6; i++) {
      const p = this.getSlot(i);
      const marker = BABYLON.MeshBuilder.CreateCylinder(`upaySlot${i + 1}`, {
        diameter: 0.48,
        height: 0.012,
        tessellation: 32
      }, this.scene);
      marker.position.set(p.x, 0.055, p.z);
      marker.isPickable = false;
      const mm = new BABYLON.StandardMaterial(`upaySlotMat${i + 1}`, this.scene);
      mm.diffuseColor = new BABYLON.Color3(0.35, 0.52, 0.58);
      mm.emissiveColor = new BABYLON.Color3(0.04, 0.09, 0.11);
      mm.alpha = 0.28;
      marker.material = mm;
      this.slotMarkers.push(marker);
    }
  }

  reset() {
    this.collected = [];
    for (const marker of this.slotMarkers) marker.setEnabled(true);
    for (const mat of this.trayMaterials) {
      mat.emissiveColor.copyFromFloats(0.02, 0.06, 0.08);
    }
    this.updateHud();
  }

  getSlot(index) {
    const slots = [
      new BABYLON.Vector3(-2.55, 0.30, 3.75),
      new BABYLON.Vector3(-1.85, 0.30, 3.75),
      new BABYLON.Vector3(-1.15, 0.30, 3.75),
      new BABYLON.Vector3(1.15, 0.30, 3.75),
      new BABYLON.Vector3(1.85, 0.30, 3.75),
      new BABYLON.Vector3(2.55, 0.30, 3.75)
    ];
    return slots[Math.min(index, slots.length - 1)].clone();
  }

  clampToVisibleField(p) {
    p.x = Math.max(-2.85, Math.min(2.85, p.x));
    p.z = Math.max(-4.65, Math.min(4.05, p.z));
    return p;
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
    piece.isPickable = false;
    for (const child of piece.getChildMeshes?.() || []) child.isPickable = false;

    const body = piece.metadata?.aggregate?.body;
    try {
      body?.setLinearVelocity(BABYLON.Vector3.Zero());
      body?.setAngularVelocity(BABYLON.Vector3.Zero());
      body?.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    } catch (_) {}

    const start = this.clampToVisibleField(piece.getAbsolutePosition().clone());
    const end = this.getSlot(index);
    const startQ = piece.rotationQuaternion
      ? piece.rotationQuaternion.clone()
      : BABYLON.Quaternion.FromEulerAngles(piece.rotation.x, piece.rotation.y, piece.rotation.z);
    const endQ = BABYLON.Quaternion.FromEulerAngles(0, 0, Math.PI / 2);

    piece.metadata.aggregate?.dispose?.();
    piece.metadata.aggregate = null;
    piece.position.copyFrom(start);

    const duration = 560;
    const t0 = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const p = BABYLON.Vector3.Lerp(start, end, e);
      p.y += Math.sin(Math.PI * t) * 0.64;
      this.clampToVisibleField(p);
      piece.position.copyFrom(p);
      piece.rotationQuaternion = BABYLON.Quaternion.Slerp(startQ, endQ, e);

      if (t >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        piece.position.copyFrom(end);
        piece.rotationQuaternion.copyFrom(endQ);
        this.slotMarkers[index]?.setEnabled(false);
        this.collected.push(piece);
        this.updateHud();

        const total = this.collected.length;
        const unit = total <= 3 ? 1 : 2;
        const unitComplete = total === 3 || total === 6;
        if (unitComplete) this.celebrateUnit(unit);

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

  celebrateUnit(unit) {
    const trayIndex = unit - 1;
    const mat = this.trayMaterials[trayIndex];
    const hud = document.getElementById(`upay${unit}`);
    const start = performance.now();
    const duration = 720;

    if (hud) {
      hud.style.transform = "scale(1.08)";
      window.setTimeout(() => { hud.style.transform = "scale(1)"; }, 220);
    }

    if (!mat) return;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const pulse = Math.sin(Math.PI * t);
      mat.emissiveColor.copyFromFloats(
        0.02 + pulse * 0.34,
        0.06 + pulse * 0.25,
        0.08 + pulse * 0.08
      );
      if (t >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        mat.emissiveColor.copyFromFloats(0.13, 0.11, 0.03);
      }
    });
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
      tray1.style.boxShadow = one >= 3 ? "0 0 20px rgba(231,195,106,.52)" : "0 6px 18px rgba(0,0,0,.18)";
    }
    if (tray2) {
      tray2.style.borderColor = two >= 3 ? "#e7c36a" : "rgba(255,255,255,.18)";
      tray2.style.boxShadow = two >= 3 ? "0 0 20px rgba(231,195,106,.52)" : "0 6px 18px rgba(0,0,0,.18)";
    }
  }
}
