# Rodada de melhorias: bugs + experiência

Auditoria feita em cima do código atual (sessão, dieta, progresso, onboarding, perfil, importador). Abaixo os achados reais, agrupados por prioridade. Tudo é frontend puro — nenhuma mudança de schema, auth, MCP ou service worker.

## P0 — Risco de perder dados ou tela travada

1. **Treino em andamento pode ser perdido ao fechar a aba / botão voltar**
   `sessao.tsx` só protege no botão "Finalizar". Não há aviso ao sair da página com séries digitadas e não marcadas.
   Correção: `beforeunload` ativo enquanto houver sessão com séries preenchidas sem ✓.

2. **Sessão corrompida no localStorage derruba a tela**
   `loadActiveSession` (`session-state.ts:65`) confia no JSON sem validar forma. Uma sessão de versão antiga sem `exercicios`/`sets` quebra o render.
   Correção: validação leve de forma; se inválida, limpar e tratar como "sem sessão".

3. **Tela branca no onboarding**
   `onboarding.tsx:261` só renderiza o passo "plan" se `plan` existir. Se a biblioteca ainda não carregou quando o timer avança, o usuário fica numa tela vazia sem nem o link de pular.
   Correção: estado de carregando + link "Pular por agora" sempre visível.

4. **Loop de onboarding pelo botão voltar**
   O redirect em `inicio.tsx:88` não usa `replace: true`, então o histórico permite voltar para a Home e ser jogado de novo para o onboarding.
   Correção: `navigate({ to: "/onboarding", replace: true })`.

5. **`window.matchMedia` lido em tempo de render** (`onboarding.tsx:56`) — risco de erro em SSR/prerender. Mover para efeito/inicializador guardado.

## P1 — Falhas silenciosas (usuário não sabe que deu erro)

6. **Salvar perfil falha sem aviso** — `perfil.tsx:116` não tem `catch`/toast.
7. **Dieta sem tratamento de erro** — `autoFillWeek`, `clearWeek`, `setPlannedMeal` e a escolha de refeição (`dieta.week.tsx`, `dieta.index.tsx`) não capturam erro; a UI fica otimista e mentindo.
8. **Lista de mercado** — marcar item persiste com `void`, sem `catch`; se falhar, o estado divergindo passa despercebido (`dieta.market.tsx:141`).
9. **Editor de rotina pode ficar preso em "carregando"** — `rotina.$id.tsx:46,69` sem `.catch()`; falha de fetch deixa a página em branco pra sempre.
10. **Exercício escolhido na biblioteca desaparece** — `sessao.tsx:211` faz `.then()` sem `.catch()`; se falhar, nada acontece e nenhuma mensagem aparece.
11. **Biblioteca mostra "nenhum exercício encontrado" em caso de erro de rede** (`biblioteca.tsx:145`) com um CTA enganoso de limpar filtros. Precisa de estado de erro com "tentar de novo".

## P2 — Experiência e polimento

12. **Timer de descanso sobrescrito sem aviso** — tocar no timer do cabeçalho reinicia o descanso de outro exercício silenciosamente (`sessao.tsx:591`).
13. **Wake lock cai sozinho** — o sistema pode liberar o wake lock; falta escutar o evento `release` para reobter, então a tela apaga no meio do treino.
14. **Lixo acumulando no localStorage** — chaves `forja.resumo.<id>` nunca são removidas. Limpar após leitura no resumo.
15. **Flicker na lista de mercado** — itens marcados aparecem vazios até o re-sync; derivar do estado de hidratação em vez de `useState` + efeito.
16. **Slot de refeição pula sozinho** — `dieta.index.tsx:65` volta para "breakfast" a cada refetch da agenda, tirando o usuário do slot que ele escolheu.
17. **Formatação numérica inconsistente** — quantidades da lista de mercado e eixos/tooltips dos gráficos de progresso não usam os helpers `formatNumber`/`formatKg`, então o separador decimal não segue o idioma.
18. **Textos ainda em inglês fixo** — `+12%` no onboarding (`onboarding.tsx:121`) e os títulos/descrições de `head()` em todas as rotas não passam pelo dicionário.
19. **Importador do Hevy pouco transparente** — linhas puladas viram só um número; e se o CSV vier sem coluna de peso, o import inteiro entra com 0 kg sem aviso. Adicionar aviso explícito de "sem coluna de peso" e detalhar o motivo das linhas puladas.
20. **Performance** — `structuredClone` da sessão inteira em cada tecla digitada (`sessao.tsx:224`) e `lastOfRoutine` sem memo em `treino.tsx:107`. Atualização imutável leve + `useMemo`.

## Detalhes técnicos

- Novos textos vão para `src/lib/i18n/dict/*` em pt/nl, zero hardcoded.
- Erros passam a usar `toast.error` com o mesmo padrão já existente em `treino.tsx`.
- `head()` continua estático por limitação do router; a correção é usar textos neutros/da marca, não traduzir dinamicamente.
- Nada de mudanças em `db.server.ts`, `forja.functions.ts`, `src/integrations/supabase/*`, MCP ou service worker.

## Sugestão de execução

Leva 1: itens 1-5 (P0). Leva 2: itens 6-11 (falhas silenciosas). Leva 3: itens 12-20 (polimento).
