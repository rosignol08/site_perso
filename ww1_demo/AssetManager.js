import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

class AssetManager {
    constructor() {
        this.loader = new FBXLoader();
        this.soldierMesh = null; // Le modèle visuel de référence
        this.animations = [];    // La liste combinée des animations
    }

    async loadResources() {
        console.log("Chargement des assets 3D...");

        // Charge tous les fichiers en parallèle
        // Remplace les chemins par tes vrais fichiers !
        //credits "British Solider 3D Model *Rigged*" (https://skfb.ly/6VJYG) by ThrillDaWill is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
        const [soldier, idle, run, shoot, dig] = await Promise.all([
            //this.loadFBX('./assets/soldats.fbx'), // Le corps rigged-and-textured-mid-poly-soldier/source/
            this.loadFBX('./assets/English Soilder/sold.fbx'),
            this.loadFBX('./assets/idle.fbx'),    // Anim Idle
            this.loadFBX('./assets/run.fbx'),     // Anim Run
            this.loadFBX('./assets/shoot.fbx'),   // Anim Shoot
            this.loadFBX('./assets/dig.fbx')      // Anim Dig (ou reload ou autre)
        ]);

        // 1. Préparer le Mesh (Le corps)
        this.soldierMesh = soldier;
        
        // Ajuste l'échelle (Les FBX sont souvent x100 ou x0.01)
        // Modifie cette valeur si ton soldat est géant ou minuscule !
        this.soldierMesh.scale.set(0.1, 0.1, 0.1); 

        // Activer les ombres
        this.soldierMesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // 2. Extraire et Nommer les animations
        this.animations = [];

        // Fonction utilitaire pour extraire l'anim d'un fichier FBX
        const addClip = (obj, name) => {
            if (obj.animations && obj.animations.length > 0) {
                const clip = obj.animations[0];
                clip.name = name; // On la renomme pour Unit.js
                this.animations.push(clip);
            }
        };

        addClip(idle, 'Idle');
        addClip(run, 'Run');
        addClip(shoot, 'Shoot');
        addClip(dig, 'Dig');

        console.log("Assets chargés avec succès :", this.animations.map(a => a.name));
    }

    loadFBX(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, resolve, undefined, reject);
        });
    }

    // Cette fonction clone le soldat pour en créer une armée
    getSoldierInstance() {
        if (!this.soldierMesh) {
            console.error("Erreur: Assets non chargés avant le spawn !");
            return null;
        }

        // CLONAGE SPÉCIAL POUR LES SQUELETTES
        const clone = SkeletonUtils.clone(this.soldierMesh);

        return {
            mesh: clone,
            animations: this.animations // On partage les anims (pas besoin de cloner les données d'anim)
        };
    }
}

export const assetManager = new AssetManager();

//export default AssetManager;