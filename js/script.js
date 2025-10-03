import * as THREE from './three.module.min.js';

import { GLTFLoader } from './GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Import GSAP for animations
// GSAP is loaded globally via a <script> tag in the HTML

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
scene.background = new THREE.Color('#000000');


//shaders
const renderPass = new RenderPass(scene, camera);
const composer = new EffectComposer( renderer );
composer.addPass( renderPass );

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2( window.innerWidth, window.innerHeight ),
  0.30,
  0.20,
  0.0
)

//bloomPass.threshold = 0.0;
composer.addPass( bloomPass );

//un rectangle coloré avec des lumières
const fenetresGeometry = new THREE.BoxGeometry(4, 2, 0.1);

const fenetres = [];
let fenetre;
//fenetre blanche
fenetre = new THREE.Mesh(fenetresGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5, toneMapped: false }));
fenetre.position.set(1, 1, 0);
fenetre.lookAt(0, 1, 0);
fenetres.push(fenetre);
/*
// Lumière pour la fenêtre blanche voir apres
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

//fenetre orange
fenetre = new THREE.Mesh(fenetresGeometry, new THREE.MeshStandardMaterial({ color: 0xf39c12, emissive: 0xf39c12, emissiveIntensity: 5, toneMapped: false }));
fenetre.position.set(0, 1, 0);
fenetre.lookAt(0, 1, 0);
fenetre.userData.url = "page_connexion.html"; // URL de redirection
fenetres.push(fenetre);
/*
// Lumière pour la fenêtre orange
let largeur_lumiere = 2.0;
let hauteur_lumiere = 4.0;
let intensite = 5;
let couleur = 0xf39c12;
let rectangle_light = new THREE.RectAreaLight(couleur, intensite, largeur_lumiere, hauteur_lumiere);
rectangle_light.position.set(0, 0.5, radius);
rectangle_light.power = 100;
rectangle_light.lookAt(0, 1, 0);
scene.add(rectangle_light)
*/

//le modèle GLTF du pc
const loader = new GLTFLoader();
let model;
let loadedGltf; // Store the loaded GLTF object
let mixer; // Animation mixer for GLTF model
loader.load('js/assets/pc.glb', function (gltf) {
  loadedGltf = gltf; // Save the gltf object for later use
  model = gltf.scene;
  //model.position.set(0, 0, 0);
  model.position.x = 2;// -20;
  model.position.y = 0.5;// 1.45;
  model.position.z = -1;
  model.scale.set(2.5, 2.5, 2.5);
  // Ajoute une couche d'émissivité au modèle pour l'effet bloom
  
  model.rotation.y = -1.57;
  scene.add(model);

  // Initialize mixer if there are animations
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
  }
}, undefined, function (error) {
  console.error(error);
});

let lumiere_ambiante = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(lumiere_ambiante);

// Ajout d'une lumière directionnelle vers l'objet 3D
const lumiere_directionnelle = new THREE.DirectionalLight(0xffffff, 2);
lumiere_directionnelle.position.set(5, 10, 5); // Position au-dessus et sur le côté
lumiere_directionnelle.target.position.set(0, 1, -1); // Cible le modèle (même position que le modèle GLTF)
scene.add(lumiere_directionnelle);
scene.add(lumiere_directionnelle.target);

//fenêtres et des lumières à la scène
fenetres.forEach(fenetre => scene.add(fenetre));

// Détection du survol avec Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredFenetre = null;

// Animation de survol
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(fenetres);

  if (intersects.length > 0) {
      if (hoveredFenetre !== intersects[0].object) {
          resetFenetres(); // Réinitialise les autres fenêtres
          hoveredFenetre = intersects[0].object;

          // Animation de grossissement
          gsap.to(hoveredFenetre.scale, { x: 1.5, y: 1.5, duration: 0.3 });
          gsap.to(hoveredFenetre.rotation, { z: hoveredFenetre.rotation.z + 0.1, duration: 0.3 });
      }
  } else {
      resetFenetres();
  }
}

// Réinitialisation des portes si la souris quitte
function resetFenetres() {
  if (hoveredFenetre) {

      gsap.to(hoveredFenetre.scale, { x: 1, y: 1, duration: 0.3 });
      gsap.to(hoveredFenetre.rotation, { z: 0, duration: 0.3 });
      hoveredFenetre = null;
  }
}

// Gestion du clic pour redirection
function onMouseClick() {
  if (hoveredDoor) {
    window.location.href = hoveredDoor.userData.url;
  }
}

let ecran_visible = false;

if (ecran_visible) {
  //écouteurs d'événements si l'ecrant est allumé
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onMouseClick);
}

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
  "Cliquez sur le rectangle pour me contacter", // Index 0
  "Bienvenue sur mon site personnel", // Index 1
  "Cliquez sur le rectangle pour découvrir qui je suis et ce que je fais."  // Index 2
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
  for (fenetre of fenetres) {
    fenetre.visible = ecran_visible;
    fenetre.material.emissiveIntensity = ecran_visible ? 5 : 0;
    if (model && !ecran_visible) {
      // Rapproche doucement le modèle PC
      gsap.to(model.position, { x: 0, duration: 2, ease: "power2.out" });

      // Lance l'animation "open" si elle existe
      if (loadedGltf && loadedGltf.animations && loadedGltf.animations.length > 0) {
        const openAnim = loadedGltf.animations.find(anim => anim.name === "1. Plane.001Action");
        if (openAnim && !model.userData.openPlayed) {
          const action = mixer.clipAction(openAnim);
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          action.play();
          model.userData.openPlayed = true;
        }
      }
      mixer.update(1 / 60);
    }
    }
  
  //if (model && !ecran_visible) {
  //  // Animation d'apparition du modèle GLTF (par exemple, montée et rotation)
  //  gsap.to(model.position, { y: 1.45, duration: 1, ease: "power2.out" });
  //  gsap.to(model.rotation, {
  //    y: 0,
  //    duration: 1,
  //    ease: "power2.out",
  //    onComplete: () => {
  //      ecran_visible = true;
  //      // Ajoute les écouteurs d'événements une fois l'animation terminée
  //      window.addEventListener('mousemove', onMouseMove);
  //      window.addEventListener('click', onMouseClick);
  //    }
  //  });
  //}
  requestAnimationFrame(animate);
  //water.material.uniforms['time'].value += 0.1 / 60.0;
  // Interpolation de l'angle actuel vers l'angle cible
  currentAngle += (targetAngle - currentAngle) * rotationSpeed;
  
  const x = cameraRadius * Math.cos(currentAngle);
  const z = cameraRadius * Math.sin(currentAngle);
  camera.position.set(x, 1.5, z);
  camera.lookAt(0, 1.5, 0);
  
  //controls.update();
  
  renderer.render(scene, camera);
  composer.render();//rendue avec postprocessing
}

animate();

// Redimensionnement de la fenêtre
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});