# Adicionar refeição por foto ou descrição

Na aba Diet, um botão "Add meal" abre um fluxo onde você descreve a refeição ("arroz, feijão, 200g de frango grelhado") **ou** tira/escolhe uma foto do prato. A IA estima calorias, proteína, carboidrato, gordura e a lista de ingredientes; você revisa e ajusta os números antes de salvar. Ao salvar, a refeição entra no slot escolhido (hoje, por padrão) e conta nos anéis do dia, na semana e — se tiver ingredientes — na lista de mercado.

## Fluxo

```text
[+ Add meal]
   ├── Describe        → texto livre + slot
   └── Photo           → câmera/galeria + observação opcional
                ↓  (IA estima)
        Revisar: nome, kcal, P/C/G, ingredientes  → [Save to today]
```

- Estado de carregamento claro enquanto a IA responde; erro amigável com "Try again" se a IA falhar (mesmo tratamento já usado no gerador de plano).
- A estimativa é marcada como aproximada ("AI estimate") e todos os campos são editáveis.
- A refeição salva fica na biblioteca do usuário e pode ser reutilizada no planner da semana como qualquer outra.

## Etapas

1. **Server function de estimativa** — nova `src/lib/nutrition-ai.functions.ts` com `estimateMealFromText` e `estimateMealFromPhoto`, ambas usando o gateway de IA existente (`src/lib/plan/gateway.server.ts`), com schema Zod de saída (nome, slots, kcal, proteína, carbo, gordura, prepMin, tags, ingredientes com quantidade/unidade/corredor). A variante de foto passa a imagem como parte multimodal para o modelo Gemini; a foto é redimensionada no navegador antes de subir (mesma técnica de `src/lib/avatar.ts`), não é armazenada.
2. **Persistência das refeições do usuário** — nova tabela `public.custom_meals` (id, user_id, nome, slots, macros, prep, tags, ingredientes em jsonb, origem `photo`/`text`, created_at) com os mesmos grants/RLS `service_role` do resto do schema, funções de leitura/escrita em `db.server.ts` + `forja.functions.ts`, e `src/lib/data/nutrition.ts` passando a unir mock + refeições do usuário em `getMeals`/`getMeal`/`totalsFor`/lista de mercado.
3. **UI** — `src/components/AddMealSheet.tsx` com as duas abas (Describe / Photo), tela de revisão editável e seleção de slot/data; botão de entrada no cabeçalho de `dieta.index.tsx` e também no `MealPickerSheet` ("Add a new meal"). Marca visual teal (dieta) e alvos de toque de 44px.
4. **i18n** — todas as strings novas no dicionário `diet` em inglês com traduções pt/nl.

## Notas técnicas

- Requer o secret `LOVABLE_API_KEY` já usado pelo gerador de plano — nada novo de configuração.
- A etapa 2 adiciona SQL em `scripts/supabase-schema.sql` (mais um arquivo de migração incremental) que você roda no seu Supabase; sem isso, as refeições criadas ficariam apenas em memória.
- `totalsFor`, `getShoppingList` e o autofill continuam funcionando porque passam a resolver refeições por um mapa combinado em vez de olhar direto o mock.
- Limite de tamanho de foto (~1600px de lado maior, JPEG comprimido) para não estourar o payload da server function.
