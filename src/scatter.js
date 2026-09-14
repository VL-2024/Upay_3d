import { CONFIG } from "./config.js";
import { createChuko, disposeChuko } from "./chuko.js";

export class ScatterSystem {
  constructor(scene){this.scene=scene;this.pieces=[];}
  clear(){for(const p of this.pieces)disposeChuko(p);this.pieces=[];}

  scatter(){
    this.clear();
    const total=CONFIG.normalCount+1;
    const points=this.buildRandomPoints(total);
    for(let i=0;i<CONFIG.normalCount;i++){
      const p=createChuko(this.scene,i,false,this.makeSpawn(points[i],i));
      this.applyScatterImpulse(p);this.pieces.push(p);
    }
    const khan=createChuko(this.scene,CONFIG.normalCount,true,this.makeSpawn(points[CONFIG.normalCount],CONFIG.normalCount));
    this.applyScatterImpulse(khan);this.pieces.push(khan);
    document.getElementById("pieceCount").textContent=CONFIG.normalCount;
    return this.pieces;
  }

  buildRandomPoints(total){
    const a=CONFIG.playArea;
    const margin=Math.max(a.pieceMargin??.72,.72);
    const minX=-a.width/2+margin,maxX=a.width/2-margin;
    const minZ=(a.centerZ??0)-a.depth/2+margin,maxZ=(a.centerZ??0)+a.depth/2-margin;
    const pts=[];
    const minDist=.62;
    for(let i=0;i<total;i++){
      let best=null,bestScore=-1;
      for(let attempt=0;attempt<80;attempt++){
        const p={x:rand(minX,maxX),z:rand(minZ,maxZ)};
        let nearest=Infinity;
        for(const q of pts){const dx=p.x-q.x,dz=p.z-q.z;nearest=Math.min(nearest,Math.hypot(dx,dz));}
        if(pts.length===0||nearest>=minDist){best=p;break;}
        if(nearest>bestScore){bestScore=nearest;best=p;}
      }
      pts.push(best);
    }
    for(let i=pts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}
    return pts;
  }

  makeSpawn(point,i){
    return{
      position:new BABYLON.Vector3(
        point.x,
        rand(CONFIG.piece.spawnHeightMin,CONFIG.piece.spawnHeightMax)+rand(-.18,.18)+i*.004,
        point.z
      ),
      rotationQuaternion:BABYLON.Quaternion.RotationYawPitchRoll(Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2)
    };
  }

  applyScatterImpulse(mesh){
    const body=mesh.metadata.aggregate.body;
    body.applyImpulse(new BABYLON.Vector3(rand(-.018,.018),0,rand(-.022,.022)),mesh.getAbsolutePosition());
  }
}

function rand(a,b){return a+Math.random()*(b-a);}
