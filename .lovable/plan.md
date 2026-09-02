# 10 melhorias para o Iron Logger — nova rodada

Auditoria read-only do estado atual. Tudo frontend/cliente, sem schema, auth ou MCP novos. Onde uma lacuna foi confirmada no código, o arquivo está citado; onde a proposta é apenas adição, não há afirmação sobre o estado atual.

## 1. Metas por levantamento

**Onde:** `src/lib/data/tracked-lifts.ts` expõe só `getTrackedLifts`/`setTrackedLift` — não existe alvo por exercício.

Você acompanha key lifts, mas sem número a perseguir.

**Correção:** meta opcional (carga ou e1RM) por lift rastreado, com barra "atual vs meta" no card de Key Lifts. Guardada localmente.

## 2. Registrar treino retroativo

**Onde:** `src/lib/data/workouts.ts` só cria treino pela sessão ativa.

Treinou sem o celular? O dia fica vazio e a streak quebra.

**Correção:** "Adicionar treino manual" no Progresso: data, duração, exercícios e séries, gravando pelo mesmo caminho de save.

## 3. Ajuste de descanso durante a série

**Onde:** `sessao.tsx:374-502` — `startRest` sempre usa o descanso do exercício.

Barra de descanso sem controle fino: nada de ±15s nem "pular" sem mudar o padrão da rotina.

**Correção:** botões −15s / +15s / pular na barra de descanso, só para o descanso em curso.

## 4. Modelos de rotina prontos

**Onde:** `src/lib/import/starter-routine.ts` gera plano apenas no onboarding.

Depois do primeiro acesso, criar uma rotina nova é montar tudo do zero.

**Correção:** ao criar rotina, oferecer modelos (Push/Pull/Legs, Upper/Lower, Full Body 3x) reaproveitando o gerador existente.

## 5. Aquecimento sugerido automaticamente

Antes do primeiro set pesado de um composto, o app não propõe rampa de aquecimento.

**Correção:** botão "Adicionar aquecimento" no primeiro exercício, gerando 2-3 séries `W` em % da carga alvo.

## 6. Descanso: aviso quando estourar

Se você esquece o celular na bancada, o timer zera e a série seguinte sai muito depois.

**Correção:** contagem "atrasado +1:20" após o zero e aviso no mini-player, para o histórico refletir a densidade real.

## 7. Tendência de fadiga por RPE

**Onde:** `src/lib/progress-analytics.ts` não tem métrica sobre `rpe`.

O RPE é coletado série a série e usado só no coach, nunca visualizado.

**Correção:** gráfico de RPE médio por semana no Progresso, junto a volume, para enxergar fadiga acumulada.

## 8. Metas de peso corporal com ritmo

O registro de peso já existe; falta ler se o ritmo bate com o prazo da meta.

**Correção:** no card de peso, projeção "no ritmo atual você chega em <data>" e comparação com `metaPrazo`.

## 9. Notas rápidas durante a sessão

Adicionar uma nota hoje exige sair do fluxo de séries.

**Correção:** campo de nota fixo no rodapé da sessão (uma linha, salva ao sair do foco) e exibição no resumo.

## 10. Reordenar exercícios na sessão

Mudar a ordem no meio do treino (máquina ocupada) não é possível sem remover e re-adicionar.

**Correção:** mover ↑/↓ nos cards de exercício da sessão, preservando séries já registradas.

## Notas técnicas

- Todos os itens são cliente/UI; nenhum pede tabela nova (metas de lift e alvos ficam em localStorage).
- Item 2 usa o mesmo caminho de gravação de treino já existente, sem endpoint novo.
- Strings novas vão para `src/lib/i18n/dict/*` em pt/nl, zero hardcoded.

## Ordem sugerida

3 → 10 → 9 → 7 → 1 → 5 → 6 → 8 → 4 → 2
