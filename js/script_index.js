// --- CONFIGURATION ---
const buttons = document.querySelectorAll('.space-button');
const friction = 0.99999; 
const bounceFactor = 0.9; 
const max_vitesse = 7.0;
// Initialisation
const floatingElements = Array.from(buttons).map(el => {
    const rect = el.getBoundingClientRect();
    const radius = (Math.max(rect.width, rect.height) / 2) * 0.85; 

    const item = {
        el: el,
        width: rect.width,
        height: rect.height,
        radius: radius,
        x: Math.random() * (window.innerWidth - rect.width),
        y: Math.random() * (window.innerHeight - rect.height),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        // Nouveaux paramètres pour le Timer
        isDragging: false,
        isFrozen: false,     // L'état "arrêté"
        hoverTimeout: null,  // Le chrono
        savedVx: 0,          // Pour mémoriser la vitesse
        savedVy: 0,
        lastMouseX: 0,
        lastMouseY: 0
    };

    // --- GESTION DU TIMER 0.2s ---
    el.addEventListener('mouseenter', () => {
        // On lance le compte à rebours
        item.hoverTimeout = setTimeout(() => {
            item.isFrozen = true;
            el.classList.add('frozen'); // Active le CSS (description)
            
            // On sauvegarde la vitesse actuelle pour la restituer plus tard
            item.savedVx = item.vx;
            item.savedVy = item.vy;
            
            // STOP !
            item.vx = 0;
            item.vy = 0;
        }, 200); // 200ms = 0.2 secondes
    });

    el.addEventListener('mouseleave', () => {
        // Si on part, on annule le chrono (si on est resté moins de 0.2s)
        if (item.hoverTimeout) {
            clearTimeout(item.hoverTimeout);
            item.hoverTimeout = null;
        }

        // Si le bouton était arrêté, on le libère
        if (item.isFrozen) {
            item.isFrozen = false;
            el.classList.remove('frozen');
            
            // On lui rend sa vitesse d'avant (pour qu'il reparte comme si de rien n'était)
            item.vx = item.savedVx;
            item.vy = item.savedVy;
            
            // Petite sécurité : s'il n'avait pas de vitesse, on lui donne une petite poussée
            if (Math.abs(item.vx) < 0.1 && Math.abs(item.vy) < 0.1) {
                item.vx = (Math.random() - 0.5);
                item.vy = (Math.random() - 0.5);
            }
        }
    });

    return item;
});

// --- GESTION DES COLLISIONS ---
function handleCollisions() {
    for (let i = 0; i < floatingElements.length; i++) {
        for (let j = i + 1; j < floatingElements.length; j++) {
            const p1 = floatingElements[i];
            const p2 = floatingElements[j];

            if (p1.isDragging || p2.isDragging) continue;

            const dx = (p2.x + p2.width/2) - (p1.x + p1.width/2);
            const dy = (p2.y + p2.height/2) - (p1.y + p1.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = p1.radius + p2.radius;

            if (distance < minDistance) {
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);
                const overlap = minDistance - distance;

                // --- LOGIQUE MODIFIÉE : On utilise isFrozen ---
                
                // Cas 1 : P1 est gelé (Mur) -> P2 rebondit
                if (p1.isFrozen && !p2.isFrozen) {
                    p2.x += overlap * cos;
                    p2.y += overlap * sin;
                    p2.vx = -p2.vx * bounceFactor;
                    p2.vy = -p2.vy * bounceFactor;
                }
                // Cas 2 : P2 est gelé (Mur) -> P1 rebondit
                else if (p2.isFrozen && !p1.isFrozen) {
                    p1.x -= overlap * cos;
                    p1.y -= overlap * sin;
                    p1.vx = -p1.vx * bounceFactor;
                    p1.vy = -p1.vy * bounceFactor;
                }
                // Cas 3 : Collision normale (personne n'est gelé ou les deux le sont)
                else if (!p1.isFrozen && !p2.isFrozen) {
                    const separationX = overlap * cos * 0.5;
                    const separationY = overlap * sin * 0.5;
                    p1.x -= separationX; p1.y -= separationY;
                    p2.x += separationX; p2.y += separationY;

                    const v1 = { x: p1.vx * cos + p1.vy * sin, y: p1.vy * cos - p1.vx * sin };
                    const v2 = { x: p2.vx * cos + p2.vy * sin, y: p2.vy * cos - p2.vx * sin };
                    const vFinal1 = { x: v2.x, y: v1.y };
                    const vFinal2 = { x: v1.x, y: v2.y };

                    p1.vx = (vFinal1.x * cos - vFinal1.y * sin) * bounceFactor;
                    p1.vy = (vFinal1.y * cos + vFinal1.x * sin) * bounceFactor;
                    p2.vx = (vFinal2.x * cos - vFinal2.y * sin) * bounceFactor;
                    p2.vy = (vFinal2.y * cos + vFinal2.x * sin) * bounceFactor;
                    // Limiter la vitesse maximale
                    const speed1 = Math.sqrt(p1.vx * p1.vx + p1.vy * p1.vy);
                    if (speed1 > max_vitesse) {
                        p1.vx = (p1.vx / speed1) * max_vitesse;
                        p1.vy = (p1.vy / speed1) * max_vitesse;
                    }

                    const speed2 = Math.sqrt(p2.vx * p2.vx + p2.vy * p2.vy);
                    if (speed2 > max_vitesse) {
                        p2.vx = (p2.vx / speed2) * max_vitesse;
                        p2.vy = (p2.vy / speed2) * max_vitesse;
                    }
                }
            }
        }
    }
}

function animate() {
    handleCollisions();

    floatingElements.forEach(item => {
        // On ne bouge pas si dragué OU si gelé par le timer
        if (!item.isDragging && !item.isFrozen) {
            item.x += item.vx;
            item.y += item.vy;

            // Rebond murs
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
        // Si on attrape un bouton gelé, on annule le gel pour pouvoir le bouger
        if (targetItem.hoverTimeout) clearTimeout(targetItem.hoverTimeout);
        targetItem.isFrozen = false;
        targetItem.el.classList.remove('frozen');
        
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