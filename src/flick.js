import { CONFIG } from "./config.js";

/**
 * Guaranteed technical flick for v0.1.3:
 * 1) temporarily moves the source as an ANIMATED Havok body toward the target;
 * 2) stops slightly before contact;
 * 3) returns body to DYNAMIC and gives it a short residual velocity for impact.
 *
 * This avoids the "selected but does not move" problem caused by sleeping dynamic bodies.
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
  const contactGap = 0.50; // stop just before target, then dynamic impact
  const travel = Math.max(0.10, distance - contactGap);
  const animatedEnd = start.add(direction.scale(travel));

  const startQ = source.rotationQuaternion
    ? source.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(
        source.rotation.x, source.rotation.y, source.rotation.z
      );

  // Make sure the body is not controlled by sleep / old velocities.
  body.setLinearVelocity(BABYLON.Vector3.Zero());
  body.setAngularVelocity(BABYLON.Vector3.Zero());
  body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);

  const duration = Math.max(220, Math.min(520, 180 + distance * 55));
  const t0 = performance.now();

  const observer = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const t = Math.min(1, (now - t0) / duration);

    // smoothstep
    const e = t * t * (3 - 2 * t);
    const pos = BABYLON.Vector3.Lerp(start, animatedEnd, e);

    // small tactile rotation while sliding
    const spin = BABYLON.Quaternion.RotationAxis(
      new BABYLON.Vector3(-direction.z, 0, direction.x),
      e * Math.min(2.2, distance * 0.55)
    );
    const q = spin.multiply(startQ);

    body.setTargetTransform(pos, q);

    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);

      // Return to real physics and let the last centimeters produce collision.
      body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
      body.setAngularVelocity(
        new BABYLON.Vector3(-direction.z * 1.2, 0.2, direction.x * 1.2)
      );

      const impactSpeed = clamp(
        CONFIG.flick.minSpeed + distance * CONFIG.flick.speedPerUnit,
        1.35,
        Math.max(1.8, CONFIG.flick.maxSpeed)
      );
      body.setLinearVelocity(
        new BABYLON.Vector3(
          direction.x * impactSpeed,
          0.02,
          direction.z * impactSpeed
        )
      );

      window.setTimeout(() => onDone?.(true), 420);
    }
  });

  return true;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
