# 10 melhorias de usabilidade — Iron Logger

Auditoria do app atual. Tudo cliente/UI, sem backend, schema, auth ou MCP novos. Strings novas passam pelo i18n (en/pt/nl).

## As melhorias

1. **Desfazer em ações destrutivas** — remover exercício da rotina, descartar sessão, apagar refeição e limpar lista de mercado passam a mostrar um toast "Undo" por ~6s em vez de sumirem em silêncio.
2. **Busca da biblioteca mais rápida** — foco automático no campo, botão de limpar, debounce e atalho de teclado; buscas recentes já existem e viram chips clicáveis logo abaixo do campo.
3. **Barra de ação fixa nos formulários longos** — Perfil, Editor de rotina e Plano ganham rodapé fixo com "Save" sempre alcançável pelo polegar, com estado salvando/salvo e aviso de alterações não salvas.
4. **Perfil em seções colapsáveis** — a tela tem quase 1.200 linhas em fluxo único; passa a ter seções recolhíveis (Conta, Modelo de treino, Metas, Idioma/Unidades, Integrações, Dados) com estado lembrado.
5. **Navegação por teclado/foco visível** — anéis de foco consistentes, ordem de tabulação correta nos sheets e fechamento por Esc em todos os diálogos.
6. **Feedback de carregamento honesto** — trocar spinners genéricos por skeletons no formato do conteúdo final (cards da Home, listas de histórico, gráficos) para eliminar salto de layout.
7. **Sessão: navegação entre exercícios** — barra superior com chips dos exercícios do treino (concluído/atual/pendente) para pular direto, em vez de rolar a lista inteira.
8. **Confirmações mais claras** — diálogos com título específico, consequência explícita e botão nomeado pela ação ("Discard workout") em lugar de "OK/Cancel".
9. **Estados vazios acionáveis** — cada tela vazia (Progresso, Dieta, Histórico, Favoritos) ganha uma frase curta do que aparece ali e um botão que leva à ação que preenche a tela.
10. **Erro e offline visíveis** — banner único e consistente para falha de rede/save com botão "Retry", integrado à fila offline já existente, em vez de mensagens diferentes por tela.

## Detalhes técnicos

- Undo: helper `src/lib/undo.ts` guardando o último estado e disparando toast via sonner; sem soft-delete no banco (o save só acontece após a janela de undo ou é revertido com um segundo write).
- Barra de ação: componente `StickyFormActions` com `useUnsavedChanges` para bloquear navegação.
- Perfil: `Collapsible` do shadcn + estado em localStorage.
- Chips de exercício na sessão reutilizam o scroll suave já implementado.
- Skeletons reutilizam `@/components/ui/skeleton`.
- Banner de erro/offline reaproveita `QueryError.tsx` e `offline-queue.ts`.

## Ordem sugerida

1 → 3 → 7 → 9 → 6 → 8 → 4 → 10 → 2 → 5
