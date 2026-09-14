import { CONFIG } from "./config.js";

const COLORS = [
  [.91,.33,.31],[.20,.58,.75],[.95,.75,.28],
  [.25,.65,.52],[.80,.56,.74],[.88,.88,.82]
];

export function createChuko(scene, index, isKhan = false, spawn = null) {
  const scale = isKhan ? CONFIG.khanScale : 1;
  const mesh = BABYLON.MeshBuilder.CreateBox(
    isKhan ? "KHAN" : `chuko_${index}`,
    {
      width: CONFIG.piece.width * scale,
      height: CONFIG.piece.height * scale,
      depth: CONFIG.piece.depth * scale
    },
    scene
  );

  if (spawn?.position) mesh.position.copyFrom(spawn.position);
  mesh.rotationQuaternion = spawn?.rotationQuaternion
    ? spawn.rotationQuaternion.clone()
    : BABYLON.Quaternion.Identity();

  const shell = BABYLON.MeshBuilder.CreateCapsule(
    `shell_${index}_${isKhan ? "k" : "n"}`,
    {
      radius: CONFIG.piece.depth * .52 * scale,
      height: CONFIG.piece.height * .96 * scale,
      tessellation: 12,
      subdivisions: 3
    },
    scene
  );
  shell.parent = mesh;
  shell.rotation.z = Math.PI / 2;
  shell.scaling.z = .82;
  shell.isPickable = true;
  mesh.visibility = .02;

  const mat = new BABYLON.StandardMaterial(`mat_${index}_${isKhan}`, scene);
  if (isKhan) {
    mat.diffuseColor = new BABYLON.Color3(.92,.70,.22);
    mat.specularColor = new BABYLON.Color3(.95,.83,.42);
    mat.emissiveColor = new BABYLON.Color3(.06,.035,0);
  } else {
    const c = COLORS[index % COLORS.length];
    mat.diffuseColor = new BABYLON.Color3(...c);
    mat.specularColor = new BABYLON.Color3(.22,.22,.22);
  }
  shell.material = mat;

  mesh.metadata = {
    id: isKhan ? "KHAN" : `C${index + 1}`,
    isKhan,
    state: "UNKNOWN",
    shell,
    aggregate: null,
    label: null
  };
  shell.metadata = { physicsMesh: mesh };

  // Important: create the Havok body only AFTER the mesh has been placed at
  // its spawn position. Creating all bodies at the origin and moving meshes
  // afterwards caused the whole scatter to collapse into one vertical line.
  const aggregate = new BABYLON.PhysicsAggregate(
    mesh,
    BABYLON.PhysicsShapeType.BOX,
    {
      mass: CONFIG.physics.mass * (isKhan ? 1.18 : 1),
      friction: CONFIG.physics.friction,
      restitution: CONFIG.physics.restitution
    },
    scene
  );
  aggregate.body.setLinearDamping(CONFIG.physics.linearDamping);
  aggregate.body.setAngularDamping(CONFIG.physics.angularDamping);
  mesh.metadata.aggregate = aggregate;
  return mesh;
}

export function disposeChuko(mesh) {
  if (!mesh) return;
  mesh.metadata?.label?.dispose?.();
  mesh.metadata?.aggregate?.dispose?.();
  mesh.metadata?.shell?.dispose?.();
  mesh.dispose();
}