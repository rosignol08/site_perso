import * as THREE from 'three';
import Trench from './Trench.js';

class ConstructionManager {
    constructor(scene, terrain, team, startX, directionX) {
        this.scene = scene;
        this.terrain = terrain;
        this.team = team;
        
        // startX : Là où commence la base (ex: -80 pour les Bleus)
        // directionX : Vers où on avance (+1 vers la droite, -1 vers la gauche)
        this.currentLineX = startX; 
        this.advanceDir = directionX; 
        
        this.blueprints = []; 
        this.soldiers = [];   

        // Paramètres de progression
        this.linesBuilt = 0; // Combien de rangées on a fait
        this.maxLines = 10;  // Limite pour pas aller à l'infini
        
        // On lance la PREMIÈRE ligne tout de suite
        this.planNextRow();
    }

    registerSoldier(unit) {
        this.soldiers.push(unit);
    }

    // Appelé à chaque frame par UnitSystem pour vérifier l'avancement
    update() {
        // On compte combien de structures sont finies dans toute la liste
        let finishedCount = 0;
        let totalCount = this.blueprints.length;

        for (const b of this.blueprints) {
            if (b.isFinished) finishedCount++;
        }

        // Si 80% des constructions totales sont finies, on lance la suite !
        // Et on vérifie qu'on n'a pas atteint la limite
        if (totalCount > 0 && (finishedCount / totalCount) > 0.8) {
            if (this.linesBuilt < this.maxLines) {
                this.planNextRow();
            }
        }
    }

    planNextRow() {
        console.log(`Équipe ${this.team}: Planification de la ligne #${this.linesBuilt + 1} à X=${this.currentLineX}`);
        
        // On construit de Z = -80 à Z = +80
        // On laisse un peu de marge sur les bords
        let currentZ = -70; 
        const endZ = 70;

        while (currentZ < endZ) {
            // Plus on avance vers le front, plus on fait de tranchées et moins de bunkers
            // Ligne 0 (Base) = Bunkers
            // Ligne 5 (Front) = Tranchées
            const bunkerChance = 0.0;//Math.max(0.1, 0.8 - (this.linesBuilt * 0.1));
            const type = (Math.random() < bunkerChance) ? 'BUNKER' : 'TRENCH';
            
            // On ajoute un peu d'aléatoire sur X pour pas faire une ligne trop droite (plus naturel)
            const randomX = this.currentLineX + (Math.random() * 5 * this.advanceDir);

            const start = new THREE.Vector3(randomX, 0, currentZ);
            const dir = new THREE.Vector3(0, 0, 1); 

            const structure = new Trench(this.scene, this.terrain, start, dir, type);
            this.blueprints.push(structure);

            const gap = 3; 
            currentZ += structure.length + gap;
        }

        // On prépare la coordonnée X pour la PROCHAINE ligne
        // On avance de 15 mètres vers l'ennemi
        this.currentLineX += (15 * this.advanceDir);
        this.linesBuilt++;
    }

    assignTask(unitPosition) {
        let bestTask = null;
        let maxScore = -Infinity; // On change la logique : on cherche le SCORE MAX

        // Direction du front (+1 ou -1)
        const frontDir = (this.team === 0) ? 1 : -1;

        for (const structure of this.blueprints) {
            
            // Calculer à quel point cette structure est "au front"
            // Plus X est grand (pour les bleus), plus c'est le front.
            const forwardScore = structure.startPos.x * frontDir; 
            const dist = unitPosition.distanceTo(structure.startPos);

            // --- SCORE DE TACHE ---
            let score = 0;

            // 1. TACHE DE CONSTRUCTION (Priorité ABSOLUE)
            if (structure.needsBuilders()) {
                // Base : 10 000 points (Immense bonus)
                // + Bonus de Front : On préfère construire devant (x10)
                // - Malus de Distance : On préfère ce qui est près (mais le bonus 10k écrase tout)
                score = 10000 + (forwardScore * 5) - (dist * 0.5);
                
                if (score > maxScore) {
                    maxScore = score;
                    bestTask = { type: 'BUILD', target: structure };
                }
            }
            
            // 2. TACHE DE DEFENSE (Seulement si on a rien de mieux à faire)
            else if (structure.isFinished && !structure.isFull()) {
                // Base : 100 points
                // On veut défendre le plus en avant possible absolument
                score = 100 + (forwardScore * 10) - dist;

                if (score > maxScore) {
                    maxScore = score;
                    bestTask = { type: 'DEFEND', target: structure };
                }
            }
        }

        return bestTask;
    }

    orderGlobalCharge() {
        console.log(`CHARGE !!!`);
        this.soldiers.forEach(s => !s.isDead && s.startCharge());
        this.blueprints.forEach(b => { b.occupants = []; b.builders = []; });
    }
}

export default ConstructionManager;