import { CONFIG } from "./config.js";
import { createChuko, disposeChuko } from "./chuko.js";

export class ScatterSystem {
  constructor(scene){this.scene=scene;this.pieces=[];}
  clear(){for(const p of this.pieces)disposeChuko(p);this.pieces=[];}

  scatter(){
    this.clear();
    const total=CONFIG.normalCount+1;
    const cells=this.buildCells(total);
    for(let i=0;i<CONFIG.normalCount;i++){
      const p=createChuko(this.scene,i,false,this.makeSpawn(cells[i],i));
      this.applyScatterImpulse(p);this.pieces.push(p);
    }
    const khan=createChuko(this.scene,CONFIG.normalCount,true,this.makeSpawn(cells[CONFIG.normalCount],CONFIG.normalCount));
    this.applyScatterImpulse(khan);this.pieces.push(khan);
    document.getElementById("pieceCount").textContent=CONFIG.normalCount;
    return this.pieces;
  }

  buildCells(total){
    // 4x4 = exactly 16 starting cells. All centres are deliberately well
    // inside the SAME blue play-area line used by the physical walls.
    const a=CONFIG.playArea;
    const margin=Math.max(a.pieceMargin??.72,.72);
    const minX=-a.width/2+margin,maxX=a.width/2-margin;
    const minZ=(a.centerZ??0)-a.depth/2+margin,maxZ=(a.centerZ??0)+a.depth/2-margin;
    const xs=linspace(minX,maxX,4),zs=linspace(minZ,maxZ,4),cells=[];
    for(const z of zs)for(const x of xs)cells.push({x,z});
    for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
    return cells.slice(0,total);
  }

  makeSpawn(cell,i){
    return{
      position:new BABYLON.Vector3(
        cell.x+rand(-.045,.045),
        rand(CONFIG.piece.spawnHeightMin,CONFIG.piece.spawnHeightMax)+i*.008,
        cell.z+rand(-.06,.06)
      ),
      rotationQuaternion:BABYLON.Quaternion.RotationYawPitchRoll(Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2)
    };
  }

  applyScatterImpulse(mesh){
    const body=mesh.metadata.aggregate.body;
    body.applyImpulse(new BABYLON.Vector3(rand(-.005,.005),0,rand(-.007,.007)),mesh.getAbsolutePosition());
  }
}

function linspace(a,b,n){if(n<=1)return[(a+b)/2];const out=[];for(let i=0;i<n;i++)out.push(a+(b-a)*(i/(n-1)));return out;}
function rand(a,b){return a+Math.random()*(b-a);}
