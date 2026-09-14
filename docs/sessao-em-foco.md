# Sessão em foco (fase 1)

Redesenho da tela de sessão (`/sessao`) para mostrar uma coisa por vez: o
exercício atual e a série que está para ser feita. Tudo o que não é registrar
a série saiu da tela principal e foi para um sheet. Base: avaliação de UX da
jornada de treino (2026-09-14).

## O que mudou na tela

| Antes                                                                                | Agora                                                                                               |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Cabeçalho de 3 camadas (título + ícones, Duração/Volume/Séries, chips)               | Um cabeçalho: nome da rotina, tempo · volume, segmentos por exercício, nome do exercício e ⋯        |
| Todos os exercícios em cards, um aberto                                              | Só o exercício atual; os outros ficam no painel do treino (ícone de lista)                          |
| Tabela de 6 colunas por série (tipo, anterior, kg, reps, RPE, ✓)                     | Série atual grande: kg e reps com −/+ (segurar e deslizar continua), "última: …", meta, ✓ de 56 px  |
| Séries feitas com campos abertos + "+ Nota para o coach"                             | Linha compacta `60 kg × 10 @8`; toque abre o editor (kg, reps, RPE, tipo, nota, desmarcar, remover) |
| Cinco pílulas de ferramenta por exercício                                            | Menu ⋯: ver como fazer, histórico, descanso, anilhas, trocar, aquecimento, pular, nota, remover     |
| Barra "Descanso 1:30 · Iniciar descanso" sempre no rodapé + botão Finalizar de 56 px | Rodapé só com a ilha de descanso enquanto há descanso; nada quando não há                           |
| Overlay modal "Descanso terminou" com botão "Retomar"                                | A ilha vira contagem "+0:12" e pulsa 3 vezes; som e vibração como antes                             |
| Toasts "metade do treino" e "última série"                                           | Segmentos do cabeçalho e o card "Todas as séries feitas · Finalizar treino"                         |
| Arrastar card, arrastar chip e "mover para cima/baixo"                               | Setas ↑↓ no painel do treino                                                                        |
| Modo foco opcional                                                                   | É o padrão                                                                                          |

Cor com um papel só: verde = feito (série e exercício), roxo = a ação de agora
(série atual, ✓), laranja = número que cresce (volume, meta).

## Onde cada coisa vive agora

- `src/routes/_authenticated/sessao.tsx`: estado, efeitos (descanso, RPE, PR,
  queda de desempenho), finalizar. Sem drag-and-drop e sem overlay de descanso.
- `src/components/session/SessionHeader.tsx`: cabeçalho e segmentos.
- `src/components/session/CurrentSetCard.tsx`: a série atual (usa `SetFields`).
- `src/components/session/SetFields.tsx` + `NumberField.tsx`: campos de kg/reps
  com stepper e o gesto de segurar e deslizar (`use-value-scrub`).
- `src/components/session/SetRows.tsx`: linhas de série feita e pendente.
- `src/components/session/SetEditSheet.tsx`: editor de uma série.
- `src/components/session/ExerciseMenuSheet.tsx`: menu ⋯ do exercício.
- `src/components/session/SessionSheet.tsx`: lista de exercícios, adicionar,
  nota da sessão, pausar relógio, finalizar.
- `src/components/session/ExerciseHistorySheet.tsx`: histórico (movido).
- `src/lib/i18n/dict/session-focus.ts`: strings novas (pt/nl).

Nada mudou em `complete-set.ts`, `session-state.ts`, `RestIsland`, `RpeSheet`,
`SessionExercisePickerSheet` nem no mini-player.

## Verificação

`bun run lint`, `bun run build` e roteiro manual no celular (375×667): iniciar,
3 exercícios, concluir série (descanso + RPE), editar série feita, trocar
exercício pelo ⋯, pular, reordenar pelo painel, finalizar.
