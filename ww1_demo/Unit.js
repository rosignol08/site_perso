import * as THREE from 'three';
import Rifle from './Rifle.js';

class Unit {
    constructor(scene, startPosition, team, unitSystem) {
        this.scene = scene;
        this.unitSystem = unitSystem;
        this.team = team; 
        
        // Enregistrement auprès du manager pour la charge globale
        const manager = this.unitSystem.getManager(this.team);
        manager.registerSoldier(this);

        this.hp = 100;
        this.isDead = false;

       // --- VISUEL 3D ---
        // On récupère le modèle depuis l'AssetManager
        const asset = assetManager.getSoldierInstance();
        this.mesh = asset.mesh;
        
        // Couleur d'équipe
        const teamColor = team === 0 ? 0x0000FF : 0xFF0000;
        
        // On parcourt le modèle pour trouver le maillage du corps et le colorier
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                // IMPORTANT: Cloner le material pour que chaque soldat ait sa couleur
                child.material = child.material.clone();
                // On garde la texture s'il y en a une, mais on teinte
                child.material.color.setHex(teamColor);
            }
        });

        this.mesh.position.copy(startPosition);
        scene.add(this.mesh);
        
        // --- ANIMATIONS ---
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.actions = {}; // Pour stocker les actions (Idle, Run...)

        // On lie les clips chargés aux actions du mixer
        asset.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            this.actions[clip.name] = action;
        });

        // Lancer l'animation par défaut
        this.activeAction = this.actions['Idle'];
        if(this.activeAction) this.activeAction.play();

        // --- LOGIQUE ---
        this.rifle = new Rifle(scene, this); 
        // NOTE: Idéalement il faudrait attacher le rifle à l'os de la main (RightHand)
        // Pour l'instant il flottera ou suivra le centre, on pourra l'améliorer.

        this.speed = 4.0 + Math.random(); // Vitesse un peu ajustée pour l'anim de course
        this.state = 'IDLE';
        
        this.currentTask = null; // { type: 'BUILD'|'DEFEND', target: Trench }
        
        this.raycaster = new THREE.Raycaster();
        this.raycaster.firstHitOnly = true; 
        this.downVector = new THREE.Vector3(0, -1, 0);

        this.combatRange = 40;
    }

    // Fonction pour changer d'animation en douceur
    fadeToAction(name, duration = 0.2) {
        const nextAction = this.actions[name];
        if (!nextAction || this.activeAction === nextAction) return;

        // Si l'anim n'existe pas (ex: pas de 'Dig'), on fallback sur 'Idle'
        if (!nextAction) {
            console.warn(`Animation ${name} manquante`);
            return;
        }

        nextAction.reset();
        nextAction.setEffectiveTimeScale(1);
        nextAction.setEffectiveWeight(1);
        
        // Transition fluide
        nextAction.crossFadeFrom(this.activeAction, duration, true);
        nextAction.play();
        
        this.activeAction = nextAction;
    }

    update(deltaTime, terrainMesh) {
        if (this.isDead) return;

        // 1. Mise à jour de l'animation
        if (this.mixer) this.mixer.update(deltaTime);

        // 2. Physique
        this.updateHeight(terrainMesh);
        this.rifle.update(deltaTime);

        // 3. Gestion des États -> Animations
        // On détermine quelle animation jouer selon l'état
        if (this.state === 'MOVING' || this.state === 'CHARGING') {
            this.fadeToAction('Run');
        } 
        else if (this.state === 'BUILDING') {
            this.fadeToAction('Dig'); 
        } 
        else if (this.state === 'COMBAT' || (this.state === 'DEFENDING' && this.targetEnemy)) {
            this.fadeToAction('Shoot');
        } 
        else {
            this.fadeToAction('Idle');
        }

        // 4. Logique Comportementale
        if (this.state === 'CHARGING') {
            this.behaviorCharge(deltaTime);
            return;
        }
        if (this.state !== 'CHARGING' && this.state !== 'COMBAT') {
            this.scanForThreats();
        }

        switch (this.state) {
            case 'IDLE':      this.behaviorIdle(); break;
            case 'MOVING':    this.behaviorMove(deltaTime); break;
            case 'BUILDING':  this.behaviorBuild(deltaTime); break;
            case 'DEFENDING': this.behaviorDefend(deltaTime); break;
            case 'COMBAT':    this.behaviorCombat(deltaTime); break;
        }
    }

    // Vérifie s'il y a des ennemis proches
    scanForThreats() {
        // On ne scanne pas à chaque frame pour les perfs (1 fois tous les 0.2s)
        if (Math.random() > 0.2) return;

        // Si on a déjà une cible vivante et proche, on reste concentré dessus
        if (this.targetEnemy && !this.targetEnemy.isDead) {
            const dist = this.mesh.position.distanceTo(this.targetEnemy.mesh.position);
            if (dist < this.combatRange) {
                // Si on était en train de construire ou marcher, on arrête tout pour se battre
                if (this.state === 'BUILDING' || this.state === 'MOVING' || this.state === 'IDLE') {
                    this.enterCombatMode();
                }
                return;
            }
        }

        // Sinon on cherche le plus proche
        const nearest = this.unitSystem.getNearestEnemy(this);
        if (nearest) {
            const dist = this.mesh.position.distanceTo(nearest.mesh.position);
            if (dist < this.combatRange) {
                this.targetEnemy = nearest;
                // Si on est à découvert (pas DEFENDING), on passe en COMBAT
                if (this.state !== 'DEFENDING') {
                    this.enterCombatMode();
                }
            }
        }
    }

    enterCombatMode() {
        console.log("Ennemi en vue ! J'arrête de travailler !");
        
        // On lâche le chantier actuel
        if (this.currentTask && this.currentTask.type === 'BUILD') {
            this.currentTask.target.removeBuilder(this);
        }
        // On lâche le poste de défense si on veut bouger (optionnel)
        // Ici on dit : COMBAT = Escarmouche à découvert
        
        this.state = 'COMBAT';
    }

    behaviorCombat(deltaTime) {
        if (!this.targetEnemy || this.targetEnemy.isDead || this.mesh.position.distanceTo(this.targetEnemy.mesh.position) > this.combatRange * 1.5) {
            this.targetEnemy = null;
            this.state = 'IDLE';
            return;
        }

        this.mesh.lookAt(this.targetEnemy.mesh.position.x, this.mesh.position.y, this.targetEnemy.mesh.position.z);
        this.rifle.shoot(this.targetEnemy);
        //si on est trop proche on recule un peu
        const dist = this.mesh.position.distanceTo(this.targetEnemy.mesh.position);
        if (dist < this.combatRange * 0.5) {
            const dir = new THREE.Vector3().subVectors(this.mesh.position, this.targetEnemy.mesh.position);
            dir.y = 0;
            dir.normalize();
            this.mesh.position.addScaledVector(dir, this.speed * deltaTime);
        }
    }
    

    behaviorIdle() {
        // Demander un travail au manager
        const manager = this.unitSystem.getManager(this.team);
        const task = manager.assignTask(this.mesh.position);

        if (task) {
            this.currentTask = task;
            
            if (task.type === 'BUILD') {
                // Tenter de s'inscrire comme constructeur
                if (task.target.addBuilder(this)) {
                    this.state = 'MOVING';
                }
            } 
            else if (task.type === 'DEFEND') {
                // Tenter de s'inscrire comme occupant
                if (task.target.addOccupant(this)) {
                    this.state = 'MOVING';
                }
            }
        } else {
            // Rien à faire ? On regarde bêtement l'ennemi
            // Ou on patrouille
        }
    }

    behaviorMove(deltaTime) {
        if (!this.currentTask) { this.state = 'IDLE'; return; }

        // On va vers le milieu de la structure
        // Astuce : cible un point aléatoire autour du centre pour éviter que les soldats se superposent
        const targetPos = this.currentTask.target.startPos.clone(); 
        
        const dist = this.mesh.position.distanceTo(targetPos);

        if (dist < 2.0) {
            // Arrivé !
            if (this.currentTask.type === 'BUILD') {
                this.state = 'BUILDING';
            } else {
                this.state = 'DEFENDING';
            }
        } else {
            this.moveTo(targetPos, deltaTime);
        }
    }

    behaviorBuild(deltaTime) {
        const structure = this.currentTask?.target;
        if (!structure || structure.isFinished) {
            if (structure) structure.removeBuilder(this);
            this.currentTask = null;
            this.state = 'IDLE';
            return;
        }
        
        // On tourne le perso pour faire face au chantier si nécessaire (optionnel)
        
        this.digTimer = (this.digTimer || 0) + deltaTime;
        if (this.digTimer > 0.1) {
            const speed = structure.type === 'BUNKER' ? 0.01 : 0.05; 
            structure.dig(speed);
            this.digTimer = 0;
        }
    }

