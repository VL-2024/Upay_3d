import { CONFIG } from "./config.js";

export function flickToTarget(scene, source, target, onDone, options={}) {
  const body=source?.metadata?.aggregate?.body,targetBody=target?.metadata?.aggregate?.body;
  if(!body||!target||!targetBody){onDone?.(false);return false;}
  const failed=!!options.failed;
  const start=source.getAbsolutePosition().clone(),targetPos=target.getAbsolutePosition().clone();
  const targetQ=target.rotationQuaternion?target.rotationQuaternion.clone():BABYLON.Quaternion.FromEulerAngles(target.rotation.x,target.rotation.y,target.rotation.z);
  const delta=targetPos.subtract(start),flat=new BABYLON.Vector3(delta.x,0,delta.z),distance=flat.length();if(distance<.15){onDone?.(false);return false;}
  const direction=flat.normalize(),contactGap=.18,travel=Math.max(.10,distance-contactGap),rawContact=start.add(direction.scale(travel));
  const halfW=2.15,halfD=CONFIG.field.depth/2-1.00;
  const contactPos=new BABYLON.Vector3(clamp(rawContact.x,-halfW,halfW),Math.max(start.y,.24),clamp(rawContact.z,-halfD,halfD));
  const startQ=source.rotationQuaternion?source.rotationQuaternion.clone():BABYLON.Quaternion.FromEulerAngles(source.rotation.x,source.rotation.y,source.rotation.z);
  const sign=idSign(source.metadata?.id),side=new BABYLON.Vector3(-direction.z,0,direction.x);
  const rawSettle=contactPos.add(direction.scale(.30)).add(side.scale(.14*sign));
  const settlePos=new BABYLON.Vector3(clamp(rawSettle.x,-halfW,halfW),contactPos.y,clamp(rawSettle.z,-halfD,halfD));
  const rollAxis=side.normalize(),settleRoll=BABYLON.Quaternion.RotationAxis(rollAxis,2.15*sign),settleYaw=BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y,.48*sign),settleQ=settleYaw.multiply(settleRoll).multiply(startQ);

  let targetEnd=targetPos.add(direction.scale(.34));
  if(failed) targetEnd=failedEdgePoint(targetPos,direction);
  targetEnd.y=Math.max(.24,targetPos.y);
  const targetRoll=BABYLON.Quaternion.RotationAxis(side,failed?1.55:.72).multiply(targetQ);

  targetBody.setLinearVelocity(BABYLON.Vector3.Zero());targetBody.setAngularVelocity(BABYLON.Vector3.Zero());targetBody.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);targetBody.setTargetTransform(targetPos,targetQ);
  body.setLinearVelocity(BABYLON.Vector3.Zero());body.setAngularVelocity(BABYLON.Vector3.Zero());body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);

  const travelDuration=Math.max(250,Math.min(560,190+distance*58)),impactDuration=failed?520:360,t0=performance.now();let contactQ=startQ;
  const observer=scene.onBeforeRenderObservable.add(()=>{
    const elapsed=performance.now()-t0;
    if(elapsed<=travelDuration){
      const t=Math.min(1,elapsed/travelDuration),e=t*t*(3-2*t),pos=BABYLON.Vector3.Lerp(start,contactPos,e);
      const spin=BABYLON.Quaternion.RotationAxis(side,e*Math.min(2.0,distance*.46));contactQ=spin.multiply(startQ);
      body.setTargetTransform(pos,contactQ);targetBody.setTargetTransform(targetPos,targetQ);return;
    }
    const st=Math.min(1,(elapsed-travelDuration)/impactDuration),se=1-Math.pow(1-st,3);
    const sourcePos=BABYLON.Vector3.Lerp(contactPos,settlePos,se);sourcePos.y+=Math.sin(Math.PI*st)*.30;
    const sourceQ=BABYLON.Quaternion.Slerp(contactQ,settleQ,se);
    const targetNow=BABYLON.Vector3.Lerp(targetPos,targetEnd,se);targetNow.y+=Math.sin(Math.PI*st)*(failed?.22:.14);
    const targetNowQ=BABYLON.Quaternion.Slerp(targetQ,targetRoll,se);
    body.setTargetTransform(sourcePos,sourceQ);targetBody.setTargetTransform(targetNow,targetNowQ);
    if(st>=1){
      scene.onBeforeRenderObservable.remove(observer);
      body.setLinearVelocity(BABYLON.Vector3.Zero());body.setAngularVelocity(BABYLON.Vector3.Zero());body.setTargetTransform(settlePos,settleQ);
      targetBody.setLinearVelocity(BABYLON.Vector3.Zero());targetBody.setAngularVelocity(BABYLON.Vector3.Zero());targetBody.setTargetTransform(targetEnd,targetRoll);
      source.position.copyFrom(settlePos);source.rotationQuaternion=settleQ.clone();
      target.position.copyFrom(targetEnd);target.rotationQuaternion=targetRoll.clone();
      onDone?.(true);
    }
  });
  return true;
}

function failedEdgePoint(start,dir){
  const halfW=CONFIG.field.width/2-.28,halfD=CONFIG.field.depth/2-.32;
  let tx=Infinity,tz=Infinity;
  if(Math.abs(dir.x)>.001)tx=((dir.x>0?halfW:-halfW)-start.x)/dir.x;
  if(Math.abs(dir.z)>.001)tz=((dir.z>0?halfD:-halfD)-start.z)/dir.z;
  let t=Math.min(tx>0?tx:Infinity,tz>0?tz:Infinity);
  if(!Number.isFinite(t))t=.7;
  t=Math.max(.35,t-.08);
  return new BABYLON.Vector3(start.x+dir.x*t,start.y,start.z+dir.z*t);
}
function idSign(id){const s=String(id||"1");let n=0;for(let i=0;i<s.length;i++)n+=s.charCodeAt(i);return n%2===0?1:-1;}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
