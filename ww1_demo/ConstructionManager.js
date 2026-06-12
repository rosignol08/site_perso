import * as THREE from 'three';
import Fortification from './Fortification.js';

const MAX_CONCURRENT = 10;

// Espacement dynamique selon la distance au front (X=0)
// À l'arrière (base, X=±80) : 8m  → fortifs serrées, zone sûre
// Au front    (NML, X=±10) : 22m  → fortifs espacées, sinon c'est le chaos
const SPACING_REAR  =  8;
const SPACING_FRONT = 22;
const FRONT_X       = 10;  // en-deçà = "proche du front"
const REAR_X        = 70;  // au-delà = "zone base"

function getDynamicSpacing(pos) {
    const distFromFront = Math.abs(pos.x);
    // t=0 → au front, t=1 → en base
    const t = Math.max(0, Math.min(1, (distFromFront - FRONT_X) / (REAR_X - FRONT_X)));
    return SPACING_FRONT + (SPACING_REAR - SPACING_FRONT) * t;
}

class ConstructionManager {
    constructor(scene, terrain, team) {
        this.scene   = scene;
        this.terrain = terrain;
        this.team    = team;

        this.fortifications = [];
        this.soldiers       = [];
        this.resources      = Infinity;
    }

    // ─── Enregistrement ───────────────────────────────────────────────────────

    registerSoldier(unit) {
        this.soldiers.push(unit);
    }

    // ─── Demandes de construction ─────────────────────────────────────────────

    requestTrench(unit) {
        const pos     = unit.mesh.position.clone();
        const spacing = getDynamicSpacing(pos);
        if (this._hasFortifNearby(pos, spacing)) return null;

        const activeCount = this.fortifications.filter(f => !f.isFinished).length;
        if (activeCount >= MAX_CONCURRENT) return null;

        const fortif = new Fortification(this.scene, this.terrain, pos, this.team, { type: 'TRENCH' });
        this.fortifications.push(fortif);
        return fortif;
    }

    requestBunker(unit) {
        const pos     = unit.mesh.position.clone();
        const spacing = getDynamicSpacing(pos);

        const tooClose = this.fortifications.some(f =>
            f.type === 'BUNKER' && f.position.distanceTo(pos) < Math.max(spacing, 20)
        );
        if (tooClose || this._hasFortifNearby(pos, spacing)) return null;

        const activeCount = this.fortifications.filter(f => !f.isFinished).length;
        if (activeCount >= MAX_CONCURRENT) return null;

        const fortif = new Fortification(this.scene, this.terrain, pos, this.team, { type: 'BUNKER' });
        this.fortifications.push(fortif);
        return fortif;
    }

    requestConnection(unit) {
        const activeCount = this.fortifications.filter(f => !f.isFinished).length;
        if (activeCount >= MAX_CONCURRENT) return null;

        // Collecte les noeuds candidats (extrémités des structures finies)
        const nodes = [];
        this.fortifications.forEach(f => {
            if (!f.isFinished) return;
            if (f.type === 'BUNKER') {
                nodes.push({ pos: f.position, fortif: f });
            } else if (f.type === 'TRENCH') {
                nodes.push({ pos: f.startWorld, fortif: f });
                nodes.push({ pos: f.endWorld,   fortif: f });
            }
        });

        // Mélange pour éviter des connexions toujours identiques
        nodes.sort(() => Math.random() - 0.5);

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];
                if (n1.fortif === n2.fortif) continue;

                // Limite le nombre de voisins par structure
                const count1 = n1.fortif.connectedTo.filter(f => f.type !== 'LINK').length;
                const count2 = n2.fortif.connectedTo.filter(f => f.type !== 'LINK').length;
                const max1   = (n1.fortif.type === 'BUNKER') ? 4 : 3;
                const max2   = (n2.fortif.type === 'BUNKER') ? 4 : 3;
                if (count1 >= max1 || count2 >= max2) continue;

                const dist = n1.pos.distanceTo(n2.pos);
                if (dist <= 5 || dist >= 35) continue;

                // Déjà connectées ?
                if (n1.fortif.connectedTo.includes(n2.fortif)) continue;

                // Voisin commun ? (évite les triangles)
                const shareNeighbor = n1.fortif.connectedTo.some(f => n2.fortif.connectedTo.includes(f));
                if (shareNeighbor) continue;

