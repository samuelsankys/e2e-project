# E2E Project

Suite de testes E2E com Playwright, orientada por documentos BDD (Gherkin). A AI é usada
apenas para **gerar** o código de teste a partir do BDD — uma vez, offline. A execução dos
testes gerados é 100% determinística: não depende de rede com nenhuma AI, não varia entre
execuções.

## Fluxo

1. Escreva ou edite um cenário em `features/*.feature` (Gherkin).
2. Gere o spec Playwright correspondente:
   ```bash
   export ANTHROPIC_API_KEY=sk-...
   npm run generate:tests -- features/login.feature
   ```
   Isso escreve/atualiza `tests/generated/login.spec.ts`.
3. **Revise o arquivo gerado** — ajuste seletores, extraia Page Objects se necessário.
4. Commite o `.feature` e o `.spec.ts` juntos.
5. Rode os testes deterministicamente, sem AI envolvida:
   ```bash
   npm run test:dev      # ou test:qa / test:staging / test:prod
   ```

## Setup

```bash
npm install
npx playwright install
cp .env.example .env.dev   # preencha BASE_URL, credenciais etc.
```

## Ambientes

Cada ambiente tem seu próprio arquivo `.env.<nome>` (não commitado, veja `.env.example`).
`TEST_ENV` controla qual arquivo é carregado (`src/config/env.ts`):

```bash
npm run test:dev
npm run test:qa
npm run test:staging
npm run test:prod
```

## Browsers / devices

Configurado em `playwright.config.ts`: chromium, firefox, webkit, mobile-chrome, mobile-safari.

```bash
npx playwright test --project=firefox
```

## Estrutura

- `features/` — documentos BDD (fonte de verdade do comportamento, não executável).
- `tests/generated/` — specs Playwright gerados a partir do BDD (executável, determinístico).
- `src/pages/` — Page Object Model.
- `src/fixtures/` — fixtures Playwright custom (injeta Page Objects nos testes).
- `src/config/env.ts` — carregamento e validação de variáveis por ambiente.
- `scripts/generate-tests.ts` — CLI de geração offline via AI.

## CI

`.github/workflows/e2e.yml` roda a matrix de browsers em paralelo e nunca chama
`generate:tests` — geração é passo manual/revisado antes do commit.

### Seleção de fluxos (tags e feature)

Cenários Gherkin podem levar tags acima do `Scenario:` (`@smoke`, `@regression`, etc. — veja
`features/login.feature`). O script de geração (`scripts/generate-tests.ts`) propaga essas tags
pro spec gerado via `test('titulo', { tag: ['@smoke'] }, ...)`, sintaxe nativa do Playwright.

Localmente:
```bash
npx playwright test --grep @smoke                       # só os cenarios @smoke
npx playwright test tests/generated/login.spec.ts        # só um arquivo/feature
```

No CI (`workflow_dispatch`), os inputs `tag` e `feature` controlam a mesma coisa — vazio roda tudo.

## CI externo e handoffs

### Handoff entre pipelines (disparo cross-repo)

O CI do **projeto real** (outro repositório, mesma org) pode acionar este projeto de duas formas:

| Mecanismo | Como funciona | Trade-off |
|---|---|---|
| `workflow_dispatch` via `gh` | `gh workflow run e2e.yml --repo org/e2e-project -f environment=qa -f tag=@smoke` seguido de `gh run watch --repo org/e2e-project` | Síncrono e simples: o job do projeto real fica bloqueado esperando, mas recebe o resultado direto (exit code do `gh run watch`). Sem plumbing extra. |
| `repository_dispatch` via API | `POST /repos/org/e2e-project/dispatches` com `event_type: e2e-trigger` e `client_payload` (`environment`, `tag`, `feature`, `callback_repo`, `callback_sha`) | Assíncrono/fire-and-forget: não bloqueia o runner de origem, mas o resultado só volta via o job `callback` deste workflow, que precisa de um token (`secrets.CALLBACK_TOKEN`) com permissão de escrever status no repo de origem. |

Exemplo de step no workflow do projeto real (opção síncrona, recomendada por simplicidade):
```yaml
- run: gh workflow run e2e.yml --repo minha-org/e2e-project -f environment=qa -f tag=@smoke
- run: gh run watch --repo minha-org/e2e-project
```

### Handoff de dados entre testes

Isso é diferente do handoff acima — é sobre passar **estado** de um teste Playwright pro outro
dentro da mesma execução. Duas regras:

1. **Não** compartilhe estado via variável de módulo entre blocos `test(...)`. Com `fullyParallel`
   ligado (como está em `playwright.config.ts`), a ordem de execução não é garantida — um teste
   não pode depender de efeito colateral de outro.
2. Quando um fluxo genuinamente precisa reaproveitar estado entre specs (ex.: fazer login uma vez
   e reusar a sessão em vários arquivos), o padrão do Playwright é **setup project + `storageState`**:
   um projeto `setup` roda antes, salva a sessão autenticada em um JSON; os projetos que precisam
   dela declaram `dependencies: ['setup']` e `use: { storageState: 'playwright/.auth/user.json' }`.
   Nenhum teste deste projeto precisa disso hoje (o `login.spec.ts` testa o próprio login, então
   roda deslogado de propósito) — passo a usar esse padrão no dia em que surgir uma feature que
   exija estar autenticado antes de começar.
3. Dados que fluem dentro do **mesmo cenário** (não entre testes) devem ficar no mesmo `test(...)`,
   organizados com `test.step(...)` — não dividir um cenário em vários testes dependentes.

## Notas

O `BASE_URL` de exemplo em `.env.example` e o spec `tests/generated/login.spec.ts` são
placeholders ilustrativos — aponte para sua aplicação real antes de rodar.
