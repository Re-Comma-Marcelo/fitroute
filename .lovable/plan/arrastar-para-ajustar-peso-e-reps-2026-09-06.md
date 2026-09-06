# Arrastar para ajustar peso e reps

Objetivo: chegar no número certo com o dedo, quase sem digitar — arraste vertical com saltos que crescem conforme você se afasta do valor esperado.

## Como vai funcionar

### Peso (kg)
- Segurar o campo e arrastar para cima aumenta, para baixo diminui.
- Saltos automáticos pela distância do arraste: perto do valor esperado anda no passo fino do exercício (2,5 kg por padrão), mais longe passa para 10 e depois 20 por passo — um leg press chega em 180 kg em um gesto só.
- Enquanto arrasta, uma etiqueta mostra o valor final ao vivo (ex.: "180 kg  +40"), não só a diferença, e o passo atual aparece ao lado ("passo 20").
- Vibração curta a cada salto, e uma vibração diferente quando o passo muda de fino para grosso.
- Ao soltar, o valor arredonda para o passo em uso, de forma que nunca sobra número quebrado.

### Repetições
- Mesmo gesto: segurar e arrastar para cima/baixo, sempre de 1 em 1 perto do alvo e de 5 em 5 quando o arraste é longo.
- Etiqueta ao vivo mostrando as reps resultantes.
- Nunca passa abaixo de zero.

### Toque e teclado
- Um toque continua abrindo o teclado e selecionando o número, para quem quiser digitar.
- Um toque num campo vazio continua aceitando o alvo cinza sugerido.
- Setas do teclado seguem funcionando (Shift = salto grosso), para acessibilidade.
- Respeita "reduzir movimento": sem escala/animação, só o valor mudando.

### Descoberta
- A dica de "segure e arraste" ganha texto mais claro e mostra o gesto nas primeiras sessões, do jeito que já desaparece hoje depois de algumas vezes.

## Detalhes técnicos

Somente frontend. Nada de Supabase, schema, auth, MCP, service worker ou manifest.

- `src/lib/use-value-scrub.ts`: gesto reescrito para trabalhar com valor absoluto em vez de contagem de passos — recebe valor atual, resolvedor de passo por distância (`fino → 10 → 20`) e devolve o valor pretendido; expõe rótulo de valor ao vivo e passo corrente. Mantém o atraso de segurar (~180 ms) para não brigar com o scroll, o pointer capture e o cancelamento do clique após arrastar.
- `src/routes/_authenticated/sessao.tsx`: `NumberField` passa a usar a nova API (`value`, `onCommit`, `stepsFor`), mostra a etiqueta de valor + passo, e `SetRow` calcula os passos do peso a partir da unidade atual (kg/lb) e do passo fino do exercício; reps usa 1/5.
- Novas strings em inglês, com traduções pt e nl em um novo fragmento `src/lib/i18n/dict/round25.ts` registrado no índice do i18n. Sem texto literal no JSX.
- Verificação: typecheck, formatação, build e uma passada de conferência da tela de sessão.
