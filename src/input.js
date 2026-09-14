import { GameState } from "./game-state.js";

export class InputController {
  constructor(scene, canvas, store, selector, getPieces, onFlick, canTargetKhan=()=>false) {
    this.scene=scene; this.canvas=canvas; this.store=store; this.selector=selector; this.getPieces=getPieces; this.onFlick=onFlick; this.canTargetKhan=canTargetKhan;
    this.down=null; this.aimLine=null; this.aimHead=null; this.lastAimDirection=null; this.install();
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
        }else{
          this.down={x:this.scene.pointerX,y:this.scene.pointerY,mesh:this.store.selected||null};
        }
      }

      if (pi.type === BABYLON.PointerEventTypes.POINTERMOVE && this.down) {
        const source=this.store.selected || this.down.mesh;
        if (!source || source.metadata?.isKhan || source.metadata?.collected) return;
        const dx=this.scene.pointerX-this.down.x,dy=this.scene.pointerY-this.down.y;
        const moved=Math.hypot(dx,dy);
        if(moved>6){
          const dir=this.directionFromPointer(source,this.scene.pointerX,this.scene.pointerY);
          if(dir){this.lastAimDirection=dir;this.showAimDirection(source,dir,moved);}
        }
      }

      if (pi.type === BABYLON.PointerEventTypes.POINTERUP) {
        const source=this.store.selected || this.down?.mesh;
        const moved=this.down?Math.hypot(this.scene.pointerX-this.down.x,this.scene.pointerY-this.down.y):0;
        if(source&&!source.metadata?.isKhan&&!source.metadata?.collected&&moved>=18&&this.lastAimDirection){
          const target=this.bestTargetByDirection(source,this.lastAimDirection);
          this.clearAim();
          this.lastAimDirection=null;
          if(target)this.onFlick(source,target);
        }else if(moved<18){
          const upMesh=this.pickPiece();
          const allowKhan=!!this.canTargetKhan();
          if(upMesh&&!upMesh.metadata?.isKhan&&!upMesh.metadata?.collected){
            this.selector.select(upMesh,this.getPieces(),allowKhan);
          }else if(upMesh&&this.selector.isValidTarget(upMesh)&&this.store.selected){
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
    const denom=ray.direction.y;
    if(Math.abs(denom)<1e-5)return null;
    const t=(planeY-ray.origin.y)/denom;
    if(t<=0)return null;
    const finger=ray.origin.add(ray.direction.scale(t));
    const sourcePos=source.getAbsolutePosition();
    // Chuko-style slingshot: finger is pulled behind the striking piece,
    // shot goes continuously in the opposite direction: finger -> source -> target.
    const dir=sourcePos.subtract(finger);dir.y=0;
    if(dir.length()<.05)return null;
    return dir.normalize();
  }

  showAimDirection(source,dir,dragPixels){
    this.clearAim();
    const start=source.getAbsolutePosition().clone();start.y=Math.max(.48,start.y+.20);
    const length=Math.max(1.0,Math.min(4.6,1.0+dragPixels*.018));
    const end=start.add(dir.scale(length));
    const side=new BABYLON.Vector3(-dir.z,0,dir.x);
    this.aimLine=BABYLON.MeshBuilder.CreateDashedLines("aimLine",{points:[start,end],dashSize:.18,gapSize:.10,dashNb:28},this.scene);
    this.aimLine.color=new BABYLON.Color3(1,.16,.06);this.aimLine.isPickable=false;
    const left=end.subtract(dir.scale(.34)).add(side.scale(.20)),right=end.subtract(dir.scale(.34)).subtract(side.scale(.20));
    this.aimHead=BABYLON.MeshBuilder.CreateLines("aimHead",{points:[left,end,right]},this.scene);
    this.aimHead.color=new BABYLON.Color3(1,.16,.06);this.aimHead.isPickable=false;
  }

  clearAim(){this.aimLine?.dispose();this.aimHead?.dispose();this.aimLine=null;this.aimHead=null;}

  bestTargetByDirection(source,dir){
    const targets=(this.store.validTargets||[]).filter(t=>!t.metadata?.collected);
    if(!source||targets.length===0)return null;
    const sp=source.getAbsolutePosition();
    let best=null,bestScore=-Infinity;
    for(const t of targets){
      const v=t.getAbsolutePosition().subtract(sp);v.y=0;
      const dist=v.length();if(dist<.08)continue;
      const dot=BABYLON.Vector3.Dot(dir,v.normalize());
      // Prefer a target that lies closest to the free aiming ray, not a target
      // that the arrow snaps to while dragging.
      const lateral=Math.sqrt(Math.max(0,1-dot*dot))*dist;
      const score=dot*2.2-lateral*.34-dist*.015;
      if(dot>.34&&score>bestScore){bestScore=score;best=t;}
    }
    return best;
  }
}
