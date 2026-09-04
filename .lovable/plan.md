# 10 melhorias — rodada de 4 de setembro

Tudo frontend puro: nada de mudanças no Supabase, nada de schema novo. O que precisar guardar fica no aparelho (como as favoritas e as metas já fazem hoje).

## Treino e sessão

1. **Substituir exercício sem perder o lugar** — no menu do exercício, "Trocar por parecido" sugere 3 alternativas do mesmo grupo com o equipamento que você tem, mantendo séries, reps-alvo e descanso.
2. **Modo superset na sessão** — juntar dois exercícios em par: os dois aparecem em um bloco, o descanso só começa depois da segunda série, com marcador A/B.
3. **Resumo de fim de treino mais útil** — além do volume, mostrar recordes batidos, comparação com a última vez na mesma rotina e um lembrete de próximo treino recomendado.
4. **Fila de exercícios reordenável antes de começar** — na tela de treino, tocar em "Ajustar ordem" abre uma lista arrastável e a sessão já começa nessa ordem.

## Progresso

5. **Filtro por grupo muscular no histórico** — chips (peito, costas, pernas…) para ver só as sessões que treinaram aquele grupo.
6. **Metas de carga por exercício** — definir "quero 100 kg no supino" e ver barra de progresso + previsão de quando chega, com base na sua evolução real.
7. **Exportar/compartilhar progresso** — imagem de resumo do mês (sessões, volume, recordes) pronta para enviar.

## Dieta

8. **Porção ajustável ao registrar** — ao marcar uma refeição como comida, escolher 0,5x / 1x / 1,5x e os macros do dia acompanharem.
9. **Refeições rápidas favoritas na tela do dia** — atalho com as 4 refeições que você mais usa, para preencher um horário em um toque.

## App em geral

10. **Central de ajustes rápidos** — um painel no Perfil com o que mais se mexe: unidade (kg/lb), descanso padrão, meta semanal, som/vibração do descanso e idioma, tudo em uma tela só.

## Detalhes técnicos

- Novos módulos locais: `src/lib/similar-exercise.ts`, `src/lib/lift-goals.ts` (estender), `src/lib/share-progress.ts`; porção da refeição entra em `nutrition-local.ts` (`EatenMap` passa a guardar `{ mealId, portion }` com migração tolerante do formato antigo).
- Supersets reaproveitam `src/lib/supersets.ts` e o estado de descanso já global em `session-state.ts`.
- Reordenação antes da sessão reusa o gesto de arrastar já implementado na sessão.
- Compartilhar progresso usa canvas no cliente + Web Share API, com download como fallback.
- Todos os textos novos entram em um novo fragmento de tradução (EN/PT/NL).

## Ordem sugerida

1 → 4 → 8 → 9 → 5 → 3 → 6 → 2 → 10 → 7
