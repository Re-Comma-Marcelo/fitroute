# 10 melhorias para o Iron Logger — nova rodada

Auditoria read-only do estado atual. Tudo cliente/UI, sem schema, auth ou MCP novos. Onde uma lacuna foi confirmada no código, o arquivo está citado; os demais itens são adições.

## 1. Favoritar exercícios

**Onde:** nenhuma referência a favorito em `src` — a biblioteca só filtra por grupo/equipamento.

Quem usa sempre os mesmos 15 exercícios rola a lista inteira toda vez.

**Correção:** estrela no card da biblioteca e no seletor da sessão, com seção "Favoritos" no topo (localStorage).

## 2. Tela de recordes (PRs)

**Onde:** não existe módulo de PR em `src/lib`; o PR só aparece pontualmente no resumo e na Home.

Os recordes existem no histórico mas não há lugar para vê-los juntos.

**Correção:** lista de PRs por exercício (melhor carga, melhor e1RM, data) no Progresso, ordenável por recentes.

## 3. Descanso estourado

**Onde:** `src/components/RestIsland.tsx` e `src/lib/session-state.ts` não contam tempo após o zero.

Se o celular fica na bancada, o timer zera e a série seguinte sai muito depois — sem registro disso.

**Correção:** contagem "+1:20 atrasado" na ilha depois do zero, com cor de aviso.

## 4. Séries por tempo fora das métricas

**Onde:** `src/lib/progress-analytics.ts` não referencia `tempo`.

Prancha, cardio e isometria são registrados na sessão e desaparecem do Progresso.

**Correção:** métrica de tempo sob tensão por sessão/semana e exibição desses sets no detalhe do treino.

## 5. Notas do coach sem histórico

**Onde:** `getCoachNotes` é lido por `CoachNotesCard`, `today-card.ts` e `recommendations.ts` — nenhuma tela lista o histórico completo.

Check-ins entram e não podem ser relidos depois.

**Correção:** lista completa de notas (data, tipo, tags) com filtro simples, dentro do Progresso.

## 6. Deload acionável

**Onde:** `src/lib/coach/plateau.ts` e `TodayCoachCard.tsx` sugerem deload em texto; sem ação.

O coach diagnostica e o usuário faz a conta na mão.

**Correção:** botão "Aplicar semana de deload" que inicia a sessão com ~60% da carga e menos séries, marcado no resumo.

## 7. Exercícios sem imagem de referência no detalhe

O detalhe da biblioteca traz instruções em texto; falta apoio visual de execução.

**Correção:** área de mídia no detalhe (imagem/GIF quando houver `midiaUrl`) e possibilidade de anexar uma foto própria de setup da máquina.

## 8. Comparar duas rotinas / exercícios

Hoje cada gráfico olha um exercício por vez.

**Correção:** seletor de dois exercícios no gráfico de tendência, sobrepondo as curvas de e1RM.

## 9. Metas semanais além de sessões

`metaTreinosSemana` conta só sessões.

**Correção:** meta opcional de volume semanal (kg) e de séries, exibida junto do card de meta na Home/Treino.

## 10. Resumo semanal

Falta um fechamento de semana que consolide o que já é calculado (volume, séries, RPE, grupos treinados).

**Correção:** card "Sua semana" no Progresso (domingo em diante) com deltas vs semana anterior e um destaque textual do coach.

## Notas técnicas

- Todos os itens são cliente/UI; favoritos, metas extras e fotos locais ficam em localStorage.
- Itens 2, 4, 5, 8, 10 reaproveitam os sets já carregados, sem query nova.
- Strings novas vão para `src/lib/i18n/dict/*` em pt/nl, zero hardcoded.

## Ordem sugerida

3 → 1 → 4 → 2 → 10 → 5 → 9 → 8 → 6 → 7
