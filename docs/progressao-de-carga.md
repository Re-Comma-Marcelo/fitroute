# Progressão de carga e sugestão da próxima série

Como o app decide "sobe o peso", "segura" ou "tira peso" depois que a série
recebe o PSE (RPE), e em que estudos isso se apoia. Base: pedido de 2026-09-15
para que o leg press suba mais que um exercício com halteres e que ir até a
falha pese na série seguinte.

## Onde a regra vive

- `src/lib/load-step.ts`: classifica o exercício (composto de perna, composto
  de membros superiores, isolado), diz qual é o menor salto que o equipamento
  permite e calcula o incremento e o back-off.
- `src/lib/next-set.ts`: alvo da **próxima série dentro da sessão**, a partir
  da série que acabou de ser marcada (peso, reps, PSE).
- `src/lib/progression.ts`: sugestão **entre sessões** (badge "+X kg" na rotina
  e na sessão), a partir de todas as séries do último treino.
- `src/lib/prescription.ts`: peso/reps prescritos ao iniciar a sessão; usa o
  mesmo incremento como teto quando a última sessão foi confortável.
- `SetFields.tsx`: os botões −/+ andam pelo passo do equipamento (haltere,
  anilha pequena), não pelo salto de progressão.

Tudo é puro e testado em `src/lib/*.test.ts` (`bun test src/lib`).

## Tamanho do salto (por que o leg press sobe mais)

A ACSM recomenda subir a carga **2–10 %** quando a pessoa passa das reps-alvo,
com a ponta baixa para exercícios de músculo pequeno e a ponta alta para
exercícios de grande massa muscular. A NSCA traduz isso em passos absolutos:
~1–2 kg para membros superiores e ~2–4 kg para membros inferiores em pessoas
menos treinadas (mais para pessoas mais fortes). A regra do app:

| Classe                             | % da carga | Teto por salto | Exemplos                                    |
| ---------------------------------- | ---------- | -------------- | ------------------------------------------- |
| Composto de perna (lower-compound) | 5 %        | 10 kg          | leg press, agachamento, terra, hip thrust   |
| Composto superior (upper-compound) | 2,5 %      | 5 kg           | supino, remada, puxada, desenvolvimento     |
| Isolado (isolation)                | 2 %        | 2,5 kg         | extensora, flexora, rosca, elevação lateral |

O percentual é arredondado ao **passo do equipamento**: 2 kg em halteres (um
haltere acima no rack), 5 kg em máquinas de perna com anilha (leg press, hack)
e 2,5 kg no resto (1,25 kg por lado ou uma placa). Nunca menos que um passo.

Exemplos: leg press 200 kg → +10 kg; agachamento 100 kg → +5 kg; supino 80 kg
→ +2,5 kg; supino com halteres 30 kg → +2 kg (próximo haltere); rosca no cabo
30 kg → +2,5 kg (passo mínimo).

### Salto grande

Em cargas leves, um passo do equipamento pode ser um salto enorme (8 → 10 kg
na elevação lateral é +25 %). Quando o salto passa de **12 % da carga**, a regra
exige mais folga antes de subir: PSE médio ≤ 7 (em vez de ≤ 8) ou, sem PSE,
duas reps acima do topo da faixa em todas as séries. A mensagem explica:
"o próximo salto é +25 % — mantenha 8 kg até parecer PSE 7".

## Entre sessões (`suggestProgression`)

Dupla progressão com autorregulação (regra "2-for-2" da NSCA, adaptada ao
PSE): a carga só sobe quando **todas** as séries de carga chegaram ao topo da
faixa **e** sobrou esforço.

| Situação da última sessão                          | Resultado                                         |
| -------------------------------------------------- | ------------------------------------------------- |
| Todas no topo, PSE médio ≤ 8 (≤ 7 se salto grande) | Sobe pelo incremento da classe                    |
| Todas no topo, PSE 8,5–9,4                         | Mantém: "perto demais do limite, domine em PSE 8" |
| PSE médio ≥ 9,5                                    | Mantém: "PSE alto"                                |
| Alguma série abaixo do topo                        | Mantém: "faixa alvo é X–Y reps"                   |

Aquecimento e séries por tempo ficam fora da conta.

## Dentro da sessão (`nextSetTarget`)

Uma série até a falha custa reps nas séries seguintes: com carga fixa e 2 min
de descanso, o número de reps cai série após série, e a recuperação completa
leva 24–48 h a mais do que parar com 1–3 reps de sobra. Helms et al. (2018)
lidam com isso com "RPE stops": depois de uma série no limite, as séries
seguintes tiram **2–6 %** da carga para que o alvo de reps continue possível.

| Série marcada                          | Próxima série                                                               |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Topo da faixa, PSE ≤ 8 (ou sem PSE)    | **Sobe** pelo incremento da classe; alvo = mínimo da faixa                  |
| PSE 10 (falha) em composto             | **Back-off**: −5 % arredondado para baixo ao passo (≥ 1 passo); mesmas reps |
| PSE 10 em isolado                      | **Mantém o peso**, alvo = reps − 2 (um passo seria −15 % ou mais)           |
| Abaixo da faixa com PSE ≥ 9 ou sem PSE | **Back-off** igual ao de falha; alvo = mínimo da faixa                      |
| Abaixo da faixa com PSE ≤ 8,5          | Parou cedo: mantém o peso, alvo = mínimo da faixa                           |
| PSE 9–9,5                              | Mantém o peso, alvo = reps − 1                                              |
| Meio da faixa, PSE ≤ 8,5               | Mantém o peso, alvo = reps + 1                                              |

Exemplos: leg press 200 kg × 10 @10 → próxima 190 kg × 10; supino 100 kg × 9
@10 → 95 kg × 9; elevação lateral 10 kg × 14 @10 → 10 kg × 12.

## O que ainda não entra

- Nível de treino (iniciante sobe mais rápido que avançado) e sexo/peso
  corporal: a NSCA sugere passos maiores para pessoas mais fortes; hoje a
  classe e a carga já escalam o salto, mas não há um multiplicador por perfil.
- Fadiga acumulada entre exercícios (ir à falha no agachamento afeta o leg
  press que vem depois): a regra só olha o próprio exercício.
- Regra "duas sessões seguidas" da 2-for-2: a sugestão entre sessões olha
  só o último treino.

## Fontes

- ACSM. _Progression models in resistance training for healthy adults_.
  Position stand, Med Sci Sports Exerc 2009. https://pubmed.ncbi.nlm.nih.gov/19204579/
- NSCA. _Essentials of Strength Training and Conditioning_, cap. 17 (regra
  2-for-2 e tabela de incrementos por região corporal).
- Helms ER et al. _RPE vs. Percentage 1RM Loading in Periodized Programs
  Matched for Sets and Repetitions_. Front Physiol 2018.
  https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2018.00247/full
- Helms ER et al. _Rating of Perceived Exertion as a Method of Volume
  Autoregulation Within a Periodized Program_. J Strength Cond Res 2018.
  https://pubmed.ncbi.nlm.nih.gov/29786623/
- Refalo MC et al. _Effects of resistance training to near failure on
  strength, hypertrophy, and motor unit adaptations in previously trained
  adults_. 2023. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10161210/
- Tsoukos A et al. _Fatigue and metabolic responses during repeated sets of
  bench press exercise to exhaustion_. 2024.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC11057609/