                // ── Test de croisement ──────────────────────────────────────
                // On rejette la connexion si le segment N1→N2 croise un LINK
                // ou une TRENCH déjà existante (intersection de segments 2D).
                if (this._segmentCrossesExisting(n1.pos, n2.pos)) continue;

                const fortif = new Fortification(this.scene, this.terrain, n1.pos, this.team, {
                    type:     'LINK',
                    startPos: n1.pos,
                    endPos:   n2.pos
                });

                n1.fortif.connectedTo.push(n2.fortif, fortif);
                n2.fortif.connectedTo.push(n1.fortif, fortif);
                fortif.connectedTo.push(n1.fortif, n2.fortif);

                this.fortifications.push(fortif);
                return fortif;
            }
        }
        return null;
    }

    // ─── Recherche ────────────────────────────────────────────────────────────

    /** Trouve un chantier actif qui manque de bras */
    findActiveChantier() {
        for (const f of this.fortifications) {
            if (!f.isFinished && f.needsBuilders()) return f;
        }
        return null;
    }

    /** Cherche un abri dans le réseau connecté à la fortif courante */
    findConnectedCover(currentFortif) {
        if (!currentFortif) return null;
        for (const neighbor of currentFortif.connectedTo) {
            if (neighbor.isFinished && !neighbor.isFull()) return neighbor;
        }
        return null;
    }

    /** Cherche l'abri terminé le plus proche dans un rayon */
    findCoverNearby(pos, radius = 20) {
        let best     = null;
        let bestDist = Infinity;
        for (const f of this.fortifications) {
            if (!f.isFinished || f.isFull()) continue;
            const dist = pos.distanceTo(f.mesh.position);
            if (dist < radius && dist < bestDist) { bestDist = dist; best = f; }
        }
        return best;
    }

    /** Vérification rapide avant de demander à construire */
    canIBuild(unit) {
        const spacing = getDynamicSpacing(unit.mesh.position);
        if (this._hasFortifNearby(unit.mesh.position, spacing)) return false;
        const activeCount = this.fortifications.filter(f => !f.isFinished).length;
        return activeCount < MAX_CONCURRENT;
    }

    // ─── Charge globale ───────────────────────────────────────────────────────

    orderGlobalCharge() {
        console.log(`[Team ${this.team}] CHARGE !`);
        this.soldiers.forEach(s => !s.isDead && s.startCharge());
        this.fortifications.forEach(f => { f.occupants = []; f.builders = []; });
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    update(deltaTime) {
        this.fortifications.forEach(f => f.update(deltaTime));
    }

    // ─── Privé ────────────────────────────────────────────────────────────────

    /**
     * Retourne true si le segment (pA → pB) croise un segment existant
     * (LINK ou TRENCH déjà construit). On travaille en 2D (X/Z).
     * On ignore les segments qui partagent une extrémité avec pA ou pB
     * (connexions légitimes au même nœud).
     */
    _segmentCrossesExisting(pA, pB) {
        for (const f of this.fortifications) {
            if (f.type !== 'LINK' && f.type !== 'TRENCH') continue;

            const c = f.startWorld;
            const d = f.endWorld;

            // Ignorer les segments qui touchent nos extrémités (même nœud)
            const EPS = 1.5;
            if (
                c.distanceTo(pA) < EPS || c.distanceTo(pB) < EPS ||
                d.distanceTo(pA) < EPS || d.distanceTo(pB) < EPS
            ) continue;

            if (this._seg2DIntersect(pA, pB, c, d)) return true;
        }
        return false;
    }

    /**
     * Test d'intersection stricte entre deux segments 2D (X/Z).
     * Utilise les produits vectoriels pour déterminer l'orientation relative.
     */
    _seg2DIntersect(p1, p2, p3, p4) {
        const cross2D = (o, a, b) =>
            (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

        const d1 = cross2D(p3, p4, p1);
        const d2 = cross2D(p3, p4, p2);
        const d3 = cross2D(p1, p2, p3);
        const d4 = cross2D(p1, p2, p4);

        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        return false;
    }

    _hasFortifNearby(pos, radius) {
        for (const f of this.fortifications) {
            if (
                pos.distanceTo(f.startWorld) < radius ||
                pos.distanceTo(f.position)   < radius ||
                pos.distanceTo(f.endWorld)   < radius
            ) return true;
        }
        return false;
    }
}

export default ConstructionManager;