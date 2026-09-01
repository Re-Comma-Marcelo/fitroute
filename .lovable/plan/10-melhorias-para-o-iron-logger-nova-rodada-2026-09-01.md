# 10 melhorias para o Iron Logger — nova rodada

Auditoria read-only do código atual. Cada item indica onde a lacuna foi confirmada. Tudo frontend, salvo onde marcado.

## 1. Aviso de nova versão do app

**Onde:** `src/lib/pwa.ts:46-57` — o registro do service worker não escuta `updatefound`/`controllerchange`.

Instalado na tela inicial, o app segue servindo a build em cache até o navegador decidir trocar.

**Correção:** detectar worker em `waiting` e mostrar toast "Nova versão disponível — atualizar" com `skipWaiting` + reload. (Mexe no registro do SW.)

## 2. Volume por grupo muscular

**Onde:** `src/lib/progress-analytics.ts` — nenhuma métrica usa `grupoPrimario`.

O Progresso mostra volume total, mas não onde ele foi gasto. É assim que se descobre perna/costas subtreinadas.

**Correção:** barras de volume por grupo (semana atual vs anterior), reaproveitando os sets já carregados.

## 3. Lembrete de treino

**Onde:** nenhuma referência a reminder em `src`; `src/lib/rest-notification.ts` só cobre descanso.

A permissão de notificação já existe, mas só serve ao timer. Nada avisa nos dias planejados (`diasSemana` já existe nas rotinas).

**Correção:** horário de lembrete opcional no Perfil e notificação local nos dias agendados enquanto o app estiver aberto/instalado.

## 4. Deload não é acionável

**Onde:** `src/lib/coach/plateau.ts` e `TodayCoachCard.tsx` sugerem deload em texto; não há ação.

O coach diagnostica, o usuário faz a conta na mão.

**Correção:** botão "Aplicar semana de deload" que inicia a sessão com ~60% da carga e menos séries, marcado no resumo.

## 5. Notas do coach sem tela própria

**Onde:** `getCoachNotes` é lido só por `today-card.ts` e `recommendations.ts` — nenhuma rota lista as notas.

Check-ins e observações entram e desaparecem; não há histórico para reler.

**Correção:** lista de notas no Progresso (data, tipo, tags) com filtro simples.

## 6. Séries por tempo fora do gráfico

**Onde:** `sessao.tsx:1328+` registra `tempo`, mas as métricas de Progresso ignoram esses sets.

Prancha e cardio somem completamente do histórico depois de salvos.

**Correção:** métrica de tempo sob tensão por sessão e exibição dos sets de tempo nos detalhes do treino.

## 7. Rotinas sem estimativa de duração

**Onde:** `src/routes/_authenticated/treino.tsx` — o card mostra exercícios e séries, não tempo.

O perfil tem `sessionLengthMin`, mas nada compara a rotina com esse limite.

**Correção:** duração estimada por rotina (séries × descanso + tempo médio de execução) e aviso quando estourar o tempo preferido.

## 8. Backup só manual

**Onde:** `src/routes/_authenticated/perfil.tsx:960+` — restore/export exigem toque.

Um usuário que nunca abre o Perfil nunca tem backup.

**Correção:** lembrete de export mensal (localStorage) no Perfil, com atalho de um toque.

## 9. Editor de rotina sem prévia de progressão

**Onde:** `src/lib/routine-progression.ts` expõe só `getRoutineSuggestions`, usado no início da sessão.

As sugestões de carga aparecem no meio do treino, nunca ao planejar.

**Correção:** no editor, mostrar por exercício a última carga e a sugestão da próxima sessão.

## 10. Sem comparação entre sessões da mesma rotina

**Onde:** `progresso.$id.tsx` mostra a sessão isolada; nenhuma diff com a anterior.

Não existe "esta Upper A vs a última Upper A" — a pergunta mais frequente ao terminar.

**Correção:** no resumo e no detalhe, delta por exercício (carga, reps, volume) contra a última vez que a mesma rotina rodou.

## Notas técnicas

- Itens 2, 4, 5, 6, 7, 8, 9, 10 são puramente cliente/UI, sem schema novo.
- Item 1 mexe no registro do service worker.
- Item 3 usa Notification API já presente; sem push server.
- Strings novas vão para `src/lib/i18n/dict/*` em pt/nl, zero hardcoded.
- Nenhuma mudança de auth ou MCP.

## Ordem sugerida

10 → 2 → 7 → 9 → 6 → 5 → 4 → 8 → 1 → 3
