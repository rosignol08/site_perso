/* Dans ta fonction principale animate() :

ArtillerySystem.update() : Bouge les obus.

Si un obus touche le sol :

Appeler Terrain.createCrater(position).

Appeler AudioManager.playBang(position).

Appeler Vegetation.checkDestruction(position).

Supprimer l'obus de la scène.

Renderer.render(scene, camera)
*/
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import Terrain from './Terrain.js';
import ArtillerySystem from './ArtillerySystem.js';
import Vegetation from './Vegetation.js';
import UnitSystem from './UnitSystem.js';


// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Ciel bleu

// Create camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 50, 100);
const audiolistener = new THREE.AudioListener();
camera.add(audiolistener);
const terrain = new Terrain(scene);
const vegetation = new Vegetation(scene);
const artillery = new ArtillerySystem(scene,audiolistener,terrain);
const unitSystem = new UnitSystem(scene, terrain);

//escouade de 5 soldats
for(let i = 0; i < 5; i++) {
    // Position aléatoire un peu groupée
    unitSystem.spawnUnit(-40 + Math.random() * 10, -40 + Math.random() * 10);
}
for(let i = 0; i < 5; i++) {
    // Position aléatoire un peu groupée
    artillery.spawnUnit(-40 + Math.random() * 10, -40 + Math.random() * 10);
}

// Create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 100, 50);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// AJOUT: PointerLockControls pour caméra libre
const controls = new PointerLockControls(camera, document.body);

// Cliquer pour activer les contrôles
document.addEventListener('click', () => {
  // Résumer l'AudioContext pour autoriser le son (requis par les navigateurs)
  if (audiolistener.context.state === 'suspended') {
    audiolistener.context.resume();
  }
  controls.lock();
});

// Déplacements WASD
const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false
};
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveState.forward = true; break;
    case 'KeyS': moveState.backward = true; break;
    case 'KeyA': moveState.left = true; break;
    case 'KeyD': moveState.right = true; break;
    case 'Space': moveState.up = true; break;
    case 'ShiftLeft': moveState.down = true; break;
  }
});
document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
    case 'Space': moveState.up = false; break;
    case 'ShiftLeft': moveState.down = false; break;
  }
});

// AJOUT: Tirer un obus de test au démarrage
setTimeout(() => {
  const startPos = new THREE.Vector3(-50, 0, 0);
  const targetPos = new THREE.Vector3(50, 0, 0);
  //artillery.fire(startPos, targetPos);
}, 5000);

function animate() {
    const deltaTime = 0.016; // Ou via un THREE.Clock
    requestAnimationFrame(animate);
    const moveSpeed = 0.5;
    if (moveState.forward) controls.moveForward(moveSpeed);
    if (moveState.backward) controls.moveForward(-moveSpeed);
    if (moveState.left) controls.moveRight(-moveSpeed);
    if (moveState.right) controls.moveRight(moveSpeed);
    if (moveState.up) camera.position.y += moveSpeed;
    if (moveState.down) camera.position.y -= moveSpeed;
  
    // 1. Calculer la physique
    artillery.update(deltaTime);
    unitSystem.update(deltaTime);

    // 2. Gérer les conséquences des impacts
    // On récupère la liste des endroits où ça a explosé cette frame
    const explosions = artillery.impacts; 

    if (explosions.length > 0) {
        // Le chef d'orchestre distribue l'information
        
        // "Terrain, fais des trous !"
        explosions.forEach(pos => terrain.createCrater(pos));
        
        // "Arbres, tombez si vous êtes touchés !"
        vegetation.handleExplosions(explosions);
        
        // "Audio, joue le son !"
        //explosions.forEach(pos => artillery.playExplosionSound(pos));
    }

    renderer.render(scene, camera);
}

// Start animation loop
animate();

export { scene, camera, terrain, artillery, vegetation };