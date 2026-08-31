# 10 melhorias para o Iron Logger

Auditoria read-only feita sobre o código atual (Home, Sessão, Treino, Dieta, Progresso, Perfil, Onboarding, busca, rotinas, coach). Cada item referencia o arquivo e a linha real onde o problema existe. Tudo é frontend/cliente, salvo onde indicado.

## 1. Timer de descanso trava ao sair da tela de sessão

**Onde:** `src/routes/_authenticated/sessao.tsx:188` (useEffect do rest), `src/components/SessionMiniPlayer.tsx:49`.

O `useEffect` que faz `clearRest()`, toca o beep e dispara a haptic só roda montado em `sessao.tsx`. O mini-player — cujo propósito é deixar você navegar durante o descanso — lê `restSecondsLeft(session)` mas nunca limpa o descanso quando ele expira. Resultado: em outra aba, o contador cai para `0:00` e fica travado, sem som, sem vibração e sem overlay. A `scheduleRestNotification` envia uma notificação (se houver permissão), mas o estado visual fica preso.

**Correção:** mover a lógica de expiração do descanso para um hook compartilhado (ou para o mini-player), de forma que `clearRest()` + feedback aconteçam independentemente da aba ativa.

## 2. Notas por exercício digitadas na sessão são perdidas ao salvar

**Onde:** `src/routes/_authenticated/sessao.tsx:873` (Textarea `ex.notas`), `src/routes/_authenticated/sessao.tsx:561` (loop de save em `finalizar`).

O `Textarea` de nota por exercício é capturado em `ActiveExercise.notas`, mas `finalizar()` constrói os `WorkoutSet` sem carregar esse campo — só `workout.notas` (nota da sessão) sobrevive. A tela de detalhes (`progresso.$id.tsx`) nunca exibe notas por exercício. O usuário digita contexto valioso ("ombro incomodou no set 3") e ele desaparece.

**Correção:** persistir `notas` por exercício no save (pode ser um campo JSON no workout ou em cada set) e exibi-lo na tela de detalhes. Pode exigir uma coluna a mais no schema — avisar antes de tocar no backend.

## 3. Coach chat é keyword matching, não IA de verdade

**Onde:** `src/lib/coach/chat.ts`.

O `askCoach()` é uma cadeia de `if/else` com `asks("today", "treinar", "vandaag", …)`. Cada branch retorna uma string fixa. O posicionamento do app é "an AI trainer that adapts to your actual life", mas o chat não raciocina — não há LLM, não há contexto do usuário além de dados pré-computados. Perguntas fora das palavras-chave recebem "I can't reason about that yet."

**Correção:** usar o conector MCP do Claude com o contexto do usuário (perfil, última sessão, rotina do dia, insights de platô) como system prompt, mantendo o fallback atual como guardrail. Frontend puro se a chamada for via server fn existente.

## 4. Busca global: resultado de exercício não leva ao exercício

**Onde:** `src/routes/_authenticated/buscar.tsx:85`.

Ao tocar num resultado de exercício, `open()` navega para `/biblioteca` sem nenhum parâmetro — o usuário cai na lista geral sem saber qual exercício buscou. Rotinas e refeições têm destino útil; exercícios não.

**Correção:** passar o `exerciseId` via search params para a biblioteca e abrir o sheet de detalhes automaticamente (ou rolar até o item).

## 5. Editor de rotina: arrastar para reordenar não funciona no toque

**Onde:** `src/routes/_authenticated/rotina.$id.tsx:268` (`draggable`, `onDragStart`, `onDrop`).

O reordenamento usa HTML5 Drag and Drop, que não funciona em telas touch. O app é mobile-first, então o gesto principal de reordenação está quebrado no celular. Os botões ↑/↓ existem mas são caracteres de texto minúsculos sem ícone, difíceis de acertar.

**Correção:** adicionar um polyfill de touch-drag (ex.: `react-dnd` com backend de touch) ou trocar por botões de mover visíveis e bem dimensionados (44px, com ícone).

## 6. Campo de peso no Perfil ignora a preferência kg/lb

**Onde:** `src/routes/_authenticated/perfil.tsx:371` (`Weight (kg)`), `src/lib/units.ts`, `src/lib/use-weight-unit.ts`.

A sessão e a tela de detalhes usam `useWeightUnit()` para mostrar kg ou lb conforme a preferência do usuário. Mas o Perfil sempre mostra "Weight (kg)" e armazena em kg direto. Se o usuário selecionou lb, ele vê lb na sessão mas precisa digitar kg no perfil — inconsistente e propenso a erro.

**Correção:** aplicar `useWeightUnit()` no campo de peso do Perfil (label, valor exibido e conversão ao armazenar), igual à sessão.

## 7. `structuredClone` da sessão inteira a cada tecla

**Onde:** `src/routes/_authenticated/sessao.tsx:239` (`update()`).

Cada `setField` (peso, reps, rpe) chama `update()` que faz `structuredClone(prev)` — deep clone de todos os exercícios e séries. Em sessões longas (10+ exercícios), cada tecla é O(n) com alocação pesada, causando lag perceptível no input em celulares mais fracos.

**Correção:** trocar por atualização imutável rasa (map/filter nos arrays relevantes) em vez de deep clone.

## 8. Dieta "Today" sem loading nem erro

**Onde:** `src/routes/_authenticated/dieta.index.tsx`.

`mealsQ`, `scheduleQ`, `targetsQ`, `planQ` não têm skeleton de loading nem estado de erro. Enquanto carrega, a página mostra o empty state "No meal planned for this slot yet" — o usuário acha que não tem nada planejado quando na verdade ainda está carregando. Se a rede falha, nenhuma mensagem aparece.

**Correção:** adicionar skeletons durante `isLoading` e estado de erro com "Try again" (mesmo padrão já usado em `biblioteca.tsx` e `onboarding.tsx`).

## 9. Coach chat não rola para a última mensagem

**Onde:** `src/components/CoachChatSheet.tsx:110` (container de mensagens).

Quando o coach responde, a nova mensagem pode ficar fora da área visível — não há auto-scroll. Em conversas longas o usuário não vê a resposta sem rolar manualmente.

**Correção:** adicionar um `ref` no fim da lista de mensagens e `scrollIntoView` ao receber resposta do coach.

## 10. Dieta "Week" sem macros completos nem barra de progresso

**Onde:** `src/routes/_authenticated/dieta.week.tsx:114`.

O card de cada dia mostra só `kcal / target kcal · P {proteinG}g`. A tela "Today" tem `MacroRings` com kcal, proteína, carboidratos e gordura, mais um anel visual. A semana não mostra carbs/fat nem nenhuma barra contra a meta — menos informativa e visualmente mais pobre que o restante do app.

**Correção:** adicionar uma mini-linha de macros (kcal · P · C · F) e uma barra fina de progresso contra a meta diária em cada dia, reaproveitando `totalsFor` e `targets`.

## Notas técnicas

- Itens 1, 4, 5, 6, 7, 8, 9, 10 são puramente cliente/UI.
- Item 2 pode precisar de uma coluna nova (ex.: `notas` em `workout_sets` ou JSON em `workouts`) — avisar antes de mexer no schema.
- Item 3 pode ser feito via server fn existente (`nutrition-ai.functions.ts` já usa o AI Gateway) sem novo endpoint.
- Strings novas vão para `src/lib/i18n/dict/*` em pt/nl, zero hardcoded.
- Nenhuma mudança em auth, MCP, service worker ou manifest sem aviso prévio.

## Ordem sugerida

1 → 7 → 8 → 4 → 6 → 9 → 5 → 10 → 2 → 3
