//pour l'armée
import * as THREE from 'three';
import Unit from './Unit.js';

class UnitSystem {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain; // Besoin du terrain pour le Raycasting
        this.units = [];
    }

    spawnUnit(x, z) {
        // On spawn à une hauteur arbitraire (ex: 50), le raycast le placera au sol à la frame 1
        const startPos = new THREE.Vector3(x, 50, z);
        const unit = new Unit(this.scene, startPos);
        
        // Donnons-leur une cible aléatoire pour tester tout de suite
        const randomTarget = new THREE.Vector3(
            (Math.random() - 0.5) * 80, 
            0, 
            (Math.random() - 0.5) * 80
        );
        unit.setTarget(randomTarget);

        this.units.push(unit);
    }

    update(deltaTime) {
        this.units.forEach(unit => {
            // IMPORTANT : On passe le mesh du terrain à l'unité pour qu'elle calcule sa hauteur
            unit.update(deltaTime, this.terrain.mesh);
        });
    }
}

export default UnitSystem;