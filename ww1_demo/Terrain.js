import * as THREE from 'three';

class Terrain {
  constructor(scene) {
    this.segments = 200; 
    this.size = 200;
    
    // Flag de debug pour voir les infos dans la console
    this.DEBUG = true; 
    this.hasChanged = false; 

    // Important : PlaneGeometry crée les sommets de Haut (+Y) en Bas (-Y)
    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x556B2F, 
        flatShading: true, 
        roughness: 1,
        metalness: 0
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; // À plat
    this.mesh.receiveShadow = true; 
    scene.add(this.mesh);
  }

  applyCrater(pointImpactWorld, radius = 5) {
    // 1. Force la mise à jour de la matrice du monde pour être sûr que la conversion est bonne
    this.mesh.updateMatrixWorld();
    
    // 2. Conversion Monde -> Local
    const localImpact = this.mesh.worldToLocal(pointImpactWorld.clone());
    
    const positions = this.geometry.attributes.position;
    const maxDepth = 4;
    const segmentSize = this.size / this.segments; // ex: 200/200 = 1 mètre
    
    // --- CORRECTION DES COORDONNÉES GRILLE ---
    
    // X : De Gauche (-100) à Droite (+100) -> Indice 0 à 200
    const centerCol = Math.floor((localImpact.x + this.size / 2) / segmentSize);
    
    // Y : De Haut (+100) à Bas (-100) -> Indice 0 à 200
    // C'était ici l'erreur : il faut soustraire Y de la taille/2
    const centerRow = Math.floor((this.size / 2 - localImpact.y) / segmentSize);

    // Rayon d'impact en "nombre de cases" (+ marge de sécurité)
    const gridRadius = Math.ceil((radius + 2) / segmentSize);

    // Calcul des bornes (Clamp pour ne pas sortir du tableau)
    const minCol = Math.max(0, centerCol - gridRadius);
    const maxCol = Math.min(this.segments, centerCol + gridRadius);
    const minRow = Math.max(0, centerRow - gridRadius);
    const maxRow = Math.min(this.segments, centerRow + gridRadius);

    let verticesTouched = 0;

    // 4. Boucle sur le carré restreint
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            
            // Index 1D dans le tableau de sommets
            const i = row * (this.segments + 1) + col;

            // Sécurité
            if (i < 0 || i >= positions.count) continue;

            const px = positions.getX(i);
            const py = positions.getY(i);
            
            const distSq = (px - localImpact.x)**2 + (py - localImpact.y)**2;
            const radSq = radius * radius;

            if (distSq < radSq) {
                const dist = Math.sqrt(distSq);
                const deformation = Math.cos((dist / radius) * (Math.PI / 2)) * maxDepth;
                
                const currentZ = positions.getZ(i);
                // On applique la déformation (creuser)
                positions.setZ(i, currentZ - deformation);
                
                this.hasChanged = true; 
                verticesTouched++;
            }
        }
    }

    if (this.DEBUG) {
        if (verticesTouched > 0) {
            // Succès
            // console.log(`Terrain: Impact en [${centerCol}, ${centerRow}], ${verticesTouched} sommets touchés.`);
        } else {
            // Echec : Affiche les infos pour comprendre pourquoi
            console.warn(`Terrain Miss: LocalImpact(${localImpact.x.toFixed(1)}, ${localImpact.y.toFixed(1)}) -> Row/Col[${centerRow}, ${centerCol}]`);
        }
    }
  }

  update() {
      if (!this.hasChanged) return;

      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.computeVertexNormals(); 
      this.hasChanged = false; 
  }
}

export default Terrain;