import { GameState } from "./game-state.js";

export class InputController {
  constructor(scene, canvas, store, selector, getPieces, onFlick, canTargetKhan=()=>false) {
    this.scene=scene; this.canvas=canvas; this.store=store; this.selector=selector; this.getPieces=getPieces; this.onFlick=onFlick; this.canTargetKhan=canTargetKhan;
    this.down=null; this.aimLine=null; this.aimHead=null; this.install();
  }

  install() {
    this.scene.onPointerObservable.add(pi => {
      if (this.store.state !== GameState.READY) { this.clearAim(); return; }

      if (pi.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        const hit=this.pickPiece();
        this.down={x:this.scene.pointerX,y:this.scene.pointerY,mesh:hit};
        if (!this.store.selected && hit && !hit.metadata?.isKhan && !hit.metadata?.collected) {
          const targets=this.selector.select(hit,this.getPieces(),!!this.canTargetKhan());
          const target=this.nearestTarget(hit,targets);
          if (target) this.showAim(hit,target);
        } else if (this.store.selected) {
          const target=this.nearestTarget(this.store.selected,this.store.validTargets);
          if (target) this.showAim(this.store.selected,target);
        }
      }

      if (pi.type === BABYLON.PointerEventTypes.POINTERMOVE && this.down) {
        const source=this.store.selected || this.down.mesh;
        if (!source || source.metadata?.isKhan || source.metadata?.collected) return;
        const dx=this.scene.pointerX-this.down.x,dy=this.scene.pointerY-this.down.y;
        const moved=Math.hypot(dx,dy);
        if (moved>8) {
          const target=this.bestTargetBySwipe(source,dx,dy);
          if (target) this.showAim(source,target);
        }
      }

      if (pi.type === BABYLON.PointerEventTypes.POINTERUP) {
        const upX=this.scene.pointerX,upY=this.scene.pointerY;
        const moved=this.down?Math.hypot(upX-this.down.x,upY-this.down.y):0;
        const upMesh=this.pickPiece();
        const allowKhan=!!this.canTargetKhan();

        if (moved<22) {
          if (!this.store.selected) {
            if (upMesh&&!upMesh.metadata.isKhan&&!upMesh.metadata.collected) {
              const targets=this.selector.select(upMesh,this.getPieces(),allowKhan);
              const target=this.nearestTarget(upMesh,targets); if(target)this.showAim(upMesh,target);
            }
          } else if (upMesh&&this.selector.isValidTarget(upMesh)) {
            const source=this.store.selected; this.clearAim(); this.onFlick(source,upMesh);
          } else if (upMesh&&!upMesh.metadata.isKhan&&!upMesh.metadata.collected) {
            const targets=this.selector.select(upMesh,this.getPieces(),allowKhan);
            const target=this.nearestTarget(upMesh,targets); if(target)this.showAim(upMesh,target); else this.clearAim();
          } else {
            this.clearAim(); this.selector.clearSelection(); this.selector.updateVisuals(this.getPieces());
          }
        } else if (this.store.selected||this.down?.mesh) {
          const source=this.store.selected||this.down.mesh;
          if (source?.metadata?.collected||source?.metadata?.isKhan) { this.down=null; this.clearAim(); return; }
          if (source&&!this.store.selected) this.selector.select(source,this.getPieces(),allowKhan);
          const target=this.bestTargetBySwipe(source,upX-this.down.x,upY-this.down.y);
          if (target) { this.clearAim(); this.onFlick(source,target); }
          else { const nearest=this.nearestTarget(source,this.store.validTargets); if(nearest)this.showAim(source,nearest); }
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

  nearestTarget(source,targets=[]) {
    let best=null,bestD=Infinity;
    for(const t of targets||[]){if(!t||t.metadata?.collected)continue;const d=BABYLON.Vector3.DistanceSquared(source.getAbsolutePosition(),t.getAbsolutePosition());if(d<bestD){bestD=d;best=t;}}
    return best;
  }

  showAim(source,target) {
    this.clearAim(); if(!source||!target)return;
    const a=source.getAbsolutePosition().clone(),b=target.getAbsolutePosition().clone(); a.y=b.y=Math.max(.46,a.y+.20);
    const flat=b.subtract(a); flat.y=0; const len=flat.length(); if(len<.1)return; const dir=flat.normalize(),side=new BABYLON.Vector3(-dir.z,0,dir.x),end=b.subtract(dir.scale(.34));
    this.aimLine=BABYLON.MeshBuilder.CreateDashedLines("aimLine",{points:[a,end],dashSize:.20,gapSize:.11,dashNb:24},this.scene); this.aimLine.color=new BABYLON.Color3(1,.16,.06); this.aimLine.isPickable=false;
    const left=end.subtract(dir.scale(.28)).add(side.scale(.16)),right=end.subtract(dir.scale(.28)).subtract(side.scale(.16));
    this.aimHead=BABYLON.MeshBuilder.CreateLines("aimHead",{points:[left,end,right]},this.scene); this.aimHead.color=new BABYLON.Color3(1,.16,.06); this.aimHead.isPickable=false;
  }

  clearAim(){this.aimLine?.dispose();this.aimHead?.dispose();this.aimLine=null;this.aimHead=null;}

  bestTargetBySwipe(source,dx,dy) {
    const targets=this.store.validTargets.filter(t=>!t.metadata?.collected); if(!source||source.metadata?.collected||targets.length===0)return null;
    const mag=Math.hypot(dx,dy); if(mag<10)return null; const sx=dx/mag,sy=dy/mag;
    const vp=this.scene.activeCamera.viewport.toGlobal(this.scene.getEngine().getRenderWidth(),this.scene.getEngine().getRenderHeight());
    const sp=BABYLON.Vector3.Project(source.getAbsolutePosition(),BABYLON.Matrix.Identity(),this.scene.getTransformMatrix(),vp);
    let best=null,bestScore=-Infinity;
    for(const t of targets){const tp=BABYLON.Vector3.Project(t.getAbsolutePosition(),BABYLON.Matrix.Identity(),this.scene.getTransformMatrix(),vp);const vx=tp.x-sp.x,vy=tp.y-sp.y,vm=Math.hypot(vx,vy)||1,score=sx*(vx/vm)+sy*(vy/vm);if(score>bestScore){bestScore=score;best=t;}}
    return bestScore>.20?best:null;
  }
}
