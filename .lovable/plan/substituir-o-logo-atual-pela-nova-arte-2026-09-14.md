# Substituir o logo atual pela nova arte

## Escopo
- Usar o arquivo enviado `Route_-_Logo.png` como a nova fonte oficial do símbolo Route.
- Substituir somente os locais onde o logo atual já aparece, sem adicionar novas posições ou alterar o restante do layout.

## Alterações
1. Atualizar o componente de logo compartilhado para exibir a nova arte mantendo os tamanhos, alinhamentos e acessibilidade atuais.
2. A substituição refletirá automaticamente nos locais já existentes: entrada, onboarding, Home, página 404 e tela de erro.
3. Gerar versões otimizadas da mesma arte para:
   - favicon do navegador;
   - ícone da tela inicial no iPhone;
   - ícones PWA de 192 px e 512 px;
   - ícone maskable, com margem segura para recortes do sistema.
4. Atualizar a imagem de compartilhamento existente para usar o novo símbolo, preservando formato, fundo e dimensões atuais.
5. Remover a referência ao SVG antigo do cabeçalho e do manifesto, apontando ambos para os novos arquivos rasterizados.

## Validação
- Conferir o logo nos tamanhos pequenos e grandes, sem distorção ou corte.
- Verificar a entrada e uma tela interna em viewport móvel.
- Confirmar favicon, manifesto e ícones instaláveis.
- Confirmar que o app continua compilando sem erros.

## Fora do escopo
- Nenhuma alteração de layout, textos, cores, navegação, dados ou Supabase.
