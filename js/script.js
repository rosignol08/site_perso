import * as THREE from './three.module.min.js';

import { GLTFLoader } from './GLTFLoader.js';
import { OrbitControls } from './OrbitControls.js';
import { Water } from './Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Initialisation de la scène
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
//renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 0.3;
//scene.background = new THREE.Color(0x000000);
//scene.background = 0x0000ff;
//renderer.setClearColor( 0x000000, 1);
scene.background = new THREE.Color('#c7c7c7');

// Ajout du brouillard à la scène
const fogColor =new THREE.Color('#c7c7c7');// Couleur du brouillard
//scene.fog = new THREE.Fog(fogColor, 1, 1000);

// Ajout de brouillard exponentiel
scene.fog = new THREE.FogExp2(fogColor, 0.035);


//shaders
const renderPass = new RenderPass(scene, camera);
const composer = new EffectComposer( renderer );
composer.addPass( renderPass );

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2( window.innerWidth, window.innerHeight ),
  0.30,
  1.5,
  0.0
)
//bloomPass.threshold = 0.0;
composer.addPass( bloomPass );

// Ajout de l'eau
const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
const water = new Water(
  waterGeometry,
  {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('js/assets/textures/waternormals.jpg', function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0x000000,
    waterColor: 0x000000, // noir
    distortionScale: 3.0, // Augmente la distorsion pour plus de réalisme
    fog: scene.fog !== undefined,
    alpha: 0.0, // Permet d'ajouter un peu de transparence
  }
);
water.rotation.x = -Math.PI / 2;
scene.add(water);
water.position.y = 0;

// Ajout des portes colorées avec des lumières
const doorGeometry = new THREE.BoxGeometry(2, 4, 0.1);
const lanterneGeometry = new THREE.SphereGeometry(0.13);

const radius = 6; // Rayon du cercle
const doors = [];
/*
// Porte blanche
let door = new THREE.Mesh(doorGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5, toneMapped: false }));
door.position.set(radius, 1, 0);
door.lookAt(0, 1, 0);
doors.push(door);

// Lumière pour la porte blanche
let largeur_lumiere = 2.0;
let hauteur_lumiere = 4.0;
let intensite = 5;
let couleur = 0xffffff;
let rectangle_light = new THREE.RectAreaLight(couleur, intensite, largeur_lumiere, hauteur_lumiere);
rectangle_light.position.set(radius, 0.5, 0);
rectangle_light.power = 100;
rectangle_light.lookAt(0, 1, 0);
scene.add(rectangle_light)
*/

// Porte orange
let door = new THREE.Mesh(doorGeometry, new THREE.MeshStandardMaterial({ color: 0xf39c12, emissive: 0xf39c12, emissiveIntensity: 5, toneMapped: false }));
door.position.set(0, 1, radius);
door.lookAt(0, 1, 0);
door.userData.url = "https://example.com"; // URL de redirection
doors.push(door);

// Lumière pour la porte orange
let largeur_lumiere = 2.0;
let hauteur_lumiere = 4.0;
let intensite = 5;
let couleur = 0xf39c12;
let rectangle_light = new THREE.RectAreaLight(couleur, intensite, largeur_lumiere, hauteur_lumiere);
rectangle_light.position.set(0, 0.5, radius);
rectangle_light.power = 100;
rectangle_light.lookAt(0, 1, 0);
scene.add(rectangle_light)

/*
// Porte verte
door = new THREE.Mesh(doorGeometry, new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 5, toneMapped: false }));
door.position.set(-radius, 1, 0);
door.lookAt(0, 1, 0);
doors.push(door);

// Lumière pour la porte verte
largeur_lumiere = 2.0;
hauteur_lumiere = 4.0;
intensite = 5;
couleur = 0x00ff00;
rectangle_light = new THREE.RectAreaLight(couleur, intensite, largeur_lumiere, hauteur_lumiere);
rectangle_light.position.set(-radius,0.5 , 0);
rectangle_light.power = 100;
rectangle_light.lookAt(0, 1, 0);
scene.add(rectangle_light)
*/

// Chargement du modèle GLTF pour le personnage
const loader = new GLTFLoader();
let model; //definition du model pour pouvoir le manipuler
loader.load('js/assets/docteur/steampunk_plague_doctor.glb', function (gltf) {
  model = gltf.scene;
  model.position.set(-radius, 0, 0);
  model.position.x = -20;
  model.position.y = 1.45;
  model.scale.set(1.5, 1.5, 1.5);
  model.rotation.y = -1;
  scene.add(model);
}, undefined, function (error) {
  console.error(error);
});

let door_lanterne = new THREE.Mesh(lanterneGeometry, new THREE.MeshStandardMaterial({ color: 0xf39c12, emissive: 0xf39c12, emissiveIntensity: 5, toneMapped: false }));
door_lanterne.position.set(-20, 2, 0.2);
//door_lanterne.scale.set(0.1, 0.1, 0.1);
door_lanterne.lookAt(0, 1, 0);
scene.add(door_lanterne);

// Lumière pour la porte orange
//let largeur_lumiere_lanterne = 10.0;
//let hauteur_lumiere_lanterne = 10.0;
//let intensite_lanterne = 50;
//let couleur_lanterne = 0xff2929;
//let rectangle_light_lanterne = new THREE.RectAreaLight(couleur_lanterne, intensite_lanterne, largeur_lumiere_lanterne, hauteur_lumiere_lanterne);
//rectangle_light_lanterne.position.set(-radius, 0, 0);
//rectangle_light_lanterne.position.x = -10;
//rectangle_light_lanterne.position.y = 1.45;
//rectangle_light_lanterne.power = 1000;
//rectangle_light_lanterne.lookAt(0, 1, 0);
//scene.add(rectangle_light_lanterne)

// Porte bleue
door = new THREE.Mesh(doorGeometry, new THREE.MeshStandardMaterial({ color: 0x2192d3, emissive: 0x2192d3, emissiveIntensity: 5, toneMapped: false }));
door.position.set(0, 1, -radius);
door.lookAt(0, 1, 0);
door.userData.url ="https://linktr.ee/joyca_discobeast"; // URL de redirection
doors.push(door);

// Lumière pour la porte bleue
largeur_lumiere = 2.0;
hauteur_lumiere = 4.0;
intensite = 5;
couleur = 0x2192d3;
rectangle_light = new THREE.RectAreaLight(couleur, intensite, largeur_lumiere, hauteur_lumiere);
rectangle_light.position.set(0, 0.5, -radius);
rectangle_light.power = 100;
rectangle_light.lookAt(0, 1, 0);
scene.add(rectangle_light)

// Ajout des portes et des lumières à la scène
doors.forEach(door => scene.add(door));

// Détection du survol avec Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredDoor = null;

// Animation de survol
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(doors);

  if (intersects.length > 0) {
      if (hoveredDoor !== intersects[0].object) {
          resetDoors(); // Réinitialise les autres portes
          hoveredDoor = intersects[0].object;

          // Animation de grossissement
          gsap.to(hoveredDoor.scale, { x: 1.5, y: 1.5, duration: 0.3 });
          gsap.to(hoveredDoor.rotation, { z: hoveredDoor.rotation.z + 0.1, duration: 0.3 });
      }
  } else {
      resetDoors();
  }
}

