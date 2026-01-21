import * as THREE from 'three';

class ArtillerySystem {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain; // AJOUT: référence au terrain
    this.shells = [];
    this.gravite = -9.81;
  }

  fire(startPos, targetPos) {
    const geometry = new THREE.SphereGeometry(15, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const obus = new THREE.Mesh(geometry, material);
    obus.position.copy(startPos);

    // Calculer vélocité initiale
    const dx = targetPos.x - startPos.x;
    const dz = targetPos.z - startPos.z;
    const distance_horizontale = Math.sqrt(dx * dx + dz * dz);
    
    const angle = 45 * (Math.PI / 180);
    const vitesse_initiale = Math.sqrt((distance_horizontale * Math.abs(this.gravite)) / Math.sin(2 * angle));
    
    const vitesse_horizontale = vitesse_initiale * Math.cos(angle);
    
    // Stocker la vélocité AVEC l'obus
    obus.velocity = {
      x: vitesse_horizontale * (dx / distance_horizontale),
      y: vitesse_initiale * Math.sin(angle),
      z: vitesse_horizontale * (dz / distance_horizontale)
    };
    
    this.shells.push(obus);
    this.scene.add(obus); // AJOUT: ajouter l'obus à la scène
  }

  update(deltaTime) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const obus = this.shells[i];
      
      // Appliquer la vélocité
      this.appliqueVelocite(obus, deltaTime);
      
      // Vérifier collision sol
      if (obus.position.y <= 0) {
        this.triggerExplosion(obus.position);
        this.terrain.createCrater(obus.position); // AJOUT: créer cratère
        this.scene.remove(obus);
        this.shells.splice(i, 1);
      }
    }
  }
  
  appliqueVelocite(obus, deltaTime) {
    // Appliquer la gravité sur la composante verticale
    obus.velocity.y += this.gravite * deltaTime;
    
    // Déplacer l'obus selon sa vélocité
    obus.position.x += obus.velocity.x * deltaTime;
    obus.position.y += obus.velocity.y * deltaTime;
    obus.position.z += obus.velocity.z * deltaTime;
  }

  triggerExplosion(position) {
    console.log("Explosion à", position);
    // TODO: créer effet d'explosion
  }
}

export default ArtillerySystem;