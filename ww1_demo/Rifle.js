import * as THREE from 'three';

class Rifle {
    constructor(scene, ownerUnit) {
        this.scene = scene;
        this.owner = ownerUnit;
        this.cooldown = 0;
        this.fireRate = 1.5; // Temps entre les tirs (secondes)
        this.damage = 10;
        this.range = 50; // Portée de tir
        
        // Liste des balles actives
        this.bullets = [];
        
        // Visuel simple du fusil (un bâton marron)
        const geo = new THREE.BoxGeometry(0.1, 0.1, 1.2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(0.3, 1.2, 0.4); // Position "dans les mains"
        // Attaché au soldat (seulement si le mesh existe)
        if (this.owner.mesh) {
            this.owner.mesh.add(this.mesh);
        }
    }

    update(deltaTime) {
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
        }
        
        // Mise à jour des balles
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.mesh.position.addScaledVector(bullet.direction, bullet.speed * deltaTime);
            bullet.life -= deltaTime;
            
            // Suppression si durée de vie écoulée
            if (bullet.life <= 0) {
                this.scene.remove(bullet.mesh);
                bullet.mesh.geometry.dispose();
                bullet.mesh.material.dispose();
                this.bullets.splice(i, 1);
            }
        }
    }

    shoot(targetUnit) {
        if (this.cooldown > 0) return false; // En rechargement

        // Calcul distance
        const dist = this.owner.mesh.position.distanceTo(targetUnit.mesh.position);
        if (dist > this.range) return false; // Trop loin

        // PAN !
        this.cooldown = this.fireRate;
        
        // Effet visuel (Flash jaune rapide)
        this.createMuzzleFlash();
        
        // Créer la balle visible
        this.createBullet(targetUnit);

        // Appliquer les dégâts (Probabilité de toucher selon la distance)
        const accuracy = 1 - (dist / this.range); // Plus près = plus précis
        if (Math.random() < accuracy) {
            targetUnit.takeDamage(this.damage);
            return true; // Touché
        }
        return false; // Raté
    }
    
    createBullet(targetUnit) {
        // Position de départ : bout du canon (position mondiale)
        const startPos = new THREE.Vector3();
        this.mesh.getWorldPosition(startPos);
        startPos.y += 0.1;
        
        // Direction vers la cible (avec légère imprécision)
        const targetPos = targetUnit.mesh.position.clone();
        targetPos.y += 1.0; // Viser le torse
        
        // Ajouter un peu de dispersion aléatoire
        targetPos.x += (Math.random() - 0.5) * 2;
        targetPos.y += (Math.random() - 0.5) * 1;
        targetPos.z += (Math.random() - 0.5) * 2;
        
        const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
        
        // Créer le mesh de la balle (petit cylindre allongé = tracer)
        const bulletGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
        bulletGeo.rotateX(Math.PI / 2); // Orienter le cylindre vers l'avant
        const bulletMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 }); // Jaune vif
        const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
        
        bulletMesh.position.copy(startPos);
        bulletMesh.lookAt(targetPos);
        
        this.scene.add(bulletMesh);
        
        // Ajouter à la liste des balles actives
        this.bullets.push({
            mesh: bulletMesh,
            direction: direction,
            speed: 150, // Vitesse de la balle
            life: 0.5   // Durée de vie en secondes
        });
    }

    createMuzzleFlash() {
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
        );
        flash.position.set(0, 0, 0.6); // Bout du canon
        this.mesh.add(flash);
        
        // Disparait après 50ms
        setTimeout(() => {
            this.mesh.remove(flash);
            flash.geometry.dispose();
            flash.material.dispose();
        }, 50);
    }
}

export default Rifle;