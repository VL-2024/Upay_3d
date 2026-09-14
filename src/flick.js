import { CONFIG } from "./config.js";

/**
 * Controlled technical flick for v0.1.6.
 * The source is animated deterministically into the contact zone,
 * then returned to Havok with only a short, low-energy impact.
 * This keeps the visual hit while preventing pieces from being launched
 * across or outside the field.
 */
export function flickToTarget(scene, source, target, onDone) {
  const body = source?.metadata?.aggregate?.body;
  if (!body || !target) {
    onDone?.(false);
    return false;
  }

  const start = source.getAbsolutePosition().clone();
  const targetPos = target.getAbsolutePosition().clone();
  const delta = targetPos.subtract(start);
  const flat = new BABYLON.Vector3(delta.x, 0, delta.z);
  const distance = flat.length();

  if (distance < 0.15) {
    onDone?.(false);
    return false;
  }

  const direction = flat.normalize();
  const contactGap = 0.12;
  const travel = Math.max(0.10, distance - contactGap);
  const animatedEnd = start.add(direction.scale(travel));

  const startQ = source.rotationQuaternion
    ? source.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(
        source.rotation.x, source.rotation.y, source.rotation.z
      );

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

    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);

      body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);

      // A short tactile impact only. The previous 2.0–5.8 speed range
      // was enough to launch a piece over the lower boundary after contact.
      const impactSpeed = Math.min(1.15, Math.max(0.72, 0.62 + distance * 0.07));
      body.setLinearVelocity(new BABYLON.Vector3(
        direction.x * impactSpeed,
        0.0,
        direction.z * impactSpeed
      ));
      body.setAngularVelocity(new BABYLON.Vector3(
        -direction.z * 0.65,
        0.08,
        direction.x * 0.65
      ));

      // Kill any residual launch energy after the contact has been visible.
      window.setTimeout(() => {
        try {
          body.setLinearVelocity(BABYLON.Vector3.Zero());
          body.setAngularVelocity(BABYLON.Vector3.Zero());
        } catch (_) {}
      }, 180);

      window.setTimeout(() => onDone?.(true), 360);
    }
  });

  return true;
}
