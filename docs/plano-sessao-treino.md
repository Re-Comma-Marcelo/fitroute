# Plano — correções na sessão de treino

Cinco temas levantados em 2026-09-13. Para cada um: o que acontece hoje (com a
referência no código), o que muda, arquivos envolvidos e critério de aceite.
No fim, a ordem de execução em três fases.

Contexto do código: a tela de sessão é `src/routes/_authenticated/sessao.tsx`
(2.500 linhas). O estado da sessão vive em `src/lib/session-state.ts` e é
persistido em `localStorage`. O descanso é o `RestIsland` na barra inferior.
O catálogo tem 80 exercícios embutidos (`src/lib/data/mocks.ts`); 43 deles têm
mídia no Supabase (bucket público `exercise-media`, 43 loops WebP + 43 thumbs).

---

## 1. O timer de descanso tem de começar no check da série

### Diagnóstico

Hoje `toggleSet` (sessao.tsx ~551-620) até chama `startRest`, mas de forma
frágil:

1. **Bug de concorrência com o React.** As variáveis `descanso`, `proximo`,
   `completou` e `logged` são preenchidas *dentro* do updater de
   `setSession(prev => ...)` e lidas logo depois, de forma síncrona. O React só
   executa o updater na hora se o componente não tiver nenhuma atualização
   pendente. Como `useTick` dispara um `setState` a cada segundo (sessao.tsx
   ~176) e cada tecla digitada também enfileira (`patchSet`), há uma janela em
   que o updater fica para o render seguinte e o código lê `descanso = 0`:
   sem descanso, sem prompt de RPE, sem avanço de exercício. Isso explica o
   comportamento intermitente. `repeatLastSet` tem o mesmo padrão.
2. **O timer começa mas fica escondido.** Logo após o check abre o `RpeSheet`
   (bottom sheet modal) por cima da barra inferior, exatamente onde o
   `RestIsland` mora. A pessoa não vê a contagem começar.
3. Dentro de um superset o descanso é 0 por desenho (`supersetChain`), mas a
   tela não mostra nada. Parece que "não começou".

### O que fazer

- Extrair a lógica para uma função pura em `session-state.ts`:
  `completeSet(session, exIdx, setIdx): { session, effects }`, onde `effects`
  traz `restSeconds`, `nextExerciseIdx`, `exerciseDone`, `logged`,
  `targetLine`. `toggleSet` passa a calcular a partir de um `sessionRef`
  (sempre sincronizado com o estado), aplica `setSession(next)` e executa os
  efeitos. Nada mais é lido de dentro de um updater. Aplicar o mesmo a
  `repeatLastSet`.
- Chamar `startRest` **antes** de abrir o RPE, e mostrar a contagem (mm:ss +
  anel) no cabeçalho do `RpeSheet`, para o timer ser visível desde o primeiro
  segundo.
- Em superset: mostrar no lugar do descanso um chip "Sem descanso · próximo:
  {exercício}" na barra inferior.
- Descanso "tempo" (série cronometrada): o check já registra segundos; manter.

### Arquivos

`src/lib/session-state.ts`, `src/routes/_authenticated/sessao.tsx`,
`src/components/RpeScale.tsx` (cabeçalho com contagem), `src/components/RestIsland.tsx`.

### Aceite

- 50 checks seguidos, digitando peso/reps entre eles, com o relógio rodando:
  100% iniciam o descanso com o valor do exercício.
- O countdown aparece na hora, mesmo com o sheet de RPE aberto.
- Dentro de superset aparece o chip "sem descanso" em vez de nada.

Esforço: 0,5 dia.

---

## 2. RPE conclui a série (um toque a menos)

### Diagnóstico

Fluxo atual para registrar uma série com esforço: **✓ → sheet de RPE → toca o
valor → "Salvar esforço"** = 3 toques. Além disso o alvo da próxima série
(`nextSetTarget`) é calculado no check, quando o RPE ainda está vazio, e não é
recalculado depois que o RPE chega (sessao.tsx ~570-585). O RPE hoje não
influencia a sugestão, embora `nextSetTarget` o suporte.

### O que fazer

- **No sheet de RPE, tocar num valor salva e fecha.** Some o botão "Salvar
  esforço"; ficam "Pular" e "Limpar". No arraste, o valor é confirmado ao
  soltar o dedo (pointerup), com o haptic já existente.
