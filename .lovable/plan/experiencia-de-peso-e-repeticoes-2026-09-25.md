# Experiência de alterar peso e repetições

Objetivo: registrar uma série com a mão suada entre séries, **sem teclado na maioria das vezes, sem registrar número que você não viu, e sem ter que "corrigir depois"**.

## Como está hoje (diagnóstico)

A tela de sessão tem um cartão da série atual (`CurrentSetCard` → `SetFields big`) com peso e reps grandes, botões −/+ nas laterais, gesto de "segurar e arrastar" (`use-value-scrub`), toque abre o teclado, e o botão "Concluir série". Séries concluídas e futuras abrem um bottom sheet (`SetEditSheet`) com os campos pequenos.

O que atrapalha:

1. **Reps registradas sem o usuário ver.** Sem alvo de reps (exercício novo, sem histórico), o campo mostra a faixa "8-12" em cinza, mas ao tocar em "Concluir série" o app grava `repsMax` (12) em silêncio (`complete-set.ts`). Quem fez 9 registra 12 sem perceber.
2. **Valores do próximo set são apagados.** Ao concluir uma série, `applyNextTarget` zera `pesoKg`/`reps` da próxima série pendente — mesmo que o usuário já tenha ajustado ela pelo sheet. O comentário do código diz o contrário ("typed values are never overwritten").
3. **Cinza vs. confirmado é ambíguo.** O alvo aparece como placeholder cinza; não fica claro que é exatamente isso que será gravado, nem quanto ele difere da última vez.
4. **Botões −/+ pequenos.** 36 px (`size-9`), abaixo dos 44–48 px recomendados para toque; não repetem ao segurar, então ir de 60 para 80 kg são 8 toques.
5. **Gesto de arrastar é invisível.** Precisa segurar 180 ms antes de arrastar, dentro de uma área pequena entre os dois botões; a dica some depois de 3 sessões. Quem não descobriu cai no teclado.
6. **Teclado do sistema atrapalha.** No iPhone o teclado decimal não tem "Enter/Próximo", então `enterKeyHint="next"` não ajuda; o teclado cobre o botão "Concluir série" e é preciso tocar fora para fechar.
7. **Editar série concluída é pior que registrar.** O `SetEditSheet` usa os campos pequenos, sem −/+.
8. **Reps é o número que mais varia, e é o mais trabalhoso.** O peso costuma ser o alvo; as reps mudam série a série (fadiga), mas exigem −/+ repetido, arrastar ou teclado.
9. **Detalhes:** em lb o passo é sempre 5 lb (`displayStep` tem `incrementoKg <= 2 ? 5 : 5`), grosso demais para isoladores; séries por tempo andam de 1 em 1 s; o `ManualWorkoutSheet` tem seu próprio `NumberField`, diferente do da sessão.

## Princípios

- **O que você vê é o que grava.** Nada de número escondido em placeholder que vira outro valor.
- **Caminho feliz = 1 toque.** Fez o alvo → "Concluir série". Fez diferente → 1 toque a mais, não teclado.
- **Teclado é plano C**, depois de toque rápido e −/+.
- **Mesmo controle em todo lugar** (série atual, série concluída, treino manual).

## Plano

### Fase 1 — Corrigir armadilhas (pequeno, baixo risco)

1. **Reps sempre com um número concreto.** Sem `sugReps`, o valor exibido passa a ser um número (topo da faixa, igual ao que já é gravado hoje) e a faixa "8–12" vai para o rótulo/linha auxiliar. Assim o ✓ grava exatamente o que está na tela.
2. **Não apagar o que o usuário ajustou.** `applyNextTarget` só atualiza o alvo (`sugPeso`/`sugReps`) e só limpa `pesoKg`/`reps` da próxima série se o usuário não tiver mexido nela (marcar a série como "editada" ao alterar pelo sheet).
3. **−/+ maiores e com repetição.** Área de toque de 48 px; segurar o botão repete o passo, acelerando depois de ~0,5 s; vibração leve por passo (`hapticTick`).
4. **Passos certos.** lb: 2,5 lb para incrementos pequenos (≤ 2 kg) e 5 lb nos demais. Séries por tempo: 5 s no −/+ e 15 s no passo grosso.

