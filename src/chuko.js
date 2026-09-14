import { CONFIG } from "./config.js";
import { createChukoVisual } from "./chuko-visual.js";

const COLORS=[[1.00,.28,.25],[.10,.58,.95],[1.00,.78,.10],[.12,.78,.48],[1.00,.48,.78],[.96,.96,.92]];

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

  const mat=new BABYLON.StandardMaterial(`mat_${index}_${isKhan}`,scene);
  if(isKhan){
    mat.diffuseColor=new BABYLON.Color3(1.00,.67,.08);
    mat.emissiveColor=new BABYLON.Color3(.18,.08,0);
    mat.specularColor=new BABYLON.Color3(1.00,.88,.42);
    mat.specularPower=96;
  }else{
    const c=COLORS[index%COLORS.length];
    mat.diffuseColor=new BABYLON.Color3(...c);
    mat.emissiveColor=new BABYLON.Color3(c[0]*.16,c[1]*.16,c[2]*.16);
    mat.specularColor=new BABYLON.Color3(.35,.35,.35);
    mat.specularPower=52;
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
