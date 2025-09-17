// tests/session.e2e.test.js
import { chromium } from 'playwright';
import { httpServer, io } from '../server.js';
import { PrismaClient } from '../generated/prisma/index.js';

let browser, page;
let prisma;

const LOGIN_PSEUDO = 'Cafipo';
const LOGIN_PASSWORD = '12345';

beforeAll(async () => {
  await new Promise((resolve) => {
    httpServer.listen(3001, 'localhost', () => {
      resolve();
    });
  });

  // Préparer l'utilisateur de test pour la connexion
  prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findFirst({ where: { pseudo: LOGIN_PSEUDO } });
    if (!existing) {
      await prisma.user.create({
        data: {
          pseudo: LOGIN_PSEUDO,
          password: LOGIN_PASSWORD,
          email: 'fp.lajudie@gmail.com',
          IsActive: true,
        },
      });
    }
  } catch (e) {
    // Laisser le test signaler l'erreur plus tard si la DB est indisponible
    // eslint-disable-next-line no-console
    console.warn('Impossible de préparer l\'utilisateur de test:', e?.message || e);
  }

  browser = await chromium.launch();
  page = await browser.newPage();
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
}, 30000);

afterAll(async () => {
  await browser.close();
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
  if (prisma) {
    await prisma.$disconnect();
  }
}, 30000);

describe('Session utilisateur', () => {
  test('Connexion + envoi et réception d’un message', async () => {
    // Affichage du formulaire de connexion
    await page.waitForSelector('#loginForm', { state: 'visible' });

    // Remplir et soumettre le formulaire de connexion
    await page.fill('#login-pseudo', LOGIN_PSEUDO);
    await page.fill('#login-password', LOGIN_PASSWORD);
    await page.click('#login-submit');

    // Le conteneur du chat doit apparaître après connexion
    await page.waitForSelector('#chat-container', { state: 'visible' });

    // Envoi d’un message
    const randomMessage = Math.random().toString(36).substring(2, 15);
    await page.fill('#messageInput', randomMessage);
    await page.click('#messageForm button');

    // Attente que le message apparaisse dans la liste
    await page.waitForSelector(`li:has-text("${randomMessage}")`);

    const messages = await page.$$eval('#messages li', (els) =>
      els.map((el) => el.textContent)
    );
    expect(messages.some((m) => m.includes(randomMessage))).toBe(true);
  }, 300000);
});