import { CONFIG } from "./config.js";

export function flickToTarget(scene, source, target, onDone, options={}) {
  const body=source?.metadata?.aggregate?.body,targetBody=target?.metadata?.aggregate?.body;
  if(!body||!target||!targetBody){onDone?.(false);return false;}
  const failed=!!options.failed;
  const start=source.getAbsolutePosition().clone(),targetPos=target.getAbsolutePosition().clone();
  const targetQ=target.rotationQuaternion?target.rotationQuaternion.clone():BABYLON.Quaternion.FromEulerAngles(target.rotation.x,target.rotation.y,target.rotation.z);
  const delta=targetPos.subtract(start),flat=new BABYLON.Vector3(delta.x,0,delta.z),distance=flat.length();
  if(distance<.15){onDone?.(false);return false;}

  const direction=flat.normalize();
  const side=new BABYLON.Vector3(-direction.z,0,direction.x).normalize();
  const contactGap=.16;
  const travel=Math.max(.10,distance-contactGap);
  const rawContact=start.add(direction.scale(travel));
  const a=CONFIG.playArea,m=a.pieceMargin??.34,halfW=a.width/2-m,minZ=(a.centerZ??0)-a.depth/2+m,maxZ=(a.centerZ??0)+a.depth/2-m;
  const contactPos=new BABYLON.Vector3(clamp(rawContact.x,-halfW,halfW),Math.max(start.y,.24),clamp(rawContact.z,minZ,maxZ));

  const startQ=source.rotationQuaternion?source.rotationQuaternion.clone():BABYLON.Quaternion.FromEulerAngles(source.rotation.x,source.rotation.y,source.rotation.z);
  const sign=idSign(source.metadata?.id);
  const sourceKick=contactPos.add(direction.scale(.24)).add(side.scale(.20*sign));
  const settlePos=new BABYLON.Vector3(clamp(sourceKick.x,-halfW,halfW),contactPos.y,clamp(sourceKick.z,minZ,maxZ));

  const sourceRoll=BABYLON.Quaternion.RotationAxis(side,2.65*sign);
  const sourceYaw=BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y,.62*sign);
  const sourceTilt=BABYLON.Quaternion.RotationAxis(direction,.34*sign);
  const settleQ=sourceYaw.multiply(sourceTilt).multiply(sourceRoll).multiply(startQ);

  let targetEnd=targetPos.add(direction.scale(failed?.70:.48)).add(side.scale(.08*-sign));
  if(failed)targetEnd=failedEdgePoint(targetPos,direction,side,sign);
  targetEnd.y=Math.max(.24,targetPos.y);
  const targetRoll=BABYLON.Quaternion.RotationAxis(side,failed?2.15:1.05).multiply(
    BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y,.28*-sign).multiply(targetQ)
  );

  targetBody.setLinearVelocity(BABYLON.Vector3.Zero());
  targetBody.setAngularVelocity(BABYLON.Vector3.Zero());
  targetBody.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
  targetBody.setTargetTransform(targetPos,targetQ);
  body.setLinearVelocity(BABYLON.Vector3.Zero());
  body.setAngularVelocity(BABYLON.Vector3.Zero());
  body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);

  const travelDuration=Math.max(240,Math.min(520,170+distance*54));
  const impactDuration=failed?620:500;
  const t0=performance.now();
  let contactQ=startQ;

  const observer=scene.onBeforeRenderObservable.add(()=>{
    const elapsed=performance.now()-t0;
    if(elapsed<=travelDuration){
      const t=Math.min(1,elapsed/travelDuration);
      const e=t*t*(3-2*t);
      const pos=BABYLON.Vector3.Lerp(start,contactPos,e);
      pos.y+=Math.sin(Math.PI*t)*.045;
      const spin=BABYLON.Quaternion.RotationAxis(side,e*Math.min(2.15,distance*.50));
      contactQ=spin.multiply(startQ);
      body.setTargetTransform(pos,contactQ);
      targetBody.setTargetTransform(targetPos,targetQ);
      return;
    }

    const st=Math.min(1,(elapsed-travelDuration)/impactDuration);
    const kickT=Math.min(1,st/.34);
    const settleT=st<=.34?0:(st-.34)/.66;
    const kickEase=1-Math.pow(1-kickT,3);
    const settleEase=settleT*settleT*(3-2*settleT);

    const sourcePeak=contactPos.add(direction.scale(.11)).add(side.scale(.10*sign));
    let sourcePos;
    if(st<=.34) sourcePos=BABYLON.Vector3.Lerp(contactPos,sourcePeak,kickEase);
    else sourcePos=BABYLON.Vector3.Lerp(sourcePeak,settlePos,settleEase);
    sourcePos.y+=Math.sin(Math.PI*st)*.38;

    const qKick=BABYLON.Quaternion.RotationAxis(side,1.15*sign).multiply(contactQ);
    const sourceQ=st<=.34?BABYLON.Quaternion.Slerp(contactQ,qKick,kickEase):BABYLON.Quaternion.Slerp(qKick,settleQ,settleEase);

    const targetEase=1-Math.pow(1-st,3);
    const targetNow=BABYLON.Vector3.Lerp(targetPos,targetEnd,targetEase);
    targetNow.y+=Math.sin(Math.PI*st)*(failed?.24:.19);
    const targetNowQ=BABYLON.Quaternion.Slerp(targetQ,targetRoll,targetEase);

    body.setTargetTransform(sourcePos,sourceQ);
    targetBody.setTargetTransform(targetNow,targetNowQ);

    if(st>=1){
      scene.onBeforeRenderObservable.remove(observer);
      body.setLinearVelocity(BABYLON.Vector3.Zero());
      body.setAngularVelocity(BABYLON.Vector3.Zero());
      body.setTargetTransform(settlePos,settleQ);
      targetBody.setLinearVelocity(BABYLON.Vector3.Zero());
      targetBody.setAngularVelocity(BABYLON.Vector3.Zero());
      targetBody.setTargetTransform(targetEnd,targetRoll);
      source.position.copyFrom(settlePos);
      source.rotationQuaternion=settleQ.clone();
      target.position.copyFrom(targetEnd);
      target.rotationQuaternion=targetRoll.clone();
      onDone?.(true);
    }
  });
  return true;
}

function failedEdgePoint(start,dir,side,sign){
  const a=CONFIG.playArea;
  const halfW=a.width/2-.18,minZ=(a.centerZ??0)-a.depth/2+.18,maxZ=(a.centerZ??0)+a.depth/2-.18;
  let tx=Infinity,tz=Infinity;
  if(Math.abs(dir.x)>.001)tx=((dir.x>0?halfW:-halfW)-start.x)/dir.x;
  if(Math.abs(dir.z)>.001)tz=((dir.z>0?maxZ:minZ)-start.z)/dir.z;
  let t=Math.min(tx>0?tx:Infinity,tz>0?tz:Infinity);
  if(!Number.isFinite(t))t=.9;
  t=Math.max(.45,t-.10);
  const p=start.add(dir.scale(t)).add(side.scale(.08*sign));
  p.x=clamp(p.x,-halfW,halfW);
  p.z=clamp(p.z,minZ,maxZ);
  return p;
}
function idSign(id){const s=String(id||"1");let n=0;for(let i=0;i<s.length;i++)n+=s.charCodeAt(i);return n%2===0?1:-1;}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
