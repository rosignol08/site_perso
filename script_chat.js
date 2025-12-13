const API_URL = "https://robot.romaric.site"; // L'URL de votre serveur
const MODEL = "gemma3:4b";
const messagesBox = document.getElementById('messages-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusMessage = document.getElementById('status-message');

/**
 * Ajoute un nouveau message à la boîte de dialogue.
 * @param {string} text - Le contenu du message (potentiellement en Markdown).
 * @param {string} sender - 'user' ou 'ai'.
 */
function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender + '-message');
    
    if (sender === 'ai') {
        // C'est la ligne magique : convertir le Markdown en HTML
        messageDiv.innerHTML = marked.parse(text); 
        
        // Optionnel: Ajouter une classe spécifique pour styliser le Markdown
        messageDiv.classList.add('ai-markdown'); 
    } else {
        // Pour les utilisateurs, on utilise textContent pour la sécurité
        messageDiv.textContent = text;
    }
    
    messagesBox.appendChild(messageDiv);
    
    // Scroller automatiquement vers le bas
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

/**
 * Envoie le message de l'utilisateur au serveur.
 */
async function sendMessage() {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    // 1. Désactiver l'interface et afficher le message utilisateur
    userInput.value = ''; // Vider le champ
    sendButton.disabled = true;
    userInput.disabled = true;
    statusMessage.textContent = 'Envoi du message...';
    displayMessage(prompt, 'user');

    // 2. Préparer la requête POST
    const payload = {
        prompt: prompt,
        model: MODEL,
        max_tokens: 3000,
        temperature: 0.7
    };

    try {
        statusMessage.textContent = 'Réflexion...';
        
        // 3. Appel à l'API (Endpoint /chat/ du serveur)
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
            // Assurez-vous que le chemin d'accès au contenu est correct
            const content = data.message?.content || "Désolé, je n'ai pas pu obtenir de réponse.";
            
            displayMessage(content, 'ai');
            statusMessage.textContent = 'Prêt.';
        } else {
            const errorText = `Erreur serveur: ${response.status} ${response.statusText}`;
            displayMessage(errorText, 'system');
            statusMessage.textContent = 'Erreur serveur.';
        }

    } catch (error) {
        // 5. Gérer les erreurs de connexion
        console.error('Erreur de connexion:', error);
        displayMessage(`Erreur de connexion: ${error.message}`, 'system');
        statusMessage.textContent = 'Erreur de connexion.';
    } finally {
        // 6. Réactiver l'interface
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus(); // Rendre le champ de saisie actif
    }
}

// Ajouter l'écouteur pour la touche Entrée (rend l'utilisation plus rapide)
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !sendButton.disabled) {
        sendMessage();
    }
});

// Focus initial sur le champ de saisie
document.addEventListener('DOMContentLoaded', () => {
    userInput.focus();
});