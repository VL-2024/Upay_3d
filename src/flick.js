import { CONFIG } from "./config.js";

export function flickToTarget(scene, source, target, onDone) {
  const body=source?.metadata?.aggregate?.body,targetBody=target?.metadata?.aggregate?.body;
  if(!body||!target||!targetBody){onDone?.(false);return false;}
  const start=source.getAbsolutePosition().clone(),targetPos=target.getAbsolutePosition().clone();
  const targetQ=target.rotationQuaternion?target.rotationQuaternion.clone():BABYLON.Quaternion.FromEulerAngles(target.rotation.x,target.rotation.y,target.rotation.z);
  const delta=targetPos.subtract(start),flat=new BABYLON.Vector3(delta.x,0,delta.z),distance=flat.length(); if(distance<.15){onDone?.(false);return false;}
  const direction=flat.normalize(),contactGap=.18,travel=Math.max(.10,distance-contactGap),rawContact=start.add(direction.scale(travel));
  const halfW=2.15,halfD=CONFIG.field.depth/2-1.00;
  const contactPos=new BABYLON.Vector3(clamp(rawContact.x,-halfW,halfW),Math.max(start.y,.24),clamp(rawContact.z,-halfD,halfD));
  const startQ=source.rotationQuaternion?source.rotationQuaternion.clone():BABYLON.Quaternion.FromEulerAngles(source.rotation.x,source.rotation.y,source.rotation.z);
  const sign=idSign(source.metadata?.id),side=new BABYLON.Vector3(-direction.z,0,direction.x);
  const rawSettle=contactPos.add(direction.scale(.22)).add(side.scale(.18*sign));
  const settlePos=new BABYLON.Vector3(clamp(rawSettle.x,-halfW,halfW),contactPos.y,clamp(rawSettle.z,-halfD,halfD));
  const rollAxis=side.normalize(),settleRoll=BABYLON.Quaternion.RotationAxis(rollAxis,1.75*sign),settleYaw=BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y,.38*sign),settleQ=settleYaw.multiply(settleRoll).multiply(startQ);
  targetBody.setLinearVelocity(BABYLON.Vector3.Zero());targetBody.setAngularVelocity(BABYLON.Vector3.Zero());targetBody.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);targetBody.setTargetTransform(targetPos,targetQ);
  body.setLinearVelocity(BABYLON.Vector3.Zero());body.setAngularVelocity(BABYLON.Vector3.Zero());body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
  const travelDuration=Math.max(260,Math.min(620,210+distance*60)),settleDuration=430,t0=performance.now(); let contactQ=startQ;
  const observer=scene.onBeforeRenderObservable.add(()=>{
    const elapsed=performance.now()-t0;
    if(elapsed<=travelDuration){const t=Math.min(1,elapsed/travelDuration),e=t*t*(3-2*t),pos=BABYLON.Vector3.Lerp(start,contactPos,e);const spin=BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(-direction.z,0,direction.x),e*Math.min(1.9,distance*.42));contactQ=spin.multiply(startQ);body.setTargetTransform(pos,contactQ);targetBody.setTargetTransform(targetPos,targetQ);return;}
    const st=Math.min(1,(elapsed-travelDuration)/settleDuration),se=1-Math.pow(1-st,3),pos=BABYLON.Vector3.Lerp(contactPos,settlePos,se);pos.y+=Math.sin(Math.PI*st)*.24;const q=BABYLON.Quaternion.Slerp(contactQ,settleQ,se);body.setTargetTransform(pos,q);targetBody.setTargetTransform(targetPos,targetQ);
    if(st>=1){scene.onBeforeRenderObservable.remove(observer);body.setLinearVelocity(BABYLON.Vector3.Zero());body.setAngularVelocity(BABYLON.Vector3.Zero());body.setTargetTransform(settlePos,settleQ);source.position.copyFrom(settlePos);source.rotationQuaternion=settleQ.clone();onDone?.(true);}
  });
  return true;
}
function idSign(id){const s=String(id||"1");let n=0;for(let i=0;i<s.length;i++)n+=s.charCodeAt(i);return n%2===0?1:-1;}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
