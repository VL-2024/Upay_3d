import { CONFIG } from "./config.js";

/**
 * Deterministic technical flick for v0.1.9.
 * Source and target are kept under controlled ANIMATED motion through contact.
 * After contact the target is collected, while the source REMAINS animated
 * at rest instead of being returned to DYNAMIC. This removes the Havok
 * launch edge case that was still occurring on the first move.
 */
export function flickToTarget(scene, source, target, onDone) {
  const body = source?.metadata?.aggregate?.body;
  const targetBody = target?.metadata?.aggregate?.body;
  if (!body || !target || !targetBody) {
    onDone?.(false);
    return false;
  }

  const start = source.getAbsolutePosition().clone();
  const targetPos = target.getAbsolutePosition().clone();
  const targetQ = target.rotationQuaternion
    ? target.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(target.rotation.x, target.rotation.y, target.rotation.z);

  const delta = targetPos.subtract(start);
  const flat = new BABYLON.Vector3(delta.x, 0, delta.z);
  const distance = flat.length();
  if (distance < 0.15) {
    onDone?.(false);
    return false;
  }

  const direction = flat.normalize();
  const contactGap = 0.18;
  const travel = Math.max(0.10, distance - contactGap);
  const rawEnd = start.add(direction.scale(travel));

  // Hard clamp inside the visible play field. Even if target is close to an edge,
  // the source center can never be animated outside the safe playable area.
  const halfW = CONFIG.field.width / 2 - Math.max(CONFIG.field.safeMargin, 0.65);
  const halfD = CONFIG.field.depth / 2 - Math.max(CONFIG.field.safeMargin, 0.85);
  const animatedEnd = new BABYLON.Vector3(
    clamp(rawEnd.x, -halfW, halfW),
    Math.max(start.y, 0.24),
    clamp(rawEnd.z, -halfD, halfD)
  );

  const startQ = source.rotationQuaternion
    ? source.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(source.rotation.x, source.rotation.y, source.rotation.z);

  targetBody.setLinearVelocity(BABYLON.Vector3.Zero());
  targetBody.setAngularVelocity(BABYLON.Vector3.Zero());
  targetBody.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
  targetBody.setTargetTransform(targetPos, targetQ);

  body.setLinearVelocity(BABYLON.Vector3.Zero());
  body.setAngularVelocity(BABYLON.Vector3.Zero());
  body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);

  const duration = Math.max(260, Math.min(620, 210 + distance * 60));
  const t0 = performance.now();

  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = Math.min(1, (performance.now() - t0) / duration);
    const e = t * t * (3 - 2 * t);
    const pos = BABYLON.Vector3.Lerp(start, animatedEnd, e);

    const spin = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(-direction.z, 0, direction.x),
      e * Math.min(1.6, distance * 0.35)
    );
    const q = spin.multiply(startQ);

    body.setTargetTransform(pos, q);
    targetBody.setTargetTransform(targetPos, targetQ);

    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);

      // Keep source fully controlled and stationary after contact.
      // Do NOT switch it back to DYNAMIC here: that transition was the
      // remaining cause of the first-piece launch on some Havok frames.
      body.setLinearVelocity(BABYLON.Vector3.Zero());
      body.setAngularVelocity(BABYLON.Vector3.Zero());
      body.setTargetTransform(animatedEnd, q);

      onDone?.(true);
    }
  });

  return true;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