// Réinitialisation des portes si la souris quitte
function resetDoors() {
  if (hoveredDoor) {
      gsap.to(hoveredDoor.scale, { x: 1, y: 1, duration: 0.3 });
      gsap.to(hoveredDoor.rotation, { z: 0, duration: 0.3 });
      hoveredDoor = null;
  }
}

// Gestion du clic pour redirection
function onMouseClick() {
  if (hoveredDoor) {
    window.location.href = hoveredDoor.userData.url;
  }
}

// Ajout des écouteurs d'événements
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onMouseClick);


// Position initiale de la caméra
const cameraRadius = 5; // Distance de la caméra par rapport au centre
camera.position.set(cameraRadius, 1.5, 0);
camera.lookAt(0, 1.5, 0); // Regarder vers le centre de la scène

let currentAngle = 0; // Angle actuel de la caméra
let targetAngle = 0; // Angle cible pour l'animation
const rotationSpeed = 0.05; // Vitesse de rotation

// Fonction pour tourner la caméra
function rotateCamera(direction) {
  const angleIncrement = -Math.PI / 2; // 90 degrés

  if (direction === 'left') {
    targetAngle += angleIncrement;
  } else if (direction === 'right') {
    targetAngle -= angleIncrement;
  }

  // Limiter l'angle de rotation entre -90 degrés et 90 degrés
  const maxAngle = Math.PI / 2;
  if (targetAngle > maxAngle) {
    targetAngle = maxAngle;
  } else if (targetAngle < -maxAngle) {
    targetAngle = -maxAngle;
  }
}

