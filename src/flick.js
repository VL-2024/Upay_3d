import { CONFIG } from "./config.js";

export function flickToTarget(source, target) {
  if (!source?.metadata?.aggregate?.body || !target) return false;

  const sourcePos = source.getAbsolutePosition();
  const targetPos = target.getAbsolutePosition();
  const delta = targetPos.subtract(sourcePos);
  const flat = new BABYLON.Vector3(delta.x, 0, delta.z);
  const distance = Math.max(0.001, flat.length());
  const direction = flat.normalize();

  const speed = clamp(
    CONFIG.flick.minSpeed + distance * CONFIG.flick.speedPerUnit,
    CONFIG.flick.minSpeed,
    CONFIG.flick.maxSpeed
  );

  const velocity = direction.scale(speed);
  velocity.y = CONFIG.flick.upwardSpeed;

  const body = source.metadata.aggregate.body;
  body.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
  body.setLinearVelocity(velocity);

  return true;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
