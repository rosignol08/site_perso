import * as THREE from 'three';
import Rifle from './Rifle.js';
import { assetManager } from './AssetManager.js';

class Unit {
    constructor(scene, startPosition, team, unitSystem, role = 'RIFLEMAN') {
        this.scene = scene;
        this.unitSystem = unitSystem;
        this.team = team; 
        this.role = role; // 'RIFLEMAN', 'ENGINEER', ou 'MELEE'
        
        const manager = this.unitSystem.getManager(this.team);
        manager.registerSoldier(this);

        this.hp = 100;
        this.isDead = false;
        this.hasSeenCombat = false; 

       // --- VISUEL 3D & COULEURS ---
        const asset = assetManager.getSoldierInstance();
        this.mesh = asset.mesh;
        
        const baseColor = team === 0 ? 0x0000FF : 0xFF0000;
        let finalColor = new THREE.Color(baseColor);

        // Teinture selon le rôle
        if (this.role === 'ENGINEER') {
            finalColor.lerp(new THREE.Color(0xFFFF00), 0.4); // Teinte jaune
        } else if (this.role === 'MELEE') {
            finalColor.lerp(new THREE.Color(0x000000), 0.7); // Très sombre
        }

        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.color.copy(finalColor);
            }
        });

        this.mesh.position.copy(startPosition);
        scene.add(this.mesh);
        
        // --- ANIMATIONS ---
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.actions = {}; 
        asset.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            this.actions[clip.name] = action;
        });

        this.activeAction = this.actions['Idle'];
        if(this.activeAction) this.activeAction.play();

        // --- STATS SELON LE RÔLE ---
        this.rifle = new Rifle(scene, this); 
        
        if (this.role === 'MELEE') {
            this.speed = 6.5 + Math.random() * 2; // Très rapide
            this.combatRange = 4; // Attaque de contact
        } else if (this.role === 'ENGINEER') {
            this.speed = 4.0 + Math.random();
            this.combatRange = 40; 
        } else {
            // RIFLEMAN (Classique)
            this.speed = 4.0 + Math.random();
            this.combatRange = 50; 
        }
        
        this.state = 'IDLE';
        this.maxSlopeAngle = 90; 
        this.targetEnemy = null;
        
        // --- SYSTEME DE CONSTRUCTION ---
        this.currentFortif = null;  
        this.buildCheckTimer = 0;   
        this.BUILD_CHECK_INTERVAL = 2; 
        this.targetPosition = null; 
        
        // --- PHYSIQUE ---
        this.raycaster = new THREE.Raycaster();
        this.raycaster.firstHitOnly = true; 
        this.downVector = new THREE.Vector3(0, -1, 0);
        this.lastPos = startPosition.clone();
        this.stuckTimer = 0;
        this.stuckThreshold = 1.5; 
    }

    fadeToAction(name, duration = 0.2) {
        const nextAction = this.actions[name];
        if (!nextAction || this.activeAction === nextAction) return;
        nextAction.reset();
        nextAction.setEffectiveTimeScale(1);
        nextAction.setEffectiveWeight(1);
        nextAction.crossFadeFrom(this.activeAction, duration, true);
        nextAction.play();
        this.activeAction = nextAction;
    }

    update(deltaTime, terrainMesh) {
        if (this.isDead) return;
        this.buildCheckTimer += deltaTime; 

        if (this.mixer) this.mixer.update(deltaTime);
        this.updateHeight(terrainMesh);
        this.rifle.update(deltaTime);

        // Gestion Animations
        if (this.state === 'MOVING' || this.state === 'CHARGING') {
            this.fadeToAction('Run');
        } 
        else if (this.state === 'BUILDING') {
            if (this.targetPosition && this.mesh.position.distanceTo(this.targetPosition) > 1.5) {
                this.fadeToAction('Run');
            } else {
                this.fadeToAction('Dig'); 
            }
        } 
        else if (this.state === 'COMBAT' || (this.state === 'DEFENDING' && this.targetEnemy)) {
            this.fadeToAction('Shoot'); // Remarque: le corps à corps utilise l'anim Shoot pour l'instant
        } 
        else {
            this.fadeToAction('Idle');
        }

        if (this.state === 'CHARGING') {
            this.behaviorCharge(deltaTime);
            return;
        }
        if (this.state !== 'CHARGING' && this.state !== 'COMBAT') {
            this.scanForThreats();
        }

        switch (this.state) {
            case 'IDLE':      this.behaviorIdle(deltaTime); break;
            case 'MOVING':    this.behaviorMove(deltaTime); break;
            case 'BUILDING':  this.behaviorBuild(deltaTime); break;
            case 'DEFENDING': this.behaviorDefend(deltaTime); break;
            case 'COMBAT':    this.behaviorCombat(deltaTime); break;
        }
    }

    scanForThreats() {
        if (Math.random() > 0.2) return;

        const nearest = this.unitSystem.getNearestEnemy(this);
        if (nearest) {
            const dist = this.mesh.position.distanceTo(nearest.mesh.position);
            
            // L'Assaut "voit" la cible de loin (80m) pour courir dessus
            const aggroRange = (this.role === 'MELEE') ? 80 : this.combatRange;

            if (dist < aggroRange) {
                this.targetEnemy = nearest;
                if (this.state !== 'COMBAT') {
                    // Si on est défensif, seul le MELEE ose sortir pour attaquer de loin
                    if (this.state !== 'DEFENDING' || this.role === 'MELEE') {
                        this.enterCombatMode();
                    }
                }
            }
        }
    }

    enterCombatMode() {
        if (this.currentFortif) {
            this.currentFortif.removeBuilder(this);
            this.currentFortif.removeOccupant(this);
            this.currentFortif = null;
        }
        this.hasSeenCombat = true; 
        this.state = 'COMBAT';
    }

    behaviorCombat(deltaTime) {
        if (!this.targetEnemy || this.targetEnemy.isDead || this.mesh.position.distanceTo(this.targetEnemy.mesh.position) > 120) {
            this.targetEnemy = null;
            this.state = 'IDLE'; 
            return;
        }

        this.mesh.lookAt(this.targetEnemy.mesh.position.x, this.mesh.position.y, this.targetEnemy.mesh.position.z);
        const dist = this.mesh.position.distanceTo(this.targetEnemy.mesh.position);

        if (this.role === 'MELEE') {
            if (dist > this.combatRange) {
                this.moveTo(this.targetEnemy.mesh.position, deltaTime); // Sprint
            } else {
                this.rifle.shoot(this.targetEnemy); // "Coup de couteau"
            }
        } else {
            this.rifle.shoot(this.targetEnemy);
            // Les tireurs reculent s'ils sont trop approchés
            if (dist < this.combatRange * 0.4) {
                const dir = new THREE.Vector3().subVectors(this.mesh.position, this.targetEnemy.mesh.position);
                dir.y = 0; dir.normalize();
                this.mesh.position.addScaledVector(dir, this.speed * deltaTime);
            }
        }
    }
