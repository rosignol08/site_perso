import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Terrain from './Terrain.js';
import ArtillerySystem from './ArtillerySystem.js';
import Vegetation from './Vegetation.js';
// import UnitSystem from './UnitSystem.js'; // Optionnel si tu veux aussi des soldats à pied

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
const vegetation = new Vegetation(scene, 5000); // 1000 arbres

// L'Artillerie gère les canons ET les obus
const artillery = new ArtillerySystem(scene, audiolistener, terrain);

// 3. Spawning (Création des unités)
// Equipe 0 (Bleus) à Gauche (X négatif)
for(let i = 0; i < 10; i++) {
    // Note: on utilise 'artillery' (le nom de ta constante)
    artillery.spawnUnit(-60, (Math.random()-0.5)*40, 0); 
}

// Equipe 1 (Rouges) à Droite (X positif)
for(let i = 0; i < 10; i++) {
    artillery.spawnUnit(60, (Math.random()-0.5)*40, 1);
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

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta(); // Plus précis que 0.016 fixe

    // Mouvements Caméra
    const moveSpeed = 20 * deltaTime; // Vitesse ajustée au temps
    if (moveState.forward) controls.moveForward(moveSpeed);
    if (moveState.backward) controls.moveForward(-moveSpeed);
    if (moveState.left) controls.moveRight(-moveSpeed);
    if (moveState.right) controls.moveRight(moveSpeed);
    if (moveState.up) camera.position.y += moveSpeed;
    if (moveState.down) camera.position.y -= moveSpeed;
  
    // --- LOGIQUE DU JEU ---

    // 1. Mettre à jour l'artillerie (Canons + Obus)
    artillery.update(deltaTime);
    
    // Si tu as gardé unitSystem pour l'infanterie :
    // unitSystem.update(deltaTime);

    // 2. Gérer les conséquences des impacts
    // artillery.impacts est rempli par artillery.update() si des obus touchent le sol
    const explosions = artillery.impacts; 

    if (explosions.length > 0) {
        console.log(`💥 ${explosions.length} explosion(s) détectée(s) cette frame`);
        explosions.forEach(pos => {
            // A. Creuser le sol
            console.log("explosion a :", pos);
            terrain.applyCrater(pos, 8); // Rayon 8

            // B. Casser les arbres (si vegetation existe)
            if (vegetation) {
                vegetation.handleExplosions(explosions);
            }

            // C. Le son est déjà géré dans ArtillerySystem, pas besoin ici !
        });
    }
    terrain.update();
    renderer.render(scene, camera);
}

animate();

// Gestion redimensionnement fenêtre
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

export { scene, camera, terrain, artillery, vegetation };