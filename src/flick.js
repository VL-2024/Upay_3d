import { CONFIG } from "./config.js";

/**
 * Deterministic technical flick for v0.1.8.
 * Both source and target stay under controlled ANIMATED motion through contact.
 * The target is handed to CollectorSystem first; only after that is the source
 * returned to DYNAMIC with zero residual velocity. This prevents the first
 * source piece from being launched off the lower edge.
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
  const contactGap = 0.14;
  const travel = Math.max(0.10, distance - contactGap);
  const animatedEnd = start.add(direction.scale(travel));

  const startQ = source.rotationQuaternion
    ? source.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(source.rotation.x, source.rotation.y, source.rotation.z);

  // Freeze target and fully control source through the visual contact.
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

      // Keep SOURCE animated while callback starts collection and immediately
      // disposes TARGET's Havok aggregate. No physical impulse is applied.
      onDone?.(true);

      // Once target has been removed from field physics, return source to
      // normal physics at rest. Deliberately no residual push/spin.
      window.setTimeout(() => {
        try {
          if (!source?.metadata?.aggregate?.body) return;
          const sourceBody = source.metadata.aggregate.body;
          sourceBody.setTargetTransform(animatedEnd, q);
          sourceBody.setLinearVelocity(BABYLON.Vector3.Zero());
          sourceBody.setAngularVelocity(BABYLON.Vector3.Zero());
          sourceBody.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
          sourceBody.setLinearVelocity(BABYLON.Vector3.Zero());
          sourceBody.setAngularVelocity(BABYLON.Vector3.Zero());
        } catch (_) {}
      }, 80);
    }
  });

  return true;
}
