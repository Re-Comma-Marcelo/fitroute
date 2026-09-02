# 10 melhorias para o Iron Logger

Auditoria do estado atual: o descanso estourado já ficou pronto (ilha conta "+1:20" após o zero). Já existem, prontos mas **não ligados a nenhuma tela**, os módulos `src/lib/favorites.ts`, `records.ts`, `weekly-targets.ts`, `exercise-photos.ts`, `week-summary.ts` e os cards `PersonalRecordsCard`, `ExerciseCompareCard`, `WeekSummaryCard` — nenhuma rota os importa. Esta rodada entrega esse valor ao usuário e fecha as lacunas restantes. Tudo cliente/UI: sem schema, auth ou MCP.

## 1. Favoritos na biblioteca

Estrela no card da biblioteca e seção "Favoritos" no topo, com os mesmos favoritos aparecendo no seletor de exercícios da sessão.

## 2. Tela de recordes (PRs)

`PersonalRecordsCard` no Progresso: melhor carga, melhor e1RM e data por exercício, ordenável por recentes ou mais forte.

## 3. Resumo semanal

`WeekSummaryCard` no Progresso: sessões, volume, séries, PSE médio, tempo sob tensão e grupos treinados, com deltas vs. semana anterior.

## 4. Comparar dois exercícios

`ExerciseCompareCard` no Progresso: duas curvas de e1RM sobrepostas com seletores de exercício.

## 5. Séries por tempo nas métricas

Tempo sob tensão entra no Progresso (modo do gráfico de tendência semanal), hoje ausente em `progress-analytics.ts`.

## 6. Metas semanais de volume e séries

Campos opcionais no Perfil (volume kg e séries), exibidos ao lado da meta de sessões na Home/Treino e no resumo semanal.

## 7. Histórico completo de notas do coach

`CoachNotesCard` ganha "ver todas" com paginação simples, em vez de cortar a lista.

## 8. Mídia e foto de setup no detalhe do exercício

Área visual no detalhe da biblioteca: imagem de `midiaUrl` quando houver, mais foto própria de setup da máquina (local, comprimida).

## 9. Filtro "Favoritos" e ordenação na biblioteca

Chip de filtro por favoritos e ordenação por mais usados recentemente, para chegar rápido nos 15 exercícios de sempre.

## 10. Destaque do coach no resumo semanal

Uma frase gerada dos sinais já calculados (volume caindo, PSE alto, aderência) fechando o card "Sua semana".

## Notas técnicas

- Integrações: `progresso.index.tsx` (itens 2, 3, 4, 5, 10), `biblioteca.tsx` (1, 8, 9), `perfil.tsx` + `treino.tsx` (6), `CoachNotesCard.tsx` (7).
- Favoritos, metas extras e fotos ficam em localStorage; itens 2, 3, 4, 5 e 10 reaproveitam os sets já carregados pela tela de Progresso, sem query nova.
- Strings novas em `src/lib/i18n/dict/*` (en/pt/nl), zero hardcoded.

## Ordem sugerida

1 → 2 → 3 → 6 → 5 → 10 → 9 → 7 → 8 → 4