- **O botão RPE da linha vira atalho de conclusão.** Numa série ainda não
  marcada, tocar em RPE abre o sheet; escolher o valor aceita peso/reps
  sugeridos, marca a série como concluída, salva o RPE e inicia o descanso.
  Fluxo passa a ser **RPE → valor** (2 toques, com esforço registrado). O ✓
  continua existindo para quem não registra RPE.
- Recalcular `nextSetTarget` quando o RPE for salvo depois do check, e
  atualizar a linha "Próxima série: …".
- Micro-copy do sheet: "Como foi? Toque e pronto." Mantém a preferência
  "Perguntar RPE ao concluir" que já existe (`askRpeEnabled`).

### Arquivos

`src/components/RpeScale.tsx`, `src/routes/_authenticated/sessao.tsx` (SetRow,
PsePicker, toggleSet), `src/lib/i18n/dict/session.ts` (novas strings pt/en/nl).

### Aceite

- Série com RPE: 2 toques. Série sem RPE: 1 toque (✓).
- A linha "Próxima série" muda quando o RPE registrado é 9,5+ (segura carga)
  ou ≤ 8 no topo da faixa (sobe carga).

Esforço: 0,5 dia.

---

## 3. Trocar exercício e receber sugestões está quebrado

### Diagnóstico

Há três caminhos e cada um tem um problema diferente:

a) **Menu "Trocar exercício" na sessão** (sessao.tsx ~983): manda para a
   biblioteca em outra rota, guarda o slot em `localStorage` e, na volta,
   reconstrói o exercício com `buildActiveExercise(pending)` **sem opções**
   (~262-284). Resultado: perde o número de séries, a faixa de reps e o
   descanso configurados; volta com 3×8-12 padrão. A navegação também tira a
   pessoa da sessão (perde posição e o timer de vista).

b) **Chat do coach na sessão** (`SessionCoachSheet.tsx`): só sugere trocas se
   a mensagem contém uma palavra de `SWAP_HINTS`. Faltam variantes comuns em
   português ("troca", "outro", "sugest", "não consigo", "ocupada", "difícil",
   "incomoda"). Os candidatos exigem `equipamento ∈ profile.equipment`: quem
   marcou só "Halteres" no perfil nunca recebe alternativa para um exercício de
   máquina. Grupos pequenos do catálogo (Panturrilha 2, Adutores 1, Antebraço
   2, Trapézio 2) caem em "Nada no arquivo…". A lista é `slice(0,3)` em ordem
   alfabética, sem ranking, sem thumb, sem última carga.

c) **Card "Coach · hoje" na Home** (`TodayCoachCard.tsx` ~118): o botão
   "Trocar exercício" fica **desabilitado** a menos que o coach tenha
   sinalizado algum exercício (`model.flagged`). Para o usuário, o botão
   simplesmente não funciona.

### O que fazer

- **Um único ranqueador** em `src/lib/coach/swap.ts`:
  `rankSwapCandidates(target, exercises, { profile, excludeIds, reason })`.
  Regras: mesmo grupo primário (obrigatório); equipamento do perfil e do
  exercício original dão bônus, não filtram; histórico (já treinou) dá bônus;
  lista de "evitar" exclui; se sobrar menos de 3, completa com grupos
  secundários compatíveis. Nunca devolve vazio se existir qualquer exercício
  do mesmo grupo. Motivo influencia: "máquina ocupada" prefere outro
  equipamento; "dor no ombro" evita padrões overhead (mapa simples de tags por
  exercício). Usado pelos três caminhos.
- **Trocar na sessão sem sair da tela**: reaproveitar
  `SessionExercisePickerSheet` em modo `replace`, com uma seção "Sugeridas"
  no topo (ranqueador acima, com thumb, equipamento e última carga) e a busca
  completa embaixo. A troca usa `swapExerciseTo` (sessao.tsx ~646), que já
  preserva séries/reps/descanso. Remover o round-trip pela biblioteca.
- **Chat do coach**: ampliar as intenções (pt/en/nl) e renderizar as
  sugestões como cards. Sempre oferecer "Ver mais opções" que abre o picker
  em modo replace.
- **Home**: "Trocar exercício" habilitado sempre; lista todos os exercícios da
  rotina com os sinalizados primeiro.

### Arquivos

