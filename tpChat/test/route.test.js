import request from 'supertest';
import app from '../app.js';

describe('Test des routes', () => {
    test('devrait renvoyer le code 200', async () => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/html');
        expect(response.text).toMatch('<!DOCTYPE html>');
    });
});