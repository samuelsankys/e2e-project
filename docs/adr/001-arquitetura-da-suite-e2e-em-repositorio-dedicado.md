# ADR-001: Arquitetura da suíte E2E em repositório dedicado

- **Data**: 2026-09-01
- **Status**: Aceito
- **Decisores**: QA / Engenharia
- **Tags**: testes, e2e, ci, playwright

## Contexto e problema

Este repositório contém **apenas testes end-to-end**. O código da aplicação vive em outro
repositório e a suíte roda contra um ambiente já publicado, disparada pelo CI do projeto real.

Esse isolamento cria três forças que não existem quando os testes moram junto do código:

1. **Não controlamos o HTML nem o banco.** Seletores e dados de teste dependem de contratos com
   outro time, não de código que podemos alterar no mesmo PR.
2. **Não há pirâmide de testes aqui.** Este repo é só o topo dela. Sem um porteiro explícito, ele
   atrai teste unitário disfarçado, validação de campo e teste de API — e vira lento, instável e
   ignorado.
3. **Ambiente é dependência externa.** Uma falha de infraestrutura produz o mesmo vermelho que uma
   regressão de produto.

A suíte já roda com `fullyParallel: true`, mas com uma única conta de teste
(`TEST_USER_EMAIL` singular) — dois testes paralelos alteravam o estado do mesmo usuário,
gerando flake não-determinístico.

## Fatores de decisão

- Execução paralela precisa ser segura por construção, não por convenção
- Tempo de feedback no PR abaixo de 5 minutos para o conjunto `@smoke`
- Confiança na suíte: vermelho tem que significar bug de produto
- Baixo acoplamento com o repositório da aplicação — não podemos exigir mudanças lá para cada teste

## Opções consideradas

- **A. Suíte isolada com contrato explícito** (escolhida) — regras de admissão, isolamento de
  estado e contratos de seletor tratados como decisão de arquitetura
- **B. Suíte livre** — qualquer teste entra, execução serial para evitar colisão de estado
- **C. Mover os testes para o repositório da aplicação** — acesso direto ao código e ao banco

## Decisão

Adotamos a **opção A**. A suíte é tratada como um sistema com contratos próprios, não como uma
pasta de scripts.

A opção C resolveria o isolamento de dados e o contrato de seletores de uma vez, mas exigiria que
o time da aplicação assumisse a suíte E2E — o que não é a realidade organizacional atual. A opção B
paga o isolamento com execução serial: o custo cresce linearmente com o número de testes e destrói
o tempo de feedback no PR.

### Decisões derivadas

| Decisão | Por quê | Alternativa descartada |
| --- | --- | --- |
| **Pool de contas por worker** — `TEST_USER_N_EMAIL`/`TEST_USER_N_PASSWORD`; a fixture `testUser` indexa por `parallelIndex` | Elimina a colisão simultânea sem abrir mão do paralelismo. Não depende de mudança no repo da aplicação | Conta única (flake) ou `fullyParallel: false` (lento) |
| **`workers` derivado do tamanho do pool** (`playwright.config.ts`) | Torna impossível, por construção, dois workers caírem na mesma conta. O paralelismo passa a ser função de um recurso provisionado, não de um número escolhido à mão | Configurar `workers` manualmente e confiar em disciplina |
| **Critério de admissão** — teste só entra se for ponta-a-ponta, jornada de negócio e bloqueante (`CONTRIBUTING.md`) | Sem porteiro, a suíte absorve testes que pertencem à pirâmide do outro repo | Aceitar tudo e controlar o custo depois — na prática, nunca acontece |
| **Seletores semânticos primeiro** (`getByRole`/`getByLabel`), `data-testid` como contrato, CSS/XPath barrado | Papel semântico é estável; classe de CSS muda a cada refactor no repo que não controlamos | Seletores estruturais — quebram sem aviso |
| **Asserção só no spec**, nunca no Page Object | Page Object com `expect` não reusa e produz erro que não localiza a falha | POs com asserções embutidas |
| **CI GitLab** com matriz de browsers, `junit` nativo e commit status de volta ao projeto de origem | O gatilho vem do CI da aplicação; o resultado precisa voltar como status no commit que o originou | Suíte rodando só em agenda, desacoplada do release |
| **Reuso de sessão via `storageState`** — *planejado, ver Pendências* | Login por UI em todo teste custa segundos por teste e concentra o risco de flake num único formulário | Login por UI em cada teste (estado atual) |

### Consequências positivas

- Paralelismo seguro: o número de workers passa a ser limitado por contas disponíveis, não por risco de colisão
- Vermelho na suíte volta a ser sinal de bug, não ruído
- O contrato de seletores torna explícito o acoplamento com o repo da aplicação, em vez de escondê-lo

### Consequências negativas

- **Provisionar contas de teste vira pré-requisito operacional, e agora com efeito visível.** Como
  `workers` deriva do pool, uma única conta faz a suíte rodar serial. Trocamos um flake silencioso
  por lentidão explícita — preferimos a lentidão, mas ela é real e alguém vai reclamar dela
- **O pool não entrega isolamento de dados.** Ele elimina a colisão *simultânea*; testes que rodam em
  sequência no mesmo worker continuam compartilhando a conta e herdando o estado deixado pelo
  anterior. Enquanto não houver factories via API, todo teste precisa criar o que consome e nenhum
  pode assumir estado inicial. É a limitação mais fácil de esquecer e a mais cara de descobrir tarde
- O critério de admissão gera atrito: alguns testes serão recusados e terão que ser escritos no
  repositório da aplicação, por um time que não é o nosso
- O contrato de `data-testid` cria uma dependência formal entre repositórios — mudanças de UI passam
  a exigir coordenação

## Pendências

- **Factories via API** para criar dados por teste — é o que fecha a lacuna de isolamento descrita
  acima. Depende de a aplicação expor criação de entidades por API, o que precisa ser negociado com
  o time dono dela. Enquanto não existir, o pool é mitigação, não solução
- `storageState` ainda **não implementado**. Enquanto isso, todo teste loga pela UI. Quando entrar,
  cada conta do pool precisa do seu próprio arquivo de sessão, e os testes de login devem sair de
  sessão via `test.use({ storageState: { cookies: [], origins: [] } })`
- `globalSetup` com health-check de `BASE_URL`/`API_URL`, para separar falha de ambiente de falha de produto
- Sharding no CI — hoje cada browser roda a suíte inteira em um job

## Links

- `CONTRIBUTING.md` — critério de admissão e checklist de PR
- `src/config/env.ts` — pool de contas
- `src/fixtures/index.ts` — fixture `testUser`
- `.gitlab-ci.yml` — pipeline, trigger externo e callback de status
