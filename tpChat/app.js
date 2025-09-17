import express from 'express';
import twig from 'twig';
import session from 'express-session';
import dotenv from 'dotenv';
import cors from 'cors';
import { PrismaClient } from './generated/prisma/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Pour obtenir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charge les variables d'environnement
dotenv.config();

// Configuration Express
const app = express();

// Trust proxy for correct secure cookies behind proxies/load balancers
app.set('trust proxy', 1);

// Prisma
const prisma = new PrismaClient();

// Config Twig
app.set('views', join(__dirname, 'view'));
app.set('view engine', 'twig');
app.engine('twig', twig.renderFile);

// FRONT_URL-driven config for CORS and cookies
const FRONT_URL = process.env.FRONT_URL;
let cookieSecure = false;
let cookieSameSite = 'lax';
try {
  if (FRONT_URL) {
    const parsed = new URL(FRONT_URL);
    if (parsed.protocol === 'https:') {
      cookieSecure = true;
      cookieSameSite = 'none';
    }
  }
} catch (_) {
  // ignore invalid FRONT_URL
}

const corsOptions = {
  origin: FRONT_URL || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
    },
  })
);

// Route principale
app.get('/', async (req, res) => {
  try {
    const user = req.session && req.session.user ? req.session.user : null;
    if (!user) {
      return res.render('chat', { pseudo: '', messages: [] });
    }

    const lastMessages = await prisma.message.findMany({
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return res.render('chat', { pseudo: user.pseudo, messages: lastMessages });
  } catch (err) {
    console.error('Erreur chargement page /:', err);
    return res.status(500).send('Erreur serveur');
  }
});

// Inscription: GET /register
app.get('/register', (req, res) => {
  try {
    const user = req.session && req.session.user ? req.session.user : null;
    if (user) {
      return res.redirect('/');
    }
    return res.render('register', { error: '', pseudo: '', email: '' });
  } catch (err) {
    console.error('Erreur /register GET:', err);
    return res.status(500).send('Erreur serveur');
  }
});

// Inscription: POST /register
app.post('/register', async (req, res) => {
  try {
    const { pseudo, email, password } = req.body || {};
    if (!pseudo || !email || !password) {
      return res.status(400).render('register', {
        error: 'Tous les champs sont requis',
        pseudo: pseudo || '',
        email: email || '',
      });
    }

    const existing = await prisma.user.findFirst({ where: { pseudo } });
    if (existing) {
      return res.status(409).render('register', {
        error: 'Ce pseudo est déjà utilisé',
        pseudo,
        email,
      });
    }

    const created = await prisma.user.create({
      data: { pseudo, email, password, IsActive: true },
    });

    req.session.user = { id: created.id, pseudo: created.pseudo };
    return res.redirect('/');
  } catch (err) {
    console.error('Erreur /register POST:', err);
    return res.status(500).render('register', {
      error: 'Erreur serveur',
      pseudo: (req.body && req.body.pseudo) || '',
      email: (req.body && req.body.email) || '',
    });
  }
});

// Auth: POST /login
app.post('/login', async (req, res) => {
  try {
    const { pseudo, password } = req.body || {};
    if (!pseudo || !password) {
      return res.status(400).json({ ok: false, message: 'Champs requis manquants' });
    }

    const user = await prisma.user.findFirst({ where: { pseudo, password } });
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Identifiants invalides' });
    }

    req.session.user = { id: user.id, pseudo: user.pseudo };
    return res.json({ ok: true, pseudo: user.pseudo });
  } catch (err) {
    console.error('Erreur /login:', err);
    return res.status(500).json({ ok: false, message: 'Erreur serveur' });
  }
});

// Auth: GET /logout
app.get('/logout', (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Erreur destruction session:', err);
        }
        res.clearCookie('connect.sid', { path: '/', secure: cookieSecure, sameSite: cookieSameSite });
        return res.redirect('/');
      });
    } else {
      return res.redirect('/');
    }
  } catch (err) {
    console.error('Erreur /logout:', err);
    return res.redirect('/');
  }
});

export default app;