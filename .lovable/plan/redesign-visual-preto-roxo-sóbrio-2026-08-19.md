# Redesign visual: preto + roxo sóbrio

Frontend puro. Sem Cloud, sem backend, sem banco — só apresentação em cima do mock atual. Nenhuma regra de negócio (progressão, sessão, volume, 2 toques) muda.

## Direção escolhida

- Paleta: preto profundo com tons de roxo sóbrios (acento roxo dessaturado, superfícies quase negras, cinzas frios).
- Tipografia: Sora nos títulos, Manrope no corpo (carregadas via `<link>` no root).
- Layout: coluna única calma, muito respiro, menos bordas e mais hierarquia por espaçamento e tipografia.

## O que muda em cada tela

- **Login**: imagem hero de academia em tratamento escuro/roxo, degradê sobre a foto, logo e formulário flutuando no terço inferior.
- **Home (Treino)**: cabeçalho mais leve, card de objetivo semanal minimalista com barra segmentada fina; cards de rotina com capa discreta ao fundo; itens de exercício com miniatura à esquerda.
- **Biblioteca**: miniaturas por grupo muscular nas linhas de exercício, filtros como chips discretos.
- **Sessão**: mesma grade e mesmo fluxo de 2 toques; só refinamento visual — linhas mais arejadas, tipografia tabular mais forte, ✓ e aquecimento com contraste ajustado à nova paleta.
- **Resumo e Progresso**: textura/fundo sutil no topo, números grandes em Sora, gráficos Recharts recolorados para a paleta roxa.
- **Perfil e Dieta**: mesmas seções, espaçamento e divisores mais suaves.
- **Mini-player**: mesma função, aparência mais discreta (vidro escuro, ponto roxo pulsando).

## Imagens

Geradas em `src/assets/` e importadas como ES6:
- 1 hero do login (foto escura de academia, tom roxo);
- 3 capas de rotina (peito/costas/pernas, abstratas e escuras);
- 1 textura sutil para resumo/progresso;
- miniaturas por grupo muscular (peito, costas, pernas, ombros, braços, core), mapeadas por `grupoPrimario`, com fallback para ícone.

## Detalhes técnicos

- Tokens em `src/styles.css`: reescrever `:root` em oklch (background ~oklch(0.13 0.01 300), card, primary roxo, info/warn recalibrados, chart-1..5 na família roxa), adicionar `--font-display`/`--font-sans` em `@theme` e um token de gradiente/sombra elegante.
- Fontes via `<link>` em `src/routes/__root.tsx` (nunca `@import` remoto no CSS).
- Sem classes de cor fixas (`text-white`, `bg-[#...]`) — só tokens semânticos.
- Novo helper `src/lib/exercise-image.ts` para mapear grupo muscular → asset de miniatura.
- Sem alteração em `src/lib/progression.ts`, `session-state.ts` e camada `src/lib/data/`.
- Verificação: Playwright com viewport mobile em Login, Home, Sessão, Biblioteca, Progresso e Resumo, conferindo contraste e alvos de toque de 44px.
