import { test as base } from '@playwright/test';
import { env, type TestUser } from '../config/env';
import { LoginPage } from '../pages/login.page';

interface Fixtures {
  loginPage: LoginPage;
  testUser: TestUser;
}

/**
 * Todo spec gerado deve importar `test`/`expect` daqui, nao de '@playwright/test'
 * diretamente, para ter acesso aos Page Objects como fixtures.
 */
export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  /**
   * Conta de teste do worker atual. Cada worker paralelo recebe uma conta
   * exclusiva do pool, evitando que dois testes alterem o estado do mesmo
   * usuario ao mesmo tempo. Nunca leia `env.users` direto num spec.
   *
   * O playwright.config ja limita `workers` ao tamanho do pool; a checagem
   * abaixo cobre o caso de alguem passar `--workers=N` na linha de comando,
   * que ignora essa configuracao. Falhar aqui e melhor que compartilhar conta
   * em silencio e caçar flake depois.
   */
  testUser: async ({}, use, testInfo) => {
    const user = env.users[testInfo.parallelIndex];

    if (!user) {
      throw new Error(
        `Worker ${testInfo.parallelIndex} nao tem conta exclusiva: o pool tem ${env.users.length} conta(s). ` +
          `Reduza --workers ou cadastre TEST_USER_${env.users.length + 1}_EMAIL e ` +
          `TEST_USER_${env.users.length + 1}_PASSWORD.`
      );
    }

    await use(user);
  },
});

export { expect } from '@playwright/test';
