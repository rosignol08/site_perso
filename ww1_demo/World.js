import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import Terrain from './Terrain.js';
import ArtillerySystem from './ArtillerySystem.js';
import Vegetation from './Vegetation.js';
import UnitSystem from './UnitSystem.js';



const nombre_soldats_par_equipe = 100;



// 1. Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Ciel bleu
// Un peu de brouillard pour l'ambiance guerre
scene.fog = new THREE.FogExp2(0x87ceeb, 0.002); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 60); // Un peu plus haut pour bien voir

// Audio Listener (Les oreilles)
const audiolistener = new THREE.AudioListener();
camera.add(audiolistener);

// 2. Instanciation des Systèmes
const terrain = new Terrain(scene);
const vegetation = new Vegetation(scene, 3000, terrain.size); // 3000 arbres

const unitSystem = new UnitSystem(scene, terrain);

// Spawn Bleus (Equipe 0)
for(let i=0; i<nombre_soldats_par_equipe; i++) {
    unitSystem.spawnUnit(terrain.size / -2 + Math.random()*10, (Math.random()-0.5)*20, 0);
}

// Spawn Rouges (Equipe 1)
for(let i=0; i<nombre_soldats_par_equipe; i++) {
    unitSystem.spawnUnit(terrain.size / 2 - Math.random()*10, (Math.random()-0.5)*20, 1);
}

// L'Artillerie gère les canons ET les obus
const artillery = new ArtillerySystem(scene, audiolistener, terrain);

// 3. Spawning (Création des unités)
// Equipe 0 (Bleus) à Gauche (X négatif)
for(let i = 0; i < nombre_soldats_par_equipe; i++) {
    // Note: on utilise 'artillery' (le nom de ta constante)
    artillery.spawnUnit(terrain.size / -2 + Math.random()*10, (Math.random()-0.5)*40, 0); 
}

// Equipe 1 (Rouges) à Droite (X positif)
for(let i = 0; i < nombre_soldats_par_equipe; i++) {
    artillery.spawnUnit(terrain.size / 2 - Math.random()*10, (Math.random()-0.5)*40, 1);
}

// 4. Rendu & Lumière
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Antialias pour que ce soit plus joli
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Activer les ombres
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(50, 100, 50);
light.castShadow = true;
// Optimisation des ombres pour grande map
light.shadow.camera.left = -100;
light.shadow.camera.right = 100;
light.shadow.camera.top = 100;
light.shadow.camera.bottom = -100;
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

// 5. Contrôles
const controls = new PointerLockControls(camera, document.body);

document.addEventListener('click', () => {
  if (audiolistener.context.state === 'suspended') {
    audiolistener.context.resume();
  }
  controls.lock();
});

const moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
const onKeyDown = (event) => {
  switch (event.code) {
    case 'KeyW': moveState.forward = true; break;
    case 'KeyS': moveState.backward = true; break;
    case 'KeyA': moveState.left = true; break;
    case 'KeyD': moveState.right = true; break;
    case 'Space': moveState.up = true; break;
    case 'ShiftLeft': moveState.down = true; break;
    case 'KeyC': // 'C' pour Charge !
        console.log("ORDRE DE CHARGE DONNÉ !");
        // Les bleus attaquent !
        unitSystem.triggerCharge(0); 
        break;
  }
};
const onKeyUp = (event) => {
  switch (event.code) {
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
    case 'Space': moveState.up = false; break;
    case 'ShiftLeft': moveState.down = false; break;
  }
};
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);


// 6. Boucle d'Animation
const clock = new THREE.Clock();

// Compteur FPS
let frameCount = 0;
let lastTime = performance.now();
const fpsDisplay = document.createElement('div');
fpsDisplay.style.position = 'absolute';
fpsDisplay.style.top = '10px';
fpsDisplay.style.left = '10px';
fpsDisplay.style.color = 'white';
fpsDisplay.style.fontSize = '20px';
fpsDisplay.style.fontFamily = 'monospace';
fpsDisplay.style.backgroundColor = 'rgba(0,0,0,0.5)';
fpsDisplay.style.padding = '5px 10px';
fpsDisplay.style.zIndex = '1000';
document.body.appendChild(fpsDisplay);

function animate() {
    const deltaTime = clock.getDelta();

    // Calcul FPS
    frameCount++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        fpsDisplay.textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastTime = currentTime;
    }

    // Mouvements Caméra
    const moveSpeed = 20 * deltaTime;
    if (moveState.forward) controls.moveForward(moveSpeed);
    if (moveState.backward) controls.moveForward(-moveSpeed);
    if (moveState.left) controls.moveRight(-moveSpeed);
    if (moveState.right) controls.moveRight(moveSpeed);
    if (moveState.up) camera.position.y += moveSpeed;
    if (moveState.down) camera.position.y -= moveSpeed;
  
    // --- LOGIQUE DU JEU ---

    // 1. Mettre à jour l'artillerie (Canons + Obus)
    artillery.update(deltaTime);
    
    unitSystem.update(deltaTime);

    // 2. Gérer les conséquences des impacts
    // artillery.impacts est rempli par artillery.update() si des obus touchent le sol
    const explosions = artillery.impacts; 

    if (explosions.length > 0) {
        //console.log(`💥 ${explosions.length} explosion(s) détectée(s) cette frame`);
        explosions.forEach(pos => {
            // A. Creuser le sol
            //console.log("explosion a :", pos);
            terrain.applyCrater(pos, 8); // Rayon 8

            // B. Casser les arbres (si vegetation existe)
            if (vegetation) {
                vegetation.handleExplosions(explosions);
            }

            // C. Le son est déjà géré dans ArtillerySystem, pas besoin ici !
        });
        terrain.update();
        console.log("update", explosions.length)
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// Gestion redimensionnement fenêtre
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

export { scene, camera, terrain, artillery, vegetation };