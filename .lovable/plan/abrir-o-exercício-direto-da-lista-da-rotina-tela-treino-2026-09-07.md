# Abrir o exercício direto da lista da rotina (tela Treino)

Hoje, na rotina expandida da tela Treino, cada exercício é só texto: não dá para tocar e ver como executar. A ficha completa do exercício já existe (usada durante a sessão) — falta abrir por ali.

## O que muda

- Cada linha de exercício na rotina expandida vira um item tocável (alvo ≥ 44px, com efeito de toque e chevron discreto à direita).
- Tocar abre a mesma ficha do exercício já usada no treino: vídeo/foto de execução, passos, dicas do coach com base nos seus dados, histórico e o chat para perguntar sobre o movimento.
- A ficha abre por cima sem sair da tela Treino e sem iniciar sessão; fechar volta exatamente para a lista aberta.
- Os selos de atenção (estagnação etc.) continuam visíveis na linha e não atrapalham o toque.

## Técnico

- `src/routes/_authenticated/treino.tsx`: transformar o `<li>` da lista de exercícios em `<button>` que guarda `{ id, nome }` em estado local do card da rotina; renderizar um único `ExerciseDetailSheet` controlado por esse estado.
- Reaproveita `ExerciseDetailSheet` (`exerciseId`, `nome`, `open`, `onOpenChange`) sem alterações no componente.
- Chaves de tradução novas (se necessário, apenas o rótulo de acessibilidade) em `src/lib/i18n/dict/home.ts` ou dicionário da tela de treino, nos três idiomas.
- Sem dependências novas, sem Supabase, sem mudança em regras de treino.
- Verificação com Playwright em viewport de celular: abrir rotina, tocar num exercício, conferir a ficha e o retorno ao fechar.
