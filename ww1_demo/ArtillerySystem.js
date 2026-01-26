import * as THREE from "three";
import ArtilleryUnit from "./Artillery.js";

class ArtillerySystem {
    constructor(scene, audioListener, terrain) {
        this.scene = scene;
        this.shells = [];
        this.impacts = []; // Liste des explosions de cette frame
        this.units = [];
        this.gravite = -9.81;
        this.terrain = terrain;
        this.audioListener = audioListener;
        this.audioLoader = new THREE.AudioLoader();
    }

    // Méthode pour ajouter un obus venant d'ailleurs (ex: ArtilleryUnit)
    addShell(obus) {
        this.shells.push(obus);
        this.scene.add(obus);
    }

    spawnUnit(x, z, equipe) {
        // On spawn à une hauteur arbitraire (ex: 50), le raycast le placera au sol à la frame 1
        const startPos = new THREE.Vector3(x, 50, z);
        const unit = new ArtilleryUnit(this.scene, startPos, this, equipe);

        // IA Basique : Avancer vers le bord de la map de son côté
        // Si equipe 0 (à gauche) -> avance vers x négatif (bord gauche)
        // Si equipe 1 (à droite) -> avance vers x positif (bord droit)
        const targetX = equipe === 0 ? x - 30 : x + 30;

        unit.moveTo(
            new THREE.Vector3(
                targetX,
                0,
                z, // Garde la même position z (avance tout droit)
            ),
        );

        this.units.push(unit);
    }

    update(deltaTime) {
        this.impacts = []; // On vide la liste des impacts précédents
        // 1. Mettre à jour les unités d'artillerie (canons)
        this.units.forEach((unit) => {
            if (unit.Mort) unit.update(deltaTime, this.terrain.mesh);
            // Donner une cible si il n'en a pas
            if (!unit.targetUnit) {
                unit.targetUnit = this.findNearestEnemy(unit);
            }
            //console.log(unit.targetUnit);
            unit.update(deltaTime, this.terrain.mesh);
        });

        for (let i = this.shells.length - 1; i >= 0; i--) {
            const obus = this.shells[i];
            this.appliqueVelocite(obus, deltaTime);
            // Collision Sol
            // Amélioration : Utiliser Raycaster pour collision précise avec le terrain déformé
            // Sinon obus.position.y <= 0 est "ok" pour débuter mais imprécis si cratère
            if (obus.position.y <= 0) {
                this.createExplosion(obus.position);
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

    playExplosionSound(position) {
        const sound = new THREE.PositionalAudio(this.audioListener);

        // Créer un mesh dummy invisible au point d'impact pour émettre le son
        const audioSource = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
        audioSource.visible = false;
        audioSource.position.copy(position);
        this.scene.add(audioSource);
        audioSource.add(sound);

        // Attention au chemin du fichier, assure-toi qu'il est bon
        this.audioLoader.load("explosion-fx-343683.mp3", (buffer) => {
            sound.setBuffer(buffer);
            sound.setRefDistance(10);
            sound.setVolume(1.0); // Volume fort !
            sound.play();

            // Nettoyage automatique du son après lecture pour éviter les fuites de mémoire
            sound.onEnded = () => {
                sound.disconnect();
                this.scene.remove(audioSource);
                audioSource.geometry.dispose();
                audioSource.material.dispose();
            };
        });
    }
    findNearestEnemy(myFormUnit) {
      let nearest = null;
      let minDist = Infinity;

      this.units.forEach(otherUnit => {
          if (otherUnit === myFormUnit) return; // Pas moi-même
          if (otherUnit.equipe === myFormUnit.equipe) return; // Pas un allié
          if (otherUnit.Mort) return; // Pas un mort
        
          const dist = myFormUnit.mesh.position.distanceTo(otherUnit.mesh.position);
          if (dist < minDist) {
              minDist = dist;
              nearest = otherUnit;
          }
      });
      //console.log("cible trouvee :", nearest.mesh.position);
      return nearest; // Retourner l'unité entière pour accéder à sa position via nearest.mesh.position
  }
  createExplosion(position) {
      // 1. Effet visuel et sonore
      this.playExplosionSound(position);
      this.impacts.push(position.clone()); // Pour le World.js qui gère le terrain

      // 2. Dégâts de zone (Blast Radius)
      const explosionRadius = 15; // Rayon de dégats
      
      this.units.forEach(unit => {
          if (unit.Mort){
            ////on retire l'unite des unité existantes
            //const index = this.units.indexOf(unit);
            //if (index > -1) {
            //    this.units.splice(index, 1);
            //}
            return;
          }
          
          const dist = position.distanceTo(unit.mesh.position);
          
          if (dist < explosionRadius) {
              // Plus on est près, plus on a mal
              const damage = Math.floor((1 - (dist / explosionRadius)) * 100);
              console.log(`Unité touchée ! Dégats: ${damage}`);
              unit.takeDamage(damage);
          }
      });
  }
}

export default ArtillerySystem;
