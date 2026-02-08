const API_URL = "https://robot.romaric.site"; // L'URL du serveur
const MODEL2 = "gemma3:4b";
const MODEL = "gemma3:1b";
const messagesBox = document.getElementById('messages-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusMessage = document.getElementById('status-message');
const modelToggle = document.getElementById('model-toggle');

let currentModel = MODEL;

function toggleModel() {
    currentModel = currentModel === MODEL ? MODEL2 : MODEL;
    updateModelButton();
    displayMessage(`Modèle changé vers: ${currentModel}`, 'system');
}

/**
 * Met à jour le texte du bouton
 */
function updateModelButton() {
    if (modelToggle) {
        modelToggle.textContent = `Modèle: ${currentModel}`;
        modelToggle.title = `Cliquez pour changer (${currentModel === MODEL ? MODEL2 : MODEL})`;
    }
}


// S'assurer que 'marked' est disponible au chargement
console.log("DEBUG: L'objet 'marked' est chargé :", typeof marked);
if (typeof marked === 'undefined') {
    console.error("ERREUR CRITIQUE: La librairie marked.js n'est pas chargée !");
}

/**
 * Ajoute un nouveau message à la boîte de dialogue.
 * @param {string} text - Le contenu du message (potentiellement en Markdown).
 * @param {string} sender - 'user' ou 'ai'.
 */
function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    // Ajoute les classes : 'message' et 'user-message' ou 'ai-message'
    messageDiv.className = `message ${sender}-message`;

    // 1. Déterminer l'avatar (Lettre ou Icône)
    // ChatGPT utilise des carrés de couleur avec une icône ou une lettre
    const avatarLabel = sender === 'ai' ? 'IA' : 'U'; 

    // 2. Préparer le contenu HTML du texte
    let contentHtml = '';
    
    if (sender === 'ai') {
        try {
            // Conversion Markdown pour l'IA
            contentHtml = marked.parse(text);
        } catch (e) {
            console.error("Erreur Markdown:", e);
            contentHtml = text;
        }
    } else {
        // Pour l'utilisateur, on évite le HTML brut pour la sécurité, 
        // mais on garde les sauts de ligne
        contentHtml = text.replace(/\n/g, '<br>');
    }

    // 3. Construction du HTML interne (Structure ChatGPT)
    // C'est ici que la magie visuelle opère : une div pour le contenu centré qui contient Avatar + Texte
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="avatar">${avatarLabel}</div>
            <div class="text ai-markdown">${contentHtml}</div>
        </div>
    `;

    // 4. Ajout au DOM
    messagesBox.appendChild(messageDiv);
    
    // Scroll automatique vers le bas (sur le document ou la box selon le CSS)
    // Avec le style ChatGPT, c'est souvent le 'messagesBox' ou 'window' qui scroll.
    // Ici on assure le scroll sur la box :
    messagesBox.scrollTop = messagesBox.scrollHeight;
    // Et aussi sur la fenêtre principale au cas où :
    window.scrollTo(0, document.body.scrollHeight);
}

/**
 * Envoie le message de l'utilisateur au serveur.
 */

// Générer un ID de session aléatoire pour cet onglet
const SESSION_ID = "user_" + Math.random().toString(36).substring(7);

async function sendMessage() {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    // 1. Pré-envoi
    userInput.value = '';
    sendButton.disabled = true;
    userInput.disabled = true;
    statusMessage.textContent = 'Envoi du message...';
    displayMessage(prompt, 'user');

    console.log(`DEBUG: Envoi de la requête au serveur : ${API_URL}/chat/?session_id=${SESSION_ID} avec le prompt : "${prompt}"`);
    const systemInstruction = "\nRéponds en français et en mode drague en surnommant l'utilisateur 'princesse'.";
    const finalPrompt = prompt + systemInstruction;
    
    console.log("DEBUG: Prompt final envoyé :", finalPrompt);
    const payload = {
        prompt: finalPrompt,
        model: currentModel,
        max_tokens: 3000,
        temperature: 0.7
    };

    try {
        statusMessage.textContent = 'Réflexion...';

        // 3. Appel à l'API
        const response = await fetch(`${API_URL}/chat/?session_id=${SESSION_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // 4. Traiter la réponse
        if (response.ok) {
            const data = await response.json();

            // --- DEBOGAGE DE LA RÉPONSE SERVEUR ---
            console.log("DEBUG: Réponse JSON du serveur :", data);

            const content = data.message?.content || "Désolé, je n'ai pas pu obtenir de réponse.";

            // --- DEBOGAGE DU CONTENU EXTRAIT ---
            console.log("DEBUG: Contenu texte extrait (prêt pour Markdown) :", content);

            displayMessage(content, 'ai');//affiche le message de l'IA
            statusMessage.textContent = 'Prêt.';
        } else {
            console.error(`ERREUR SERVEUR: ${response.status} ${response.statusText}`);
            const errorText = `Erreur serveur: ${response.status} ${response.statusText}`;
            displayMessage(errorText, 'system');
            statusMessage.textContent = 'Erreur serveur.';
        }
    } catch (error) {
        console.error('ERREUR DE CONNEXION GLOBALE:', error);
        displayMessage(`Erreur de connexion: ${error.message}`, 'system');
        statusMessage.textContent = 'Erreur de connexion.';
    } finally {
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

function appendMessage(sender, text) {
    const messagesBox = document.getElementById('messages-box');
    
    // Créer la div principale
    const messageDiv = document.createElement('div');
    // Définir la classe (user-message ou ai-message)
    const className = sender === 'user' ? 'user-message' : 'ai-message';
    messageDiv.className = `message ${className}`;

    // Définir l'avatar (Initiale ou icône)
    const avatarLabel = sender === 'user' ? 'U' : 'IA'; // Tu peux mettre une balise <img> ici

    // Convertir le markdown si c'est l'IA
    const contentHtml = sender === 'user' ? text : marked.parse(text);

    // Structure HTML interne style ChatGPT
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="avatar">${avatarLabel}</div>
            <div class="text ai-markdown">${contentHtml}</div>
        </div>
    `;

    messagesBox.appendChild(messageDiv);
    
    // Auto-scroll vers le bas
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

if (modelToggle) {
    modelToggle.addEventListener('click', toggleModel);
}

document.addEventListener('DOMContentLoaded', () => {
    userInput.focus();
    updateModelButton();
});

// l'écouteur pour la touche Entrée
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !sendButton.disabled) {
        sendMessage();
    }
});

// Focus initial sur le champ de saisie
document.addEventListener('DOMContentLoaded', () => {
    userInput.focus();
});