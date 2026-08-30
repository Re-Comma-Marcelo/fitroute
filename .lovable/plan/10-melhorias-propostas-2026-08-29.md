# 10 melhorias propostas

Lista para revisão e priorização. Tudo frontend/UX salvo indicação contrária. Nada aqui muda schema, auth, MCP ou service worker sem eu avisar antes.

## 1. Unidade de peso (kg/lb) no perfil

Hoje o app é kg em todo lugar; só o importador do Hevy converte libras. Adicionar `unidade` no perfil e formatar exibição/entrada (sessão, progresso, PRs, gráficos) via um helper único de formatação. Armazenamento continua em kg.

## 2. Calculadora de anilhas na sessão

Ao tocar no valor de kg, mostrar a montagem da barra (ex.: 20 + 2x15 + 2x5) com barra e anilhas configuráveis. Reduz erro e é o pedido mais comum de quem loga na academia.

## 3. Editar/apagar um treino já finalizado

`deleteWorkout()` já existe na camada de dados, mas nenhuma tela usa. Adicionar em `progresso.$id.tsx` ações de apagar (com confirmação) e corrigir séries de um treino salvo.

## 4. Supersets e agrupamento de exercícios

Permitir marcar 2+ exercícios como bloco A1/A2 no editor de rotina e alternar entre eles na sessão, com um único descanso ao fim do bloco.

## 5. Busca global

Um campo único (Home ou nav) que busca exercícios, rotinas e refeições e leva direto ao destino. Hoje só a biblioteca tem filtro próprio.

## 6. Fila offline de gravações

O service worker cacheia o shell, mas finalizar treino sem rede falha. Guardar a gravação pendente localmente e reenviar quando a conexão voltar, com indicador visível de "pendente".

## 7. Notas por exercício e por treino

Campo de nota livre por exercício na sessão (ex.: "ombro incomodou no set 3") e uma nota do treino no resumo. Isso alimenta as coach notes com contexto real em vez de inferido.

## 8. Descanso em background com notificação

O timer de descanso hoje depende da aba visível. Usar notificação/áudio agendado para que o fim do descanso chegue mesmo com a tela bloqueada ou app em segundo plano.

## 9. Exportar e importar meus dados

Botão no perfil para exportar treinos/rotinas/perfil em JSON (e CSV de treinos) e reimportar. Dá controle ao usuário e serve de backup antes de mudanças grandes.



## Detalhes técnicos

- Itens 1, 2, 4, 5, 7 são puramente cliente/UI.
- Item 3 usa `deleteWorkout()`/`saveWorkout()` existentes, sem nova query de servidor.
- Item 6 mexe em cliente + service worker (avisar antes de tocar no SW).
- Item 8 pede permissão de notificação; degradar para o comportamento atual quando negada.
- Strings novas vão para `src/lib/i18n/dict/*` em pt/nl, zero hardcoded.

## Ordem sugerida

1 → 2 → 7 → 3 → 8 → 4 → 5 → 9 → 6 