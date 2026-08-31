import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

export type TestEnvironment = 'dev' | 'qa' | 'staging' | 'prod';

const VALID_ENVIRONMENTS: TestEnvironment[] = ['dev', 'qa', 'staging', 'prod'];

function resolveTestEnv(): TestEnvironment {
  const raw = (process.env.TEST_ENV ?? 'dev').toLowerCase();
  if (!VALID_ENVIRONMENTS.includes(raw as TestEnvironment)) {
    throw new Error(
      `TEST_ENV invalido: "${raw}". Use um de: ${VALID_ENVIRONMENTS.join(', ')}`
    );
  }
  return raw as TestEnvironment;
}

function loadDotenvFile(testEnv: TestEnvironment): void {
  const envFile = path.resolve(process.cwd(), `.env.${testEnv}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

function requireVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variavel de ambiente obrigatoria ausente: ${name}. Confira .env.${resolveTestEnv()} (veja .env.example).`
    );
  }
  return value;
}

export interface Env {
  testEnv: TestEnvironment;
  baseURL: string;
  apiURL: string;
  user: {
    email: string;
    password: string;
  };
}

function loadEnv(): Env {
  const testEnv = resolveTestEnv();
  loadDotenvFile(testEnv);

  return {
    testEnv,
    baseURL: requireVar('BASE_URL'),
    apiURL: requireVar('API_URL'),
    user: {
      email: requireVar('TEST_USER_EMAIL'),
      password: requireVar('TEST_USER_PASSWORD'),
    },
  };
}

export const env = loadEnv();
