import { CONFIG } from "./config.js";
import { createChukoVisual } from "./chuko-visual.js";

const COLORS=[[.91,.33,.31],[.20,.58,.75],[.95,.75,.28],[.25,.65,.52],[.80,.56,.74],[.88,.88,.82]];

export function createChuko(scene,index,isKhan=false,spawn=null){
  const scale=isKhan?CONFIG.khanScale:1;
  const mesh=BABYLON.MeshBuilder.CreateBox(isKhan?"KHAN":`chuko_${index}`,{
    width:CONFIG.piece.modelLength*scale,
    height:CONFIG.piece.modelHeight*scale,
    depth:CONFIG.piece.modelDepth*scale
  },scene);
  if(spawn?.position)mesh.position.copyFrom(spawn.position);
  mesh.rotationQuaternion=spawn?.rotationQuaternion?spawn.rotationQuaternion.clone():BABYLON.Quaternion.Identity();
  mesh.visibility=.001;

  const mat=new BABYLON.PBRMaterial(`mat_${index}_${isKhan}`,scene);
  if(isKhan){
    mat.albedoColor=new BABYLON.Color3(.92,.63,.13);mat.metallic=.78;mat.roughness=.24;mat.emissiveColor=new BABYLON.Color3(.035,.018,0);
  }else{
    const c=COLORS[index%COLORS.length];mat.albedoColor=new BABYLON.Color3(...c);mat.metallic=.04;mat.roughness=.32;
  }

  mesh.metadata={id:isKhan?"KHAN":`C${index+1}`,isKhan,state:"UNKNOWN",shell:null,aggregate:null,label:null};
  const shell=createChukoVisual(scene,`visual_${index}_${isKhan?"k":"n"}`,mesh,mat,scale);
  mesh.metadata.shell=shell;

  const aggregate=new BABYLON.PhysicsAggregate(mesh,BABYLON.PhysicsShapeType.BOX,{mass:CONFIG.physics.mass*(isKhan?1.18:1),friction:CONFIG.physics.friction,restitution:CONFIG.physics.restitution},scene);
  aggregate.body.setLinearDamping(CONFIG.physics.linearDamping);
  aggregate.body.setAngularDamping(CONFIG.physics.angularDamping);
  mesh.metadata.aggregate=aggregate;
  return mesh;
}

export function disposeChuko(mesh){if(!mesh)return;mesh.metadata?.label?.dispose?.();mesh.metadata?.aggregate?.dispose?.();mesh.metadata?.shell?.dispose?.();mesh.dispose();}
