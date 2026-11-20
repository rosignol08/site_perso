const OLLAMA_URL = "https://robot.romaric.nl"; // L'URL du serveur backend
const LLAMACPP_MODEL = "qwen3.8-27b-turbo"; // Le modèle du serveur llama.cpp (routé via le backend)
const MODEL3 = "gemma4:26b";
const MODEL2 = "gemma4:e4b";
const MODEL = "gemma4:e2b"//"dolphin-phi:latest"; //gemma3:1b
const messagesBox = document.getElementById('messages-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusMessage = document.getElementById('status-message');
const modelToggle = document.getElementById('model-toggle');
const expertToggle = document.getElementById('expert-toggle');
const conversationsBtn = document.getElementById('conversations-btn');
const conversationsPanel = document.getElementById('conversations-panel');
const conversationsList = document.getElementById('conversations-list');
const currentConversationTitle = document.getElementById('current-conversation-title');

let currentModel = MODEL;
let isExpertMode = false;
let currentMessageDiv = null; // Pour le streaming
let currentConversationId = null; // ID de la conversation active

function toggleModel() {
    if (isExpertMode) return; // Ne pas changer de modèle en mode expert
    if (currentModel === MODEL) {
        currentModel = MODEL2;
    } else if (currentModel === MODEL2) {
        currentModel = MODEL3;
    } else {
        currentModel = MODEL;
    }
    updateModelButton();
    displayMessage(`Modèle changé vers: ${currentModel}`, 'system');
}

function toggleExpert() {
    isExpertMode = !isExpertMode;
    if (isExpertMode) {
        currentModel = LLAMACPP_MODEL;
        expertToggle.classList.add('active');
        expertToggle.textContent = '🚀 Expert ON';
        displayMessage('Mode expert activé : Qwen3.8 27B Turbo (Serveur Linux)', 'system');
    } else {
        currentModel = MODEL; // Toujours revenir au modèle par défaut
        expertToggle.classList.remove('active');
        expertToggle.textContent = '🚀 Expert';
        displayMessage('Mode expert désactivé : retour à ' + MODEL, 'system');
    }
    updateModelButton();
}

/**
 * Met à jour le texte du bouton
 */
function updateModelButton() {
    if (modelToggle) {
        if (isExpertMode) {
            modelToggle.textContent = "Modèle: Qwen3.8 27B Turbo";
            modelToggle.disabled = true;
            modelToggle.title = "Mode expert actif - modèle verrouillé";
        } else {
            modelToggle.textContent = `Modèle: ${currentModel}`;
            modelToggle.disabled = false;
            let nextModel;
            if (currentModel === MODEL) {
                nextModel = MODEL2;
            } else if (currentModel === MODEL2) {
                nextModel = MODEL3;
            } else {
                nextModel = MODEL;
            }
            modelToggle.title = `Cliquez pour changer (${nextModel})`;
        }
    }
}


// S'assurer que 'marked' est disponible au chargement
console.log("DEBUG: L'objet 'marked' est chargé :", typeof marked);
if (typeof marked === 'undefined') {
    console.error("ERREUR CRITIQUE: La librairie marked.js n'est pas chargée !");
}

// Mobile: dismiss keyboard when tapping outside input
document.addEventListener('touchstart', function(event) {
    if (event.target !== userInput && document.activeElement === userInput) {
        userInput.blur();
    }
});

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

    console.log(`DEBUG: Envoi de la requête au serveur (${currentModel}) avec le prompt : "${prompt}"`);
    const systemInstruction = "\nRéponds en français .";
    const finalPrompt = prompt + systemInstruction;
    
    console.log("DEBUG: Prompt final envoyé :", finalPrompt);
    
    try {
        statusMessage.textContent = 'Réflexion...';

        // 3. Appel à l'API (le backend route vers Ollama ou llama.cpp selon le modèle)
        await sendToOllamaStream(finalPrompt);
    } catch (error) {
        console.error('ERREUR DE CONNEXION GLOBALE:', error);
        displayMessage(`Erreur de connexion: ${error.message}`, 'system');
        statusMessage.textContent = 'Erreur de connexion.';
    } finally {
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
        currentMessageDiv = null;
    }
}

