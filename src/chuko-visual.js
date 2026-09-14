import { preloadChukoModel, cloneChukoVisual } from "./chuko-model.js";

export function createChukoVisual(scene,name,parent,material,scale=1){
  const placeholder=BABYLON.MeshBuilder.CreateCapsule(`${name}_loading`,{radius:.22*scale,height:.98*scale,tessellation:10,subdivisions:2},scene);
  placeholder.parent=parent;placeholder.rotation.z=Math.PI/2;placeholder.isPickable=true;placeholder.material=material;placeholder.metadata={physicsMesh:parent};
  preloadChukoModel(scene).then(()=>{
    if(parent.isDisposed?.())return;
    const real=cloneChukoVisual(name,parent,material,scale);
    if(!real)return;
    real.metadata={physicsMesh:parent};real.isPickable=true;
    if(parent.metadata)parent.metadata.shell=real;
    placeholder.dispose();
  }).catch(err=>console.error("Chuko GLB load failed",err));
  return placeholder;
}