// Ajout des flèches pour tourner la caméra
const leftArrow = document.createElement('div');
leftArrow.id = 'left-arrow';
leftArrow.innerHTML = '←';
leftArrow.style.position = 'absolute';
leftArrow.style.left = '20px';
leftArrow.style.top = '50%';
leftArrow.style.fontSize = '48px';
leftArrow.style.color = 'black';
leftArrow.style.cursor = 'pointer';
leftArrow.onclick = () => rotateCamera('left');
document.body.appendChild(leftArrow);

const rightArrow = document.createElement('div');
rightArrow.id = 'right-arrow';
rightArrow.innerHTML = '→';
rightArrow.style.position = 'absolute';
rightArrow.style.right = '20px';
rightArrow.style.top = '50%';
rightArrow.style.fontSize = '48px';
rightArrow.style.color = 'black';
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
presentationText.style.color = 'black';
presentationText.style.fontSize = '24px';
document.body.appendChild(presentationText);

// Ajout du texte dynamique
const textElement = document.createElement('div');
textElement.id = 'text-content';
textElement.style.position = 'absolute';
textElement.style.top = '80px';
textElement.style.width = '100%';
textElement.style.textAlign = 'center';
textElement.style.color = 'black';
textElement.style.fontSize = '24px';
textElement.style.transition = 'opacity 0.5s'; // Animation CSS pour un effet fondu
document.body.appendChild(textElement);

const texts = [
  "Texte de gauche", // Index 0
  "Texte du milieu", // Index 1
  "Texte de droite"  // Index 2
];

let currentIndex = 1; // Commence au milieu
textElement.textContent = texts[currentIndex]; // Afficher le texte de départ

// Ajout des événements pour changer le texte avec les flèches
leftArrow.addEventListener("click", () => changeText(-1));
rightArrow.addEventListener("click", () => changeText(1));

let isAnimating = false; // Variable pour suivre l'état de l'animation

function changeText(direction) {
  if (isAnimating) {
    // Si une animation est en cours, la coupe et passe directement à la nouvelle animation
    textElement.classList.remove("smoke-out", "smoke-in");
  }

  let newIndex = currentIndex + direction;

  // Vérifie si on dépasse les limites
  if (newIndex < 0 || newIndex > 2) {
    return; // Ne fait rien si on est déjà au bout
  }
  // Désactiver les flèches pendant l'animation
  leftArrow.style.pointerEvents = "none";
  rightArrow.style.pointerEvents = "none";

  textElement.classList.add("smoke-out"); // Ajoute l'animation de disparition

  isAnimating = true; // Début de l'animation

  setTimeout(() => {
    currentIndex = newIndex; // Met à jour l'index seulement si valide
    textElement.textContent = texts[currentIndex];
    textElement.classList.remove("smoke-out"); // Supprime l'ancienne animation
    textElement.classList.add("smoke-in"); // Ajoute l'animation d'apparition

    setTimeout(() => {
      isAnimating = false; // Fin de l'animation
      textElement.classList.remove("smoke-in"); // Nettoie après animation
      // Réactiver les flèches après l'animation
      leftArrow.style.pointerEvents = "auto";
      rightArrow.style.pointerEvents = "auto";
    }, 500); // Durée de l'animation CSS
  }, 500); // Attend la fin de l'animation avant de changer le texte
}


// Fonction d'animation
function animate() {
  requestAnimationFrame(animate);
  water.material.uniforms['time'].value += 0.01 / 60.0;
  // Interpolation de l'angle actuel vers l'angle cible
  currentAngle += (targetAngle - currentAngle) * rotationSpeed;
  
  // Calculer la nouvelle position de la caméra
  const x = cameraRadius * Math.cos(currentAngle);
  const z = cameraRadius * Math.sin(currentAngle);
  camera.position.set(x, 1.5, z);
  // Assurez-vous que la caméra regarde toujours vers le centre
  camera.lookAt(0, 1.5, 0);
  
  //controls.update();
  
  //renderer.render(scene, camera);
  composer.render();//rendue avec postprocessing
}

animate();

// Redimensionnement de la fenêtre
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});