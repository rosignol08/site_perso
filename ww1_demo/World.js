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

const terrain = new Terrain(scene);
const artillerySystem = new ArtillerySystem(scene, terrain);

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
  artillerySystem.fire(startPos, targetPos);
}, 1000);

function animate() {
  requestAnimationFrame(animate);
  
  // AJOUT: Déplacer la caméra selon les touches
  const moveSpeed = 0.5;
  if (moveState.forward) controls.moveForward(moveSpeed);
  if (moveState.backward) controls.moveForward(-moveSpeed);
  if (moveState.left) controls.moveRight(-moveSpeed);
  if (moveState.right) controls.moveRight(moveSpeed);
  if (moveState.up) camera.position.y += moveSpeed;
  if (moveState.down) camera.position.y -= moveSpeed;
  
  // Laisser ArtillerySystem gérer TOUT (mouvement + collision)
  artillerySystem.update(0.016);
  
  renderer.render(scene, camera);
}

// Start animation loop
animate();

export { scene, camera, terrain, artillerySystem };