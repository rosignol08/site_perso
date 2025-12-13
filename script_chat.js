const API_URL = "https://robot.romaric.site"; // L'URL de votre serveur
const MODEL = "gemma3:4b";
const messagesBox = document.getElementById('messages-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusMessage = document.getElementById('status-message');

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
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender + '-message');

    // CAS 1 : C'est un message de l'IA (AI)
    if (sender === 'ai') {
        // --- DEBOGAGE MARKDOWN ---
        console.log("DEBUG: Message AI (BRUT Markdown) :", text);

        try {
            // Conversion Markdown vers HTML
            const htmlContent = marked.parse(text);

            console.log("DEBUG: Message AI (HTML généré) :", htmlContent);

            // Affichage du HTML
            messageDiv.innerHTML = htmlContent;

            messageDiv.classList.add('ai-markdown');
        } catch (e) {
            console.error("ERREUR lors du parsing Markdown :", e);
            messageDiv.textContent = "Erreur de formatage : " + text; // Afficher le brut en cas d'échec
        }
    }
    // CAS 2 : C'est un message de l'utilisateur (USER)
    else {
        console.log("DEBUG: Message Utilisateur :", text);
        messageDiv.textContent = text;
    }

    messagesBox.appendChild(messageDiv);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

/**
 * Envoie le message de l'utilisateur au serveur.
 */
async function sendMessage() {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    // 1. Pré-envoi
    userInput.value = '';
    sendButton.disabled = true;
    userInput.disabled = true;
    statusMessage.textContent = 'Envoi du message...';
    displayMessage(prompt, 'user');

    console.log(`DEBUG: Envoi de la requête au serveur : ${API_URL}/chat/ avec le prompt : "${prompt}"`);

    const payload = {
        prompt: prompt,
        model: MODEL,
        max_tokens: 3000,
        temperature: 0.7
    };

    try {
        statusMessage.textContent = 'Réflexion...';

        // 3. Appel à l'API
        const response = await fetch(`${API_URL}/chat/`, {
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

            displayMessage(content, 'ai');
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

// Ajouter l'écouteur pour la touche Entrée
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !sendButton.disabled) {
        sendMessage();
    }
});

// Focus initial sur le champ de saisie
document.addEventListener('DOMContentLoaded', () => {
    userInput.focus();
});