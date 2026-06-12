import * as THREE from 'three';

const TEAM_COLORS = [0x4444aa, 0xaa4444]; // Bleu, Rouge
const SANDBAG_COLOR = 0xc2a060;

class Fortification {
    // NOUVEAU: On passe startPos (point de départ précis) et un angle forcé optionnel
    constructor(scene, terrain, startPos, team, forceAngle = null) {
        this.scene   = scene;
        this.terrain = terrain;
        this.team    = team;

        this.builderMax = 2;
        this.length = 6 + Math.random() * 4;   
        this.width  = 3.2; // Un peu plus large pour avoir de la place
        this.depth  = 2.5;
        this.frontDir = (team === 0) ? 1 : -1;

        // 1. Calcul des points de départ et d'arrivée
        this.startWorld = startPos.clone();
        this.startWorld.y = 0;

        // Angle de la tranchée : si on l'impose (pour les liaisons), on l'utilise
        if (forceAngle !== null) {
            this.angle = forceAngle;
        } else {
            // Sinon on crée une base à peu près parallèle au front (axe Z) avec une variation
            const dirZ = (Math.random() > 0.5) ? 1 : -1;
            this.angle = (Math.PI / 2) * dirZ + (Math.random() - 0.5) * 0.5;
        }

        // On projette la fin de la tranchée
        const dx = Math.cos(this.angle) * this.length;
        const dz = Math.sin(this.angle) * this.length;
        this.endWorld = new THREE.Vector3(this.startWorld.x + dx, 0, this.startWorld.z + dz);

        // Position centrale pour placer notre Group 3D
        this.position = new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, 0.5);

        // Group 3D principal placé au centre
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // 2. Génération des Zones (Sas de Tir & Circulation)
        this._generateSlots();

        this.progress   = 0;
        this.isFinished = false;
        this.occupants = [];
        this.builders  = [];
        this._buildPlan = [];

