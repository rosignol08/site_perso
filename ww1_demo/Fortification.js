import * as THREE from 'three';

const TEAM_COLORS   = [0x4444aa, 0xaa4444];
const SANDBAG_COLOR = 0xc2a060;
const WOOD_COLOR    = 0x6B4423;
const WIRE_COLOR    = 0x888880;

// Géométries réutilisées (shared pour économiser la mémoire)
const BAG_GEO  = new THREE.BoxGeometry(0.48, 0.32, 0.30);
const POST_GEO = new THREE.CylinderGeometry(0.045, 0.06, 1.4, 5);

class Fortification {
    constructor(scene, terrain, startPos, team, options = {}) {
        this.scene    = scene;
        this.terrain  = terrain;
        this.team     = team;
        this.type     = options.type || 'TRENCH';
        this.connectedTo = [];

        this.builderMax = (this.type === 'BUNKER') ? 4 : 2;
        this.depth      = 2.5;
        this.frontDir   = (team === 0) ? 1 : -1;

        // ── Géométrie selon le type ──────────────────────────────────────────
        if (this.type === 'LINK') {
            this.startWorld = options.startPos.clone(); this.startWorld.y = 0;
            this.endWorld   = options.endPos.clone();   this.endWorld.y   = 0;
            this.length     = this.startWorld.distanceTo(this.endWorld);
            this.width      = 2.2; // Plus étroit qu'avant — couloir de comm
            this.angle      = Math.atan2(
                this.endWorld.z - this.startWorld.z,
                this.endWorld.x - this.startWorld.x
            );
            this.position = new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, 0.5);

            // Génération du chemin en zigzag (points intermédiaires monde)
            this._zigzagPoints = this._buildZigzagPath(this.startWorld, this.endWorld, this.width);

        } else if (this.type === 'BUNKER') {
            this.startWorld = startPos.clone(); this.startWorld.y = 0;
            this.endWorld   = this.startWorld.clone();
            this.position   = this.startWorld.clone();
            this.length     = 7;
            this.width      = 7;
            this.angle      = (Math.random() - 0.5) * Math.PI * 0.5; // Orientation aléatoire

        } else { // TRENCH
            this.startWorld = startPos.clone(); this.startWorld.y = 0;
            this.length     = 6 + Math.random() * 3;
            this.width      = 3.0;
            const dirZ      = (Math.random() > 0.5) ? 1 : -1;
            this.angle      = (Math.PI / 2) * dirZ + (Math.random() - 0.5) * 0.4;
            this.endWorld   = new THREE.Vector3(
                this.startWorld.x + Math.cos(this.angle) * this.length, 0,
                this.startWorld.z + Math.sin(this.angle) * this.length
            );
            this.position = new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, 0.5);
        }

        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        this._generateSlots();

        this.progress    = 0;
        this.isFinished  = false;
        this.occupants   = [];
        this.builders    = [];
        this._buildPlan  = [];

        this._generateBuildPlan();
        this._showGhost();
    }

    // ── Zigzag ────────────────────────────────────────────────────────────────
    /**
     * Découpe le segment A→B en N tronçons et déplace les jonctions
     * alternativement à gauche/droite → forme un Z continu.
     * Retourne un tableau de Vector3 (points monde, y=0).
     */
    _buildZigzagPath(A, B, width) {
        const totalLen = A.distanceTo(B);
        // Longueur d'un segment droit : ~3m, sinon le zigzag est trop serré
        const segLen   = 3.5;
        const N        = Math.max(2, Math.floor(totalLen / segLen));

        const mainDir = new THREE.Vector3().subVectors(B, A).normalize();
        const perp    = new THREE.Vector3(-mainDir.z, 0, mainDir.x);
        const offset  = width * 0.55; // amplitude du décalage latéral

        const pts = [A.clone()];
        for (let i = 1; i < N; i++) {
            const t    = i / N;
            const base = new THREE.Vector3().lerpVectors(A, B, t);
            const side = (i % 2 === 0) ? 1 : -1;
            base.addScaledVector(perp, side * offset);
            pts.push(base);
        }
        pts.push(B.clone());
        return pts;
    }

    // ── Slots ─────────────────────────────────────────────────────────────────
    _generateSlots() {
        this.slots = [];

        if (this.type === 'BUNKER') {
            const offsets = [
                new THREE.Vector3( 2.5, 0,  2.5),
                new THREE.Vector3( 2.5, 0, -2.5),
                new THREE.Vector3(-2.5, 0,  2.5),
                new THREE.Vector3(-2.5, 0, -2.5),
            ];
            offsets.forEach(o => {
                // Rotation selon l'angle du bunker
                o.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle);
                this.slots.push({ type: 'COMBAT', pos: this.position.clone().add(o), occupant: null });
            });
            this.slots.push({ type: 'REST', pos: this.position.clone(), occupant: null });
            this.occupancyMax = this.slots.length;
            return;
        }

        if (this.type === 'LINK') {
            // Slots le long du chemin zigzag
            const pts    = this._zigzagPoints;
            const numSas = Math.max(1, pts.length - 1);
            for (let i = 1; i <= numSas; i++) {
                const t   = i / (numSas + 1);
                const idx = Math.min(Math.floor(t * (pts.length - 1)), pts.length - 2);
                const pos = new THREE.Vector3().lerpVectors(pts[idx], pts[idx + 1], t * (pts.length - 1) - idx);
                this.slots.push({ type: 'REST', pos: pos.clone(), occupant: null });
            }
            this.occupancyMax = this.slots.length;
            return;
        }

        // TRENCH
        const trenchDir = new THREE.Vector3().subVectors(this.endWorld, this.startWorld).normalize();
        let perp = new THREE.Vector3(-trenchDir.z, 0, trenchDir.x);
        if (perp.x * this.frontDir < 0) perp.negate();

        const numSas = Math.max(1, Math.floor(this.length / 3.5));
        for (let i = 1; i <= numSas; i++) {
            const t       = i / (numSas + 1);
            const basePos = new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, t);
            this.slots.push({ type: 'COMBAT', pos: basePos.clone().add(perp.clone().multiplyScalar(this.width * 0.25)), occupant: null });
            this.slots.push({ type: 'REST',   pos: basePos.clone().add(perp.clone().multiplyScalar(-this.width * 0.25)), occupant: null });
        }
        this.occupancyMax = this.slots.length;
    }

    isFull()         { return this.occupants.length >= this.occupancyMax; }
    needsBuilders()  { return !this.isFinished && this.builders.length < this.builderMax; }

    addOccupant(unit) {
        const targetType = (unit.role === 'ENGINEER') ? 'REST' : 'COMBAT';
        let slot = this.slots.find(s => s.occupant === null && s.type === targetType)
                || this.slots.find(s => s.occupant === null);
        if (slot) { slot.occupant = unit; this.occupants.push(unit); return true; }
        return false;
    }
    removeOccupant(unit) {
        const slot = this.slots.find(s => s.occupant === unit);
        if (slot) slot.occupant = null;
        const idx = this.occupants.indexOf(unit);
        if (idx > -1) this.occupants.splice(idx, 1);
    }
    getSlotPosition(unit) {
        const slot = this.slots.find(s => s.occupant === unit);
        return slot ? slot.pos : this.position;
    }
    getSlotType(unit) {
        const slot = this.slots.find(s => s.occupant === unit);
        return slot ? slot.type : 'REST';
    }

    addBuilder(unit) { if (this.needsBuilders()) { this.builders.push(unit); return true; } return false; }
    removeBuilder(unit) {
        const idx = this.builders.indexOf(unit);
        if (idx > -1) this.builders.splice(idx, 1);
    }
    getBuildPosition(unit) {
        if (this.type === 'BUNKER') return this.position.clone();
        const idx = this.builders.indexOf(unit);
        const t   = (idx + 1) / (this.builderMax + 1);
        return new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, t);
    }

    // ── Build Plan ────────────────────────────────────────────────────────────
    _generateBuildPlan() {
        const plan = [];
        const mat  = new THREE.MeshStandardMaterial({ color: SANDBAG_COLOR, roughness: 0.95 });

        if (this.type === 'BUNKER')      this._planBunker(plan, mat);
        else if (this.type === 'LINK')   this._planLink(plan, mat);
        else                             this._planTrench(plan, mat);

        this._buildPlan = plan;
    }

    // ─── BUNKER : enceinte rectangulaire, 3 rangées de sacs + barbelés ───────
    _planBunker(plan, mat) {
        const half = this.width / 2;

        // 3 couches de sacs sur les 4 murs
        for (let layer = 0; layer < 3; layer++) {
            const step = 0.52;
            for (let x = -half; x <= half; x += step) {
                this._addBag(plan, mat, this._rotateBunkerPt(x, -half), layer, Math.random(), 'BUNKER');
                this._addBag(plan, mat, this._rotateBunkerPt(x,  half), layer, Math.random(), 'BUNKER');
            }
            for (let z = -half + step; z < half; z += step) {
                this._addBag(plan, mat, this._rotateBunkerPt(-half, z), layer, Math.random(), 'BUNKER');
                this._addBag(plan, mat, this._rotateBunkerPt( half, z), layer, Math.random(), 'BUNKER');
            }
        }

        // Poteaux de bois aux 4 coins
        const corners = [[-half, -half], [-half, half], [half, -half], [half, half]];
        corners.forEach(([cx, cz], i) => {
            const pt = this._rotateBunkerPt(cx, cz);
            this._addPost(plan, pt, 0.88 + i * 0.03);
        });

        // Barbelés sur le côté ennemi (extérieur)
        this._addWireRow(plan, this._rotateBunkerPt(-half - 1.5, 0), this._rotateBunkerPt(half + 1.5, 0), 0.9);
    }

    _rotateBunkerPt(x, z) {
        // Applique la rotation du bunker (this.angle)
        const rx = Math.cos(this.angle) * x - Math.sin(this.angle) * z;
        const rz = Math.sin(this.angle) * x + Math.cos(this.angle) * z;
        return new THREE.Vector3(rx, 0, rz); // local (relatif à this.position)
    }

    // ─── TRENCH : parapet côté ennemi + contre-parapet fin côté ami ──────────
    _planTrench(plan, mat) {
        const trenchDir = new THREE.Vector3().subVectors(this.endWorld, this.startWorld).normalize();
        let perp = new THREE.Vector3(-trenchDir.z, 0, trenchDir.x);
        if (perp.x * this.frontDir < 0) perp.negate();

        const count = Math.floor(this.length / 0.52);

        for (let i = 0; i < count; i++) {
            const t       = i / count;
            const worldPt = new THREE.Vector3().lerpVectors(this.startWorld, this.endWorld, t);
            const local   = worldPt.clone().sub(this.position);

            // Parapet principal côté ennemi (2 couches hautes)
            for (let layer = 0; layer < 2; layer++) {
                const pDist = this.width * 0.42 + (layer === 0 ? 0 : 0.08);
                const lp    = local.clone().add(perp.clone().multiplyScalar(pDist));
                this._addBag(plan, mat, lp, layer, t, 'TRENCH');
            }

            // Contre-parapet côté ami (1 seule couche basse, plus espacée)
            if (i % 2 === 0) {
                const lp = local.clone().add(perp.clone().multiplyScalar(-this.width * 0.42));
                this._addBag(plan, mat, lp, 0, t + 0.5, 'TRENCH'); // apparaît plus tard
            }
        }

        // Poteaux de bois aux extrémités
        [this.startWorld, this.endWorld].forEach((wp, idx) => {
            const local = wp.clone().sub(this.position);
            this._addPost(plan, local, 0.82 + idx * 0.05);
        });

        // Barbelés devant le parapet (côté ennemi, world space → local)
        const wireStart = this.startWorld.clone().add(perp.clone().multiplyScalar(this.width * 0.8));
        const wireEnd   = this.endWorld.clone().add(perp.clone().multiplyScalar(this.width * 0.8));
        this._addWireRow(plan,
            wireStart.clone().sub(this.position),
            wireEnd.clone().sub(this.position),
            0.85
        );
    }

    // ─── LINK : sacs le long du chemin zigzag (parapet des deux côtés) ───────
    _planLink(plan, mat) {
        const pts = this._zigzagPoints;

        for (let seg = 0; seg < pts.length - 1; seg++) {
            const A       = pts[seg];
            const B       = pts[seg + 1];
            const segLen  = A.distanceTo(B);
            const count   = Math.max(1, Math.floor(segLen / 0.52));
            const segDir  = new THREE.Vector3().subVectors(B, A).normalize();
            const perp    = new THREE.Vector3(-segDir.z, 0, segDir.x);

            // t global (0→1 sur toute la tranchée) pour le progressThreshold
            const tBase   = seg / (pts.length - 1);
            const tStep   = 1 / ((pts.length - 1) * count);

            for (let i = 0; i < count; i++) {
                // Marge aux jonctions pour ne pas empiler les sacs aux coudes
                if ((i === 0 && seg > 0) || (i === count - 1 && seg < pts.length - 2)) continue;

                const t       = tBase + i * tStep;
                const worldPt = new THREE.Vector3().lerpVectors(A, B, i / count);
                const local   = worldPt.clone().sub(this.position);

                // Un sac de chaque côté (couloir, pas de parapet orienté)
                for (const sign of [-1, 1]) {
                    const lp = local.clone().add(perp.clone().multiplyScalar(sign * this.width * 0.38));
                    this._addBag(plan, mat, lp, 0, t, 'LINK');
                    // Deuxième couche en quinconce (tous les 2)
                    if (i % 2 === 0) {
                        const lp2 = local.clone().add(perp.clone().multiplyScalar(sign * (this.width * 0.38 + 0.1)));
                        this._addBag(plan, mat, lp2, 1, t + 0.3, 'LINK');
                    }
                }
            }

            // Poteau de bois à chaque coude du zigzag
            if (seg > 0) {
                const local = pts[seg].clone().sub(this.position);
                this._addPost(plan, local, tBase);
            }
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    _addBag(plan, mat, localPos, layer, t, typeHint) {
        const mesh = new THREE.Mesh(BAG_GEO, mat.clone());
        mesh.position.copy(localPos);
        mesh.position.y = 0.17 + layer * 0.33 + (Math.random() - 0.5) * 0.04;

        // Légère rotation aléatoire + alignement sur le segment
        const baseAngle  = (typeHint === 'BUNKER') ? this.angle : this.angle;
        mesh.rotation.y  = baseAngle + (Math.random() - 0.5) * 0.45;

        // Légère inclinaison (sac pas parfaitement plat)
        mesh.rotation.z  = (Math.random() - 0.5) * 0.12;

        // Variation subtile de teinte (sacs usés différemment)
        mesh.material.color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);

        mesh.visible    = false;
        mesh.castShadow = true;
        this.mesh.add(mesh);
        plan.push({ mesh, progressThreshold: Math.min(0.98, t * 0.6 + layer * 0.35) });
    }

    _addPost(plan, localPos, threshold) {
        const postMat = new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 1 });
        const post    = new THREE.Mesh(POST_GEO, postMat);
        post.position.copy(localPos);
        post.position.y  = 0.7;
        post.rotation.z  = (Math.random() - 0.5) * 0.15; // légèrement penché
        post.visible     = false;
        post.castShadow  = true;
        this.mesh.add(post);
        plan.push({ mesh: post, progressThreshold: Math.min(0.98, threshold) });
    }

    /**
     * Ajoute une rangée de fil barbelé entre deux points locaux.
     * Représenté par un tube TubeGeometry fin avec des petites épines.
     */
    _addWireRow(plan, localA, localB, threshold) {
        const dir    = new THREE.Vector3().subVectors(localB, localA);
        const len    = dir.length();
        if (len < 1) return;

        // Fil principal : LineSegments (plus léger qu'un tube)
        const points = [];
        const segs   = Math.max(2, Math.floor(len / 1.5));
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            // Légère ondulation verticale
            const y = 0.55 + Math.sin(t * Math.PI * 3) * 0.08;
            points.push(new THREE.Vector3(
                localA.x + dir.x * t,
                y,
                localA.z + dir.z * t
            ));
        }
        const wireGeo = new THREE.BufferGeometry().setFromPoints(points);
        const wireMat = new THREE.LineBasicMaterial({ color: WIRE_COLOR });
        const wire    = new THREE.Line(wireGeo, wireMat);
        wire.visible  = false;
        this.mesh.add(wire);
        plan.push({ mesh: wire, progressThreshold: threshold });

        // Piquets de barbelé tous les ~2m
        const piketMat = new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 1 });
        const piketGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.9, 4);
        const piketCount = Math.max(2, Math.floor(len / 2));
        for (let i = 0; i <= piketCount; i++) {
            const t     = i / piketCount;
            const piket = new THREE.Mesh(piketGeo, piketMat.clone());
            piket.position.set(
                localA.x + dir.x * t,
                0.45,
                localA.z + dir.z * t
            );
            piket.rotation.z = (Math.random() - 0.5) * 0.2;
            piket.visible    = false;
            piket.castShadow = true;
            this.mesh.add(piket);
            plan.push({ mesh: piket, progressThreshold: threshold + 0.02 });
        }
    }

    // ── Ghost ─────────────────────────────────────────────────────────────────
    _showGhost() {
        if (this.type === 'LINK' && this._zigzagPoints) {
            // Pour les LINK, le ghost suit le chemin zigzag
            const pts = this._zigzagPoints.map(p => p.clone().sub(this.position));
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineBasicMaterial({
                color:   TEAM_COLORS[this.team],
                opacity: 0.5,
                transparent: true
            });
            this._ghost = new THREE.Line(geo, mat);
        } else {
            const geo = new THREE.BoxGeometry(this.length, 0.1, this.width);
            const mat = new THREE.MeshStandardMaterial({
                color:       TEAM_COLORS[this.team],
                transparent: true,
                opacity:     0.25,
                depthWrite:  false
            });
            this._ghost = new THREE.Mesh(geo, mat);
            this._ghost.position.set(0, 0.05, 0);
            if (this.type === 'TRENCH') this._ghost.lookAt(this.endWorld);
        }
        this.mesh.add(this._ghost);
    }

    // ── Dig / Terrain ─────────────────────────────────────────────────────────
    dig(amount) {
        if (this.isFinished) return;
        this.progress = Math.min(1, this.progress + amount);

        for (const item of this._buildPlan) {
            if (!item.mesh.visible && this.progress >= item.progressThreshold)
                item.mesh.visible = true;
        }

        const depth = this.depth * this.progress;

        if (this.type === 'BUNKER') {
            const p1 = this.position.clone().add(new THREE.Vector3(-this.width * 0.4, 0, 0));
            const p2 = this.position.clone().add(new THREE.Vector3( this.width * 0.4, 0, 0));
            this.terrain.applyTrench(p1, p2, this.width * 0.85, depth);
        } else if (this.type === 'LINK') {
            // Creuse segment par segment le long du zigzag
            const pts = this._zigzagPoints;
            for (let i = 0; i < pts.length - 1; i++) {
                this.terrain.applyTrench(pts[i], pts[i + 1], this.width * 0.75, depth * 0.8);
            }
        } else {
            this.terrain.applyTrench(this.startWorld, this.endWorld, this.width * 0.8, depth);
        }

        if (this.progress >= 1.0) this._onFinished();
    }

    _onFinished() {
        this.isFinished = true;
        this.builders   = [];
        if (this._ghost) {
            this.mesh.remove(this._ghost);
            if (this._ghost.geometry) this._ghost.geometry.dispose();
            this._ghost = null;
        }
    }

    update(deltaTime) {}
}

export default Fortification;