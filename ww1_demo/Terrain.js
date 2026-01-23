import * as THREE from 'three';

class Terrain {
  constructor(scene) {
    // Augmente un peu les segments pour des cratères plus jolis (128 -> 150 ou 200 si ton PC tient)
    this.geometry = new THREE.PlaneGeometry(100, 100, 250, 250);
    
    // Astuce : Wireframe temporaire pour bien voir la déformation
    // Ou flatShading: true pour voir les facettes du style "Low Poly"
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x228822, // Vert herbe
        flatShading: true,
        side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; 
    // IMPORTANT : On permet au mesh de recevoir des ombres
    this.mesh.receiveShadow = true; 
    scene.add(this.mesh);
  }

  createCrater(pointImpactWorld, radius = 5) {
    // 1. Convertir le point d'impact (World) en coordonnées locales du Plane (Local)
    // On clone pour ne pas modifier le vecteur original de l'obus
    const localImpact = this.mesh.worldToLocal(pointImpactWorld.clone());

    const positions = this.geometry.attributes.position;
    const vector = new THREE.Vector3();
    const maxDepth = 4; // Profondeur du trou

    for (let i = 0; i < positions.count; i++) {
      vector.fromBufferAttribute(positions, i);

      // Maintenant on compare X avec X, et Y avec Y (car on est en local sur le PlaneGeometry)
      // On ignore Z dans la distance car Z est la "hauteur" locale qu'on veut modifier
      const dist = Math.sqrt(
        Math.pow(vector.x - localImpact.x, 2) +
        Math.pow(vector.y - localImpact.y, 2)
      );

      if (dist < radius) {
        // Formule Cosinus pour un trou progressif
        const deformation = Math.cos((dist / radius) * (Math.PI / 2)) * maxDepth;
        
        // On soustrait la déformation à la hauteur existante (axe Z local)
        // On vérifie que le vertex n'est pas déjà plus bas (pour ne pas "remonter" le fond d'un vieux cratère)
        const currentZ = positions.getZ(i);
        const newZ = currentZ - deformation;
        
        // Petit bruit aléatoire pour faire terreux et pas lisse
        const noise = (Math.random() - 0.5) * 0.5; 
        
        positions.setZ(i, Math.min(currentZ, newZ + noise));
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

export default Terrain;