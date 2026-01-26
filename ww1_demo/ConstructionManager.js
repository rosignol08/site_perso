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
            const bunkerChance = Math.max(0.1, 0.8 - (this.linesBuilt * 0.1));
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

        // On veut prioriser les structures qui sont le plus "en avant" sur le front.
        // Si je suis Bleu (Team 0), je veux les X les plus GRANDS.
        // Si je suis Rouge (Team 1), je veux les X les plus PETITS.
        const frontDirection = (this.team === 0) ? 1 : -1;

        // Fonction de score : Plus le score est haut, plus la tache est prioritaire.
        // Le score est basé sur la position X (avancée)
        const calculateScore = (structure) => {
            // Position X pondérée par la direction de l'équipe
            return structure.startPos.x * frontDirection;
        };

        // 1. Lister toutes les tâches possibles
        let potentialTasks = [];

        for (const structure of this.blueprints) {
            // A. Tâche de CONSTRUCTION (Priorité haute)
            if (structure.needsBuilders()) {
                // On ajoute un bonus artificiel (+1000) pour que la construction passe avant la défense
                potentialTasks.push({ 
                    type: 'BUILD', 
                    target: structure, 
                    score: calculateScore(structure) + 1000 
                });
            }
            // B. Tâche de DÉFENSE (Seulement si fini et pas plein)
            else if (structure.isFinished && !structure.isFull()) {
                potentialTasks.push({ 
                    type: 'DEFEND', 
                    target: structure, 
                    score: calculateScore(structure) 
                });
            }
        }

        // 2. Trier les tâches : Score le plus élevé en premier (Le plus au front)
        potentialTasks.sort((a, b) => b.score - a.score);

        // 3. Retourner la meilleure
        if (potentialTasks.length > 0) {
            // Petite subtilité : Si le soldat est déjà très loin derrière, 
            // on ne veut pas forcément qu'il traverse TOUTE la map pour le front immédiat s'il y a un chantier juste à côté.
            // Mais pour ta demande "qu'ils avancent", on prend juste le premier de la liste.
            return potentialTasks[0];
        }

        return null;
    }

    orderGlobalCharge() {
        console.log(`CHARGE !!!`);
        this.soldiers.forEach(s => !s.isDead && s.startCharge());
        this.blueprints.forEach(b => { b.occupants = []; b.builders = []; });
    }
}

export default ConstructionManager;