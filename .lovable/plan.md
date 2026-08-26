# Tradução da interface (Inglês, Português, Holandês)

## Objetivo
Um seletor de idioma no Perfil que troca toda a interface entre **English**, **Português (BR)** e **Nederlands**. A escolha fica salva no perfil (banco), então segue o usuário em qualquer dispositivo.

Escopo confirmado: **apenas a interface** — botões, títulos, rótulos, navegação, estados vazios, mensagens de erro/toast. Nomes de exercícios, nomes de refeições e as frases geradas pelo coach continuam como estão hoje.

## Como vai funcionar

1. No Perfil, uma seção **Language / Idioma** com três opções (English · Português · Nederlands).
2. Ao tocar, a interface troca na hora — sem recarregar a página.
3. A preferência é salva no perfil junto com os outros campos e reaplicada no próximo login, em qualquer aparelho.
4. Antes do login (tela de entrada), o app usa o idioma escolhido da última vez naquele dispositivo, ou o idioma do navegador na primeira visita.

## Etapas

### 1. Base de tradução
- Criar `src/lib/i18n/` com um dicionário por idioma (`en.ts`, `pt.ts`, `nl.ts`) e um `index.ts` com o tipo das chaves — o inglês é a referência, então falta de tradução aparece como erro de tipo, não como texto vazio.
- Provider de idioma no `__root.tsx` + hook `useT()` para os componentes, com suporte a interpolação (ex.: `"{count} sessões"`) e plural simples.
- Formatação de datas e números passa a seguir o idioma ativo (`Intl`), reaproveitando `src/lib/format.ts`.

### 2. Persistência
- Novo campo `idioma` no `Profile` (padrão: idioma do navegador, com fallback inglês).
- Nova coluna `idioma text not null default 'en'` na tabela `profiles`, adicionada ao `scripts/supabase-schema.sql` e a um pequeno script `ALTER TABLE` para você rodar no SQL Editor do seu Supabase — é a única mudança de banco necessária.
- Leitura/escrita pelo caminho que já existe (`db.server.ts` + `forja.functions.ts`, funções de perfil).
- Espelho em `localStorage` para a tela de login e para não haver "piscada" de idioma no carregamento.

### 3. Seletor no Perfil
- Seção **Language** no `perfil.tsx`, no mesmo estilo dos outros campos, com os três idiomas.
- Troca aplica na hora e salva no perfil em seguida.

### 4. Substituir a cópia fixa por chaves
Passar por todas as telas e componentes, trocando texto fixo por chaves de tradução:
- Entrada/login, Home, Treino, Sessão em andamento, Resumo do treino, Editor de rotina, Biblioteca, Progresso (incluindo lista de histórico e seção de key lifts), Dieta (dia, semana, lista de mercado, folhas de refeição), Perfil, navegação inferior, mini-player, ponte com o Claude, formulários do coach e mensagens de toast.
- Os textos que o coach monta em código (`src/lib/coach/*`) ficam em inglês nesta etapa, como combinado.

### 5. Validação
- Trocar entre os três idiomas e conferir cada tela, com atenção a: quebras de layout (holandês costuma ter palavras mais longas), botões com dois toques na Sessão, e datas/números no formato certo.
- Confirmar que a preferência sobrevive a logout/login e a um recarregamento.

## Detalhes técnicos
- Dicionários planos com chaves tipadas (`t("session.finish")`), sem biblioteca externa de i18n — mantém o bundle enxuto e evita dependência nova.
- O provider lê o perfil já carregado no app; a tela pública de login usa só o `localStorage`/navegador, sem chamada ao servidor.
- Nada muda na forma como treinos são registrados, nem no schema além da coluna `idioma`.

## O que fica de fora
- Tradução de nomes de exercícios, refeições e textos gerados pelo coach.
- Tradução automática por IA (podemos avaliar depois para os textos do coach).
- Mudança visual: nenhuma — só o texto muda.