### Fase 2 — Deixar claro e acelerar as reps

5. **Alvo com cara de alvo.** O valor do alvo aparece em destaque normal (não placeholder), com uma etiqueta discreta "alvo"; ao mudar, a etiqueta vira a diferença em relação à última vez (ex.: "+2,5 kg vs. última", "−2 reps").
6. **Chips de reps em um toque.** Abaixo do campo de reps, uma fileira com os números em torno do alvo (ex.: alvo 10 → `8 9 10 11 12`, rolável para os lados). Tocar num chip define as reps. É o jeito mais rápido de registrar "fiz 9".
7. **Atalhos de peso.** Chips pequenos: "= última (60)", "+passo" quando o coach sugere subir, e "−10%" para drop/dia ruim. Só aparecem quando fazem sentido (há histórico, série de carga).
8. **Placas na hora.** Para barra, uma linha fina sob o peso com a montagem por lado (ex.: "20 + 2,5 · 20 · 5 por lado"), reaproveitando `plateBreakdown`; toque abre a calculadora completa que hoje fica escondida no menu ⋯.
9. **Descoberta do arraste.** Uma animação curta de "segure e arraste" na primeira série da primeira sessão, e a área de arraste vale para todo o bloco do número (não só o texto).

### Fase 3 — Edição e teclado

10. **Mesmo controle ao editar.** `SetEditSheet` usa `SetFields big` (−/+, chips, arraste) para séries concluídas e futuras.
11. **Teclado com saída.** Enquanto o campo estiver focado, mostrar uma barra acima do teclado com "OK" (fecha) e "Concluir série"; aceitar vírgula e ponto (já aceita no peso) também em outros lugares.
12. **Opcional, a validar:** um teclado numérico próprio em bottom sheet (dígitos grandes, vírgula, −/+, "Concluir série") no lugar do teclado do sistema. Resolve 6 de vez, mas é uma mudança maior — decidir depois de usar as fases 1–2.
13. **Treino manual igual.** `ManualWorkoutSheet` passa a usar o mesmo `NumberField`/`SetFields` da sessão.

## Como saber se melhorou

- Série no alvo: 1 toque (✓), sem teclado.
- Série com reps diferente: 2 toques (chip + ✓).
- Mudar peso em um passo: 2 toques (+ e ✓); em vários passos: segurar o + ou arrastar, sem teclado.
- Menos edições de séries já concluídas (sinal de que o registro saiu certo da primeira vez).

## Perguntas em aberto

- Chips de reps: mostrar sempre, ou só depois que o usuário mexe nas reps pela primeira vez na sessão?
- Halteres: o peso é por halter ou total? Hoje não está escrito; vale rotular "por halter".
- Teclado próprio (item 12): seguir direto ou esperar o uso das fases 1–2?

## Detalhes técnicos

Somente frontend. Nada de Supabase, schema, auth, MCP, service worker ou manifest.

- `src/lib/complete-set.ts`: `applyNextTarget` respeita séries editadas; o default de reps continua `sugReps ?? repsMax`, mas agora é o valor exibido.
- `src/lib/session-state.ts`: flag opcional na `ActiveSet` para "editada pelo usuário" (somente estado da sessão, não vai para o banco).
- `src/components/session/SetFields.tsx`: valor do alvo como valor real + etiqueta alvo/diferença; chips de reps e de peso; linha de placas; `Stepper`/`StepButton` com 48 px e repetição ao segurar.
- `src/components/session/NumberField.tsx`: área de arraste no bloco inteiro; barra "OK / Concluir série" ao focar.
- `src/lib/units.ts`: `displayStep` com 2,5 lb para passos pequenos.
- `src/components/session/SetEditSheet.tsx`: usar `SetFields big`.
- `src/components/ManualWorkoutSheet.tsx`: trocar o `NumberField` local pelo compartilhado.
- Textos novos em inglês com traduções pt e nl em um novo arquivo `src/lib/i18n/dict/roundN.ts` registrado no índice; nada de texto literal no JSX.
- Verificação: lint, build e uma passada manual na tela de sessão (kg e lb, série por tempo, barra e halter, série concluída).