`src/lib/coach/swap.ts`, `src/components/SessionExercisePickerSheet.tsx`,
`src/components/SessionCoachSheet.tsx`, `src/components/TodayCoachCard.tsx`,
`src/routes/_authenticated/treino.tsx`, `src/routes/_authenticated/sessao.tsx`,
`src/lib/i18n/dict/coach.ts`.

### Aceite

- Trocar um exercício na sessão mantém 4×6-8 e 150 s se era isso que estava
  configurado.
- "quero trocar, a máquina tá ocupada" devolve 3 opções de outro equipamento.
- Nenhum exercício do catálogo devolve "Nada no arquivo".
- Na Home, qualquer exercício da rotina de hoje pode ser trocado.

Esforço: 1,5 dia.

---

## 4. Vídeo padrão, músculos em destaque e vídeo de preparo

### Estado atual

- Bucket `exercise-media` (público) tem 43 loops WebP animados + 43 thumbs,
  nomeados como no dataset free-exercise-db; a tabela `exercises` no Supabase
  tem `midia_url` nesses 43. O catálogo embutido tem 80 exercícios: **37 estão
  sem mídia**.
- Na sessão, o botão ▶ "Ver como fazer" abre `ExerciseDetailSheet`, que mostra
  o loop, instruções, dicas do coach, histórico e chat. Já é um bom lugar;
  falta conteúdo e falta destacar músculos.
- O catálogo já tem `grupoPrimario` e `gruposSecundarios` por exercício.

### Decisão proposta: o "vídeo padrão"

Manter o **loop WebP animado (3:2, ≤ 300 KB)** como formato padrão, em vez de
vídeo MP4 ou YouTube. Motivos: carrega em 4G de academia, funciona offline com
o PWA, sem player, sem anúncio, sem bloqueio de CSP, e o pipeline (bucket +
`midia_url` + `exerciseMedia.ts`) já existe. Fonte: free-exercise-db (mesma
origem dos 43 atuais), completando os 37 que faltam; para exercícios sem
equivalente, gravar/curar loop próprio.

### O que fazer

1. **Completar a mídia dos 37 exercícios.** Script `scripts/sync-exercise-media.ts`
   que mapeia `id → slug free-exercise-db`, gera loop + thumb (WebP) e faz
   upload no bucket, e uma migração SQL que grava `midia_url`. Adicionar
   `midiaUrl` ao catálogo embutido para funcionar offline no primeiro uso.
2. **Mapa muscular.** Componente `MuscleMap` (SVG frente/costas, ~13 regiões
   que batem com os grupos do catálogo). Primário em cor forte, secundários em
   cor fraca. Entra no `ExerciseDetailSheet` ao lado do loop e no detalhe da
   biblioteca. Também vira o fallback visual quando um exercício não tem loop.
3. **Loop visível na própria sessão.** Thumb pequena (44 px) ao lado do nome do
   exercício no card; toque abre o sheet. Reconhecimento instantâneo sem abrir
   nada.
4. **Vídeo de preparo quando a pessoa relata dificuldade.** No
   `SessionCoachSheet`, nova intenção `DIFFICULTY_HINTS` ("não consigo",
   "difícil", "desconfortável", "incomoda", "travado", "hard", "can't",
   "uncomfortable", "stiff", "moeilijk"). A resposta é um card "Preparar o
   corpo" com: (a) loop/vídeo de mobilidade/ativação para o grupo muscular
   (mapa `src/lib/coach/prep-media.ts`: grupo → título, mídia em
   `exercise-media/prep/<grupo>.webp`, 3 passos em texto); (b) uma
   **regressão** (variação mais fácil: mesmo grupo, peso corporal ou máquina,
   menor complexidade); (c) as opções de troca do item 3. A mensagem é salva
   como nota do coach com tag `difficulty`, então o plano do dia seguinte já
   considera isso (`saveCoachNote` já existe).
5. Conteúdo de preparo: 13 grupos → 13 peças de mídia curtas (mobilidade de
   ombro, quadril, tornozelo, coluna torácica, etc.). Fase 1 entrega texto +
   regressão; a mídia entra quando o conteúdo for gravado/curado.

### Arquivos

`scripts/sync-exercise-media.ts`, `src/lib/data/mocks.ts`,
`src/components/MuscleMap.tsx`, `src/components/ExerciseDetailSheet.tsx`,
`src/components/SessionCoachSheet.tsx`, `src/lib/coach/prep-media.ts`,
`src/lib/coach/swap.ts` (regressão), `src/routes/_authenticated/sessao.tsx`.

