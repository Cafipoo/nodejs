import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bodyParser from 'body-parser';
import { PrismaClient } from './generated/prisma/index.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const prisma = new PrismaClient();

// Équivalent de __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(express.static('public'));

// Configuration pour Twig
app.set('view engine', 'twig');
app.set('views', path.join(__dirname, 'view'));
app.get('/', function (req, res) {
   res.sendFile(path.join(__dirname,"index.html"));
})

// Route pour entrer dans le chat
app.post('/enter_chat', urlencodedParser, function (req, res) {
   const pseudo = req.body.pseudo;
   // Redirection vers une route GET avec le pseudo en paramètre
   res.redirect('/chat?pseudo=' + encodeURIComponent(pseudo));
});

// Route GET pour afficher le chat
app.get('/chat', async function (req, res) {
   const pseudo = req.query.pseudo;
   if (!pseudo) {
      // Si pas de pseudo, rediriger vers la page d'accueil
      res.redirect('/');
      return;
   }
   
   try {
      // Récupérer les messages existants depuis la base de données
      const messages = await prisma.message.findMany({
         orderBy: {
            createdAt: 'asc'
         },
         take: 50 // Limiter à 50 messages récents
      });
      
      // Formatter les messages pour le template
      const formattedMessages = messages.map(msg => ({
         pseudo: msg.pseudo,
         text: msg.content,
         timestamp: msg.createdAt
      }));
      
      res.render('chat', { pseudo: pseudo, messages: formattedMessages });
   } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      res.render('chat', { pseudo: pseudo, messages: [] });
   }
});

// Route pour envoyer un message (gardée pour compatibilité)
app.post('/send_message', urlencodedParser, async function (req, res) {
   const pseudo = req.body.pseudo;
   const message = req.body.message;
   
   try {
      // Sauvegarder le message en base de données
      const savedMessage = await prisma.message.create({
         data: {
            pseudo: pseudo,
            content: message
         }
      });
      
      // Formatter le message pour l'émission
      const formattedMessage = {
         pseudo: savedMessage.pseudo,
         text: savedMessage.content,
         timestamp: savedMessage.createdAt
      };
      
      // Émettre le message à tous les clients connectés
      io.emit('new_message', formattedMessage);
      
      // Redirection pour éviter le message de rafraîchissement
      res.redirect('/chat?pseudo=' + encodeURIComponent(pseudo));
   } catch (error) {
      console.error('Erreur lors de la sauvegarde du message:', error);
      res.redirect('/chat?pseudo=' + encodeURIComponent(pseudo));
   }
});

// Gestion des connexions Socket.IO
io.on('connection', async function(socket) {
   console.log('Un utilisateur s\'est connecté');
   
   // Envoyer les messages existants au nouvel utilisateur
   try {
      const recentMessages = await prisma.message.findMany({
         orderBy: {
            createdAt: 'asc'
         },
         take: 50 // Limiter à 50 messages récents
      });
      
      const formattedMessages = recentMessages.map(msg => ({
         pseudo: msg.pseudo,
         text: msg.content,
         timestamp: msg.createdAt
      }));
      
      // Envoyer uniquement au client qui vient de se connecter
      socket.emit('load_messages', formattedMessages);
   } catch (error) {
      console.error('Erreur lors du chargement des messages pour le socket:', error);
   }
   
   // Écouter les nouveaux messages
   socket.on('send_message', async function(data) {
      try {
         // Sauvegarder le message en base de données
         const savedMessage = await prisma.message.create({
            data: {
               pseudo: data.pseudo,
               content: data.message
            }
         });
         
         const formattedMessage = {
            pseudo: savedMessage.pseudo,
            text: savedMessage.content,
            timestamp: savedMessage.createdAt
         };
         
         // Émettre le message à tous les clients connectés
         io.emit('new_message', formattedMessage);
      } catch (error) {
         console.error('Erreur lors de la sauvegarde du message via socket:', error);
      }
   });
   
   socket.on('disconnect', function() {
      console.log('Un utilisateur s\'est déconnecté');
   });
});

server.listen(5000, function () {
   console.log("Express App running at http://127.0.0.1:5000/");
});

// Gestion de la fermeture propre de Prisma
process.on('beforeExit', async () => {
   await prisma.$disconnect();
});

process.on('SIGINT', async () => {
   await prisma.$disconnect();
   process.exit(0);
});

process.on('SIGTERM', async () => {
   await prisma.$disconnect();
   process.exit(0);
});