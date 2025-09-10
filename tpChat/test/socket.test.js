import { io as ClientIO } from 'socket.io-client';
import { httpServer } from '../server.js';

let clientSocket;
let serverPort;

beforeAll((done) => {
  // Démarre le serveur sur un port libre pour les tests
  httpServer.listen(0, () => {
    serverPort = httpServer.address().port;
    done();
  });
});

afterAll((done) => {
    if (clientSocket?.connected) clientSocket.disconnect();
  httpServer.close(() => done());
});

describe('test des sockets', () => {
    test('should connect to the server', (done) => {
        clientSocket = new ClientIO(`http://localhost:${serverPort}`);
        clientSocket.on('connect', () => {
            clientSocket.emit('message', 'Bonjour serveur');
            clientSocket.on('message', (data) => {
                expect(data).toBe('Bonjour serveur');
                done();
            });
        });
    });
});