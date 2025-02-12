import * as THREE from './three.module.min.js';
import { GLTFLoader } from './GLTFLoader.js';
import { OrbitControls } from './OrbitControls.js';
import { Water } from './Water.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';


/**
 * 
// Initialisation de la scène
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 20000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposUncaught ReferenceError: EffectComposer is not definedure = 0.5;

// Charger la texture de la surface
const textureLoader = new THREE.TextureLoader();
const surfaceTexture = textureLoader.load('js/assets/textures/metal_plate_02_diff_1k.jpg', function (texture) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10); // Répéter la texture pour couvrir la surface
});

// Charger la carte de réflexion (envMap)
const cubeTextureLoader = new THREE.CubeTextureLoader();
const envMap = cubeTextureLoader.load([
  'js/assets/textures/metal_plate_02_nor_gl_1k.jpg',
  'js/assets/textures/metal_plate_02_ao_1k.jpg'
]);

// Créer la surface réfléchissante
const surfaceGeometry = new THREE.PlaneGeometry(10000, 10000);
const surfaceMaterial = new THREE.MeshStandardMaterial({
  map: surfaceTexture,
  envMap: envMap,
  metalness: 0.9,
  roughness: 0.1,
});

 */

const params = {
  threshold: 0,
  strength: 1,
  radius: 0.5,
  exposure: 1
};

// Initialisation de la scène
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 20000);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.CineonToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.outputColorSpace = THREE.sRGBColorSpace;

const rendererScene = new RenderPass(scene,camera)

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;  // Ajuste la force du bloom
bloomPass.radius = params.radius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(rendererScene); // Ajoute la passe de rendu
bloomComposer.addPass(bloomPass); // Ajoute la passe de bloom

bloomComposer.renderToScreen = false;

const mixPass //https://youtu.be/VTKi70bCVwQ?si=XnN9ao9E1A9QndlX

// Ajout de l'eau
const waterGeometry = new THREE.PlaneGeometry(100, 100);
const water = new Water(
  waterGeometry,
  {
    textureWidth: 256,
    textureHeight: 256,
    waterNormals: new THREE.TextureLoader().load('js/assets/textures/waternormals.jpg', function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 0.2,
  }
);

water.rotation.x = -Math.PI / 2;
scene.add(water);
water.position.y = 0;

// Ajout des portes colorées avec des lumières
const doorGeometry = new THREE.BoxGeometry(1, 2, 0.1);
const materials = [
  { color: 0xffffff, lightColor: 0xffffff }, // Blanc
  { color: 0xff0000, lightColor: 0xff0000 }, // Rouge
  { color: 0x00ff00, lightColor: 0x00ff00 }, // Vert
  { color: 0x0000ff, lightColor: 0x0000ff }  // Bleu
];

const radius = 5; // Rayon du cercle
const doors = [];
const lights = [];

// Porte blanche
let door = new THREE.Mesh(doorGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5, toneMapped: false }));
door.position.set(radius, 1, 0);
door.lookAt(0, 1, 0);
doors.push(door);

// Lumière pour la porte blanche
let light = new THREE.PointLight(0xffffff, 5, 20);
light.position.set(radius, 2, 0);
lights.push(light);

// Porte rouge
door = new THREE.Mesh(doorGeometry, new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 5, toneMapped: false }));
door.position.set(0, 1, radius);
door.lookAt(0, 1, 0);
doors.push(door);

// Lumière pour la porte rouge
light = new THREE.PointLight(0xff0000, 5, 20);
light.position.set(0, 2, radius);
lights.push(light);

// Porte verte
door = new THREE.Mesh(doorGeometry, new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 5, toneMapped: false }));
door.position.set(-radius, 1, 0);
door.lookAt(0, 1, 0);
doors.push(door);

// Lumière pour la porte verte
light = new THREE.PointLight(0x00ff00, 5, 20);
light.position.set(-radius, 2, 0);
lights.push(light);

// Porte bleue
door = new THREE.Mesh(doorGeometry, new THREE.MeshStandardMaterial({ color: 0x0000ff, emissive: 0x0000ff, emissiveIntensity: 5, toneMapped: false }));
door.position.set(0, 1, -radius);
door.lookAt(0, 1, 0);
doors.push(door);

// Lumière pour la porte bleue
light = new THREE.PointLight(0x0000ff, 5, 20);
light.position.set(0, 2, -radius);
lights.push(light);

// Ajout des portes et des lumières à la scène
doors.forEach(door => scene.add(door));
lights.forEach(light => scene.add(light));

