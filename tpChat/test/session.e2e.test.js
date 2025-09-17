// tests/session.e2e.test.js
import { chromium } from 'playwright';
import { httpServer, io } from '../server.js';

let browser, page;
let clientSocket;

beforeAll(async () => {
  await new Promise((resolve) => {
    httpServer.listen(3001, 'localhost', () => {
      resolve();
    });
  });
  
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
}, 30000);

afterAll(async () => {
  await browser.close();
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
}, 30000);

describe('Session utilisateur', () => {
  test('Session utilisateur complète : envoi et réception d’un message', async () => {
    // Attendre que Socket.IO soit connecté
    console.log('Attente connexion Socket.IO');
    await page.waitForFunction(() => {
      // Accès à la variable socket définie dans main.js
      return typeof socket !== 'undefined' && socket.connected;
    }, { timeout: 10000 });
    console.log('Socket.IO connecté');

    // Entrée du pseudo
    console.log('Attente pseudo-input');
    await page.waitForSelector('#pseudo-input');
    console.log('Pseudo-input trouvé');
    await page.fill('#pseudo-input', 'Benoit');
    console.log('Pseudo rempli');
    await page.click('#pseudo-submit');

    // Attente du message "chat history"
    console.log('Attente chat history');
    await page.waitForFunction(() => {
      const messages = document.getElementById('messages');
      return messages && messages.children.length > 0;
    }, { timeout: 10000 });
    console.log('Chat history reçu');

    // Attente du chat
    console.log('Attente chat-container');
    await page.waitForSelector('#chat-container', { state: 'visible' });
    // Récupère le contenu HTML du chat-container
    const chatContainerHTML = await page.$eval('#messages', el => el.innerHTML);
    console.log('Contenu du chat-container:', chatContainerHTML);
    
    // Envoi d’un message
    let randomMessage = Math.random().toString(36).substring(2, 15);
    await page.fill('#message', randomMessage);
    await page.click('#form button');

    // Attente que le message apparaisse
    console.log(`Attente du message ${randomMessage} dans la liste`);
    await page.waitForSelector(`li:has-text("${randomMessage}")`);
    console.log('Message trouvé dans la liste');

    const messages = await page.$$eval('#messages li', (els) =>
      els.map((el) => el.textContent)
    );
    expect(messages.some((m) => m.includes(randomMessage))).toBe(true);
    console.log('Test terminé avec succès');
  }, 30000);
});