import * as THREE from 'three';
import Fortification from './Fortification.js';

/**
 * ConstructionManager — Arbitre de construction
 *
 * NE planifie RIEN à l'avance.
 * Répond aux demandes individuelles des soldats :
 *   - canIBuild(unit)     → bool  : "est-ce que j'ai le droit de construire ici ?"
 *   - requestBuild(unit)  → Fortification | null
 *
 * Règles d'arbitrage :
 *   1. Pas déjà une fortif dans un rayon MIN_SPACING autour du soldat
 *   2. Pas trop de chantiers en cours en même temps (MAX_CONCURRENT)
 *   3. Ressources disponibles (illimitées pour l'instant, prêt pour extension)
 */

const MIN_SPACING    = 12;   // Distance mini entre deux fortifs (évite le spam)
const MAX_CONCURRENT = 8;    // Chantiers actifs simultanés max par équipe

class ConstructionManager {
    constructor(scene, terrain, team) {
        this.scene   = scene;
        this.terrain = terrain;
        this.team    = team;

        this.fortifications = []; // Toutes les fortifs (finies ou en cours)
        this.soldiers       = []; // Référence aux soldats de l'équipe

        // Ressources (illimitées pour l'instant)
        this.resources = Infinity;
    }

    // ─── Enregistrement ───────────────────────────────────────────────────────

    registerSoldier(unit) {
        this.soldiers.push(unit);
    }

    // ─── API principale : demande de construction ─────────────────────────────

    /**
     * Un soldat demande s'il peut construire à sa position.
     * Retourne une Fortification (nouveau chantier) ou null (refus).
     */
    requestBuild(unit) {
        const pos = unit.mesh.position;
        // On empêche de construire SUR une tranchée existante
        if (this._hasFortifNearby(pos, MIN_SPACING)) return null;
        // Règle 1 : Trop près d'une fortif existante ?
        if (this._hasFortifNearby(pos, MIN_SPACING)){
            console.log("Trop près d'une fortif");
            return null;
        }
        // Règle 2 : Trop de chantiers actifs ?
        const activeCount = this.fortifications.filter(f => !f.isFinished).length;
        if (activeCount >= MAX_CONCURRENT){
            console.log("Trop près d'une fortif");
            return null;
        }

        // Règle 3 : Ressources (pour plus tard)
        if (this.resources <= 0) return null;

        //Autorisé → on crée la fortification à la position du soldat
        const fortif = new Fortification(this.scene, this.terrain, pos.clone(), this.team);
        this.fortifications.push(fortif);

        return fortif;
    }


    // Crée une tranchée à l'extrémité d'une autre pour faire un réseau
    requestExtension(unit) {
        const validFortifs = this.fortifications.filter(f => f.isFinished);
        
        for (const f of validFortifs) {
            const endPos = f.endWorld.clone();
            
            // Est-ce que cette extrémité est déjà connectée à une autre tranchée ?
            const isExtended = this.fortifications.some(other => 
                other !== f && other.startWorld.distanceTo(endPos) < 2.0
            );
            
            if (!isExtended) {
                // Création du Zig-zag : On casse l'angle précédent de 45° (+ ou -)
                const angleOffset = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4);
                const newAngle = f.angle + angleOffset;

                const fortif = new Fortification(this.scene, this.terrain, endPos, this.team, newAngle);
                this.fortifications.push(fortif);
                return fortif;
            }
        }
        return null;
    }

   // Trouve un chantier inachevé pour aller aider
    findActiveChantier() {
        for (const f of this.fortifications) {
            // CORRECTION: on vérifie s'il y a besoin de constructeurs !
            if (!f.isFinished && f.needsBuilders()) return f;
        }
        return null;
    }

    /**
     * Vérifie rapidement si un soldat PEUT potentiellement demander à construire
     * (utilisé par Unit.js avant de changer d'état pour éviter des appels inutiles)
     */
    canIBuild(unit) {
        const pos = unit.mesh.position;
        if (this._hasFortifNearby(pos, MIN_SPACING)) return false;
        const activeCount = this.fortifications.filter(f => !f.isFinished).length;
        if (activeCount >= MAX_CONCURRENT) return false;
        return true;
    }

    isFull() {
        return this.occupants.length >= this.occupancyMax;
    }

    // ─── Recherche de fortif disponible (pour se planquer) ────────────────────
    /**
     * Retourne la fortification terminée la plus proche avec de la place,
     * dans un rayon donné. Utilisé par Unit.js pour trouver où se défendre.
     */
    findCoverNearby(pos, radius = 20) {
        let best     = null;
        let bestDist = Infinity;

        for (const f of this.fortifications) {
            if (!f.isFinished) continue;
            if (f.isFull())    continue;

            const dist = pos.distanceTo(f.mesh.position);
            if (dist < radius && dist < bestDist) {
                bestDist = dist;
                best     = f;
            }
        }
        return best;
    }
    // ─── Charge globale ───────────────────────────────────────────────────────

    orderGlobalCharge() {
        console.log(`[Team ${this.team}] CHARGE !`);
        this.soldiers.forEach(s => !s.isDead && s.startCharge());
        // Vide les occupants de toutes les fortifs
        this.fortifications.forEach(f => {
            f.occupants = [];
            f.builders  = [];
        });
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    update(deltaTime) {
        // On update chaque fortification (progression du chantier, etc.)
        this.fortifications.forEach(f => f.update(deltaTime));
    }

    // ─── Privé ────────────────────────────────────────────────────────────────

    _hasFortifNearby(pos, radius) {
        for (const f of this.fortifications) {
            // On vérifie le départ, le centre ET la fin pour être sûr de ne pas se croiser bêtement
            if (pos.distanceTo(f.startWorld) < radius || pos.distanceTo(f.position) < radius || pos.distanceTo(f.endWorld) < radius) {
                return true;
            }
        }
        return false;
    }
}

export default ConstructionManager;
