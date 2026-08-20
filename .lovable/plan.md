# Tela inicial mais bonita e organizada

Só apresentação: nada de Cloud, backend ou mudança nas regras de negócio. Continua tudo em cima de `src/lib/data/` (mock).

## Problemas atuais

- Dois títulos concorrendo no topo ("Início" no header + "ESTA SEMANA" gigante).
- Três cards de estatística empilhados verticalmente ocupam quase metade da tela com pouca informação.
- Falta o card de objetivo semanal com barra segmentada (existe `metaTreinosSemana`, mas aqui só aparece como "0/4").
- Rotinas e sessões recentes são linhas iguais e sem imagem, sem hierarquia visual.
- Sem estado de carregamento: a tela pisca vazia ("Nenhuma rotina criada ainda") antes dos dados chegarem.

## Nova estrutura da página

```text
saudação + data ("Boa noite, Marcelo" / qui, 20 de agosto)
┌───────────────────────────────┐
│ ESTA SEMANA        3/4        │  card herói com capa escura
│ ▰▰▰▱  barra segmentada        │  + botão Iniciar/Retomar treino
└───────────────────────────────┘
[ Volume ] [ Tempo ] [ Séries ]     3 métricas em linha, compactas
SUAS ROTINAS            ver todas   cards horizontais com capa + n° de exercícios
SESSÕES RECENTES        histórico   lista com miniatura do grupo, data e volume
```

## Detalhes

- **Herói**: um único bloco combinando objetivo semanal (contador `x/meta` + barra segmentada, um segmento por treino da meta) e a ação principal (Retomar quando há sessão ativa, Iniciar caso contrário). Usa capa escura de `src/lib/exercise-image.ts` com `veil` e `shadow-elegant`.
- **Métricas**: grid de 3 colunas, números em `font-display` tabular, rótulo em `label-caps`. Some o empilhamento atual.
- **Rotinas**: card com capa discreta ao fundo, nome, contagem de exercícios e último treino (`getRoutineLastWorkoutDate`), chevron alinhado. Máx. 3 + "ver todas".
- **Sessões recentes**: linhas com miniatura (`ExerciseThumb` / imagem por grupo), nome da rotina, data relativa + duração, volume à direita. Máx. 4 + link para `/progresso`.
- **Carregamento**: skeletons no lugar dos vazios enquanto `useQuery` roda; textos de vazio só quando realmente não há dados.
- **Espaçamento e toque**: seções com respiro consistente, todos os alvos ≥ 44px, sem cores fixas — só tokens semânticos.

## Técnico

- Muda apenas `src/routes/inicio.tsx` (e, se necessário, pequenos ajustes de tokens/utilitários em `src/styles.css`).
- Reaproveita `AppShell`, `ExerciseThumb`, `routineCover`, `formatDurationShort`, `relativeDays`, `formatKg`.
- Sem novas dependências. `head()` da rota permanece com título/descrição próprios.
- Verificação com Playwright em viewport 393px, conferindo hierarquia, contraste e alvos de toque.
