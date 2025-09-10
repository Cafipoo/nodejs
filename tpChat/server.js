import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from './generated/prisma/index.js';
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const prisma = new PrismaClient();

// Serveur HTTP avec l'app Express
const httpServer = createServer(app);
const io = new Server(httpServer);

// Pour les tests, on peut utilise run echo simple
io.on('connection', (socket) => {
  socket.on('message', (data) => {
    socket.emit('message', data);
  });
});

// Socket.IO
io.on('connection', async (socket) => {
  console.log('Un utilisateur connecté');

  // Récupérer les derniers messages (par exemple, les 50 plus récents)
  try {
    const lastMessages = await prisma.message.findMany({
      orderBy: { createdAt: 'asc' },  // ou 'desc' puis inverser côté client
      take: 50,
    });
    // Envoyer l'historique au client connecté
    socket.emit('chat history', lastMessages);
  } catch (err) {
    console.error('Erreur récupération historique:', err);
  }

  socket.on('chat message', async (data) => {
    try {
      await prisma.message.create({
        data: {
          pseudo: data.pseudo,
          content: data.message,
        },
      });
    } catch (err) {
      console.error('Erreur sauvegarde message:', err);
    }
    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur déconnecté');
  });
});



// Export pour les tests
export { httpServer };

// Démarrage
const PORT = process.env.PORT || 3000;
// Ne démarre le serveur que si ce n'est pas un test
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
  });
}