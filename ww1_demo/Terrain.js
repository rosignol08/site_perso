import * as THREE from 'three';
// Import via CDN pour module (comme tu faisais avant)
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'https://unpkg.com/three-mesh-bvh@0.7.3/build/index.module.js';

// --- PATCH THREE.JS (Obligatoire pour que ça marche) ---
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

class Terrain {
  constructor(scene) {
    this.segments = 500; 
    this.size = 500;
    this.hasChanged = false; 

    // Compteur pour limiter les mises à jour lourdes
    this.frameCounter = 0; 

    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    
    // 1. INITIALISATION DU BVH (CRUCIAL !)
    this.geometry.computeBoundsTree();

    const material = new THREE.MeshStandardMaterial({ 
        color: 0x556B2F, 
        flatShading: true, 
        roughness: 1,
        metalness: 0
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; 
    this.mesh.receiveShadow = true; 
    this.mesh.castShadow = true;
    
    // Optimisation : On ne bouge jamais le terrain globalement
    this.mesh.matrixAutoUpdate = false; 
    this.mesh.updateMatrix(); 
    
    scene.add(this.mesh);
  }

  // --- 1. CRATÈRE ---
  applyCrater(pointImpactWorld, radius = 5) {
    const localImpact = this.mesh.worldToLocal(pointImpactWorld.clone());
    const positions = this.geometry.attributes.position;
    const maxDepth = 4;
    const segmentSize = this.size / this.segments;
    
    const centerCol = Math.floor((localImpact.x + this.size / 2) / segmentSize);
    const centerRow = Math.floor((this.size / 2 - localImpact.y) / segmentSize);
    const gridRadius = Math.ceil((radius + 2) / segmentSize);

    const minCol = Math.max(0, centerCol - gridRadius);
    const maxCol = Math.min(this.segments, centerCol + gridRadius);
    const minRow = Math.max(0, centerRow - gridRadius);
    const maxRow = Math.min(this.segments, centerRow + gridRadius);

    let moved = false;
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            const i = row * (this.segments + 1) + col;
            if (i < 0 || i >= positions.count) continue;

            const px = positions.getX(i);
            const py = positions.getY(i);
            const distSq = (px - localImpact.x)**2 + (py - localImpact.y)**2;

            if (distSq < radius * radius) {
                const dist = Math.sqrt(distSq);
                const deformation = Math.cos((dist / radius) * (Math.PI / 2)) * maxDepth;
                const currentZ = positions.getZ(i);
                positions.setZ(i, currentZ - deformation);
                moved = true;
            }
        }
    }

    if (moved) this.hasChanged = true;
  }

  // --- 2. TRANCHÉE ---
  applyTrench(startWorld, endWorld, width = 3, depthTarget = 2.5) {
    const start = this.mesh.worldToLocal(startWorld.clone());
    const end = this.mesh.worldToLocal(endWorld.clone());
    const positions = this.geometry.attributes.position;
    const segmentSize = this.size / this.segments;
    
    const minX = Math.min(start.x, end.x) - width;
    const maxX = Math.max(start.x, end.x) + width;
    const minY = Math.min(start.y, end.y) - width; 
    const maxY = Math.max(start.y, end.y) + width;

    const minCol = Math.max(0, Math.floor((minX + this.size / 2) / segmentSize));
    const maxCol = Math.min(this.segments, Math.floor((maxX + this.size / 2) / segmentSize));
    const maxRow = Math.min(this.segments, Math.floor((this.size / 2 - minY) / segmentSize));
    const minRow = Math.max(0, Math.floor((this.size / 2 - maxY) / segmentSize));

    let moved = false;
    const lineVec = new THREE.Vector2(end.x - start.x, end.y - start.y);
    const lineLenSq = lineVec.lengthSq();

    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            const i = row * (this.segments + 1) + col;
            if (i < 0 || i >= positions.count) continue;

            const px = positions.getX(i);
            const py = positions.getY(i);

            let t = ((px - start.x) * lineVec.x + (py - start.y) * lineVec.y) / lineLenSq;
            t = Math.max(0, Math.min(1, t));
            
            const closestX = start.x + t * lineVec.x;
            const closestY = start.y + t * lineVec.y;
            const distSq = (px - closestX)**2 + (py - closestY)**2;
            const dist = Math.sqrt(distSq);

            if (dist < width) {
                const targetZ = -depthTarget;
                let factor = 1 - (dist / width);
                factor = factor * factor * (3 - 2 * factor); 
                const desiredDepth = targetZ * factor;
                const currentZ = positions.getZ(i);

                if (currentZ > desiredDepth) {
                    positions.setZ(i, desiredDepth);
                    moved = true;
                }
            }
        }
    }

    if (moved) this.hasChanged = true;
  }

  update() {
      if (!this.hasChanged) return;

      // 1. Mise à jour physique (OBLIGATOIRE et RAPIDE)
      this.geometry.attributes.position.needsUpdate = true;
      
      // 2. Mise à jour du Raycasting (BVH) (OBLIGATOIRE et RAPIDE)
      // "refit" adapte la boite de collision aux nouveaux sommets sans tout recalculer
      
      this.geometry.boundsTree.refit();

      // 3. Mise à jour lumière (LOURD !!)
      // On ne le fait qu'une fois toutes les 15 frames pour garder 165 FPS
      this.frameCounter++;
      if (this.frameCounter > 15) {
          this.geometry.computeVertexNormals();
          this.frameCounter = 0;
      }
      
      this.hasChanged = false; 
  }
}

export default Terrain;