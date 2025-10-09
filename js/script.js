import * as THREE from './three.module.min.js';

import { GLTFLoader } from './GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';

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
const fenetresGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);

const fenetres = [];
let fenetre;
//fenetre blanche
fenetre = new THREE.Mesh(fenetresGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5, toneMapped: false }));
fenetre.position.set(1,1.5,1);
fenetre.lookAt(0, 1, 2);
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
fenetre.position.set(1, 1, 0);
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
  model.position.x = 0;// -20;
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

const pcSpotlight = new THREE.SpotLight(0xffffff, 6.5, 10, Math.PI / 6, 0.5, 1);
pcSpotlight.position.set(0, 5, -1); // Au-dessus du PC
pcSpotlight.target.position.set(0, 0.5, -1); // Cible le PC
scene.add(pcSpotlight);
scene.add(pcSpotlight.target);
//fenêtres et des lumières à la scène
fenetres.forEach(fenetre => scene.add(fenetre));

// Détection du survol avec Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredFenetre = null;

const texts = [
  "", // Index 0
  "Mes projets.", // Index 1
  "À propos de moi.",  // Index 2
  "Me contacter." // Index 3
];

let currentIndex = 0; //ecrit rien au debut
textElement.textContent = texts[currentIndex]; // Afficher le texte de départ

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
          if (hoveredFenetre === fenetres[0]) {
            currentIndex = 1;
          } else if (hoveredFenetre === fenetres[1]) {
            currentIndex = 2;
          } else if (hoveredFenetre === fenetres[2]) {
            currentIndex = 3;
          }
          textElement.textContent = texts[currentIndex];

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

// Remplace la lumière ambiante par une Spotlight à la position de la caméra
const spotlight = new THREE.SpotLight(0xffffff, 3.2);
spotlight.position.set(0, 6.9, 3);
spotlight.target.position.set(-10, 0, -4.1);
spotlight.angle = Math.PI / 17.3;
spotlight.angle = 0.41;
//spotlight.position.copy(camera.position);
//spotlight.target.position.set(0, 0.5, -1); // cible le modèle PC (position initiale)
scene.add(spotlight);
scene.add(spotlight.target);

const lumiere_ecran = new THREE.RectAreaLight(0xffffff, 2, 2, 1); // largeur: 1, hauteur: 2.5
lumiere_ecran.position.set(1, 1.2, 0.3); // Position de l'écran du PC
lumiere_ecran.scale.set(2,1,1);
lumiere_ecran.rotation.y = -Math.PI / 2;

//lumiere_ecran.lookAt(0, 0, 0); // Direction vers la caméra
lumiere_ecran.visible = false; // Invisible au début
scene.add(lumiere_ecran);
//const helper = new RectAreaLightHelper(lumiere_ecran);
//scene.add(helper);

// Ajout des flèches pour tourner la caméra
//const leftArrow = document.createElement('div');
//leftArrow.id = 'left-arrow';
//leftArrow.innerHTML = '←';
//leftArrow.style.position = 'absolute';
//leftArrow.style.left = '20px';
//leftArrow.style.top = '50%';
//leftArrow.style.fontSize = '48px';
//leftArrow.style.color = 'black';
//leftArrow.style.cursor = 'pointer';
//leftArrow.onclick = () => rotateCamera('left');
//document.body.appendChild(leftArrow);
//
//const rightArrow = document.createElement('div');
//rightArrow.id = 'right-arrow';
//rightArrow.innerHTML = '→';
//rightArrow.style.position = 'absolute';
//rightArrow.style.right = '20px';
//rightArrow.style.top = '50%';
//rightArrow.style.fontSize = '48px';
//rightArrow.style.color = 'black';
//rightArrow.style.cursor = 'pointer';
//rightArrow.onclick = () => rotateCamera('right');
//document.body.appendChild(rightArrow);

// Ajout du texte de présentation
//const presentationText = document.createElement('div');
//presentationText.innerHTML = 'Cliquez sur les flèches pour explorer les différentes sections.';
//presentationText.style.position = 'absolute';
//presentationText.style.top = '20px';
//presentationText.style.width = '100%';
//presentationText.style.textAlign = 'center';
//presentationText.style.color = 'black';
//presentationText.style.fontSize = '24px';
//document.body.appendChild(presentationText);

// Ajout du texte dynamique
//const textElement = document.createElement('div');
//textElement.id = 'text-content';
//textElement.style.position = 'absolute';
//textElement.style.top = '80px';
//textElement.style.width = '100%';
//textElement.style.textAlign = 'center';
//textElement.style.color = 'black';
//textElement.style.fontSize = '24px';
//textElement.style.transition = 'opacity 0.5s'; // Animation CSS pour un effet fondu
//document.body.appendChild(textElement);

// Fonction d'animation
function animate() {
  for (fenetre of fenetres) {
    fenetre.visible = ecran_visible;
    fenetre.material.emissiveIntensity = ecran_visible ? 5 : 0;
    if (model && !ecran_visible) {
      // Rapproche doucement le modèle PC
      gsap.to(model.position, { x: 3, duration: 10, ease: "power2.out" });

      // Lance l'animation "open" si elle existe
      if (loadedGltf && loadedGltf.animations && loadedGltf.animations.length > 0) {
        const openAnim = loadedGltf.animations.find(anim => anim.name === "Plane.001Action");
        if (openAnim && !model.userData.openPlayed) {
          const action = mixer.clipAction(openAnim);
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          action.timeScale = 0.2;
          // Écouteur pour détecter la fin de l'animation
          action.getMixer().addEventListener('finished', () => {
            //la lumière de l'écran quand l'animation est finie
            lumiere_ecran.visible = true;
            gsap.to(lumiere_ecran, { intensity: 8, duration: 1, ease: "power2.out" });
            ecran_visible = true;
            
            // Active les interactions avec les fenêtres
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('click', onMouseClick);
          });
          
          action.play();
          model.userData.openPlayed = true;
        }
      }
      mixer.update(1 / 30);
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
  camera.position.set(x, 2.5, z);
  camera.lookAt(0, -0.80, 0);
  
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