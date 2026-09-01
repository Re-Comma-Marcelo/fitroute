# 10 melhorias para o Iron Logger — nova rodada

Auditoria read-only sobre o código atual (sessão, treino, progresso, dieta, busca, perfil, PWA). Cada item aponta o arquivo/linha onde a lacuna existe. Tudo frontend, salvo onde indicado.

## 1. Reordenar e substituir exercícios durante a sessão

**Onde:** `src/routes/_authenticated/sessao.tsx:486` — existe só `removeExercise()`.

Durante o treino você pode adicionar e remover exercícios, mas não mudar a ordem nem trocar um exercício por outro (máquina ocupada é o caso clássico). Hoje a única saída é remover e adicionar no fim, perdendo a posição.

**Correção:** botões mover ↑/↓ (44px, com ícone) e "Substituir" abrindo o seletor da biblioteca, preservando séries já registradas quando for troca de exercício equivalente.

## 2. Nenhum aviso de nova versão do app instalado

**Onde:** `src/lib/pwa.ts` — o registro do service worker não escuta `updatefound`/`controllerchange`.

Instalado na tela inicial, o app continua servindo a versão em cache até o navegador decidir trocar. O usuário pode ficar dias numa build antiga sem saber.

**Correção:** detectar worker novo em `waiting` e mostrar um toast "Nova versão disponível — atualizar", com `skipWaiting` + reload ao tocar.

## 3. Estados de erro faltando na maioria das telas

**Onde:** `isError` só é tratado em `onboarding.tsx:311`, `biblioteca.tsx:153` e `dieta.index.tsx:140`. Progresso (`progresso.index.tsx:84` só olha `isLoading`), Treino, Busca e Lista de mercado não têm.

Se a rede falha, essas telas mostram estado vazio ("nenhum treino ainda") em vez de erro — o usuário acha que perdeu dados.

**Correção:** um bloco de erro reutilizável com "Tentar de novo" (`refetch`) aplicado nas telas que faltam, mesmo padrão da biblioteca.

## 4. Compartilhar o resumo do treino

**Onde:** `src/routes/_authenticated/resumo.$id.tsx` — nenhuma ação de compartilhamento.

O resumo já é celebratório (volume, PRs, streak) mas morre na tela. Compartilhar é o gesto natural depois de um PR.

**Correção:** botão "Compartilhar" gerando um card em canvas (volume, séries, duração, PR) e usando Web Share API, com fallback de download da imagem.

## 5. Busca vazia sem nada para tocar

**Onde:** `src/routes/_authenticated/buscar.tsx:41` — com menos de 2 caracteres a lista é sempre vazia.

Ao abrir a busca a tela fica em branco: nada sugerido, nada recente. Cada uso exige digitar do zero.

**Correção:** buscas recentes (localStorage) e atalhos de grupo muscular/rotina quando o campo está vazio.

## 6. Progresso sem filtro de período nem de rotina

**Onde:** `src/routes/_authenticated/progresso.index.tsx:45-84`.

Todos os gráficos e comparações usam o histórico inteiro. Não há como olhar "últimas 8 semanas" ou "só Upper A", que é exatamente o corte que responde "estou evoluindo?".

**Correção:** um segmented control de período (4/8/12 semanas / tudo) e um filtro opcional de rotina, alimentando as métricas e os gráficos já existentes.

## 7. Duplicar rotina

**Onde:** `src/routes/_authenticated/treino.tsx` e `rotina.$id.tsx` — nenhuma ação de duplicar.

Criar uma variação (Upper A → Upper A pesado) exige remontar exercício por exercício.

**Correção:** ação "Duplicar" no card da rotina, criando "<nome> (cópia)" com os mesmos exercícios e abrindo o editor.

## 8. Histórico do exercício não é alcançável durante a sessão

**Onde:** `src/routes/_authenticated/sessao.tsx:95` — a linha mostra apenas a última carga ("anterior").

Você vê a última série, mas não a tendência das últimas 3-4 sessões, que é o que decide subir carga ou insistir nas reps.

**Correção:** tocar no nome do exercício abre um sheet com as últimas sessões daquele exercício (data, séries, carga, RPE) e o melhor set.

## 9. Restaurar backup sem prévia do que será sobrescrito

**Onde:** `src/routes/_authenticated/perfil.tsx:941` (`restoreBackup`).

O import lê o arquivo e grava direto. Um JSON de outra conta ou antigo pode sobrescrever rotinas e perfil sem confirmação informada.

**Correção:** ler o arquivo, mostrar um resumo ("12 treinos, 4 rotinas, perfil") e pedir confirmação explícita antes de gravar.

## 10. Teclado numérico e navegação entre campos na sessão

**Onde:** `src/routes/_authenticated/sessao.tsx` — apenas 2 campos declaram `inputMode`.

Campos de peso/reps sem `inputMode="decimal"`/`"numeric"` abrem teclado alfabético em parte dos aparelhos, e não há `enterKeyHint`/avanço para o próximo campo — cada série exige fechar o teclado e tocar de novo.

**Correção:** `inputMode`, `enterKeyHint="next"` e avanço de foco kg → reps → próxima série em todos os campos numéricos.

## Notas técnicas

- Itens 1, 3, 4, 5, 6, 7, 8, 10 são puramente cliente/UI.
- Item 2 mexe no registro do service worker (avisar antes de tocar no SW).
- Item 9 usa `buildBackup`/`restoreBackup` existentes, sem nova query.
- Strings novas vão para `src/lib/i18n/dict/*` em pt/nl, zero hardcoded.
- Nenhuma mudança de schema, auth ou MCP.

## Ordem sugerida

10 → 3 → 1 → 8 → 6 → 5 → 7 → 9 → 4 → 2
