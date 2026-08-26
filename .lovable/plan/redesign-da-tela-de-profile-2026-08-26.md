# Redesign da tela de Profile

Hoje a tela é um formulário longo e plano: 12 blocos empilhados com o mesmo peso visual, uma grade com 40+ chips de "Exercises to avoid", nenhum resumo de quem você é, e o botão Save perdido no meio da rolagem. Vamos transformar em um perfil com hierarquia clara.

## O que muda

**1. Cabeçalho de identidade**
Bloco no topo com inicial/avatar, nome, e-mail da conta e três métricas em linha: peso, altura e objetivo. Abaixo, chips-resumo do modelo de treino (ex.: `4x/week · 60 min · Evening`). Editar deixa de exigir rolar até achar o campo.

**2. Seções agrupadas e recolhíveis**
Em vez de 12 campos soltos, quatro grupos com título e subtítulo curto, cada um recolhível (o primeiro aberto por padrão):
- **Body & goal** — nome, peso, altura, sexo, nível de atividade, objetivo
- **Training model** — meta semanal, duração da sessão, horário preferido, equipamento
- **Limits & check-in** — exercícios a evitar, modo de check-in semanal
- **App** — idioma, ponte com o Claude, conta/sair

**3. "Exercises to avoid" sem parede de chips**
Passa a mostrar só os exercícios já marcados (com o motivo em linha) mais um botão "Add exercise" que abre uma folha com busca e filtro por grupo muscular. O motivo ganha sugestões rápidas ("shoulder pain", "knee pain", "no equipment").

**4. Barra de salvar fixa**
Aparece no rodapé só quando existe alteração não salva, mostrando "Unsaved changes" + botões Save/Discard. Sai o botão gigante no fim da página. Toast mantido.

**5. Refinos visuais**
Grupos de escolha (objetivo, meta semanal, duração, horário) viram segmented controls consistentes, com altura e tipografia iguais entre si; hoje variam entre `text-sm`/`text-xs` e paddings diferentes. Seleção usa `primary` com anel suave em vez de bloco cheio saturado, mantendo alvos de 44px. Idioma continua com as três opções, mas em linha compacta.

**6. Conta**
Bloco de conta com e-mail, idioma ativo e "Sign out" em variante discreta, no fim da página — sem competir com o resto.

## Detalhes técnicos

- Reescrever `src/routes/_authenticated/perfil.tsx` como composição de subcomponentes locais (`ProfileHeader`, `Section`, `SegmentedField`, `AvoidList`, `StickySaveBar`), mantendo o mesmo estado `form` e as chamadas `getProfile`/`saveProfile`.
- Novo componente `src/components/AvoidExerciseSheet.tsx` (busca + filtro), reaproveitando o padrão das folhas existentes (`MealPickerSheet`).
- `dirty` = comparação do form com `profileQuery.data`; controla a barra fixa e o Discard.
- Sem mudanças de schema, backend ou dados: mesmos campos de `Profile`.
- Todas as strings novas passam por `t()` e entram em `src/lib/i18n/dict/profile.ts` nos três idiomas.
- Tokens semânticos do `src/styles.css`, sem cores fixas.
