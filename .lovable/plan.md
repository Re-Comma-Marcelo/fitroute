# Corrigir erro de limite de e-mail no cadastro

## Diagnóstico confirmado

A resposta **“email rate limit exceeded”** vem do serviço de autenticação do Supabase quando o projeto ultrapassa o limite temporário de e-mails de confirmação. O cadastro atual repassa a mensagem técnica diretamente no aviso da tela, sem uma explicação ou próximo passo.

## Alterações no app

1. **Tratar o erro de limite explicitamente**
   - Reconhecer o código/mensagem de limite de envio retornado pelo Supabase.
   - Substituir o erro técnico por uma mensagem amigável: aguardar alguns minutos antes de tentar novamente e evitar novos envios consecutivos.
   - Manter o e-mail preenchido e liberar a pessoa para voltar ao login.

2. **Melhorar o estado de erro do formulário**
   - Exibir o problema junto ao formulário, com hierarquia visual discreta e acessível, em vez de depender apenas do aviso flutuante.
   - Não simular sucesso, não repetir automaticamente a requisição e não criar um cronômetro enganoso, pois o tempo real do bloqueio é controlado pelo Supabase.

3. **Traduzir a nova experiência**
   - Adicionar as mensagens em inglês, português e holandês ao sistema de tradução existente.

4. **Validar os fluxos**
   - Confirmar que limite de e-mail, credenciais inválidas e cadastro bem-sucedido apresentam estados diferentes.
   - Verificar que o estado “Confira seu e-mail” continua aparecendo apenas quando o Supabase aceita o cadastro.

## Ajuste necessário fora do código

O tratamento acima melhora a experiência, mas não aumenta a cota. No painel do seu Supabase externo, será necessário revisar o limite de envio em **Authentication → Rate Limits**. Para uso real, também é recomendável configurar um provedor SMTP próprio em **Authentication → Email/SMTP**, pois o envio padrão tem limites baixos.
