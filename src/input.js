import { GameState } from "./game-state.js";

export class InputController {
  constructor(scene, canvas, store, selector, getPieces, onFlick, canTargetKhan=()=>false) {
    this.scene=scene; this.canvas=canvas; this.store=store; this.selector=selector; this.getPieces=getPieces; this.onFlick=onFlick; this.canTargetKhan=canTargetKhan;
    this.down=null; this.aimSector=null; this.lastAimDirection=null; this.aimHalfAngle=BABYLON.Tools.ToRadians(7); this.install();
  }

  install() {
    this.scene.onPointerObservable.add(pi => {
      if (this.store.state !== GameState.READY) { this.clearAim(); return; }

      if (pi.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        const hit=this.pickPiece();
        const allowKhan=!!this.canTargetKhan();
        if(hit&&!hit.metadata?.isKhan&&!hit.metadata?.collected){
          if(this.store.selected!==hit)this.selector.select(hit,this.getPieces(),allowKhan);
          this.down={x:this.scene.pointerX,y:this.scene.pointerY,mesh:hit};
          this.lastAimDirection=null;
          this.clearAim();
        } else {
          this.down={x:this.scene.pointerX,y:this.scene.pointerY,mesh:this.store.selected||null};
        }
      }

      if (pi.type === BABYLON.PointerEventTypes.POINTERMOVE && this.down) {
        const source=this.store.selected || this.down.mesh;
        if (!source || source.metadata?.isKhan || source.metadata?.collected) return;
        const dx=this.scene.pointerX-this.down.x,dy=this.scene.pointerY-this.down.y;
        const moved=Math.hypot(dx,dy);
        if(moved>5){
          const dir=this.directionFromPointer(source,this.scene.pointerX,this.scene.pointerY);
          if(dir){this.lastAimDirection=dir;this.showAimSector(source,dir,moved);}
        }
      }

      if (pi.type === BABYLON.PointerEventTypes.POINTERUP) {
        const source=this.store.selected || this.down?.mesh;
        const moved=this.down?Math.hypot(this.scene.pointerX-this.down.x,this.scene.pointerY-this.down.y):0;
        if(source&&!source.metadata?.isKhan&&!source.metadata?.collected&&moved>=18&&this.lastAimDirection){
          const target=this.bestTargetByDirection(source,this.lastAimDirection);
          this.clearAim(); this.lastAimDirection=null;
          if(target)this.onFlick(source,target);
        } else if(moved<18){
          const upMesh=this.pickPiece();
          const allowKhan=!!this.canTargetKhan();
          if(upMesh&&!upMesh.metadata?.isKhan&&!upMesh.metadata?.collected){
            this.selector.select(upMesh,this.getPieces(),allowKhan);
          } else if(upMesh&&this.selector.isValidTarget(upMesh)&&this.store.selected){
            const selected=this.store.selected;this.clearAim();this.onFlick(selected,upMesh);
          }
        }
        this.down=null;
      }
    });
  }

  pickPiece() {
    const pick=this.scene.pick(this.scene.pointerX,this.scene.pointerY,mesh=>!!mesh?.metadata?.id||!!mesh?.metadata?.physicsMesh);
    if(!pick?.hit||!pick.pickedMesh)return null;
    const piece=pick.pickedMesh.metadata?.physicsMesh||pick.pickedMesh;
    return piece?.metadata?.collected?null:piece;
  }

  directionFromPointer(source,x,y){
    const ray=this.scene.createPickingRay(x,y,BABYLON.Matrix.Identity(),this.scene.activeCamera,false);
    const planeY=Math.max(.22,source.getAbsolutePosition().y);
    if(Math.abs(ray.direction.y)<1e-5)return null;
    const t=(planeY-ray.origin.y)/ray.direction.y;
    if(t<=0)return null;
    const finger=ray.origin.add(ray.direction.scale(t));
    const dir=source.getAbsolutePosition().subtract(finger);dir.y=0;
    if(dir.length()<.05)return null;
    return dir.normalize();
  }

  showAimSector(source,dir,dragPixels){
    this.clearAim();
    const origin=source.getAbsolutePosition().clone();
    origin.y=Math.max(.50,origin.y+.22);
    const length=Math.max(1.25,Math.min(4.8,1.25+dragPixels*.018));
    const inner=.38;
    const segments=18;
    const positions=[],indices=[],colors=[];
    const centerAngle=Math.atan2(dir.z,dir.x);

    // Two rings form a 14-degree cone. Vertex alpha fades from the striking
    // chuko outward, producing a soft directional sector rather than an arrow.
    for(let ring=0;ring<2;ring++){
      const r=ring===0?inner:length;
      const alpha=ring===0?.48:.035;
      for(let i=0;i<=segments;i++){
        const a=centerAngle-this.aimHalfAngle+(this.aimHalfAngle*2)*(i/segments);
        positions.push(origin.x+Math.cos(a)*r,origin.y,origin.z+Math.sin(a)*r);
        colors.push(1.0,.20,.06,alpha);
      }
    }
    const row=segments+1;
    for(let i=0;i<segments;i++){
      const a=i,b=i+1,c=row+i,d=row+i+1;
      indices.push(a,c,b,b,c,d);
    }

    const mesh=new BABYLON.Mesh("aimSector",this.scene);
    const vd=new BABYLON.VertexData();
    vd.positions=positions;vd.indices=indices;vd.colors=colors;vd.applyToMesh(mesh);
    const mat=new BABYLON.StandardMaterial("aimSectorMat",this.scene);
    mat.diffuseColor=new BABYLON.Color3(1,.18,.05);
    mat.emissiveColor=new BABYLON.Color3(.42,.035,.008);
    mat.disableLighting=true;mat.backFaceCulling=false;mat.alpha=1;
    mat.useVertexColors=true;mat.useVertexAlpha=true;
    mat.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
    mesh.material=mat;mesh.isPickable=false;mesh.renderingGroupId=2;
    this.aimSector=mesh;
  }

  clearAim(){
    if(this.aimSector){const mat=this.aimSector.material;this.aimSector.dispose();mat?.dispose();}
    this.aimSector=null;
  }

  bestTargetByDirection(source,dir){
    const targets=(this.store.validTargets||[]).filter(t=>!t.metadata?.collected);
    if(!source||targets.length===0)return null;
    const sp=source.getAbsolutePosition();
    let best=null,bestScore=-Infinity;
    const minDot=Math.cos(this.aimHalfAngle);
    for(const t of targets){
      const v=t.getAbsolutePosition().subtract(sp);v.y=0;
      const dist=v.length();if(dist<.08)continue;
      const dot=BABYLON.Vector3.Dot(dir,v.normalize());
      if(dot<minDot)continue;
      const anglePenalty=(1-dot)*8;
      const score=dot*3-anglePenalty-dist*.025;
      if(score>bestScore){bestScore=score;best=t;}
    }
    return best;
  }
}
