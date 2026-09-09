# Rebrand completo para ROUTE

## Objetivo

Substituir integralmente a identidade Iron Logger/Forja por ROUTE em toda a interface, mantendo os fluxos e regras atuais. O resultado será claro, quente, industrial e alinhado à esquerda, com a assinatura oxide “the stop” aplicada de forma sistemática e sem vestígios visuais da identidade escura anterior.

## 1. Fundação visual e marca

- Substituir os tokens globais por bone, ink, stone, stone-line, violet, oxide e steel, incluindo estados de interação e contraste em superfícies ink.
- Tornar o aplicativo light-mode por padrão e remover gradientes, brilhos, sombras, cores antigas e regras de dark mode que conflitem com ROUTE.
- Carregar Archivo Variable e Chivo no documento e definir a escala tipográfica solicitada:
  - display e títulos em Archivo expandida, pesada e uppercase;
  - corpo em Chivo 300;
  - dados em Chivo 400, tabulares e alinhados à direita;
  - labels em Chivo 700 uppercase.
- Padronizar raio máximo de 8px, margem de tela de 24px, grid de 12 colunas e alinhamento flush-left.
- Substituir todas as curvas de animação pela curva plana `cubic-bezier(.2, 0, .2, 1)`; remover bounce, overshoot, pulse, glow e celebrações.
- Criar primitivas reutilizáveis para:
  - `Stop`, com proporção exata de 2× a espessura da linha;
  - regras de 14px, 6px e 2px com um único stop terminal;
  - marcador discreto de canto sem duplicação;
  - status `active`, `attention` e `neutral`.
- Criar os três lockups oficiais ROUTE: empilhado, horizontal e ícone sobre ink. Atualizar favicon, ícones PWA, manifest, theme-color, títulos, metadados e nome instalado.
- Preservar chaves internas antigas de armazenamento e compatibilidade de backups quando renomeá-las arriscaria dados existentes; somente a apresentação passa a dizer ROUTE.

## 2. Componentes compartilhados

- Reconstruir os componentes-base antes das telas: Button, Card, Badge/Tag, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Tabs, Progress, Dialog, AlertDialog, Sheet/Drawer, Popover, menus, Toast, Skeleton, Table e estados de foco.
- Botões:
  - primary violet sólido;
  - secondary transparente com borda ink de 3–4px;
  - tertiary sem fundo/borda e texto stone-line;
  - labels Archivo uppercase, espaçamento controlado e raio de 8px.
- Cards/panels: stone plano, sem borda e sem sombra. Onde um box não for necessário, trocar por regra e lista editorial.
- Tags: retângulos pequenos, nunca pills, usando apenas violet/oxide/steel conforme significado.
- Migrar os controles visíveis que hoje usam `<button>` cru para o Button compartilhado ou para uma variante semântica apropriada, sem alterar comportamento.
- Criar wrapper de ícones com tamanhos exclusivos 20/24/32px, stroke 2.4px, caps/joins quadrados e stop oxide ligado ao terminus visual. Manter marcas de terceiros, como o símbolo do Google, sem adulteração.
- Atualizar navegação inferior, cabeçalhos, mini-player, cronômetro, modais e folhas para o mesmo sistema.

## 3. Dados, gráficos e rota

- Tornar steel a cor padrão de números, medidas e histórico; manter valores tabulares e alinhados à direita em listas.
- Aplicar o vocabulário fixo de status:
  - violet: ativo, no plano ou concluído como previsto;
  - oxide: atenção real, atraso, desvio, plateau ou alvo não atingido;
  - steel: dado neutro, medido ou histórico.
- Remover cores por categoria, grupo muscular e zona; usar texto, agrupamento e hierarquia para essas distinções.
- Padronizar listas como label à esquerda + valor steel à direita + divisor stone-line de 3px.
- Reconstruir gráficos Recharts, sparklines, anéis e a rota com linhas sem suavização visual, caps quadrados e sem pontos genéricos.
- Criar um endpoint compartilhado de gráfico: quadrado oxide com 2× a espessura da linha, somente no ponto mais recente/alvo.
- Animar cada linha uma vez ao carregar por cerca de 900ms; o stop aparece apenas ao final. Respeitar redução de movimento.
- Redesenhar `RoutePath` e `RoutePreviewCard` para compartilhar a mesma geometria e gramática visual do logo ROUTE.

