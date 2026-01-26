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
        this.rifle = new Rifle(scene, this);

        // --- VISUEL ---
        this.mesh = new THREE.Group();
        const color = team === 0 ? 0x0000FF : 0xFF0000;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.7, 8), new THREE.MeshStandardMaterial({ color: color }));
        body.position.y = 0.85;
        body.castShadow = true;
        this.mesh.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        head.position.y = 1.9;
        this.mesh.add(head);
        this.mesh.position.copy(startPosition);
        scene.add(this.mesh);

        // --- LOGIQUE ---
        this.speed = 7.0 + Math.random(); 
        this.state = 'IDLE'; 
        
        this.currentTask = null; // { type: 'BUILD'|'DEFEND', target: Trench }
        
        this.raycaster = new THREE.Raycaster();
        this.raycaster.firstHitOnly = true; 
        this.downVector = new THREE.Vector3(0, -1, 0);
    }

    update(deltaTime, terrainMesh) {
        if (this.isDead) return;

        this.updateHeight(terrainMesh);
        this.rifle.update(deltaTime);

        // Priorité absolue : Si je suis en CHARGING, je fonce
        if (this.state === 'CHARGING') {
            this.behaviorCharge(deltaTime);
            return;
        }

        switch (this.state) {
            case 'IDLE':
                this.behaviorIdle();
                break;
            case 'MOVING':
                this.behaviorMove(deltaTime);
                break;
            case 'BUILDING':
                this.behaviorBuild(deltaTime);
                break;
            case 'DEFENDING':
                this.behaviorDefend(deltaTime);
                break;
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
        
        // Si pas de structure ou si elle est finie
        if (!structure || structure.isFinished) {
            // 1. On démissionne du poste de constructeur actuel
            if (structure) structure.removeBuilder(this);
            
            // 2. IMPORTANT : On oublie la tâche et on repasse en IDLE
            // Cela va forcer le 'update' suivant à relancer behaviorIdle()
            // qui va appeler manager.assignTask() et trouver le prochain chantier !
            this.currentTask = null;
            this.state = 'IDLE';
            return;
        }

        // Animation
        this.mesh.rotation.y += deltaTime * 5;
        
        // Optimisation pelle
        this.digTimer = (this.digTimer || 0) + deltaTime;
        if (this.digTimer > 0.1) {
            const speed = structure.type === 'BUNKER' ? 0.01 : 0.05; 
            structure.dig(speed);
            this.digTimer = 0;
        }
    }

    behaviorDefend(deltaTime) {
        // Regarder vers l'ennemi
        const lookDir = (this.team === 0) ? 1 : -1; 
        this.mesh.lookAt(this.mesh.position.x + lookDir * 100, this.mesh.position.y, 0);

        // --- NOUVEAU : Check périodique pour du travail ---
        this.jobCheckTimer = (this.jobCheckTimer || 0) + deltaTime;
        
        // Toutes les 2 secondes, on vérifie si on est plus utile ailleurs
        if (this.jobCheckTimer > 2.0) {
            this.jobCheckTimer = 0;
            const manager = this.unitSystem.getManager(this.team);
            
            // On demande "Y a-t-il mieux à faire ?"
            const newTask = manager.assignTask(this.mesh.position);
            
            // Si le manager propose de CONSTRUIRE alors qu'on DÉFEND
            if (newTask && newTask.type === 'BUILD') {
                // On quitte notre poste de défense
                if (this.assignedTrench) { // (assure-toi que assignedTrench est bien set quand il rentre dedans)
                     // Note: il faudrait une méthode removeOccupant dans Trench.js, sinon c'est pas grave le isFull gère
                }
                
                // On accepte la nouvelle mission
                this.currentTask = newTask;
                newTask.target.addBuilder(this); // On s'inscrit
                this.state = 'MOVING';
                return;
            }
        }
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
        origin.y += 20;
        this.raycaster.set(origin, this.downVector);
        // Grâce au BVH, ceci est ultra rapide
        const intersects = this.raycaster.intersectObject(terrainMesh);
        if (intersects.length > 0) {
            this.mesh.position.y = intersects[0].point.y;
        }
    }
    
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            this.mesh.rotation.x = -Math.PI/2; // Couché
            this.mesh.position.y -= 0.2;
            this.mesh.children.forEach(c => c.material.color.setHex(0x555555));
            
            // Libérer la place dans la tranchée si on meurt dedans
            // (À implémenter dans Trench.js : removeOccupant)
            if (this.assignedTrench) {
                this.assignedTrench.removeOccupant(this);
            }
        }
    }
}

export default Unit;