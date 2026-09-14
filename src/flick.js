import { CONFIG } from "./config.js";

/**
 * Deterministic technical flick.
 * Phase 1: source travels to the selected target.
 * Phase 2: after contact the striking chuko visibly settles into a slightly
 * different place and orientation. This makes the next legal pairs changing
 * on screen understandable to the player, while the ticket result remains
 * scenario-controlled.
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
  const rawContact = start.add(direction.scale(travel));

  // Match the approved portrait safe zone from main.js.
  const halfW = 2.55;
  const halfD = CONFIG.field.depth / 2 - 1.05;
  const contactPos = new BABYLON.Vector3(
    clamp(rawContact.x, -halfW, halfW),
    Math.max(start.y, 0.24),
    clamp(rawContact.z, -halfD, halfD)
  );

  const startQ = source.rotationQuaternion
    ? source.rotationQuaternion.clone()
    : BABYLON.Quaternion.FromEulerAngles(source.rotation.x, source.rotation.y, source.rotation.z);

  // Small deterministic post-contact displacement and roll.
  // Sign alternates by id so repeated hits do not all look identical.
  const sign = idSign(source.metadata?.id);
  const side = new BABYLON.Vector3(-direction.z, 0, direction.x);
  const rawSettle = contactPos
    .add(direction.scale(0.10))
    .add(side.scale(0.09 * sign));
  const settlePos = new BABYLON.Vector3(
    clamp(rawSettle.x, -halfW, halfW),
    contactPos.y,
    clamp(rawSettle.z, -halfD, halfD)
  );

  const rollAxis = side.normalize();
  const settleRoll = BABYLON.Quaternion.RotationAxis(rollAxis, 1.18 * sign);
  const settleYaw = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, 0.20 * sign);
  const settleQ = settleYaw.multiply(settleRoll).multiply(startQ);

  targetBody.setLinearVelocity(BABYLON.Vector3.Zero());
  targetBody.setAngularVelocity(BABYLON.Vector3.Zero());
  targetBody.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
  targetBody.setTargetTransform(targetPos, targetQ);

  body.setLinearVelocity(BABYLON.Vector3.Zero());
  body.setAngularVelocity(BABYLON.Vector3.Zero());
  body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);

  const travelDuration = Math.max(260, Math.min(620, 210 + distance * 60));
  const settleDuration = 270;
  const t0 = performance.now();
  let contactQ = startQ;

  const observer = scene.onBeforeRenderObservable.add(() => {
    const elapsed = performance.now() - t0;

    if (elapsed <= travelDuration) {
      const t = Math.min(1, elapsed / travelDuration);
      const e = t * t * (3 - 2 * t);
      const pos = BABYLON.Vector3.Lerp(start, contactPos, e);
      const spin = BABYLON.Quaternion.RotationAxis(
        new BABYLON.Vector3(-direction.z, 0, direction.x),
        e * Math.min(1.6, distance * 0.35)
      );
      contactQ = spin.multiply(startQ);
      body.setTargetTransform(pos, contactQ);
      targetBody.setTargetTransform(targetPos, targetQ);
      return;
    }

    const st = Math.min(1, (elapsed - travelDuration) / settleDuration);
    const se = 1 - Math.pow(1 - st, 3);
    const settleArc = Math.sin(Math.PI * st) * 0.08;
    const pos = BABYLON.Vector3.Lerp(contactPos, settlePos, se);
    pos.y += settleArc;
    const q = BABYLON.Quaternion.Slerp(contactQ, settleQ, se);
    body.setTargetTransform(pos, q);
    targetBody.setTargetTransform(targetPos, targetQ);

    if (st >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      body.setLinearVelocity(BABYLON.Vector3.Zero());
      body.setAngularVelocity(BABYLON.Vector3.Zero());
      body.setTargetTransform(settlePos, settleQ);
      onDone?.(true);
    }
  });

  return true;
}

function idSign(id) {
  const s = String(id || "1");
  let n = 0;
  for (let i = 0; i < s.length; i++) n += s.charCodeAt(i);
  return n % 2 === 0 ? 1 : -1;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