## 4. Passagem manual por todas as telas

Aplicar o novo sistema sem mudar regras de produto ou dados em:

- Login e criação de conta.
- Home, treino do dia, status da rota, coach notes, resumo de dieta e estados vazios.
- Treino, biblioteca, busca e editor de rotina.
- Sessão ativa: faixa de exercícios, drag-and-drop, séries, peso/reps, RPE, timer, notas e coach.
- Dieta: refeições planejadas/comidas, macros, horários, trocas, hidratação, semana e mercado.
- Minha Route e Progresso: checkpoints, detalhes, comparações, recordes, histórico e todos os gráficos.
- Perfil, metas, preferências, integrações, backup e configurações.
- Onboarding, entrevista/plano, importador Hevy e revisão do plano.
- Resumo pós-treino, telas de detalhe, autenticação MCP/OAuth, erros, loading e empty states.

Em cada tela:

- remover centralização indevida, pills, cards aninhados, bordas decorativas, sombras, gradientes e cores antigas;
- manter margem esquerda estável de 24px e composição 7/3/2 em telas largas;
- garantir no máximo um display title por tela;
- aplicar stops somente ligados a uma regra, linha, ícone ou canto de painel, nunca duplicados ou flutuantes;
- revisar mobile e desktop para evitar cortes, sobreposição e regressões de toque.

## 5. Reescrita completa da voz

- Renomear todas as superfícies visíveis para ROUTE: interface, SEO, PWA, consentimento, exportações compartilhadas e descrições exibidas no Claude/MCP.
- Reescrever cada string em inglês para a voz composta, exata, curta e não motivacional.
- Remover “streak”, linguagem de celebração, hype, pedidos de desculpa, “journey”, “Let’s”, exclamações e emojis decorativos.
- Padronizar mensagens na ordem: fato → significado → próximo passo.
- Usar verbos diretos em CTAs: “Begin session”, “Adjust”, “Skip today”.
- Atualizar simultaneamente as traduções em português e holandês para cada chave inglesa alterada.
- Criar uma verificação de paridade dos dicionários para impedir chaves órfãs ou fallback acidental para inglês.

## 6. Verificação e critérios de conclusão

- Busca automatizada deve retornar zero ocorrências das cinco cores antigas, Inter/Poppins visíveis, gradientes, sombras decorativas, pills em controles/tags, animações em loop e nomes visíveis Iron Logger/Forja.
- Validar que nenhum elemento receba dois stops e que oxide permaneça restrito a stop ou atenção.
- Verificar todos os caminhos de navegação e ações existentes sem alterar backend, Supabase, dados ou regras funcionais.
- Validar build, tipos e testes relevantes.
- Fazer inspeção visual com Playwright nas telas principais em mobile e desktop, incluindo login, Home, sessão, Dieta, Route/Progresso, Perfil e Onboarding.
- Conferir contraste, foco por teclado, alvos de toque, textos longos nos três idiomas, safe areas do PWA e ícones instaláveis.

## Detalhes técnicos

- O levantamento atual encontrou 172 usos de `rounded-full`, 46 usos de sombra, 12 gradientes, 145 botões crus e 58 referências de marca antiga. Eles serão tratados por componentes compartilhados primeiro e depois por auditoria manual.
- A arquitetura de tradução usa a frase inglesa como chave. Cada reescrita será feita atomicamente no ponto de uso e nos dicionários português/holandês para não quebrar traduções.
- O Google Mark continuará com suas cores oficiais; é uma marca externa, não parte da paleta funcional ROUTE.
- Chaves internas como armazenamento local e identificadores de backup serão mantidas quando necessárias para compatibilidade, mesmo que contenham nomes antigos; elas não aparecem para a pessoa usuária.
