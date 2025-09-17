const socket = io();

const pseudoContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('loginForm');
const pseudoInput = document.getElementById('login-pseudo');
const passwordInput = document.getElementById('login-password');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messages = document.getElementById('messages');
const quitLink = document.querySelector('a.quit-link');

let pseudo = null;

// Gestion du formulaire de connexion
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      pseudo: (pseudoInput && pseudoInput.value || '').trim(),
      password: (passwordInput && passwordInput.value || ''),
    };
    if (!body.pseudo || !body.password) {
      alert('Veuillez entrer le pseudo et le mot de passe');
      return;
    }
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.message || 'Échec de la connexion');
        return;
      }
      pseudo = data.pseudo;
      pseudoContainer.style.display = 'none';
      chatContainer.style.display = 'block';
      messageInput && messageInput.focus();
    } catch (err) {
      console.error('Erreur de connexion', err);
      alert('Erreur de connexion');
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

// Déconnexion
if (quitLink) {
  quitLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/logout', { method: 'GET', credentials: 'same-origin' });
    } catch (_) {}
    window.location.href = '/';
  });
}

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