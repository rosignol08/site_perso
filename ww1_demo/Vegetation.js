import * as THREE from 'three';

class Vegetation {
  constructor(scene, count = 50) {
    this.scene = scene;
    this.trees = []; // On stocke nos arbres ici
    
    // Géométries partagées pour optimiser la mémoire
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 2, 6);
    const leavesGeo = new THREE.ConeGeometry(3, 6, 8);
    
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Marron
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Vert foncé

    for (let i = 0; i < count; i++) {
      this.createTree(trunkGeo, leavesGeo, trunkMat, leavesMat);
    }
  }
    createTree(trunkGeo, leavesGeo, trunkMat, leavesMat) {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    trunk.castShadow = true;
    leaves.castShadow = true;
    leaves.position.y = 4; // Positionner les feuilles au-dessus du tronc

    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(leaves);
    tree.position.set(
      (Math.random() - 0.5) * 80, // X aléatoire dans une zone de 80x80
      1, // Y au sol (tronc de 2 de haut)
      (Math.random() - 0.5) * 80  // Z aléatoire
    );
    this.scene.add(tree);
    this.trees.push(tree);
  }
    checkDestruction(impactPos, radius) {
    const toRemove = [];
    this.trees.forEach((tree, index) => {
        const dist = tree.position.distanceTo(impactPos);
        if (dist < radius) {
            toRemove.push(index);
            this.scene.remove(tree);
        }
    });
    // Supprimer les arbres détruits de la liste
    for (let i = toRemove.length - 1; i >= 0; i--) {
        this.trees.splice(toRemove[i], 1);
    }
  }
    // On lui donne une liste d'explosions, il vérifie s'il doit tuer des arbres
    handleExplosions(impactPositions) {
        if (impactPositions.length === 0) return;

        impactPositions.forEach(pos => {
            // Logique de vérification de distance et chute d'arbre
            this.checkDestruction(pos, 10); 
        });
    }
}

export default Vegetation;