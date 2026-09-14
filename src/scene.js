import{CONFIG}from"./config.js";

export function createScene(engine,canvas,havokInstance){
  const scene=new BABYLON.Scene(engine);
  scene.clearColor=new BABYLON.Color4(.035,.075,.11,1);
  const plugin=new BABYLON.HavokPlugin(true,havokInstance);
  scene.enablePhysics(new BABYLON.Vector3(0,CONFIG.physics.gravity,0),plugin);

  const camera=new BABYLON.ArcRotateCamera("camera",CONFIG.camera.alpha,CONFIG.camera.beta,CONFIG.camera.radius,new BABYLON.Vector3(0,CONFIG.camera.targetY,0),scene);
  camera.fov=CONFIG.camera.fov;
  camera.lowerRadiusLimit=camera.upperRadiusLimit=CONFIG.camera.radius;
  camera.inputs.clear();

  const hemi=new BABYLON.HemisphericLight("hemi",new BABYLON.Vector3(.2,1,.1),scene);
  hemi.intensity=1.05;
  hemi.groundColor=new BABYLON.Color3(.12,.17,.22);
  const key=new BABYLON.DirectionalLight("key",new BABYLON.Vector3(-.35,-1,.25),scene);
  key.position=new BABYLON.Vector3(4,9,-6);
  key.intensity=1;

  const rug=BABYLON.MeshBuilder.CreateBox("rug",{width:CONFIG.field.width,height:CONFIG.field.thickness,depth:CONFIG.field.depth},scene);
  rug.position.y=-CONFIG.field.thickness/2;
  const rugMat=new BABYLON.StandardMaterial("rugMat",scene);
  rugMat.diffuseColor=new BABYLON.Color3(.18,.43,.57);
  rug.material=rugMat;
  const rugBody=new BABYLON.PhysicsAggregate(rug,BABYLON.PhysicsShapeType.BOX,{mass:0,friction:CONFIG.physics.friction,restitution:CONFIG.physics.restitution},scene);

  const inlay=BABYLON.MeshBuilder.CreateGround("inlay",{width:CONFIG.field.width-.55,height:CONFIG.field.depth-.55},scene);
  inlay.position.y=.008;
  const im=new BABYLON.StandardMaterial("inlayMat",scene);
  im.diffuseColor=new BABYLON.Color3(.74,.84,.82);
  im.alpha=.18;
  inlay.material=im;

  createBoundary(scene);
  createScatterFence(scene);
  createOuterWalls(scene);
  return{scene,camera,rug,rugBody};
}

function createBoundary(scene){
  const a=CONFIG.playArea,x=a.width/2,z=a.depth/2,c=a.centerZ??0,y=.045;
  const pts=[
    new BABYLON.Vector3(-x,y,c-z),
    new BABYLON.Vector3(x,y,c-z),
    new BABYLON.Vector3(x,y,c+z),
    new BABYLON.Vector3(-x,y,c+z),
    new BABYLON.Vector3(-x,y,c-z)
  ];
  const line=BABYLON.MeshBuilder.CreateLines("fieldBoundary",{points:pts},scene);
  line.color=new BABYLON.Color3(.06,.34,.52);
  line.alpha=.95;
  line.isPickable=false;
  line.renderingGroupId=1;
}

// Invisible tall physical fence whose INNER face is exactly on the blue
// play-area line. During the dynamic scatter, a chuko's collision box cannot
// cross that line at all, so there is no later visible correction/teleport.
// After settling, gameplay uses ANIMATED bodies, so scripted strikes can still
// cross the line when the scenario requires a successful knock-out.
function createScatterFence(scene){
  const a=CONFIG.playArea;
  const halfW=a.width/2,halfD=a.depth/2,c=a.centerZ??0;
  const t=.16,h=8.0,y=h/2;
  const defs=[
    ["scatterFenceL",t,h,a.depth+t,-halfW-t/2,y,c],
    ["scatterFenceR",t,h,a.depth+t,halfW+t/2,y,c],
    ["scatterFenceT",a.width+t,h,t,0,y,c-halfD-t/2],
    ["scatterFenceB",a.width+t,h,t,0,y,c+halfD+t/2]
  ];
  for(const[name,w,hh,d,x,yy,z]of defs){
    const m=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:hh,depth:d},scene);
    m.position.set(x,yy,z);
    m.isVisible=false;
    m.isPickable=false;
    new BABYLON.PhysicsAggregate(m,BABYLON.PhysicsShapeType.BOX,{mass:0,friction:.78,restitution:.01},scene);
  }
}

function createOuterWalls(scene){
  const fw=CONFIG.field.width,fd=CONFIG.field.depth,h=CONFIG.field.wallHeight,t=.34;
  const defs=[
    ["wallL",t,h,fd+.5,-fw/2-t/2,h/2,0],
    ["wallR",t,h,fd+.5,fw/2+t/2,h/2,0],
    ["wallT",fw+.5,h,t,0,h/2,-fd/2-t/2],
    ["wallB",fw+.5,h,t,0,h/2,fd/2+t/2]
  ];
  for(const[name,w,hh,d,x,y,z]of defs){
    const m=BABYLON.MeshBuilder.CreateBox(name,{width:w,height:hh,depth:d},scene);
    m.position.set(x,y,z);
    m.isVisible=false;
    new BABYLON.PhysicsAggregate(m,BABYLON.PhysicsShapeType.BOX,{mass:0,friction:.8,restitution:.02},scene);
  }
}