### Aceite

- 80/80 exercícios com loop e thumb.
- O sheet mostra o mapa com primário/secundários corretos para qualquer
  exercício.
- "não consigo fazer esse movimento direito" devolve o card de preparo com
  regressão e opções de troca, e grava a nota.

Esforço: 2 dias de código + conteúdo (mídia dos 37 + 13 preparos).

---

## 5. Confirmação ao concluir a série (feedback que dá vontade de continuar)

### Estado atual

Ao marcar: o ✓ escala 15% por 200 ms (`set-pop`), a linha pisca verde por
400 ms (`set-flash`), vibração de 15 ms. Ao fechar o exercício: barra fica
verde por 600 ms e aparece o banner "Próximo". Não há PR ao vivo, som,
marcos de progresso ou animação no cabeçalho.

### O que fazer (em camadas, todas ≤ 400 ms para não atrasar o registro)

- **Série**: ✓ preenche com anel circular + pop maior; a linha "trava" no
  estado feito (kg×reps em negrito, campos somem); chip "+240 kg" voa da linha
  até o contador de Volume no cabeçalho, que anima com o `CountUp` existente;
  o `ProgressRing` do cabeçalho anima o incremento. Haptic: tick normal; PR →
  `hapticSuccess`.
- **PR ao vivo**: pré-carregar `getPersonalRecord` por exercício ao iniciar a
  sessão (guardar `prKg` no `ActiveExercise`). Se a série bate o PR: selo
  "🏆 PR" na linha, explosão de confete em CSS puro (sem lib), haptic de
  sucesso. Hoje o PR só aparece no resumo final.
- **Exercício concluído**: card recolhe com animação, banner verde "Exercício
  concluído · 3 de 6" com pulso, e "Próximo: {nome}" já em destaque (o banner
  existe; ganha o pulso e o contador).
- **Marcos da sessão** (não bloqueantes, respeitando a regra "sem modal na
  sessão"): metade do treino ("Metade. 2,1 t levantados") e última série
  ("Última série do treino"). Toast de 2 s no topo.
- **Resumo** (`resumo.$id.tsx`): já tem CountUp, PRs e compartilhar. Adicionar
  "vs. última vez" (o `SessionDiffCard` existe) e "sequência de semanas"
  (`weekStreak` existe) logo abaixo do número principal.
- Respeitar `prefers-reduced-motion` e a preferência de vibração do perfil.

### Arquivos

`src/styles.css` (keyframes: ring-fill, fly-up, confetti), `src/routes/_authenticated/sessao.tsx`
(SetRow, header, toasts), `src/lib/session-state.ts` (`prKg`),
`src/lib/start-session.ts` (pré-carregar PR), `src/routes/_authenticated/resumo.$id.tsx`,
`src/lib/haptics.ts`.

### Aceite

- Cada check gera feedback visível no cabeçalho (volume e anel) além da linha.
- Bater um PR na academia mostra o selo e o confete na hora.
- Com "reduzir movimento" ativo, nada anima mas o estado muda igual.

Esforço: 1,5 dia.

---

## Ordem de execução

| Fase | Itens | Por quê | Esforço |
| --- | --- | --- | --- |
| 1 · Correções | 1, 2, 3a, 3c | Bugs que quebram o fluxo principal de registrar série e trocar exercício | ~2 dias |
| 2 · Experiência | 5, 3b | Feedback ao concluir e sugestões inteligentes no chat | ~2 dias |
| 3 · Conteúdo | 4 | Depende de decisão de formato (proposta: WebP loop) e produção de mídia | ~2 dias + conteúdo |

Cada fase vira um PR próprio, publicado no Lovable depois de validar no
celular (375×667, uma mão). Verificação por fase: `bun run lint`,
`bun run build` e roteiro manual de sessão completa (iniciar, 3 exercícios,
troca, RPE, PR, finalizar).

## Decisões tomadas (2026-09-13)

1. Vídeo/mídia (item 4) fica para depois; nenhuma alteração de conteúdo agora.
2. O RPE continua sendo perguntado logo após o ✓, mas passa a salvar com um
   único toque no valor.
3. Itens 1, 2, 3 e 5 implementados na branch `claude/focused-edison-teenpo`.
