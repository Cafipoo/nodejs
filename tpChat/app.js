import express from 'express';
import twig from 'twig';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Pour obtenir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration Express
const app = express();

// Config Twig
app.set('views', join(__dirname, 'view'));
app.set('view engine', 'twig');
app.engine('twig', twig.renderFile);

// Fichiers statiques
app.use(express.static(join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Route principale
app.get('/', (req, res) => {
  res.render('chat', { pseudo: '', messages: [] });
});

export default app;
