/**
 * Gerado a partir de features/login.feature via `npm run generate:tests`.
 * Nao editar a logica do fluxo BDD aqui sem atualizar o .feature correspondente.
 */
import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';

test.describe('Login', () => {
  test('login com credenciais validas', { tag: ['@smoke', '@login'] }, async ({ page, loginPage }) => {
    await loginPage.goto('/login');
    await loginPage.login(env.user.email, env.user.password);

    await expect(page).toHaveURL(/dashboard|home|account/i);
  });

  test('login com senha invalida', { tag: ['@regression', '@login'] }, async ({ loginPage }) => {
    await loginPage.goto('/login');
    await loginPage.login(env.user.email, 'senha-incorreta-123');

    await expect(loginPage.errorMessage).toBeVisible();
  });
});
