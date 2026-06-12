import * as THREE from 'three';
import Unit from './Unit.js';
import ConstructionManager from './ConstructionManager.js';

class UnitSystem {
    constructor(scene, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.units = [];
        this.trenches = []; 

        // CONFIGURATION DES BASES
        // Bleu :
        this.managerBlue = new ConstructionManager(scene, terrain, 0, -80, 1);
        
        // Rouge :
        this.managerRed = new ConstructionManager(scene, terrain, 1, 80, -1);
    }

    //spawnUnit(x, z, team) {
    //    const startPos = new THREE.Vector3(x, 50, z);
    //    const unit = new Unit(this.scene, startPos, team, this);
    //    this.units.push(unit);
    //}
    spawnUnit(x, z, team) {
        const startPos = new THREE.Vector3(x, 50, z);
        
        // --- DISTRIBUTION DES RÔLES OBLIGATOIRE ---
        const rand = Math.random();
        let role = 'RIFLEMAN';
        if (rand < 0.25) role = 'ENGINEER';    // 25% construisent et relient !
        else if (rand < 0.45) role = 'MELEE';  // 20% d'assaut
        
        const unit = new Unit(this.scene, startPos, team, this, role);
        this.units.push(unit);
    }

    getManager(team) {
        return (team === 0) ? this.managerBlue : this.managerRed;
    }

    triggerCharge(team) {
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
        // 1. Update des unités
        this.units.forEach(u => u.update(deltaTime, this.terrain.mesh));

        // 2. IMPORTANT : Update des Managers pour qu'ils planifient les nouvelles lignes
        this.managerBlue.update();
        this.managerRed.update();
    }
}

export default UnitSystem;