behaviorDefend(deltaTime) {
    // Tirer depuis la tranchée
    if (this.targetEnemy && !this.targetEnemy.isDead) {
         const dist = this.mesh.position.distanceTo(this.targetEnemy.mesh.position);
         if(dist < 60) {
             this.mesh.lookAt(this.targetEnemy.mesh.position.x, this.mesh.position.y, this.targetEnemy.mesh.position.z);
             this.rifle.shoot(this.targetEnemy);
         }
    } else {
         const lookDir = (this.team === 0) ? 1 : -1; 
         this.mesh.lookAt(this.mesh.position.x + lookDir * 100, this.mesh.position.y, 0);
    }

    this.jobCheckTimer = (this.jobCheckTimer || 0) + deltaTime;
    
    if (this.jobCheckTimer > 1.0) {
        this.jobCheckTimer = 0;
        
        const manager = this.unitSystem.getManager(this.team);
        const newTask = manager.assignTask(this.mesh.position);

        if (newTask) {
            // ✅ PRIORITÉ 1 : CONSTRUIRE (même en combat)
            if (newTask.type === 'BUILD') {
                this.leaveTrenchAndGo(newTask);
                return;
            }

            // ✅ PRIORITÉ 2 : DÉFENDRE MIEUX (seulement si pas de combat proche)
            if (newTask.type === 'DEFEND') {
                // Si je tire sur un ennemi proche, je ne bouge pas
                if (this.targetEnemy && !this.targetEnemy.isDead && 
                    this.mesh.position.distanceTo(this.targetEnemy.mesh.position) < 30) {
                    return; // ⚠️ Maintenant c'est après avoir vérifié BUILD
                }

                const currentX = this.assignedTrench ? this.assignedTrench.startPos.x : this.mesh.position.x;
                const newX = newTask.target.startPos.x;
                const frontDir = (this.team === 0) ? 1 : -1;

                if ((newX - currentX) * frontDir > 10) {
                    this.leaveTrenchAndGo(newTask);
                    return;
                }
            }
        }
    }}


