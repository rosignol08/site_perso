// --- CONFIGURATION ---
const buttons = document.querySelectorAll('.space-button');
const friction = 1.0; 
const bounceFactor = 0.9; 

// Initialisation des objets
const floatingElements = Array.from(buttons).map(el => {
    const rect = el.getBoundingClientRect();
    // On calcule un rayon approximatif (moyenne largeur/hauteur divisée par 2)
    // On ajoute une petite marge (10px) pour qu'ils ne se chevauchent pas trop
    const radius = (Math.max(rect.width, rect.height) / 2) * 0.8; 

    // Position aléatoire sécurisée
    const x = Math.random() * (window.innerWidth - rect.width);
    const y = Math.random() * (window.innerHeight - rect.height);
    
    return {
        el: el,
        width: rect.width,
        height: rect.height,
        radius: radius, // Nouveau : Rayon de collision
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0
    };
});

// --- GESTION DES COLLISIONS ENTRE BOUTONS ---
function handleCollisions() {
    for (let i = 0; i < floatingElements.length; i++) {
        for (let j = i + 1; j < floatingElements.length; j++) {
            const p1 = floatingElements[i];
            const p2 = floatingElements[j];

            // Si l'un des deux est en train d'être dragué, on ignore la physique entre eux
            // (Optionnel : tu peux l'enlever si tu veux pousser les autres avec celui que tu tiens)
            if (p1.isDragging || p2.isDragging) continue;

            // Calcul du centre des boutons
            const center1X = p1.x + p1.width / 2;
            const center1Y = p1.y + p1.height / 2;
            const center2X = p2.x + p2.width / 2;
            const center2Y = p2.y + p2.height / 2;

            // Distance entre les deux centres
            const dx = center2X - center1X;
            const dy = center2Y - center1Y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Somme des rayons (distance minimale acceptable)
            const minDistance = p1.radius + p2.radius;

            // --- COLLISION DÉTECTÉE ---
            if (distance < minDistance) {
                
                // 1. CALCUL DE L'ANGLE ET DE LA FORCE
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                // 2. SÉPARATION (Anti-Stick)
                // On les repousse pour qu'ils ne se chevauchent plus
                const overlap = minDistance - distance;
                const separationX = overlap * cos * 0.5;
                const separationY = overlap * sin * 0.5;

                p1.x -= separationX;
                p1.y -= separationY;
                p2.x += separationX;
                p2.y += separationY;

                // 3. REBOND (Échange de vélocité)
                // Rotation des vélocités
                const v1 = { x: p1.vx * cos + p1.vy * sin, y: p1.vy * cos - p1.vx * sin };
                const v2 = { x: p2.vx * cos + p2.vy * sin, y: p2.vy * cos - p2.vx * sin };

                // Échange des vitesses sur l'axe de collision (x)
                // v1.y et v2.y ne changent pas (tangente)
                const vFinal1 = { x: v2.x, y: v1.y };
                const vFinal2 = { x: v1.x, y: v2.y };

                // Rotation inverse pour revenir aux axes normaux
                p1.vx = vFinal1.x * cos - vFinal1.y * sin;
                p1.vy = vFinal1.y * cos + vFinal1.x * sin;
                p2.vx = vFinal2.x * cos - vFinal2.y * sin;
                p2.vy = vFinal2.y * cos + vFinal2.x * sin;
                
                // Petite perte d'énergie (bruit d'impact)
                p1.vx *= bounceFactor; p1.vy *= bounceFactor;
                p2.vx *= bounceFactor; p2.vy *= bounceFactor;
            }
        }
    }
}

// --- BOUCLE D'ANIMATION ---
function animate() {
    
    // Vérifier les collisions entre boutons AVANT de bouger
    handleCollisions();

    floatingElements.forEach(item => {
        if (!item.isDragging) {
            item.x += item.vx;
            item.y += item.vy;

            // --- REBONDS MURS ---
            if (item.x + item.width >= window.innerWidth) {
                item.vx *= -1;
                item.x = window.innerWidth - item.width;
            } else if (item.x <= 0) {
                item.vx *= -1;
                item.x = 0;
            }

            if (item.y + item.height >= window.innerHeight) {
                item.vy *= -1;
                item.y = window.innerHeight - item.height;
            } else if (item.y <= 0) {
                item.vy *= -1;
                item.y = 0;
            }
            
            item.vx *= friction;
            item.vy *= friction;
        }

        item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
    });

    requestAnimationFrame(animate);
}

animate();

// --- DRAG & DROP (Code inchangé) ---
let activeItem = null;

document.addEventListener('mousedown', (e) => {
    const targetEl = e.target.closest('.space-button');
    if (!targetEl) return;

    const targetItem = floatingElements.find(item => item.el === targetEl);
    if (targetItem) {
        e.preventDefault();
        activeItem = targetItem;
        activeItem.isDragging = true;
        activeItem.lastMouseX = e.clientX;
        activeItem.lastMouseY = e.clientY;
        activeItem.vx = 0;
        activeItem.vy = 0;
        activeItem.el.style.cursor = 'grabbing';
    }
});

document.addEventListener('mousemove', (e) => {
    if (activeItem) {
        const dx = e.clientX - activeItem.lastMouseX;
        const dy = e.clientY - activeItem.lastMouseY;
        activeItem.x += dx;
        activeItem.y += dy;
        activeItem.vx = dx; 
        activeItem.vy = dy;
        activeItem.lastMouseX = e.clientX;
        activeItem.lastMouseY = e.clientY;
        activeItem.el.style.transform = `translate3d(${activeItem.x}px, ${activeItem.y}px, 0)`;
    }
});

document.addEventListener('mouseup', () => {
    if (activeItem) {
        activeItem.isDragging = false;
        activeItem.el.style.cursor = 'grab';
        const wasThrown = Math.abs(activeItem.vx) > 3 || Math.abs(activeItem.vy) > 3;
        if (wasThrown) {
            const clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                activeItem.el.removeEventListener('click', clickHandler, true);
            };
            activeItem.el.addEventListener('click', clickHandler, true);
            setTimeout(() => {
                activeItem.el.removeEventListener('click', clickHandler, true);
            }, 100);
        }
        activeItem = null;
    }
});