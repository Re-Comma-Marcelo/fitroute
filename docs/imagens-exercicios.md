# Imagens dos exercícios

As mídias ficam no bucket público `exercise-media` do Supabase, em dois pares
por exercício com o mesmo slug:

- `loop/<slug>.webp` — animação da execução (usada no card do exercício)
- `thumb/<slug>.webp` — frame estático (usado nas listas e miniaturas)

A tabela `public.exercises` guarda só o caminho do loop em `midia_url`
(`exercise-media/loop/<slug>.webp`). O thumb é derivado trocando `/loop/` por
`/thumb/` em `src/lib/exerciseMedia.ts`, então não precisa de coluna própria.

## Subindo novas imagens

1. Monte uma pasta local espelhando o bucket:

   ```
   media/loop/barbell-shrug.webp
   media/thumb/barbell-shrug.webp
   ```

   O slug vem do nome do exercício (`Barbell Shrug` → `barbell-shrug`). Quando o
   arquivo tiver outro nome, mapeie em `scripts/exercise-media-map.json`:

   ```json
   { "Barbell Shrug": "Dumbbell_Shrug_Alt" }
   ```

2. Confira o que falta e o que casou, sem enviar nada:

   ```sh
   bun scripts/upload-exercise-media.ts --check
   ```

3. Suba e atualize as linhas em um passo só:

   ```sh
   FORJA_SUPABASE_URL=... FORJA_SUPABASE_SERVICE_ROLE_KEY=... \
     bun scripts/upload-exercise-media.ts media
   ```

O script só toca em exercícios com `midia_url` vazio, faz upload com `upsert` e
só grava `midia_url` depois que loop e thumb subiram — rodar de novo é seguro.