// Petite fonction utilitaire pour éviter de dupliquer le code
leaveTrenchAndGo(task) {
    // Sortir proprement de la tranchée actuelle
    if (this.assignedTrench) {
        this.assignedTrench.removeOccupant(this);
        this.assignedTrench = null;
    }

    // Accepter la nouvelle mission
    this.currentTask = task;
    if (task.type === 'BUILD') task.target.addBuilder(this);
    else task.target.addOccupant(this); // DEFEND

    this.state = 'MOVING';
}

// --- LA CHARGE ---
startCharge() {
    // Appelé directement par le Manager
    this.state = 'CHARGING';
    this.currentTask = null; // On oublie le chantier
    this.speed *= 1.5; 
}

behaviorCharge(deltaTime) {
    // Trouver l'ennemi le plus proche
    let target = this.unitSystem.getNearestEnemy(this);
    
    if (target) {
        const dist = this.mesh.position.distanceTo(target.mesh.position);
        
        // Si loin, on court
        if (dist > 2.0) {
            this.moveTo(target.mesh.position, deltaTime);
        }
        // Tirer en courant
        if (dist < 50) this.rifle.shoot(target);
    } else {
        // Si plus d'ennemi, on court vers le camp adverse
        const enemyCampX = (this.team === 0) ? 100 : -100;
        this.moveTo(new THREE.Vector3(enemyCampX, 0, this.mesh.position.z), deltaTime);
    }
}

// --- OUTILS ---
moveTo(targetPos, deltaTime) {
    const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
    dir.y = 0; 
    dir.normalize();
    this.mesh.position.addScaledVector(dir, this.speed * deltaTime);
    this.mesh.lookAt(targetPos.x, this.mesh.position.y, targetPos.z);
}

updateHeight(terrainMesh) {
        const origin = this.mesh.position.clone();
        origin.y += 30;
        this.raycaster.set(origin, this.downVector);
        const intersects = this.raycaster.intersectObject(terrainMesh);
        if (intersects.length > 0) {
            this.mesh.position.y = intersects[0].point.y;
        }
    }
takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            // Animation de mort ? Si tu en as une, joue-la : this.fadeToAction('Die');
            // Sinon on fait simple :
            this.fadeToAction('Idle'); // Stop run
            this.mesh.rotation.x = -Math.PI/2; 
            this.mesh.position.y -= 0.2;
            
            // On peut arrêter le mixer pour figer la pose
            // this.mixer.stopAllAction();
            
            if (this.assignedTrench) this.assignedTrench.removeOccupant(this);
        }
    }
}

export default Unit;