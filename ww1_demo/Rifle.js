import * as THREE from 'three';

class Rifle {
    constructor(scene, ownerUnit) {
        this.scene = scene;
        this.owner = ownerUnit;
        this.cooldown = 0;
        this.fireRate = 1.5; // Temps entre les tirs (secondes)
        this.damage = 10;
        this.range = 50; // Portée de tir
        
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

        // Appliquer les dégâts (Probabilité de toucher selon la distance)
        const accuracy = 1 - (dist / this.range); // Plus près = plus précis
        if (Math.random() < accuracy) {
            targetUnit.takeDamage(this.damage);
            return true; // Touché
        }
        return false; // Raté
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