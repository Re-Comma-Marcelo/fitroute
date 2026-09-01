# 10 melhorias para o Iron Logger — rodada nova

Auditoria read-only do código atual. Cada item indica o arquivo onde a lacuna foi confirmada. Tudo frontend, exceto onde marcado.

## 1. Peso corporal ao longo do tempo

**Onde:** `src/lib/types.ts:21` — `pesoKg` é um único número no perfil; não existe nenhum registro histórico em `src/lib/data/`.

Você tem meta de peso, mas só o valor atual. Não há como ver a curva, que é o dado que diz se o bulk/cut está indo.

**Correção:** registro rápido de peso (data + kg) com lista e gráfico de tendência no Progresso. Requer uma tabela nova no seu Supabase — aviso antes de tocar em schema.

## 2. Estados de erro faltando na Home e na Lista de mercado

**Onde:** `src/routes/_authenticated/inicio.tsx:63-70` só usa `isLoading`; `src/routes/_authenticated/dieta.market.tsx:56` não trata `isError`.

Com rede ruim a Home mostra zeros e a lista aparece vazia — parece perda de dados em vez de falha de carregamento.

**Correção:** aplicar o `QueryError` já existente (com "Tentar de novo") nessas duas telas.

## 3. 1RM estimado (e1RM)

**Onde:** nenhuma referência a `e1rm`/`1rm` em `src/lib`.

Progresso compara volume e carga bruta. Subir de 80x5 para 85x3 é evolução, mas hoje isso não aparece em nenhum número.

**Correção:** e1RM (Epley) por série concluída, melhor e1RM por exercício no card de Key Lifts e na linha de histórico do exercício.

## 4. Rotinas sem dia da semana

**Onde:** `src/lib/types.ts` / `src/lib/data/routines.ts` — não existe campo de dias.

A meta semanal conta sessões, mas nada diz *quando* cada rotina acontece. A Home tem que adivinhar o treino de hoje.

**Correção:** dias sugeridos por rotina no editor e "Hoje: Upper A" na Home a partir desse agendamento.

## 5. Pausar o cronômetro da sessão

**Onde:** `src/lib/session-state.ts:191` — o tempo é sempre `agora − iniciadoEm`.

Interrupção real (ligação, fila na máquina) infla a duração e polui a média do Progresso.

**Correção:** pausar/retomar acumulando tempo ativo, com estado visível no header e no mini-player.

## 6. Atalhos no descanso: −30s / +30s / pular

**Onde:** `src/routes/_authenticated/sessao.tsx:367` — o descanso só inicia com o valor do exercício.

Se o descanso ficou curto ou longo, a única saída é abrir o seletor do exercício e mudar o padrão.

**Correção:** botões de ±30s e "pular" na barra de descanso, sem alterar o padrão da rotina.

## 7. Séries por tempo (prancha, cardio, isometria)

**Onde:** `src/lib/types.ts:92` — a série tem peso e reps; não há campo de duração por série.

Exercícios isométricos hoje são logados como reps falsas, o que distorce volume.

**Correção:** tipo de série por tempo, entrada de segundos e volume calculado sem contar como reps.

## 8. Detalhe do exercício sem histórico

**Onde:** `src/routes/_authenticated/biblioteca.tsx` — o detalhe não mostra PR, histórico nem gráfico.

O sheet de histórico existe só dentro da sessão. Fora do treino não há como revisar um exercício.

**Correção:** reaproveitar o histórico da sessão no detalhe da biblioteca, com PR, e1RM e mini gráfico.

## 9. Aviso de nova versão do app instalado

**Onde:** `src/lib/pwa.ts` — o registro não escuta `updatefound`/`controllerchange`.

Instalado na tela inicial, o app pode servir uma build antiga por dias.

**Correção:** detectar worker em `waiting` e mostrar toast "Nova versão — atualizar" com `skipWaiting` + reload. Mexe no service worker.

## 10. Histórico do Progresso sem calendário

**Onde:** `src/routes/_authenticated/progresso.index.tsx:231` — o histórico é uma lista linear.

Achar "o treino de duas quartas atrás" exige rolar. A Home tem heatmap, o Progresso não.

**Correção:** visão de mês navegável com dias treinados marcados, tocando no dia para abrir a sessão.

## Notas técnicas

- Itens 2, 3, 5, 6, 8, 10 são puramente cliente/UI.
- Itens 1, 4, 7 pedem persistência nova (coluna/tabela no seu Supabase) — confirmo antes.
- Item 9 altera o registro do service worker.
- Strings novas vão para `src/lib/i18n/dict/*` em pt/nl, zero hardcoded.
- Nenhuma mudança de auth ou MCP.

## Ordem sugerida

2 → 6 → 3 → 5 → 8 → 10 → 1 → 4 → 7 → 9
