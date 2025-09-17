const socket = io();

const pseudoContainer = document.getElementById('pseudo-container');
const chatContainer = document.getElementById('chat-container');
const pseudoInput = document.getElementById('pseudo-input');
const pseudoSubmit = document.getElementById('pseudo-submit');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messages = document.getElementById('messages');

let pseudo = null;

// Gestion de la saisie du pseudo
if (pseudoSubmit) {
  pseudoSubmit.addEventListener('click', () => {
    const val = pseudoInput.value.trim();
    if (val) {
      pseudo = val;
      pseudoContainer.style.display = 'none';
      chatContainer.style.display = 'block';
      messageInput.focus();
    }
  });
}

// Gestion de l'envoi de messages
if (messageForm) {
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pseudo) {
      alert('Veuillez d\'abord entrer un pseudo');
      return;
    }
    if (messageInput.value.trim()) {
      socket.emit('chat message', {
        pseudo,
        message: messageInput.value
      });
      messageInput.value = '';
    }
  });
}

// Réception des nouveaux messages
socket.on('chat message', (data) => {
  const li = document.createElement('li');
  li.className = 'message';
  li.innerHTML = `<span class="pseudo">${data.pseudo}:</span> ${data.message}`;
  messages.appendChild(li);
  
  // Faire défiler vers le bas
  messages.scrollTop = messages.scrollHeight;
});

// Réception de l'historique des messages
socket.on('chat history', (msgs) => {
  // Vider les messages existants
  messages.innerHTML = '';
  // Ajouter tous les messages de l'historique
  msgs.forEach(data => {
    const li = document.createElement('li');
    li.className = 'message';
    li.innerHTML = `<span class="pseudo">${data.pseudo}:</span> ${data.content}`;
    messages.appendChild(li);
  });
  
  // Faire défiler vers le bas
  messages.scrollTop = messages.scrollHeight;
});