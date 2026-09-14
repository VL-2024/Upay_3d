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

function prepareVisual(mesh,material){
  mesh.material=material;
  mesh.useVertexColors=false;
  mesh.hasVertexAlpha=false;
  for(const child of mesh.getChildMeshes?.()||[]){
    child.material=material;
    child.useVertexColors=false;
    child.hasVertexAlpha=false;
  }
}

export function createChukoVisual(scene,name,parent,material,scale=1){
  const visualScale=.66;
  const placeholder=BABYLON.MeshBuilder.CreateCapsule(`${name}_loading`,{radius:.15*scale,height:.66*scale,tessellation:16,subdivisions:4},scene);
  placeholder.parent=parent;placeholder.rotation.z=Math.PI/2;placeholder.isPickable=true;placeholder.material=material;placeholder.metadata={physicsMesh:parent};
  preloadChukoModel(scene).then(()=>{
    if(parent.isDisposed?.())return;
    const real=cloneChukoVisual(name,parent,material,scale);
    if(!real)return;
    real.scaling.scaleInPlace(visualScale);
    smoothVisual(real);
    prepareVisual(real,material);
    real.metadata={physicsMesh:parent};real.isPickable=true;
    if(parent.metadata)parent.metadata.shell=real;
    placeholder.dispose();
  }).catch(err=>console.error("Chuko GLB load failed",err));
  return placeholder;
}
