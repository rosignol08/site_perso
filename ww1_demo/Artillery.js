//pour le soldat individuel
import * as THREE from 'three';

class ArtilleryUnit {
    constructor(scene, position, artillerySystem,equipe) {
        this.gravite = -9.81;
        this.scene = scene;
        this.artillerySystem = artillerySystem;
        this.mesh = new THREE.Group();
        this.target = new THREE.Vector3();
        this.distance_max = 20000;
        this.rechargement = 5; //rechargement en secondes
        this.peut_tirer = true;
        this.equipe = equipe;
        this.vie = 100;
        this.Mort = false;
        
        // Canon de la première guerre mondiale
        const teamColor = this.team === 0 ? 0x0000FF : 0xFF0000; // Bleu vs Rouge
        // Affût (base en bois)
        const affutGeo = new THREE.BoxGeometry(1.5, 0.3, 2);
        const affutMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brun bois
        const affut = new THREE.Mesh(affutGeo, affutMat);
        affut.position.y = 0.15;
        affut.castShadow = true;
        this.mesh.add(affut);

        // Roues (2 roues latérales)
        const roueGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 12);
        const roueMat = new THREE.MeshStandardMaterial({ color: 0x2F4F4F }); // Gris foncé métal
        
        const roueGauche = new THREE.Mesh(roueGeo, roueMat);
        roueGauche.rotation.z = Math.PI / 2;
        roueGauche.position.set(-0.8, 0.6, 0);
        roueGauche.castShadow = true;
        this.mesh.add(roueGauche);
        
        const roueDroite = new THREE.Mesh(roueGeo, roueMat);
        roueDroite.rotation.z = Math.PI / 2;
        roueDroite.position.set(0.8, 0.6, 0);
        roueDroite.castShadow = true;
        this.mesh.add(roueDroite);

        // Bouclier blindé
        const bouclierGeo = new THREE.BoxGeometry(1.8, 1.2, 0.1);
        const bouclierMat = new THREE.MeshStandardMaterial({ color: teamColor }); // Gris acier
        const bouclier = new THREE.Mesh(bouclierGeo, bouclierMat);
        bouclier.position.set(0, 1.2, 0.5);
        bouclier.castShadow = true;
        this.mesh.add(bouclier);

        // Tube du canon (long cylindre)
        const tubeGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 12);
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0x2F4F4F }); // Métal sombre
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(0, 1.2, 2);
        tube.castShadow = true;
        this.mesh.add(tube);

        // Position initiale
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        // 2. Propriétés de déplacement
        this.speed = 2 + Math.random(); // Vitesse un peu aléatoire
        this.target = null;
        
        // Outil pour détecter le sol
        this.raycaster = new THREE.Raycaster();
        this.downVector = new THREE.Vector3(0, -1, 0);
    }
    // Définit où l'unité doit se déplacer
    moveTo(vector) {
        this.destination = vector.clone();
    }

    fire(startPos, targetPos) {
        
        const dispersion = 5; 
        const noisyTarget = targetPos.clone();
        noisyTarget.x += (Math.random() - 0.5) * dispersion;
        noisyTarget.z += (Math.random() - 0.5) * dispersion;

        const geometry = new THREE.SphereGeometry(15, 32, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const obus = new THREE.Mesh(geometry, material);
        obus.position.copy(startPos);
        obus.position.y += 1.5; //pour qu'il sorte du canon et pas du sol
        
        // Calculer vélocité initiale
        const dx = noisyTarget.x - startPos.x;
        const dz = noisyTarget.z - startPos.z;
        const distance_horizontale = Math.sqrt(dx * dx + dz * dz);
        
        const angle = 45 * (Math.PI / 180);
        const vitesse_initiale = Math.sqrt((distance_horizontale * Math.abs(this.gravite)) / Math.sin(2 * angle));
        
        const vitesse_horizontale = vitesse_initiale * Math.cos(angle);
        
        // Stocker la vélocité AVEC l'obus
        obus.velocity = {
          x: vitesse_horizontale * (dx / distance_horizontale),
          y: vitesse_initiale * Math.sin(angle),
          z: vitesse_horizontale * (dz / distance_horizontale)
        };
        
        // Envoyer l'obus à l'ArtillerySystem pour gestion centralisée
        this.artillerySystem.addShell(obus);
    }

    setTarget(targetVector) {
        this.target = targetVector.clone();
    }

    update(deltaTime, terrainMesh) {
        if (this.Mort) return;
        //console.log("debug");
        this.updateHeightOnTerrain(terrainMesh);
        if (!this.target) return;
        // 2. Gestion du Déplacement (Si on a une destination)
        if (this.destination) {
            const direction = new THREE.Vector3().subVectors(this.destination, this.mesh.position);
            direction.y = 0; // On reste à plat

            if (direction.length() > 1) {
                direction.normalize();
                this.mesh.position.addScaledVector(direction, this.speed * deltaTime);
                this.mesh.lookAt(this.destination.x, this.mesh.position.y, this.destination.z);
            } else {
                this.destination = null; // Arrivé !
            }
        }
        // 3. Gestion du Combat (Si on n'a pas de destination, on cherche à tirer)
        if (!this.destination) {
            this.rechargement -= deltaTime;

            // Si on a une cible et qu'on peut tirer
            if (this.targetUnit && !this.targetUnit.isDead && this.rechargement <= 0) {
                // On se tourne vers l'ennemi
                this.mesh.lookAt(this.targetUnit.mesh.position.x, this.mesh.position.y, this.targetUnit.mesh.position.z);
                
                // FEU !
                this.fire(this.mesh.position, this.targetUnit.mesh.position);
                this.rechargement = this.tempsEntreTirs;
            }
        }
    

        //direction.normalize();
        //// 2. Avancer
        //this.mesh.position.addScaledVector(direction, this.speed * deltaTime);
        //// 3. Regarder la cible
        //this.mesh.lookAt(this.target.x, this.mesh.position.y, this.target.z);

        // --- B. Gestion de la Hauteur (Y) ---
        
        
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
        }
    }
    takeDamage(amount) {
        this.hp -= amount;
        // Petit effet visuel : Flash rouge (optionnel)
        this.mesh.children.forEach(c => c.material.color.setHex(0xFFFFFF));
        setTimeout(() => {
             // Remettre la couleur d'origine est complexe ici, simplifions :
             // Si mort -> Noir
             if(this.hp <= 0) this.die();
        }, 100);

        if (this.hp <= 0) this.die();
    }

    die() {
        if(this.isDead) return;
        this.isDead = true;
        console.log("Unité détruite !");
        
        // L'unité devient noire et fume (ou disparait)
        this.mesh.children.forEach(c => c.material.color.setHex(0x222222));
        this.mesh.rotation.x = 0.5; // Le canon penche
        this.mesh.rotation.z = 0.2;
        
        // On demande au système de nous supprimer de la liste active
        // (Géré dans le système plus tard)
    }
}

export default ArtilleryUnit;