//l'effet bloom
const sceneBloom = new THREE.Scene();
const bloomLayer = new THREE.Layers();
bloomLayer.set(1);
door.layers.enable(1); // Applique la couche bloomLayer
sceneBloom.add(door);  // Ajoute la porte seulement à la scène bloom


// Position initiale de la caméra
const cameraRadius = 5; // Distance de la caméra par rapport au centre
camera.position.set(cameraRadius, 1.5, 0);
camera.lookAt(0, 1.5, 0); // Regarder vers le centre de la scène

let currentAngle = 0; // Angle actuel de la caméra
let targetAngle = 0; // Angle cible pour l'animation
const rotationSpeed = 0.05; // Vitesse de rotation

// Fonction pour tourner la caméra
function rotateCamera(direction) {
  const angleIncrement = Math.PI / 2; // 90 degrés

  if (direction === 'left') {
    targetAngle += angleIncrement;
  } else if (direction === 'right') {
    targetAngle -= angleIncrement;
  }
}

//TODO corrgie la rotaiton de la caméra
/**
// Position initiale de la caméra
const cameraRadius = 5; // Distance de la caméra par rapport au centre
camera.position.set(cameraRadius, 1.5, 0);
camera.lookAt(0, 1.5, 0); // Regarder vers le centre de la scène

let currentAngle = 0; // Angle actuel de la caméra

// Fonction pour tourner la caméra
function rotateCamera(direction) {
  const angleIncrement = Math.PI / 2; // 90 degrés

  if (direction === 'left') {
    currentAngle += angleIncrement;
  } else if (direction === 'right') {
    currentAngle -= angleIncrement;
  }

  // Calculer la nouvelle position de la caméra
  const x = cameraRadius * Math.cos(currentAngle);
  const z = cameraRadius * Math.sin(currentAngle);
  camera.position.set(x, 1.5, z);

  // Assurez-vous que la caméra regarde toujours vers le centre
  camera.lookAt(0, 1.5, 0);
}
  */

// Initialisation des contrôles d'orbite
//const controls = new OrbitControls(camera, renderer.domElement);
//controls.enableDamping = true; // Activer l'amortissement (inertie)
//controls.dampingFactor = 0.25;
//controls.screenSpacePanning = false;
//controls.maxPolarAngle = Math.PI / 2;

// Ajout des flèches pour tourner la caméra
const leftArrow = document.createElement('div');
leftArrow.innerHTML = '←';
leftArrow.style.position = 'absolute';
leftArrow.style.left = '20px';
leftArrow.style.top = '50%';
leftArrow.style.fontSize = '48px';
leftArrow.style.color = 'white';
leftArrow.style.cursor = 'pointer';
leftArrow.onclick = () => rotateCamera('left');
document.body.appendChild(leftArrow);

const rightArrow = document.createElement('div');
rightArrow.innerHTML = '→';
rightArrow.style.position = 'absolute';
rightArrow.style.right = '20px';
rightArrow.style.top = '50%';
rightArrow.style.fontSize = '48px';
rightArrow.style.color = 'white';
rightArrow.style.cursor = 'pointer';
rightArrow.onclick = () => rotateCamera('right');
document.body.appendChild(rightArrow);

// Ajout du texte de présentation
const presentationText = document.createElement('div');
presentationText.innerHTML = 'Cliquez sur les flèches pour explorer les différentes sections.';
presentationText.style.position = 'absolute';
presentationText.style.top = '20px';
presentationText.style.width = '100%';
presentationText.style.textAlign = 'center';
presentationText.style.color = 'white';
presentationText.style.fontSize = '24px';
document.body.appendChild(presentationText);

// Fonction d'animation
function animate() {
  requestAnimationFrame(animate);
  // Première passe : ne rendre que les objets avec bloom
  camera.layers.set(1);
  composer.render();

  water.material.uniforms['time'].value += 0.10 / 60.0;
  // Interpolation de l'angle actuel vers l'angle cible
  currentAngle += (targetAngle - currentAngle) * rotationSpeed;

  // Calculer la nouvelle position de la caméra
  const x = cameraRadius * Math.cos(currentAngle);
  const z = cameraRadius * Math.sin(currentAngle);
  camera.position.set(x, 1.5, z);

  // Assurez-vous que la caméra regarde toujours vers le centre
  camera.lookAt(0, 1.5, 0);

  //controls.update();
  // Deuxième passe : rendre la scène normale
  camera.layers.set(0);
  renderer.render(scene, camera);
}

animate();

// Redimensionnement de la fenêtre
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});