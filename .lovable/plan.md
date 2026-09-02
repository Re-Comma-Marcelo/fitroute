# Cronômetro de descanso em "ilha" flutuante

Somente frontend, em `src/routes/_authenticated/sessao.tsx` e `src/components/SessionMiniPlayer.tsx`. Nenhuma mudança em dados, progressão ou Supabase.

## Situação atual (verificada no código)

- O check da série **já inicia** o descanso automaticamente (`toggleSet` chama `startRest(ex.descansoSeg)`), e já existem `-15s`, `+15s` e pular.
- O contador **já decai** a cada segundo (tick de 1s na tela).
- O problema é de visibilidade: o `RestTimerBar` é uma faixa larga presa dentro da barra inferior, junto do botão "Finish workout", no rodapé — fácil de não notar, e nada aparece nas outras abas além de um texto pequeno no mini-player.

## O que muda

### 1. Ilha do descanso (na tela de sessão)

Substituir a faixa larga por uma **ilha flutuante** centralizada, ancorada acima do rodapé, no formato da referência:

```text
        ( ⏱  01:45   −15   +15   Pular )
```

- Pílula compacta arredondada (`rounded-full`), fundo escuro translúcido com blur e borda sutil, sombra elevada.
- Tempo grande em fonte tabular; anel/arco de progresso circular à esquerda em vez da barra retangular.
- `−15` / `+15` como botões-pílula de 44px e "Pular" como botão de ação à direita.
- Últimos 10s: cor de alerta + pulso leve; ao terminar, mantém o overlay "Rest done" existente.
- Entrada/saída animada (sobe e cresce), respeitando `prefers-reduced-motion`.
- O botão "Finish workout" volta a ocupar sozinho a barra inferior (sem a faixa de descanso empurrando o layout).

### 2. Ilha do mini-player (todas as abas)

`SessionMiniPlayer` passa ao mesmo formato de ilha da segunda referência:

- Pílula flutuante: chevron, nome do treino + cronômetro, exercício atual em linha secundária, e ícone de lixeira (descartar treino) à direita — mantendo o diálogo de confirmação atual.
- Quando há descanso rodando, a ilha mostra o **tempo de descanso decaindo** em destaque com `−15` / `+15` embutidos, para o ajuste funcionar fora da tela de sessão também.
- Mesmos alvos de toque de 44px e mesma linguagem visual da ilha do descanso.

### 3. Ajuste fino do descanso

- Toque no tempo da ilha abre o seletor de descanso do exercício já existente (nada de nova lógica).

## Detalhes técnicos

- Novo componente compartilhado `src/components/RestIsland.tsx`, consumido pela sessão e pelo mini-player; recebe `restLeft`, `total`, `onAdd`, `onSubtract`, `onSkip`.
- Reaproveita `restSecondsLeft` / `patchRest` e `scheduleRestNotification` (comportamento de notificação inalterado).
- `RestTimerBar` é removido de `sessao.tsx`.
- Strings novas ("Skip rest", etc.) registradas em en/pt/nl no dicionário i18n.
- Verificação em viewport 390×710: ilha não cobre o botão de finalizar nem a navegação inferior, e alvos ≥44px.
