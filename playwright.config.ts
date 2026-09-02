import os from 'node:os';
import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

const isCI = !!process.env.CI;

/**
 * O paralelismo e limitado pelo tamanho do pool de contas: cada worker precisa
 * de uma conta exclusiva, senao dois testes alteram o estado do mesmo usuario
 * ao mesmo tempo — exatamente o flake que o pool existe para evitar.
 *
 * Consequencia pratica: para rodar mais rapido, cadastre mais contas
 * (TEST_USER_N_EMAIL / TEST_USER_N_PASSWORD). Com uma conta so, a suite roda
 * serial por construcao.
 */
const cpuBudget = isCI ? os.cpus().length : Math.ceil(os.cpus().length / 2);
const workers = Math.max(1, Math.min(env.users.length, cpuBudget));

export default defineConfig({
  testDir: './tests/generated',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers,
  reporter: isCI
    ? [['html', { open: 'never' }], ['list'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: env.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});
