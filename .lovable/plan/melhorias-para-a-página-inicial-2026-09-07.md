# Melhorias para a página inicial

Só apresentação e organização da tela `Início`. Nada de banco, backend ou mudança nas regras de treino/dieta — tudo continua em cima dos dados já carregados.

## O que atrapalha hoje

- O botão principal (Começar / Retomar treino) aparece depois de três blocos de números, então a ação mais importante fica abaixo da dobra.
- Volume, consistência e recorde são três seções separadas, cada uma com título próprio: muita rolagem para pouca informação.
- Não existe o "treino de hoje" em destaque — só o nome da rotina dentro do botão.
- Cartões de coach, cross-training, dieta e checklist entram na mesma ordem sempre, sem hierarquia entre "preciso agir" e "só informação".
- Se o carregamento falhar, o erro aparece no topo mas os blocos vazios continuam abaixo, o que confunde.

## Sugestões (em ordem de impacto)

1. **Ação primeiro**: mover o cartão de ação para logo abaixo da saudação, mostrando o treino de hoje (nome da rotina, número de exercícios, duração estimada) com o botão Começar/Retomar dentro. Quando há sessão ativa, o cartão muda para "em andamento" com o tempo corrido.
2. **Meta da semana visível**: barra segmentada com um segmento por treino da meta (`x/meta`) dentro do mesmo cartão de ação, substituindo a contagem escondida no texto do heatmap.
3. **Três números em uma linha**: volume da semana, treinos e sequência juntos em um grid de 3 colunas, com o delta vs. semana anterior como pastilha. Some o bloco herói alto de volume.
4. **Consistência mais compacta**: heatmap com rótulo curto e legenda enxuta ao lado dos números, sem título próprio.
5. **Recorde como faixa**: transformar o cartão de PR em uma faixa fina (troféu + exercício + carga × reps + quando), clicável para o Progresso.
6. **Só o que exige atenção**: coach, cross-training e checklist aparecem apenas quando têm conteúdo relevante; nada de cartão-fantasma com traços cinza.
7. **Dieta resumida**: um cartão com dois anéis/barras (kcal e proteína) lado a lado, em vez de duas barras empilhadas com textos repetidos.
8. **Carregamento e erro honestos**: esqueletos com a forma final; quando o carregamento falha, mostrar apenas o aviso com "tentar novamente", sem os blocos zerados.
9. **Toque e respiro**: espaçamento consistente entre seções, todos os alvos ≥ 44px, sem cor fixa — só tokens do tema.

## Técnico

- Alterações restritas a `src/routes/_authenticated/inicio.tsx` mais chaves novas em `src/lib/i18n/dict/home.ts` (en/pt/nl).
- Reaproveita `CountUp`, `ProgressRing`, `Skeleton`, `QueryError`, `CoachNotesCard`, `CrossTrainingSheet`, `formatKg`, `relativeDays`, `weeklyVolume`, `sessionsThisWeek`, `weekStreak`, `heatmap`, `nextRoutine`.
- Meta semanal lida de `weekly-targets` / perfil já existente; sem novo cálculo de negócio.
- Sem dependências novas; `head()` da rota permanece.
- Verificação com Playwright em viewport de celular, conferindo hierarquia, contraste e alvos de toque.
