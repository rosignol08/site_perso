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
    spawnUnit(x, z) {
        // On spawn à une hauteur arbitraire (ex: 50), le raycast le placera au sol à la frame 1
        const startPos = new THREE.Vector3(x, 50, z);
        const unit = new ArtilleryUnit(this.scene, startPos, this);

        // Donnons-leur une cible aléatoire pour tester tout de suite
        const randomTarget = new THREE.Vector3(
            (Math.random() - 0.5) * 80,
            0,
            (Math.random() - 0.5) * 80,
        );
        unit.setTarget(randomTarget);

        this.units.push(unit);
    }

    update(deltaTime) {
        // 1. Mettre à jour les unités d'artillerie (canons)
        this.units.forEach((unit) => {
            // IMPORTANT : On passe le mesh du terrain à l'unité pour qu'elle calcule sa hauteur
            unit.update(deltaTime, this.terrain.mesh);
            if (unit.target == null && unit.peut_tirer) {
                unit.setTarget(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 80,
                        0,
                        (Math.random() - 0.5) * 80,
                    ),
                );
            }
        });

        // 2. Mettre à jour les obus en vol
        this.impacts = []; // On vide la liste des impacts précédents

        for (let i = this.shells.length - 1; i >= 0; i--) {
            const obus = this.shells[i];

            // Appliquer la physique
            this.appliqueVelocite(obus, deltaTime);

            if (obus.position.y <= 0) {
                // Au lieu de modifier le terrain ici, on note juste l'impact
                this.impacts.push(obus.position.clone());

                this.scene.remove(obus);
                this.shells.splice(i, 1);

                // Jouer le son d'explosion
                this.playExplosionSound(obus.position);
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
}

export default ArtillerySystem;
