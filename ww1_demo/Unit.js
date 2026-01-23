//pour le soldat individuel
import * as THREE from 'three';

class Unit {
    constructor(scene, startPosition) {
        this.scene = scene;
        
        // 1. Création visuelle (Groupe : Corps + Tête)
        this.mesh = new THREE.Group();
        
        // Corps (Cylindre gris/kaki)
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x556B2F }); // Olive Drab
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9; // Pour que le pivot soit aux pieds
        body.castShadow = true;
        this.mesh.add(body);

        // Tête (Sphère simple)
        const headGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Casque foncé
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2;
        this.mesh.add(head);

        // Position initiale
        this.mesh.position.copy(startPosition);
        scene.add(this.mesh);

        // 2. Propriétés de déplacement
        this.speed = 2 + Math.random(); // Vitesse un peu aléatoire
        this.target = null;
        
        // Outil pour détecter le sol
        this.raycaster = new THREE.Raycaster();
        this.downVector = new THREE.Vector3(0, -1, 0);
    }

    setTarget(targetVector) {
        this.target = targetVector.clone();
    }

    update(deltaTime, terrainMesh) {
        if (!this.target) return;

        // --- A. Déplacement Horizontal (X, Z) ---
        
        // 1. Calculer la direction vers la cible
        const direction = new THREE.Vector3()
            .subVectors(this.target, this.mesh.position);
        
        // On ignore la hauteur pour le calcul de direction (on veut juste avancer en X/Z)
        direction.y = 0; 
        
        // Si on est proche de la cible (ex: < 1m), on s'arrête
        if (direction.length() < 1) {
            this.target = null;
            return; // Arrivé
        }

        direction.normalize();

        // 2. Avancer
        this.mesh.position.addScaledVector(direction, this.speed * deltaTime);

        // 3. Regarder la cible
        this.mesh.lookAt(this.target.x, this.mesh.position.y, this.target.z);


        // --- B. Gestion de la Hauteur (Y) ---
        
        this.updateHeightOnTerrain(terrainMesh);
        // Dans Unit.js
        this.walkTime = 0; // Dans constructor
            
        // Dans update()
        this.walkTime += deltaTime * this.speed * 10;
        // Petit sautillement sur Y + rotation légère sur Z
        this.mesh.children[0].position.y = 0.9 + Math.sin(this.walkTime) * 0.1; 
        this.mesh.rotation.z = Math.sin(this.walkTime) * 0.05;
    }

    updateHeightOnTerrain(terrainMesh) {
        // On lance le rayon depuis "haut" (position actuelle + 20 mètres) vers le bas
        const rayOrigin = this.mesh.position.clone();
        rayOrigin.y += 20; 

        this.raycaster.set(rayOrigin, this.downVector);

        // On teste l'intersection avec le mesh du terrain
        const intersects = this.raycaster.intersectObject(terrainMesh);

        if (intersects.length > 0) {
            // Le point d'impact est la surface du sol
            // On place le soldat exactement là
            this.mesh.position.y = intersects[0].point.y;
            
            // TODO plus tard: Orienter le soldat selon la pente (intersects[0].face.normal)
        }
    }
}

export default Unit;