behaviorIdle(deltaTime) {
        const manager = this.unitSystem.getManager(this.team);

        // ==========================================
        // 1. INGÉNIEUR (Priorité Bâtisseur)
        // ==========================================
        if (this.role === 'ENGINEER') {
            // A. Aider un copain sur un chantier
            const chantier = manager.findActiveChantier();
            if (chantier && chantier.addBuilder(this)) {
                this.currentFortif = chantier;
                this.state = 'BUILDING';
                this.setDestination(chantier.getBuildPosition(this));
                return;
            }

            // B. Créer une extension ou bâtir au front
            if (this.buildCheckTimer >= this.BUILD_CHECK_INTERVAL) {
                this.buildCheckTimer = 0; // On reset le chrono
                
                let fortif = manager.requestExtension(this);
                
                // Si aucune extension n'est possible, on bâtit une nouvelle ligne SI on est au front
                const isNearFront = Math.abs(this.mesh.position.x) < 40;
                if (!fortif && isNearFront && manager.canIBuild(this)) {
                    fortif = manager.requestBuild(this);
                }

                if (fortif) {
                    fortif.addBuilder(this);
                    this.currentFortif = fortif;
                    this.state = 'BUILDING';
                    this.setDestination(fortif.getBuildPosition(this));
                    return;
                }
            }
            
            // C. Rôde prudemment (avance vers le front)
            const frontDir = (this.team === 0) ? 1 : -1;
            this.setDestination(new THREE.Vector3(this.mesh.position.x + frontDir * 10, 0, this.mesh.position.z + (Math.random() - 0.5)*15));
            this.state = 'MOVING';
            return;
        }

        // ==========================================
        // 2. CORPS À CORPS (Priorité Assaut)
        // ==========================================
        if (this.role === 'MELEE') {
            const enemyManager = this.unitSystem.getManager(this.team === 0 ? 1 : 0);
            const targetTrench = enemyManager.findCoverNearby(this.mesh.position, 100);
            
            if (targetTrench) {
                this.setDestination(targetTrench.position);
            } else {
                const frontDir = (this.team === 0) ? 1 : -1;
                this.setDestination(new THREE.Vector3(this.mesh.position.x + frontDir * 30, 0, this.mesh.position.z));
            }
            this.state = 'MOVING';
            return;
        }

        // ==========================================
        // 3. SOLDAT CLASSIQUE (Priorité Fusilier)
        // ==========================================
        const cover = manager.findCoverNearby(this.mesh.position, 25); 
        if (cover && cover.addOccupant(this)) {
            this.currentFortif = cover;
            this.state = 'DEFENDING';
            return;
        }

        if (this.buildCheckTimer >= this.BUILD_CHECK_INTERVAL) {
            this.buildCheckTimer = 0;
            const isNearFront = Math.abs(this.mesh.position.x) < 40; 
            
            if ((this.hasSeenCombat || isNearFront) && manager.canIBuild(this)) {
                const fortif = manager.requestBuild(this);
                if (fortif) {
                    fortif.addBuilder(this);
                    this.currentFortif = fortif;
                    this.state = 'BUILDING';
                    this.setDestination(fortif.getBuildPosition(this));
                    return;
                }
            }
        }

        const frontDir = (this.team === 0) ? 1 : -1;
        const targetX = this.mesh.position.x + frontDir * (15 + Math.random() * 10);
        const targetZ = this.mesh.position.z + (Math.random() - 0.5) * 15; 
        this.setDestination(new THREE.Vector3(targetX, 0, targetZ));
        this.state = 'MOVING';
    }

    behaviorMove(deltaTime) {
        if (!this.targetPosition) { this.state = 'IDLE'; return; }
        const dist2D = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z)
            .distanceTo(new THREE.Vector2(this.targetPosition.x, this.targetPosition.z));

        if (dist2D < 1.5 || this.stuckTimer > 2.0) {
            this.state = 'IDLE';
            this.targetPosition = null;
            this.stuckTimer = 0;
        } else {
            this.moveTo(this.targetPosition, deltaTime);
        }
    }

    behaviorBuild(deltaTime) {
        if (!this.currentFortif) { this.state = 'IDLE'; return; }

        const buildPos = this.currentFortif.getBuildPosition(this);
        const dist2D = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z)
            .distanceTo(new THREE.Vector2(buildPos.x, buildPos.z));

        if (dist2D > 1.5) {
            this.moveTo(buildPos, deltaTime); 
            return;
        }

        if (!this.currentFortif.isFinished) {
            this.currentFortif.dig(0.04 * deltaTime);
        } else {
            this.currentFortif.removeBuilder(this);
            // Les ingénieurs ne restent pas forcément défendre, ils vont construire ailleurs
            if (this.role !== 'ENGINEER' && this.currentFortif.addOccupant(this)) {
                this.state = 'DEFENDING';
            } else {
                this.currentFortif = null;
                this.state = 'IDLE';
            }
        }
    }

    behaviorDefend(deltaTime) {
        if (!this.currentFortif || !this.currentFortif.isFinished) {
            if (this.currentFortif) this.currentFortif.removeOccupant(this);
            this.currentFortif = null;
            this.state = 'IDLE';
            return;
        }

        const slotPos = this.currentFortif.getSlotPosition(this);
        const slotType = this.currentFortif.getSlotType(this); // 'COMBAT' ou 'REST'

        const dist2D = new THREE.Vector2(this.mesh.position.x, this.mesh.position.z)
            .distanceTo(new THREE.Vector2(slotPos.x, slotPos.z));
        
        if (dist2D > 1.0) {
            this.moveTo(slotPos, deltaTime); 
        } else {
            // Arrivé à sa place dans la tranchée !
            if (slotType === 'REST') {
                // Dans la zone de circulation : on s'accroupit ou on reste inactif pour laisser tirer les copains
                this.fadeToAction('Idle');
                const lookDir = (this.team === 0) ? 1 : -1; 
                this.mesh.lookAt(this.mesh.position.x + lookDir * 10, this.mesh.position.y, this.mesh.position.z);
            } else {
                // Dans la zone COMBAT (au créneau) : On tire !
                if (this.targetEnemy && !this.targetEnemy.isDead) {
                    this.mesh.lookAt(this.targetEnemy.mesh.position.x, this.mesh.position.y, this.targetEnemy.mesh.position.z);
                    this.rifle.shoot(this.targetEnemy);
                } else {
                    const lookDir = (this.team === 0) ? 1 : -1; 
                    // On observe l'horizon bien droit
                    this.mesh.lookAt(this.mesh.position.x + lookDir * 100, this.mesh.position.y, this.mesh.position.z);
                }
            }
        }
    }

    setDestination(pos) {
        this.targetPosition = pos.clone();
    }

    startCharge() {
        if (this.currentFortif) {
            this.currentFortif.removeOccupant(this);
            this.currentFortif.removeBuilder(this);
            this.currentFortif = null;
        }
        this.state = 'CHARGING';
        this.targetPosition = null;
        this.speed *= 1.5; 
    }

    behaviorCharge(deltaTime) {
        let target = this.unitSystem.getNearestEnemy(this);
        if (target) {
            const dist = this.mesh.position.distanceTo(target.mesh.position);
            if (dist > 2.0) this.moveTo(target.mesh.position, deltaTime);
            if (dist < 50) this.rifle.shoot(target);
        } else {
            const enemyCampX = (this.team === 0) ? 100 : -100;
            this.moveTo(new THREE.Vector3(enemyCampX, 0, this.mesh.position.z), deltaTime);
        }
    }

    moveTo(targetPos, deltaTime) {
        const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
        dir.normalize();
        
        const slopeAngle = Math.atan2(Math.abs(dir.y), Math.hypot(dir.x, dir.z)) * (180 / Math.PI);
        if (slopeAngle > this.maxSlopeAngle) dir.y *= 0.5; 
        
        dir.normalize(); 
        this.mesh.position.addScaledVector(dir, this.speed * deltaTime);
        this.mesh.lookAt(targetPos.x, this.mesh.position.y, targetPos.z);
        
        const movementDist = new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z).distanceTo(new THREE.Vector3(this.lastPos.x, 0, this.lastPos.z));
        if (movementDist < 0.01) { 
            this.stuckTimer += deltaTime;
            if (this.stuckTimer > this.stuckThreshold) {
                const pushDir = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
                pushDir.normalize();
                const perpDir = new THREE.Vector3(-pushDir.z, pushDir.y, pushDir.x);
                const forceDir = (this.stuckTimer % 2) > 1 ? pushDir : perpDir;
                
                this.mesh.position.addScaledVector(forceDir, 0.8);
                this.stuckTimer = 0; 
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastPos.copy(this.mesh.position);
    }

    updateHeight(terrainMesh) {
        const raycastRadius = 3.5; 
        const numRays = 2; 
        const heights = [];
        
        for (let i = 0; i < numRays; i++) {
            let origin = this.mesh.position.clone();
            if (i > 0) {
                const angle = (i - 1) * (Math.PI * 2 / 4);
                origin.x += Math.cos(angle) * raycastRadius;
                origin.z += Math.sin(angle) * raycastRadius;
            }
            origin.y += 30;
            this.raycaster.set(origin, this.downVector);
            const intersects = this.raycaster.intersectObject(terrainMesh);
            if (intersects.length > 0) heights.push(intersects[0].point.y);
        }
        
        if (heights.length > 0) {
            heights.sort((a, b) => a - b);
            const medianHeight = heights[Math.floor(heights.length / 2)];
            this.mesh.position.y += (medianHeight - this.mesh.position.y) * 0.7; 
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            this.fadeToAction('Idle'); 
            this.mesh.rotation.x = -Math.PI/2; 
            this.mesh.position.y -= 0.2;
            
            if (this.currentFortif) {
                this.currentFortif.removeOccupant(this);
                this.currentFortif.removeBuilder(this);
            }
        }
    }
}

export default Unit;