# 5 melhorias para a jornada de dieta

Cinco melhorias focadas em transformar a aba Diet de um planejador passivo em um diário de alimentação que se adapta ao treino e à vida. Frontend-only — sem alterar o schema do Supabase; o estado novo (comido, hidratação) persiste em `localStorage` seguindo o padrão de `session-state.ts`, e pode ser promovido ao Supabase depois.

## Estado atual (confirmado)

- **Today** (`dieta.index.tsx`): slot ciente do horário, anéis de macro, cards de refeição com coach note, swap suggestion, Add Meal (IA texto/foto), Meal Schedule, Meal Detail. Anéis somam refeições **planejadas**, não consumidas.
- **Week** (`dieta.week.tsx`): grade de 7 dias com totais diários, tags de treino, auto-fill e clear. Sem repetição de dia.
- **Market** (`dieta.market.tsx`): lista por corredor com preço estimado, check-off, 3/7 dias. Sem compartilhar.
- **Nutrition insight** (`coach/nutrition.ts`): hardcoded — diz "Meal logging is coming soon" mesmo com logging já existente. Stale.
- Persistência: `meal_plan`, `meal_schedule`, `shopping_checked` no Supabase via `forja.functions.ts`. Sem conceito de "comido".

---

## 1. Diário de alimentação: planejar vs realmente comer

Hoje os anéis refletem intenção (planejado), não realidade. Adicionar um estado de **consumido**:

- No card de refeição planejada, um botão "Mark as eaten" (check). Tocar move a refeição de "planned" → "eaten"; os anéis passam a somar apenas refeições eaten.
- Um mini-toggle discreto no header do slot mostra quantas do dia estão eaten/planned.
- Quick-log de lanche fora do plano: o fluxo Add Meal ganha uma opção "Log now (no slot)" que registra o que você acabou de comer sem agendar no planner — entra direto como eaten no dia.
- Estado `eaten: Record<isoDate, MealSlot[], mealId>` em `localStorage` (chave `forja.eaten`), espelhando `session-state.ts`. Sem schema do Supabase.
- Arquivos: `src/lib/data/nutrition.ts` (cache + accessors `getEaten`, `markEaten`, `clearEaten`), `dieta.index.tsx` (toggle + contagem), `nutrition-ui.tsx` (estado visual eaten vs planned).

## 2. Coach de nutrição fundamentado (substituir o insight stale)

`getNutritionInsight` está hardcoded e desatualizado. Substituir por insight real, gerado a partir de dados existentes:

- Calcular macros restantes do dia (targets − eaten) e gerar mensagem: "You have 60g of protein left — one more high-protein meal covers it."
- Detectar sequência: 3+ dias seguidos abaixo de 80% da meta de proteína → nudge "Protein has been low for 3 days."
- Timing pré/pós-treino: se há treino logado hoje e a próxima refeição é <90min antes ou <2h depois, sugerir "Carb-focus pre-workout" / "Protein-focus post-workout."
- Manter o formato `CoachInsight` existente; renderização no mesmo card de hoje já funciona.
- Arquivos: `src/lib/coach/nutrition.ts` (reescrever `getNutritionInsight` usando `getTargets`, `getWeekPlan`, eaten, `getWorkouts`), `dieta.index.tsx` sem mudança de UI.

## 3. Ações rápidas de plano: repetir ontem + favoritos

O comportamento real é comer refeições parecidas em dias parecidos. Reduzir fricção:

- **Repeat yesterday**: botão "Repeat yesterday" no header do Today (quando ontem tem plano e hoje está vazio). Copia meal_plan de ontem para hoje via `setPlannedMeal` em lote.
- **Favoritos**: estrela no MealCard/MealDetailSheet. Favoritos persistem em `localStorage` (`forja.meal-favorites`). MealPickerSheet ganha um filtro "Favorites" e mostra favoritos no topo.
- Arquivos: `src/lib/data/nutrition.ts` (`repeatDay`, `toggleFavorite`, `getFavorites`), `dieta.index.tsx` (botão repeat), `MealPickerSheet.tsx` (filtro), `nutrition-ui.tsx` (estrela).

## 4. Tracker de hidratação

Coluna faltante da nutrição esportiva. Contador simples de copos no Today:

- Card compacto "Water" com contador +/− e meta configurável (padrão 8 copos / 2L). Cada toque adiciona 250ml. Persiste em `localStorage` (`forja.water`, por data).
- Progresso visual: anel ou barra pequena. Nudge do coach (item 2) pode usar: "You're 3 glasses behind your usual."
- Arquivos: novo `src/components/HydrationCard.tsx`, `dieta.index.tsx` (renderiza abaixo dos anéis), localStorage helper inline.

## 5. Lista de mercado compartilhável e limpa

A lista existe mas não sai do app. Adicionar saída prática:

- Botão "Share" / "Copy list" no header do Market: copia texto plain (corredor → itens + qty) para a área de transferência ou `navigator.share()`.
- Botão "Clear checked": remove itens já comprados da vista (não do estado de plano), com undo toast (padrão `undo.ts`).
- Arquivos: `dieta.market.tsx` (botões share/clear), reutiliza `src/lib/undo.ts`.

---

## Notas técnicas

- Tudo frontend-only; estado novo em `localStorage` (`forja.eaten`, `forja.meal-favorites`, `forja.water`), mesmo padrão de `session-state.ts`.
- Nenhuma migration SQL; nenhum touch no Supabase.
- i18n: novas strings no dicionário `diet` em EN/PT/NL.
- Ordem sugerida: 2 → 1 → 3 → 4 → 5 (o insight grounded é o mais rápido e de maior impacto percebido; o diário eaten é a mudança conceitual maior).
