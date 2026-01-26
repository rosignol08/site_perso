import * as THREE from 'three';

class Vegetation {
  constructor(scene, count = 5000, terrainSize = 200) {
    this.scene = scene;
    this.count = count;
    this.terrainSize = terrainSize;
    // 1. Géométries
    // On remonte un peu le pivot pour que l'arbre ne tourne pas autour de sa base mais un peu au dessus
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 5, 6);
    trunkGeo.translate(0, 2.5, 0); 
    
    const leavesGeo = new THREE.ConeGeometry(3, 6, 8);
    leavesGeo.translate(0, 5, 0);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x006400 });

    // 2. InstancedMesh
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    this.leavesMesh = new THREE.InstancedMesh(leavesGeo, leavesMat, count);

    this.trunkMesh.castShadow = true;
    this.trunkMesh.receiveShadow = true;
    this.leavesMesh.castShadow = true;
    this.leavesMesh.receiveShadow = true;

    this.scene.add(this.trunkMesh);
    this.scene.add(this.leavesMesh);

    // 3. Données
    this.positions = []; 
    // États de dégâts (pour ne pas "réparer" un arbre ou le détruire deux fois)
    // 0 = Intact
    // 1 = Chauve (Stripped)
    // 2 = Couché (Toppled)
    // 3 = Vaporisé (Gone)
    this.states = new Int8Array(count).fill(0); 

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;
        
        dummy.position.set(x, 0, z);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        this.trunkMesh.setMatrixAt(i, dummy.matrix);
        this.leavesMesh.setMatrixAt(i, dummy.matrix);
        
        this.positions.push(new THREE.Vector3(x, 0, z));
    }
  }

  // Fonction unique appelée par handleExplosions
  applyBlast(impactPos) {
    const dummy = new THREE.Object3D();
    let needsUpdateTrunk = false;
    let needsUpdateLeaves = false;

    // Définition des rayons au carré (pour éviter les racines carrées couteuses)
    const rVaporizeSq = 8 * 8;   // 0-5m : Disparition
    const rToppleSq = 12 * 12;   // 5-12m : Couché
    const rStripSq = 18 * 18;    // 12-25m : Perte feuilles

    for (let i = 0; i < this.count; i++) {
        // Si l'arbre est déjà vaporisé (état 3), on ne peut rien faire de pire
        if (this.states[i] === 3) continue;

        const dx = this.positions[i].x - impactPos.x;
        const dz = this.positions[i].z - impactPos.z;
        const distSq = dx*dx + dz*dz;

        // Si on est hors de portée max, on passe
        if (distSq > rStripSq) continue;

        // --- NIVEAU 3 : VAPORISATION (Coup direct) ---
        if (distSq < rVaporizeSq) {
            this.states[i] = 3;
            
            // On réduit tout à 0
            this.trunkMesh.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            dummy.scale.set(0, 0, 0); 
            dummy.updateMatrix();
            this.trunkMesh.setMatrixAt(i, dummy.matrix);
            this.leavesMesh.setMatrixAt(i, dummy.matrix); // Feuilles aussi

            needsUpdateTrunk = true;
            needsUpdateLeaves = true;
        }
        
        // --- NIVEAU 2 : COUCHÉ (Un peu à côté) ---
        else if (distSq < rToppleSq) {
            // Si déjà couché, on ne fait rien
            if (this.states[i] >= 2) continue;
            
            this.states[i] = 2;

            // On récupère la matrice actuelle
            this.trunkMesh.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            // Calcul vecteur de chute (opposé à l'explosion)
            const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
            const axis = new THREE.Vector3(-pushDir.z, 0, pushDir.x); // Produit vectoriel simple pour avoir l'axe de rotation

            // On applique une rotation de 80-90 degrés
            const rot = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 2.2);
            dummy.quaternion.multiply(rot); // On accumule la rotation
            
            // On enfonce un peu le tronc dans le sol pour faire joli
            dummy.position.y -= 0.5;

            dummy.updateMatrix();
            
            // On applique la MÊME transformation au tronc et aux feuilles
            // (L'arbre tombe entier)
            this.trunkMesh.setMatrixAt(i, dummy.matrix);
            
            // Si l'arbre n'était pas chauve, on bouge aussi les feuilles
            // (Si on veut qu'il perde ses feuilles EN PLUS de tomber, mettre scale 0 ici sur leavesMesh)
            this.leavesMesh.getMatrixAt(i, dummy.matrix);
            // Pour l'instant, je fais tomber l'arbre AVEC ses feuilles pour le différencier de l'état "chauve"
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            dummy.scale.set(0, 0, 0); // POUF
            dummy.updateMatrix();
            this.leavesMesh.setMatrixAt(i, dummy.matrix); 
            
            needsUpdateTrunk = true;
            needsUpdateLeaves = true;
        }

        // --- NIVEAU 1 : CHAUVE (Encore plus à côté) ---
        else if (distSq < rStripSq) {
            // Si déjà chauve ou pire, on passe
            if (this.states[i] >= 1) continue;

            this.states[i] = 1;

            // On ne touche pas au tronc (reste debout)
            
            // On supprime les feuilles
            this.leavesMesh.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            dummy.scale.set(0, 0, 0); // POUF
            dummy.updateMatrix();
            this.leavesMesh.setMatrixAt(i, dummy.matrix);
            
            needsUpdateLeaves = true;
        }
    }

    if (needsUpdateTrunk) this.trunkMesh.instanceMatrix.needsUpdate = true;
    if (needsUpdateLeaves) this.leavesMesh.instanceMatrix.needsUpdate = true;
  }

  handleExplosions(impactPositions) {
     if (impactPositions.length === 0) return;
     
     // Optimisation : On ne fait qu'une seule passe
     impactPositions.forEach(pos => {
         this.applyBlast(pos);
     });
  }
}

export default Vegetation;