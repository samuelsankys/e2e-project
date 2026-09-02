/**
 * Gerado a partir de features/login.feature via `npm run generate:tests`.
 * Nao editar a logica do fluxo BDD aqui sem atualizar o .feature correspondente.
 */
import { test, expect } from '../../src/fixtures';

test.describe('Login', () => {
  test('login com credenciais validas', { tag: ['@smoke', '@login'] }, async ({ page, loginPage, testUser }) => {
    await loginPage.goto('/login');
    await loginPage.login(testUser.email, testUser.password);

    await expect(page).toHaveURL(/dashboard|home|account/i);
  });

  test('login com senha invalida', { tag: ['@regression', '@login'] }, async ({ loginPage, testUser }) => {
    await loginPage.goto('/login');
    await loginPage.login(testUser.email, 'senha-incorreta-123');

    await expect(loginPage.errorMessage).toBeVisible();
  });
});
