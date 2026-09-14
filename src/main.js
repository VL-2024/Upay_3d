import { CONFIG } from "./config.js";
import { createScene } from "./scene.js";
import { ScatterSystem } from "./scatter.js";
import { updateAllOrientations } from "./orientation.js";
import { validateLayout } from "./layout-validator.js";
import { GameState, StateStore } from "./game-state.js";
import { PairSelector } from "./pair-selector.js";
import { InputController } from "./input.js";
import { flickToTarget } from "./flick.js";
import { DebugLabels } from "./debug-labels.js";
import { CollectorSystem } from "./collector.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
  adaptToDeviceRatio: true
});

const havokInstance = await HavokPhysics();
const { scene } = createScene(engine, canvas, havokInstance);
const store = new StateStore();
const scatter = new ScatterSystem(scene);
const selector = new PairSelector(scene, store);
const labels = new DebugLabels(scene);
const collector = new CollectorSystem(scene);
const statusEl = document.querySelector(".status");
if (statusEl) statusEl.textContent = `v${CONFIG.version} • Babylon.js + Havok`;

let stableFrames = 0;
let settlingStartedAt = 0;

function activePieces() {
  return scatter.pieces.filter(p => !p.metadata?.collected);
}

// After the initial physical scatter has settled, the board becomes a controlled
// lottery layout. Active pieces are kept as ANIMATED Havok bodies at their exact
// settled transforms. This prevents slow drift and stops neighbouring chuko from
// being pushed outside the field by later visual flicks.
function freezeActivePieces() {
  for (const p of activePieces()) {
    const body = p.metadata?.aggregate?.body;
    if (!body) continue;
    try {
      const pos = p.getAbsolutePosition().clone();
      const q = p.rotationQuaternion
        ? p.rotationQuaternion.clone()
        : BABYLON.Quaternion.FromEulerAngles(p.rotation.x, p.rotation.y, p.rotation.z);
      body.setLinearVelocity(BABYLON.Vector3.Zero());
      body.setAngularVelocity(BABYLON.Vector3.Zero());
      body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
      body.setTargetTransform(pos, q);
    } catch (_) {}
  }
}

new InputController(
  scene,
  canvas,
  store,
  selector,
  () => activePieces(),
  (source, target) => {
    if (!source || !target) return;

    selector.clearSelection();
    selector.updateVisuals(scatter.pieces);
    labels.refresh(scatter.pieces, false);
    store.setState(GameState.FLICKING);
    document.getElementById("hint").textContent =
      `${source.metadata.id} → ${target.metadata.id}`;

    const moved = flickToTarget(scene, source, target, (ok) => {
      if (!ok) {
        freezeActivePieces();
        updateAllOrientations(activePieces());
        labels.refresh(activePieces(), store.debug && CONFIG.debug.labels);
        updatePairCount();
        store.setState(GameState.READY);
        document.getElementById("hint").textContent = "Не удалось запустить щелчок.";
        return;
      }

      document.getElementById("hint").textContent =
        `${target.metadata.id} взят. Переносим в УПАЙ…`;

      const collecting = collector.collect(target, result => {
        freezeActivePieces();
        updateAllOrientations(activePieces());
        labels.refresh(activePieces(), store.debug && CONFIG.debug.labels);
        selector.clearSelection();
        selector.updateVisuals(scatter.pieces);
        updatePairCount();
        store.setState(GameState.READY);

        if (!result) {
          document.getElementById("hint").textContent =
            "Чүкө собран. Выберите следующую пару.";
          return;
        }

        if (result.allComplete) {
          document.getElementById("hint").textContent =
            "2 УПАЙ! Тестовый цикл сбора завершён.";
        } else if (result.total === 3) {
          document.getElementById("hint").textContent =
            "1 УПАЙ! Теперь собираем второй Упай.";
        } else {
          document.getElementById("hint").textContent =
            `УПАЙ ${result.unit}: ${result.progressInUnit}/3. Выберите следующую пару.`;
        }
      });

      if (!collecting) {
        freezeActivePieces();
        updateAllOrientations(activePieces());
        labels.refresh(activePieces(), store.debug && CONFIG.debug.labels);
        updatePairCount();
        store.setState(GameState.READY);
      }
    });

    if (!moved) {
      freezeActivePieces();
      store.setState(GameState.READY);
      document.getElementById("hint").textContent = "Не удалось запустить щелчок.";
    }
  }
);

function beginScatter() {
  selector.clearSelection();
  labels.refresh(scatter.pieces, false);
  collector.reset();
  store.setState(GameState.SCATTERING);
  scatter.scatter();
  stableFrames = 0;
  settlingStartedAt = performance.now();
  store.setState(GameState.SETTLING);
  document.getElementById("hint").textContent = "Чүкө рассыпаются…";
}

function reset() {
  selector.clearSelection();
  labels.refresh(scatter.pieces, false);
  scatter.clear();
  collector.reset();
  document.getElementById("pairCount").textContent = "0";
  document.getElementById("selected").textContent = "—";
  store.setState(GameState.INIT);
  document.getElementById("hint").textContent =
    "Нажмите «РАССЫПАТЬ». Затем выберите чүкө и ярко-зелёную цель.";
}

function allStable() {
  const pieces = activePieces();
  if (!pieces.length) return false;
  for (const p of pieces) {
    const body = p.metadata?.aggregate?.body;
    if (!body) continue;
    const lv = body.getLinearVelocity();
    const av = body.getAngularVelocity();
    if (
      lv.length() > CONFIG.physics.sleepLinearThreshold ||
      av.length() > CONFIG.physics.sleepAngularThreshold
    ) return false;
  }
  return true;
}

function finalizeLayout() {
  const pieces = activePieces();
  updateAllOrientations(pieces);
  const check = validateLayout(pieces);

  // Lock the accepted layout. From here on only the chosen source/target are
  // visually moved by the deterministic flick/collector systems.
  freezeActivePieces();

  labels.refresh(pieces, store.debug && CONFIG.debug.labels);
  selector.updateVisuals(scatter.pieces);
  document.getElementById("pairCount").textContent = String(check.pairCount);
  store.setState(GameState.READY);

  document.getElementById("hint").textContent = check.valid
    ? "Выберите чүкө. Совпадающие цели загорятся ярко-зелёным."
    : `Расклад принят без перерасклада. DEBUG: ${check.issues.join(", ") || "OK"}`;
}

function updatePairCount() {
  const check = validateLayout(activePieces());
  document.getElementById("pairCount").textContent = String(check.pairCount);
}

document.getElementById("scatterBtn").addEventListener("click", beginScatter);
document.getElementById("resetBtn").addEventListener("click", reset);
document.getElementById("debugBtn").addEventListener("click", () => {
  store.debug = !store.debug;
  document.getElementById("debugBtn").textContent = `DEBUG: ${store.debug ? "ON" : "OFF"}`;
  labels.refresh(activePieces(), store.debug && CONFIG.debug.labels);
});

collector.reset();

engine.runRenderLoop(() => {
  document.getElementById("fps").textContent = engine.getFps().toFixed(0);

  if (store.state === GameState.SETTLING) {
    if (allStable()) stableFrames++;
    else stableFrames = 0;

    const timedOut = performance.now() - settlingStartedAt > 7000;
    if (stableFrames >= CONFIG.physics.stableFramesRequired || timedOut) {
      finalizeLayout();
      stableFrames = 0;
    }
  }

  if (store.debug) labels.follow(activePieces());
  selector.followRings();
  scene.render();
});

window.addEventListener("resize", () => engine.resize());
