//import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

//classe pour charger des objet 3D
import * as THREE from 'three';
// Load model and animations
const loader = new THREE.GLTFLoader();
loader.load('model.glb', (gltf) => {
   const model = gltf.scene;
   scene.add(model);
   // Create mixer for the model
   const mixer = new THREE.AnimationMixer(model);
   // Get an animation clip and create an action
   const clip = gltf.animations[0];
   const action = mixer.clipAction(clip);
   // Play the animation
   action.play();
   // Animation loop
   const clock = new THREE.Clock();
   function animate() {
       requestAnimationFrame(animate);
       const delta = clock.getDelta();
       mixer.update(delta); // Advance animations
       renderer.render(scene, camera);
   }
   animate();
});