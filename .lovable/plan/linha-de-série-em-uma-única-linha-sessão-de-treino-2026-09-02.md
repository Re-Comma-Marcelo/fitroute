# Linha de série em uma única linha (sessão de treino)

Somente frontend/apresentação em `src/routes/_authenticated/sessao.tsx`. Nenhuma mudança em lógica de progressão, dados ou Supabase.

## Problema

Hoje cada série ocupa duas linhas: em cima `SÉRIE | ANTERIOR | PSE | ✓` e embaixo os steppers `− kg + − reps +`. Além disso, a coluna ANTERIOR quebra em duas linhas (`73kg x 12` e `@ 9 rpe`). Resultado: cada série com ~110px de altura e pouco cabendo na tela.

## Novo layout da série (uma linha)

```text
SÉRIE  ANTERIOR        KG      REPS    PSE   ✓
 [1]   73×12 @9      [ 70.5 ] [ 10 ]  [ 8 ] [✓]
```

- Grid único: `44px | 1fr | 64px | 56px | 40px | 44px`, altura da linha 44px (alvo de toque mantido).
- ANTERIOR passa a uma linha só, compacta e tabular: `73×12 @9` (com truncamento). Sem valor anterior: `—`.
- Campos de kg e reps ficam lado a lado, sem os botões − / + ocupando linha própria.
- Ajuste fino do peso continua disponível: press-and-hold (ou toque longo) no campo de kg abre um pequeno popover com − / + no incremento do equipamento, e o botão ± aparece só na linha ativa/em foco. Assim o polegar não perde o ajuste rápido, mas a linha fica limpa.
- PSE fica como botão compacto de 40px mostrando o valor escolhido (ou `–`), abrindo o seletor 6–10 como hoje.
- Cabeçalho da tabela alinhado ao novo grid, em 10px maiúsculo.
- Séries de aquecimento seguem com `W` laranja; séries concluídas mantêm o fundo roxo suave e as animações `set-pop` / `set-flash`.

## Outros refinamentos de layout aproveitando a mesma leva

- **Cartão de exercício mais enxuto**: nome + menu na mesma linha; "Descanso: 2min 15s", badge "Peso aumentado" e progresso do exercício condensados numa única faixa de meta-informação de 1 linha, com separadores em ponto.
- **Divisores em vez de blocos**: lista de séries com `divide-y` sutil no lugar de cada série ter fundo/caixa própria — menos ruído visual, mais densidade.
- **"Adicionar série"** vira link discreto de 40px em vez de botão largo com borda.
- **Espaçamento**: `px-3 pb-3` → padding vertical menor entre séries (gap 2px), aumentando de ~5 para ~9 séries visíveis em tela de 390×710.
- **Exercícios recolhidos**: linha resumo com miniatura + nome + `3/4 séries` e anel de progresso pequeno, sem repetir o cabeçalho da tabela.
- **Cabeçalho fixo**: a faixa Duração / Volume / Séries fica sticky no topo ao rolar, para não perder o contexto.

## Detalhes técnicos

- Reescrever `ROW_TOP` como grid único e remover `ROW_STEP`; `SetRow` retorna um único `<div>` em grid.
- Reaproveitar `StepButton` dentro do popover de ajuste de kg (Popover do shadcn já disponível).
- Novas strings de UI registradas no dicionário i18n (en/pt/nl) caso apareçam rótulos novos.
- Verificação com Playwright em viewport 390×710: contagem de séries visíveis, alvos de toque ≥44px e nenhuma quebra de linha na coluna ANTERIOR.
