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

let stableFrames = 0;
let settlingStartedAt = 0;

new InputController(
  scene,
  canvas,
  store,
  selector,
  () => scatter.pieces,
  (source, target) => {
    if (!source || !target) return;

    selector.clearSelection();
    selector.updateVisuals(scatter.pieces);
    labels.refresh(scatter.pieces, false);
    store.setState(GameState.FLICKING);
    document.getElementById("hint").textContent =
      `${source.metadata.id} → ${target.metadata.id}`;

    const moved = flickToTarget(source, target);
    if (!moved) {
      store.setState(GameState.READY);
      document.getElementById("hint").textContent = "Не удалось запустить щелчок.";
      return;
    }

    window.setTimeout(() => {
      updateAllOrientations(scatter.pieces);
      labels.refresh(scatter.pieces, store.debug && CONFIG.debug.labels);
      updatePairCount();
      store.setState(GameState.READY);
      document.getElementById("hint").textContent =
        "Щелчок выполнен. Выберите следующий чүкө.";
    }, CONFIG.flick.settleDelayMs);
  }
);

function beginScatter() {
  selector.clearSelection();
  labels.refresh(scatter.pieces, false);
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
  document.getElementById("pairCount").textContent = "0";
  document.getElementById("selected").textContent = "—";
  store.setState(GameState.INIT);
  document.getElementById("hint").textContent =
    "Нажмите «РАССЫПАТЬ». Затем выберите чүкө и ярко-зелёную цель.";
}

function allStable() {
  if (!scatter.pieces.length) return false;
  for (const p of scatter.pieces) {
    const body = p.metadata.aggregate.body;
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
  // IMPORTANT v0.1.2: no automatic reroll at all.
  updateAllOrientations(scatter.pieces);
  const check = validateLayout(scatter.pieces);

  labels.refresh(scatter.pieces, store.debug && CONFIG.debug.labels);
  selector.updateVisuals(scatter.pieces);
  document.getElementById("pairCount").textContent = String(check.pairCount);
  store.setState(GameState.READY);

  document.getElementById("hint").textContent = check.valid
    ? "Выберите чүкө. Совпадающие цели загорятся ярко-зелёным."
    : `Расклад принят без перерасклада. DEBUG: ${check.issues.join(", ") || "OK"}`;
}

function updatePairCount() {
  const check = validateLayout(scatter.pieces);
  document.getElementById("pairCount").textContent = String(check.pairCount);
}

document.getElementById("scatterBtn").addEventListener("click", beginScatter);
document.getElementById("resetBtn").addEventListener("click", reset);
document.getElementById("debugBtn").addEventListener("click", () => {
  store.debug = !store.debug;
  document.getElementById("debugBtn").textContent = `DEBUG: ${store.debug ? "ON" : "OFF"}`;
  labels.refresh(scatter.pieces, store.debug && CONFIG.debug.labels);
});

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

  if (store.debug) labels.follow(scatter.pieces);
  scene.render();
});

window.addEventListener("resize", () => engine.resize());
