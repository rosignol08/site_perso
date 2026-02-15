import * as THREE from 'three';

class Trench {
    constructor(scene, terrain, startPos, direction, type = 'TRENCH') {
        this.scene = scene;
        this.terrain = terrain;
        this.type = type;
        
        if (this.type === 'BUNKER') {
            this.occupancyMax = 2; // Combien de tireurs une fois fini
            this.builderMax = 4;   // Combien de constructeurs en même temps
            this.length = 8;
            this.width = 4;
            this.depthMax = 4.0;
        } else {
            this.occupancyMax = 3;
            this.builderMax = 2; // 2 soldats peuvent creuser une tranchée ensemble
            this.length = 5;
            this.width = 2.5;
            this.depthMax = 2.0;
        }

        this.startPos = startPos.clone();
        this.endPos = startPos.clone().add(direction.clone().normalize().multiplyScalar(this.length));
        
        this.occupants = []; // Ceux qui défendent
        this.builders = [];  // Ceux qui construisent
        
        this.progress = 0;
        this.isFinished = false;

        this.createVisuals(); // Visuel fantôme (transparent) au début
    }

    createVisuals() {
        if(this.mesh) this.scene.remove(this.mesh);
        
        const center = new THREE.Vector3().lerpVectors(this.startPos, this.endPos, 0.5);
        let geo, mat;

        if (this.type === 'BUNKER') {
            geo = new THREE.BoxGeometry(this.width + 1, 0.5, this.length + 1);
            mat = new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
            this.mesh = new THREE.Mesh(geo, mat);
            this.mesh.position.copy(center);
            this.mesh.position.y = 1.0; 
        } else {
            geo = new THREE.BoxGeometry(0.4, 0.3, this.length);
            mat = new THREE.MeshStandardMaterial({ color: 0xC2B280, transparent: true, opacity: 0.5 });
            this.mesh = new THREE.Mesh(geo, mat);
            this.mesh.position.copy(center);
            this.mesh.position.y = 0.15;
            // Décalage latéral
            const offset = new THREE.Vector3(0,0,1.5).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), this.endPos.clone().sub(this.startPos).normalize()));
           // this.mesh.position.add(offset); // Simplifié pour éviter bugs de rotation
        }
        
        this.mesh.lookAt(this.endPos);
        this.scene.add(this.mesh);
    }

    // Est-ce qu'on a besoin de main d'oeuvre ?
    needsBuilders() {
        return !this.isFinished && this.builders.length < this.builderMax;
    }

    addBuilder(unit) {
        if (this.needsBuilders()) {
            this.builders.push(unit);
            return true;
        }
        return false;
    }

    removeBuilder(unit) {
        const idx = this.builders.indexOf(unit);
        if (idx > -1) this.builders.splice(idx, 1);
    }

    // Est-ce qu'il y a de la place pour se planquer ?
    isFull() {
        return this.occupants.length >= this.occupancyMax;
    }

    addOccupant(unit) {
        if (!this.isFull()) {
            this.occupants.push(unit);
            return true;
        }
        return false;
    }
    removeOccupant(unit) {
        const idx = this.occupants.indexOf(unit);
        if (idx > -1) this.occupants.splice(idx, 1);
    }
    dig(amount) {
        if (this.isFinished) return;

        // La vitesse dépend du nombre de constructeurs !
        // amount est la force d'UN soldat.
        this.progress += amount;
        
        // Mise à jour visuelle (l'opacité augmente quand on construit)
        if (this.mesh.material.opacity < 1) {
            this.mesh.material.opacity = 0.5 + (this.progress * 0.5);
        }

        if (this.progress >= 1.0) {
            this.progress = 1.0;
            this.isFinished = true;
            this.mesh.material.opacity = 1.0;
            this.mesh.material.transparent = false;
            // On vire les builders (ils vont chercher une nouvelle tâche ou défendre ici)
            this.builders = []; 
        }

        const currentDepth = this.depthMax * this.progress;
        this.terrain.applyTrench(this.startPos, this.endPos, this.width, currentDepth);
    }
}

export default Trench;