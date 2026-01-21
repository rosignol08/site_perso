import * as THREE from 'three';

class Terrain {
  constructor(scene) {
    // TODO: Créer une PlaneGeometry avec BEAUCOUP de segments (ex: 100x100)
    // Plus il y a de segments, plus les cratères seront "ronds", mais plus c'est lourd.
    this.geometry = new THREE.PlaneGeometry(100, 100, 128, 128);
    const material = new THREE.MeshStandardMaterial();

    // IMPORTANT: Pour que la lumière réagisse aux trous, il faut recalculer les normales
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; // Mettre à plat
    scene.add(this.mesh);
  }

  createCrater(impactPoint, radius) {
    const positions = this.geometry.attributes.position;
    const vector = new THREE.Vector3();
    const craterRadius = radius || 10;
    const maxDepth = 5;

    for (let i = 0; i < positions.count; i++) {
      vector.fromBufferAttribute(positions, i);

      const dist = Math.sqrt(
        Math.pow(vector.x - impactPoint.x, 2) +
          Math.pow(vector.y - impactPoint.z, 2)
      );

      if (dist < craterRadius) {
        const depth =
          Math.cos((dist / craterRadius) * (Math.PI / 2)) * maxDepth;
        positions.setZ(i, vector.z - depth);
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

export default Terrain;