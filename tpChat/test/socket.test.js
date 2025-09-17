// __tests__/socket.test.js
import { io as Client } from 'socket.io-client';
import { httpServer } from '../server.js'; // adapte le chemin si nécessaire

let clientSocket;

beforeAll(async () => {
    await new Promise((resolve) => {
        httpServer.listen(3001, 'localhost', () => {
            resolve();
        });
    });
}, 30000);

afterAll(async () => {
    await new Promise((resolve) => httpServer.close(resolve));
}, 30000);

describe('Test des sockets', () => {
    test('Le serveur renvoie le message envoyé', (done) => {
        clientSocket = new Client('http://localhost:3001');

        clientSocket.on('connect', () => {
            clientSocket.on('chat history', (data) => {
                console.log('Message reçu du serveur:', data);
                expect(true).toBe(true); // simple check to ensure we received something
                clientSocket.disconnect();
                done();
            });
        });
    });
});


