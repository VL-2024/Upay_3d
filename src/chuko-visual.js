import { preloadChukoModel, cloneChukoVisual } from "./chuko-model.js";

function smoothVisual(mesh){
  try{
    mesh.makeGeometryUnique?.();
    mesh.forceSharedVertices?.();
    const positions=mesh.getVerticesData?.(BABYLON.VertexBuffer.PositionKind),indices=mesh.getIndices?.();
    if(positions&&indices&&indices.length){
      const normals=[];
      BABYLON.VertexData.ComputeNormals(positions,indices,normals);
      mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind,normals,true);
    }
  }catch(err){console.warn("Smooth normals skipped",err)}
}

export function createChukoVisual(scene,name,parent,material,scale=1){
  const visualScale=.82;
  const placeholder=BABYLON.MeshBuilder.CreateCapsule(`${name}_loading`,{radius:.18*scale,height:.80*scale,tessellation:16,subdivisions:4},scene);
  placeholder.parent=parent;placeholder.rotation.z=Math.PI/2;placeholder.isPickable=true;placeholder.material=material;placeholder.metadata={physicsMesh:parent};
  preloadChukoModel(scene).then(()=>{
    if(parent.isDisposed?.())return;
    const real=cloneChukoVisual(name,parent,material,scale);
    if(!real)return;
    real.scaling.scaleInPlace(visualScale);
    smoothVisual(real);
    real.metadata={physicsMesh:parent};real.isPickable=true;
    if(parent.metadata)parent.metadata.shell=real;
    placeholder.dispose();
  }).catch(err=>console.error("Chuko GLB load failed",err));
  return placeholder;
}
