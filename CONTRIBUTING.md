# Contribuindo

Este repositório contém **apenas testes end-to-end**. O código da aplicação vive em outro
repositório, e os testes rodam contra um ambiente já publicado.

## Critério de admissão

Antes de abrir um PR com um teste novo, confirme as **três** condições:

1. **É ponta-a-ponta.** O cenário atravessa pelo menos duas telas ou dois sistemas.
2. **É jornada de negócio.** Existe um fluxo de usuário real por trás, com dono identificável.
3. **É bloqueante.** Se o teste falhar, o release não sobe.

Se qualquer uma falhar, o teste **não entra aqui**. Validação de campo, regra de negócio isolada,
resposta de endpoint e caso de borda pertencem ao repositório da aplicação, como teste unitário ou
de integração. Suíte E2E que aceita tudo vira lenta, instável e ignorada.

## Camadas

Cada arquivo tem uma responsabilidade só:

| Camada | Responde | Pode ter `expect`? |
| --- | --- | --- |
| `features/*.feature` | o quê (negócio) | — |
| `tests/generated/*.spec.ts` | orquestração e asserção | **sim, só aqui** |
| `src/pages/*.page.ts` | como (interação) | **não** |
| `src/fixtures/` | injeção e ciclo de vida | não |

## Regras de escrita

- **Credenciais**: use a fixture `testUser`, nunca `env.users` direto nem valores hardcoded. Cada
  worker paralelo recebe uma conta exclusiva do pool — é o que impede dois testes de alterarem o
  estado do mesmo usuário **ao mesmo tempo**.
- **O pool não é isolamento de dados.** Ele evita colisão *simultânea*, não o resto: dois testes que
  rodam em sequência no mesmo worker compartilham a mesma conta, e o segundo herda o que o primeiro
  deixou para trás. Por isso um teste nunca pode assumir estado inicial — se ele precisa de um
  registro específico, ele cria esse registro. Isolamento real virá de factories via API; até lá,
  a responsabilidade é sua ao escrever o cenário.
- **Seletores**, nesta ordem: `getByRole` / `getByLabel` / `getByText` → `getByTestId` → nada mais.
  CSS e XPath são barrados em review: quebram a cada refactor de estilo no repositório da aplicação.
- **Esperas**: nada de `waitForTimeout`. Toda espera é uma asserção web-first
  (`await expect(locator).toBeVisible()`), que já tem retry automático.
- **Independência**: nenhum teste pode depender da ordem de execução ou do resultado de outro.
- **Tags** governam a execução no CI: `@smoke` (todo PR), `@regression` (nightly).

## Fluxo

1. Escreva ou atualize o `.feature`.
2. Rode `npm run generate:tests -- features/<nome>.feature`.
3. **Revise o spec gerado** — ele não é confiável sem leitura humana.
4. Rode `npm run typecheck` e a suíte localmente.
5. Abra o PR com o `.feature` e o `.spec.ts` no mesmo commit.

## Checklist de PR

- [ ] Passa nos três critérios de admissão
- [ ] Usa a fixture `testUser`
- [ ] Sem CSS/XPath, sem `waitForTimeout`
- [ ] `expect` só no spec, nunca no Page Object
- [ ] Tag correta (`@smoke` / `@regression`)
- [ ] `.feature` e `.spec.ts` em sincronia
