var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var { Server } = require('socket.io');
var io = new Server(server);
var path = require('path');

var bodyParser = require('body-parser');
// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use(express.static('public'));

// Configuration pour Twig
app.set('view engine', 'twig');
app.set('views', path.join(__dirname, 'view'));

// Stockage des messages en mémoire
var messages = [];

app.get('/', function (req, res) {
   res.sendFile(path.join(__dirname,"index.html"));
})

// Route pour entrer dans le chat
app.post('/enter_chat', urlencodedParser, function (req, res) {
   var pseudo = req.body.pseudo;
   // Redirection vers une route GET avec le pseudo en paramètre
   res.redirect('/chat?pseudo=' + encodeURIComponent(pseudo));
});

// Route GET pour afficher le chat
app.get('/chat', function (req, res) {
   var pseudo = req.query.pseudo;
   if (!pseudo) {
      // Si pas de pseudo, rediriger vers la page d'accueil
      res.redirect('/');
      return;
   }
   res.render('chat', { pseudo: pseudo, messages: [] });
});

// Route pour envoyer un message (gardée pour compatibilité)
app.post('/send_message', urlencodedParser, function (req, res) {
   var pseudo = req.body.pseudo;
   var message = req.body.message;
   
   // Créer le message sans le stocker
   var newMessage = {
      pseudo: pseudo,
      text: message,
      timestamp: new Date()
   };
   
   // Émettre le message à tous les clients connectés
   io.emit('new_message', newMessage);
   
   // Redirection pour éviter le message de rafraîchissement
   res.redirect('/chat?pseudo=' + encodeURIComponent(pseudo));
});

// Gestion des connexions Socket.IO
io.on('connection', function(socket) {
   console.log('Un utilisateur s\'est connecté');
   
   // NE PAS envoyer les messages existants - les messages disparaissent au rafraîchissement
   
   // Écouter les nouveaux messages
   socket.on('send_message', function(data) {
      var newMessage = {
         pseudo: data.pseudo,
         text: data.message,
         timestamp: new Date()
      };
      
      // NE PAS stocker le message - il sera perdu au rafraîchissement
      // messages.push(newMessage);
      
      // Émettre le message à tous les clients connectés (seulement pour cette session)
      io.emit('new_message', newMessage);
   });
   
   socket.on('disconnect', function() {
      console.log('Un utilisateur s\'est déconnecté');
   });
});

server.listen(5000, function () {
   console.log("Express App running at http://127.0.0.1:5000/");
})