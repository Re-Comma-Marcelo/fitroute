# Fix "Unsupported provider: provider is not enabled" (Google)

Esse erro vem do seu Supabase, não do código. O botão chama `signInWithOAuth({ provider: "google" })` corretamente, mas o provedor Google está desativado no seu projeto Supabase, então o endpoint `/auth/v1/authorize` recusa a requisição com HTTP 400.

## O que você precisa fazer (fora do Lovable)

1. Google Cloud Console > APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
   - Authorized JavaScript origins: as URLs do app (preview e publicada).
   - Authorized redirect URI: `https://<SEU-PROJETO>.supabase.co/auth/v1/callback`
   - Copie Client ID e Client Secret.
2. Supabase Dashboard > Authentication > Providers > Google: ative, cole Client ID/Secret e salve.
3. Supabase Dashboard > Authentication > URL Configuration:
   - Site URL: URL publicada do app.
   - Redirect URLs: adicione a URL publicada e a URL de preview (o app usa `window.location.origin` no retorno).

Depois disso o botão do Google funciona sem mudança de código.

## O que eu ajusto no app (opcional, pequeno)

- Melhorar a mensagem de erro do botão Google: quando o Supabase responder `provider is not enabled`, mostrar um aviso claro ("Google sign-in isn't enabled on this Supabase project yet") em vez do texto cru da API, traduzido nos três idiomas.
- Manter e-mail/senha como caminho principal enquanto o Google não estiver ativo.

Nada de banco, schema ou backend novo nessa etapa.
