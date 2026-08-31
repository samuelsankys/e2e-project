import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

interface Fixtures {
  loginPage: LoginPage;
}

/**
 * Todo spec gerado deve importar `test`/`expect` daqui, nao de '@playwright/test'
 * diretamente, para ter acesso aos Page Objects como fixtures.
 */
export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export { expect } from '@playwright/test';
