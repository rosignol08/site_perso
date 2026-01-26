import * as THREE from 'three';
import Unit from './Unit.js';
import ConstructionManager from './ConstructionManager.js';

class UnitSystem {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.units = []; // Toutes les unités
        this.trenches = []; // Liste des tranchées existantes
        // Manager Bleu (Team 0) : Ligne de front à X = -50
        this.managerBlue = new ConstructionManager(scene, terrain, 0, -40);
        // Manager Rouge (Team 1) : Ligne de front à X = +50
        this.managerRed = new ConstructionManager(scene, terrain, 1, 40);
    }

    spawnUnit(x, z, team) {
        const startPos = new THREE.Vector3(x, 50, z);
        const unit = new Unit(this.scene, startPos, team, this);
        this.units.push(unit);
    }

    triggerCharge(team) {
        // Appel direct sur le manager qui a la liste de ses soldats
        this.getManager(team).orderGlobalCharge();
    }
    getManager(team) {
        return (team === 0) ? this.managerBlue : this.managerRed;
    }

    addTrench(trench) {
        this.trenches.push(trench);
    }

    findAvailableTrench(position, radius) {
        for (const trench of this.trenches) {
            // 1. Est-ce qu'elle est pleine ?
            if (trench.isFull()) continue;

            // 2. Est-ce qu'elle est proche ?
            const dist = position.distanceTo(trench.startPos);
            if (dist < radius) {
                return trench;
            }
        }
        return null;
    }

    getNearestEnemy(me) {
        let nearest = null;
        let minDist = Infinity;
        for (const u of this.units) {
            if (u === me || u.team === me.team || u.isDead) continue;
            const d = me.mesh.position.distanceTo(u.mesh.position);
            if (d < minDist) {
                minDist = d;
                nearest = u;
            }
        }
        return nearest;
    }

    update(deltaTime) {
        this.units.forEach(u => u.update(deltaTime, this.terrain.mesh));
    }
}

export default UnitSystem;