async function sendToOllamaStream(finalPrompt) {
    const payload = {
        prompt: finalPrompt,
        model: currentModel,
        max_tokens: 16000,
        temperature: 0.5
    };

    // Inclure l'ID de conversation pour la persistance
    const url = currentConversationId 
        ? `${OLLAMA_URL}/chat/?stream=true&session_id=${encodeURIComponent(currentConversationId)}`
        : `${OLLAMA_URL}/chat/?stream=true`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = `Erreur serveur: ${response.status} ${response.statusText}`;
        displayMessage(errorText, 'system');
        statusMessage.textContent = 'Erreur serveur.';
        return;
    }

    // Créer le message AI vide qui va être rempli progressivement
    currentMessageDiv = createStreamingMessage();

    // Lire le stream SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullContent = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Traiter les lignes SSE
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Garder la dernière ligne incomplète

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                    continue;
                }
                try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.delta || '';
                    fullContent += delta;
                    updateStreamingMessage(currentMessageDiv, fullContent);
                } catch (e) {
                    console.error('Erreur parsing SSE:', e);
                }
            }
        }
    }

    statusMessage.textContent = 'Prêt.';
}

function createStreamingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="avatar">IA</div>
            <div class="text ai-markdown"></div>
        </div>
    `;
    messagesBox.appendChild(messageDiv);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return messageDiv;
}

function updateStreamingMessage(messageDiv, content) {
    const textDiv = messageDiv.querySelector('.text');
    try {
        textDiv.innerHTML = marked.parse(content);
    } catch (e) {
        textDiv.textContent = content;
    }
    messagesBox.scrollTop = messagesBox.scrollHeight;
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

if (expertToggle) {
    expertToggle.addEventListener('click', toggleExpert);
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

// --- GESTION DES CONVERSATIONS ---

async function toggleConversations() {
    conversationsPanel.classList.toggle('visible');
    if (conversationsPanel.classList.contains('visible')) {
        await loadConversations();
    }
}

async function loadConversations() {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/conversations`);
        const data = await response.json();
        
        conversationsList.innerHTML = '';
        
        if (data.conversations.length === 0) {
            conversationsList.innerHTML = '<p style="text-align: center; color: var(--text-main); opacity: 0.6; padding: 20px;">Aucune conversation</p>';
            return;
        }
        
        data.conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'conversation-item' + (conv.id === currentConversationId ? ' active' : '');
            
            const title = conv.title || 'Nouvelle conversation';
            const date = new Date(conv.updated_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            
            item.innerHTML = `
                <div class="conversation-info">
                    <div class="conversation-title">${title}</div>
                    <div class="conversation-date">${date}</div>
                </div>
                <button class="conversation-delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" title="Supprimer">🗑️</button>
            `;
            
            item.addEventListener('click', () => switchConversation(conv.id));
            conversationsList.appendChild(item);
        });
    } catch (error) {
        console.error('Erreur chargement conversations:', error);
    }
}

async function createNewConversation() {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/conversations`, {
            method: 'POST'
        });
        const data = await response.json();
        
        currentConversationId = data.id;
        currentConversationTitle.textContent = data.title;
        
        // Vider la boîte de messages
        messagesBox.innerHTML = '';
        
        // Message de bienvenue
        displayMessage('Bonjour, comment puis-je vous aider ?', 'ai');
        
        // Fermer le panneau
        conversationsPanel.classList.remove('visible');
        
        // Recharger la liste
        await loadConversations();
    } catch (error) {
        console.error('Erreur création conversation:', error);
    }
}

async function switchConversation(conversationId) {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/conversations/${conversationId}`);
        const data = await response.json();
        
        currentConversationId = data.id;
        currentConversationTitle.textContent = data.title || 'Nouvelle conversation';
        
        // Vider la boîte de messages
        messagesBox.innerHTML = '';
        
        // Charger les messages
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                if (msg.role === 'user') {
                    displayMessage(msg.content, 'user');
                } else if (msg.role === 'assistant') {
                    displayMessage(msg.content, 'ai');
                }
            });
        } else {
            displayMessage('Bonjour, comment puis-je vous aider ?', 'ai');
        }
        
        // Fermer le panneau
        conversationsPanel.classList.remove('visible');
        
        // Recharger la liste
        await loadConversations();
    } catch (error) {
        console.error('Erreur chargement conversation:', error);
    }
}

async function deleteConversation(conversationId) {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/conversations/${conversationId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            if (conversationId === currentConversationId) {
                currentConversationId = null;
                currentConversationTitle.textContent = 'Nouvelle conversation';
                messagesBox.innerHTML = '';
                displayMessage('Bonjour, comment puis-je vous aider ?', 'ai');
            }
            
            await loadConversations();
        }
    } catch (error) {
        console.error('Erreur suppression conversation:', error);
    }
}

// Créer une conversation par défaut au chargement
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/conversations`);
        const data = await response.json();
        
        if (data.conversations.length > 0) {
            // Charger la dernière conversation
            const lastConv = data.conversations[0];
            switchConversation(lastConv.id);
        } else {
            // Créer une nouvelle conversation
            await createNewConversation();
        }
    } catch (error) {
        console.error('Erreur initialisation conversations:', error);
    }
});