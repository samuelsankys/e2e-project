/**
 * Gera um spec Playwright determinístico a partir de um documento BDD (Gherkin).
 *
 * Uso:
 *   npm run generate:tests -- features/login.feature
 *
 * Este script roda UMA VEZ, offline, no momento em que o BDD muda. O arquivo
 * gerado em tests/generated/*.spec.ts deve ser revisado por humano e commitado.
 * Ele nunca é invocado durante `npm test` — a execução dos testes não depende
 * de AI e é 100% determinística.
 */
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';

const CONVENTIONS = `
Convencoes obrigatorias do projeto para specs Playwright gerados:

1. Importe "test" e "expect" de "../../src/fixtures" (nunca de "@playwright/test" diretamente).
2. Para credenciais, use SEMPRE a fixture "testUser" ({ email, password }), nunca "env.user" e nunca
   valores hardcoded. Cada worker paralelo recebe uma conta distinta do pool por meio dessa fixture.
   Importe "env" de "../../src/config/env" apenas para dados nao-sensiveis (baseURL, apiURL, testEnv).
3. Use os Page Objects ja injetados como fixtures (ex.: "loginPage") em vez de seletores soltos, quando existir Page Object aplicavel em src/pages.
4. Se o cenario precisar de um Page Object que ainda nao existe, gere o codigo do teste mesmo assim
   usando seletores semanticos (getByRole, getByLabel, getByText) e sinalize com um comentario
   "// TODO: extrair para Page Object" acima do bloco.
5. Estruture com test.describe(<Feature>) e um test(...) por Scenario do Gherkin, usando o nome do
   Scenario como titulo do test.
6. Se o Scenario tiver tags Gherkin (linha com "@algo @outro" logo acima do "Scenario:"), propague-as
   como segundo argumento do test: test('titulo', { tag: ['@algo', '@outro'] }, async (...) => { ... }).
   Isso permite filtrar execucao no CI via "playwright test --grep @algo". Se nao houver tags, omita
   o segundo argumento.
7. Nao invente asserts que nao decorrem do "Then" do cenario.
8. Saida deve ser APENAS o codigo TypeScript do arquivo .spec.ts, sem markdown, sem explicacao.
`.trim();

async function main(): Promise<void> {
  const featureArg = process.argv[2];
  if (!featureArg) {
    console.error('Uso: npm run generate:tests -- <caminho-para-o-.feature>');
    process.exit(1);
  }

  const featurePath = path.resolve(process.cwd(), featureArg);
  if (!fs.existsSync(featurePath)) {
    console.error(`Arquivo nao encontrado: ${featurePath}`);
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY nao definido no ambiente.');
    process.exit(1);
  }

  const gherkin = fs.readFileSync(featurePath, 'utf-8');
  const baseName = path.basename(featurePath, path.extname(featurePath));
  const outputPath = path.resolve(process.cwd(), 'tests/generated', `${baseName}.spec.ts`);

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4096,
    system: CONVENTIONS,
    messages: [
      {
        role: 'user',
        content: `Gere o spec Playwright para o seguinte documento BDD:\n\n${gherkin}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    console.error('Resposta da AI nao contem texto utilizavel.');
    process.exit(1);
  }

  const code = stripMarkdownFence(textBlock.text);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, code, 'utf-8');

  console.log(`Spec gerado: ${path.relative(process.cwd(), outputPath)}`);
  console.log('Revise o arquivo antes de commitar.');
}

function stripMarkdownFence(text: string): string {
  const fenced = text.match(/```(?:ts|typescript)?\n([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim() + '\n';
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
