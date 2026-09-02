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

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Formato preferido: um par de variaveis por conta, numeradas a partir de 1.
 *
 *   TEST_USER_1_EMAIL=qa1@example.com
 *   TEST_USER_1_PASSWORD=...
 *   TEST_USER_2_EMAIL=qa2@example.com
 *   TEST_USER_2_PASSWORD=...
 *
 * A senha e usada sem nenhum tratamento, entao pode conter virgula, espaco ou
 * qualquer outro caractere. Cada variavel tambem pode ser mascarada
 * individualmente no CI, o que uma lista separada por virgula nao permite.
 */
function collectNumberedUsers(): TestUser[] {
  const users: TestUser[] = [];

  for (let i = 1; ; i++) {
    const email = process.env[`TEST_USER_${i}_EMAIL`];
    const password = process.env[`TEST_USER_${i}_PASSWORD`];

    if (!email && !password) break;
    if (!email || !password) {
      throw new Error(
        `Conta ${i} do pool esta incompleta: defina TEST_USER_${i}_EMAIL e TEST_USER_${i}_PASSWORD.`
      );
    }

    users.push({ email: email.trim(), password });
  }

  return users;
}

/**
 * Pool de contas de teste. Testes rodam em paralelo (fullyParallel), entao uma
 * unica conta compartilhada gera colisao de estado e flake nao-deterministico.
 * Cada worker pega uma conta distinta via a fixture `testUser`.
 *
 * Alem do formato numerado acima, aceita o formato legado de listas separadas
 * por virgula (TEST_USER_EMAIL/TEST_USER_PASSWORD). Nesse formato a senha nao
 * pode conter virgula nem espaco nas pontas — prefira o formato numerado.
 */
function loadUsers(): TestUser[] {
  const numbered = collectNumberedUsers();
  if (numbered.length > 0) return numbered;

  const emails = splitList(requireVar('TEST_USER_EMAIL'));
  const passwords = splitList(requireVar('TEST_USER_PASSWORD'));

  if (emails.length === 0) {
    throw new Error(
      'Nenhuma conta de teste encontrada. Defina TEST_USER_1_EMAIL/TEST_USER_1_PASSWORD ' +
        '(formato preferido) ou TEST_USER_EMAIL/TEST_USER_PASSWORD. Veja .env.example.'
    );
  }

  if (emails.length !== passwords.length) {
    throw new Error(
      `TEST_USER_EMAIL tem ${emails.length} conta(s) e TEST_USER_PASSWORD tem ${passwords.length} senha(s). ` +
        'As duas listas precisam ter o mesmo tamanho e a mesma ordem.'
    );
  }

  return emails.map((email, i) => ({ email, password: passwords[i] }));
}

export interface TestUser {
  email: string;
  password: string;
}

export interface Env {
  testEnv: TestEnvironment;
  baseURL: string;
  apiURL: string;
  /**
   * Todas as contas disponiveis. Num spec, use SEMPRE a fixture `testUser`:
   * indexar este array direto reintroduz a colisao de estado entre workers.
   * Consumir aqui so faz sentido em setup que percorre o pool inteiro.
   */
  users: TestUser[];
}

function loadEnv(): Env {
  const testEnv = resolveTestEnv();
  loadDotenvFile(testEnv);

  return {
    testEnv,
    baseURL: requireVar('BASE_URL'),
    apiURL: requireVar('API_URL'),
    users: loadUsers(),
  };
}

export const env = loadEnv();
