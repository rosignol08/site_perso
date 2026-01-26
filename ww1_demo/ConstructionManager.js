import * as THREE from 'three';
import Trench from './Trench.js';

class ConstructionManager {
    constructor(scene, terrain, team, xLine) {
        this.scene = scene;
        this.terrain = terrain;
        this.team = team;
        this.xLine = xLine; // La ligne X où on construit (-40 ou +40)
        
        this.blueprints = []; // Liste de TOUS les projets (finis ou non)
        this.soldiers = [];   // Liste de mes soldats (pour la charge)

        // ON GÉNÈRE TOUTE LA LIGNE DE FRONT DÈS LE DÉBUT
        this.planFrontLine();
    }

    registerSoldier(unit) {
        this.soldiers.push(unit);
    }

    planFrontLine() {
        // On construit de Z = -80 à Z = +80
        let currentZ = -80;
        
        while (currentZ < 80) {
            // Pattern : 2 Tranchées, 1 Bunker, 2 Tranchées...
            // Hasard pour varier un peu
            const type = (Math.random() < 0.3) ? 'BUNKER' : 'TRENCH';
            
            // Création du blueprint
            const start = new THREE.Vector3(this.xLine, 0, currentZ);
            // Direction Z (le long de la ligne de front)
            const dir = new THREE.Vector3(0, 0, 1); 

            const structure = new Trench(this.scene, this.terrain, start, dir, type);
            this.blueprints.push(structure);

            // On avance le curseur Z selon la longueur de la structure + un petit écart
            const gap = 2; 
            currentZ += structure.length + gap;
        }
        console.log(`Équipe ${this.team}: ${this.blueprints.length} structures planifiées.`);
    }

    // Le coeur de l'intelligence : Trouve un travail pour un soldat
    assignTask(unitPosition) {
        let bestTask = null;
        let minDist = Infinity;

        // PHASE 1 : CONSTRUCTION
        for (const structure of this.blueprints) {
            if (structure.needsBuilders()) {
                const dist = unitPosition.distanceTo(structure.startPos);
                
                if (dist < minDist) {
                    minDist = dist;
                    bestTask = { type: 'BUILD', target: structure };
                }
            }
        }

        if (bestTask) return bestTask;

        // ✅ PHASE 1.5 : SI AUCUN CHANTIER LIBRE, ON AIDE LE PLUS PROCHE MÊME SI PLEIN
        // (Pour éviter que des soldats restent inactifs)
        minDist = Infinity;
        for (const structure of this.blueprints) {
            if (!structure.isFinished) { // Pas fini = on peut toujours aider
                const dist = unitPosition.distanceTo(structure.startPos);
                if (dist < minDist) {
                    minDist = dist;
                    bestTask = { type: 'BUILD', target: structure };
                }
            }
        }

        if (bestTask) return bestTask;

        // PHASE 2 : DÉFENSE
        minDist = Infinity;
        for (const structure of this.blueprints) {
            if (structure.isFinished && !structure.isFull()) {
                const dist = unitPosition.distanceTo(structure.startPos);
                if (dist < minDist) {
                    minDist = dist;
                    bestTask = { type: 'DEFEND', target: structure };
                }
            }
        }

        return bestTask;
    }
    
    // LA FONCTION "C" POUR CHARGER
    orderGlobalCharge() {
        console.log(`ÉQUIPE ${this.team} : CHARGEZ !!! (${this.soldiers.length} soldats)`);
        
        // On force tous les soldats à passer en état CHARGING
        this.soldiers.forEach(soldier => {
            if (!soldier.isDead) {
                soldier.startCharge();
            }
        });
        
        // On vide toutes les structures (logiquement)
        this.blueprints.forEach(struct => {
            struct.occupants = [];
            struct.builders = [];
        });
    }
}

export default ConstructionManager;