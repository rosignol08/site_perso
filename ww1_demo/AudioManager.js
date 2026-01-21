// Dans ta classe AudioManager ou ArtillerySystem
function createExplosionSound(position, camera) {
    // On a besoin d'un "Listener" sur la caméra (les oreilles du joueur)
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.PositionalAudio(listener);
    const audioLoader = new THREE.AudioLoader();
    
    audioLoader.load('explosion-fx-343683.mp3', function(buffer) {
        sound.setBuffer(buffer);
        sound.setRefDistance(20); // Distance à laquelle le volume commence à baisser
        sound.play();
    });

    // Créer un objet invisible à l'endroit de l'impact pour émettre le son
    const audioSource = new THREE.Object3D();
    audioSource.position.copy(position);
    scene.add(audioSource);
    audioSource.add(sound);
}