        this._generateBuildPlan();
        this._showGhost();
    }

    _generateSlots() {
        this.slots = [];
        const trenchDir = new THREE.Vector3().subVectors(this.endWorld, this.startWorld).normalize();
        
        // On calcule la perpendiculaire (le "mur" qui fait face à l'ennemi)
        let perp = new THREE.Vector3(-trenchDir.z, 0, trenchDir.x);
        if (perp.x * this.frontDir < 0) perp.negate(); 

        // 1 Sas de tir tous les ~3.5 mètres
        const numSas = Math.max(1, Math.floor(this.length / 3.5));
        
        for (let i = 1; i <= numSas; i++) {
            const t = i / (numSas + 1);
            const basePos = new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, t);
            
            // ZONE COMBAT (Au bord de la tranchée, côté ennemi)
            this.slots.push({
                type: 'COMBAT',
                pos: basePos.clone().add(perp.clone().multiplyScalar(this.width * 0.25)),
                occupant: null
            });
            
            // ZONE REST / CIRCULATION (Plus profond, à l'arrière)
            this.slots.push({
                type: 'REST',
                pos: basePos.clone().add(perp.clone().multiplyScalar(-this.width * 0.25)),
                occupant: null
            });
        }
        this.occupancyMax = this.slots.length;
    }

    // --- Assignation Intelligente des Places ---
    addOccupant(unit) {
        // Les ingénieurs vont au fond (REST), les autres au créneau (COMBAT)
        const targetType = (unit.role === 'ENGINEER') ? 'REST' : 'COMBAT';
        
        let emptySlot = this.slots.find(s => s.occupant === null && s.type === targetType);
        // Si le rôle préféré est plein, on prend n'importe quelle place
        if (!emptySlot) emptySlot = this.slots.find(s => s.occupant === null);

        if (emptySlot) {
            emptySlot.occupant = unit;
            this.occupants.push(unit);
            return true;
        }
        return false;
    }

    removeOccupant(unit) {
        const slot = this.slots.find(s => s.occupant === unit);
        if (slot) slot.occupant = null;
        const idx = this.occupants.indexOf(unit);
        if (idx > -1) this.occupants.splice(idx, 1);
    }

    isFull() {
        return this.occupants.length >= this.occupancyMax;
    }

    getSlotPosition(unit) {
        const slot = this.slots.find(s => s.occupant === unit);
        return slot ? slot.pos : this.position;
    }

    getSlotType(unit) {
        const slot = this.slots.find(s => s.occupant === unit);
        return slot ? slot.type : 'REST';
    }

    // --- Les Constructeurs (Pas de changement) ---
    needsBuilders() { return !this.isFinished && this.builders.length < this.builderMax; }
    addBuilder(unit) { if (this.needsBuilders()) { this.builders.push(unit); return true; } return false; }
    removeBuilder(unit) {
        const idx = this.builders.indexOf(unit);
        if (idx > -1) this.builders.splice(idx, 1);
    }
    getBuildPosition(unit) {
        const idx = this.builders.indexOf(unit);
        const t = (idx + 1) / (this.builderMax + 1);
        return new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, t);
    }

    // --- Visuels ---
    _generateBuildPlan() {
        const plan = [];
        const geo = new THREE.BoxGeometry(0.45, 0.35, 0.28);
        const mat = new THREE.MeshStandardMaterial({ color: SANDBAG_COLOR });

        const trenchDir = new THREE.Vector3().subVectors(this.endWorld, this.startWorld).normalize();
        let perp = new THREE.Vector3(-trenchDir.z, 0, trenchDir.x);
        if (perp.x * this.frontDir < 0) perp.negate();

        const count = Math.floor(this.length / 0.5);
        for(let i=0; i<count; i++) {
            const t = i / count;
            const posAlong = new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, t);
            
            // Les sacs de sable avancent pour former une alcôve devant les zones COMBAT
            let parapetDist = this.width * 0.4; // Mur droit par défaut
            for(const slot of this.slots) {
                if(slot.type === 'COMBAT' && posAlong.distanceTo(slot.pos) < 1.2) {
                    parapetDist = this.width * 0.65; // On pousse les sacs vers l'avant !
                }
            }

            // On empile 2 couches de sacs
            for(let layer=0; layer<2; layer++) {
                const bagWorldPos = posAlong.clone().add(perp.clone().multiplyScalar(parapetDist));
                const cube = new THREE.Mesh(geo, mat.clone());
                
                // Position locale par rapport au centre de la tranchée
                cube.position.copy(bagWorldPos).sub(this.position);
                cube.position.y = 0.18 + (layer * 0.35) + (Math.random()*0.05);
                cube.rotation.y = this.angle + (Math.random() - 0.5) * 0.5;
                cube.visible = false;
                cube.castShadow = true;
                this.mesh.add(cube);

                plan.push({ mesh: cube, progressThreshold: (t * 0.5) + (layer * 0.4) });
            }
        }
        this._buildPlan = plan;
    }

    _showGhost() {
        const geo = new THREE.BoxGeometry(this.length, 0.1, this.width);
        const mat = new THREE.MeshStandardMaterial({
            color: TEAM_COLORS[this.team], transparent: true, opacity: 0.25, depthWrite: false
        });
        this._ghost = new THREE.Mesh(geo, mat);
        this._ghost.position.set(0, 0.05, 0); 
        
        // CORRECTION ICI : Le fantôme doit regarder l'extrémité en coordonnées mondiales
        this._ghost.lookAt(this.endWorld);
        this.mesh.add(this._ghost);
    }

    dig(amount) {
        if (this.isFinished) return;
        this.progress = Math.min(1, this.progress + amount);

        for (const item of this._buildPlan) {
            if (!item.mesh.visible && this.progress >= item.progressThreshold) item.mesh.visible = true;
        }

        const currentDepth = this.depth * this.progress;
        this.terrain.applyTrench(this.startWorld, this.endWorld, this.width * 0.8, currentDepth);

        if (this.progress >= 1.0) this._onFinished();
    }

    _onFinished() {
        this.isFinished = true;
        this.builders = [];
        if (this._ghost) {
            this.mesh.remove(this._ghost);
            this._ghost.geometry.dispose();
            this._ghost = null;
        }
    }

    update(deltaTime) {}
}

export default Fortification;