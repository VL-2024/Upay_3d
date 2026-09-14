import { CONFIG } from "./config.js";

/**
 * Deterministic technical flick for v0.1.7.
 * The target is temporarily frozen as an ANIMATED body so the incoming
 * piece can visibly touch it without Havok launching the target out of the field.
 * Financial/game outcome is scenario-driven, so a successful visual hit must
 * not depend on uncontrolled collision energy.
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
  const contactGap = 0.10;
  const travel = Math.max(0.10, distance - contactGap);
  const animatedEnd = start.add(direction.scale(travel));

  const startQ = source.rotationQuaternion
    ? source.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(source.rotation.x, source.rotation.y, source.rotation.z);

  // Freeze the target for the duration of the visual contact.
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
      e * Math.min(2.0, distance * 0.45)
    );
    const q = spin.multiply(startQ);
    body.setTargetTransform(pos, q);
    targetBody.setTargetTransform(targetPos, targetQ);

    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);

      // Source returns to normal physics but with almost no residual energy.
      body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
      body.setLinearVelocity(new BABYLON.Vector3(direction.x * 0.18, 0, direction.z * 0.18));
      body.setAngularVelocity(new BABYLON.Vector3(-direction.z * 0.20, 0.03, direction.x * 0.20));

      // Keep the target frozen until CollectorSystem removes it from physics.
      // Callback happens immediately after the contact is visible.
      window.setTimeout(() => onDone?.(true), 90);
    }
  });

  return true;
}
