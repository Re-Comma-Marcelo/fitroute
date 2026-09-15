import type { Recipe } from "../nutrition-types";

// In-memory mock. NEVER import this file directly in components —
// use only functions from src/lib/data/nutrition.ts.
//
// Recipes for the Brazilian catalogue in src/lib/data/meals.mock.ts, keyed by
// meal id. Written in Portuguese for the same reason the dish names and
// ingredients are: the recipe belongs to the dish, not to the interface. Only
// the chrome around it (headings, "Tips", the button) goes through i18n.
//
// Quantities follow the meal's own ingredient list, so the macros shown in the
// app are the macros of what these steps produce. Delivery meals (br25, br26)
// have no recipe on purpose.

const r = (servings: number, steps: string[], tips: string[]): Recipe => ({
  servings,
  steps,
  tips,
});

export const recipes: Record<string, Recipe> = {
  // ---- Café da manhã --------------------------------------------------------
  br01: r(
    1,
    [
      "Quebre os 3 ovos numa tigela, tempere com uma pitada de sal e bata com o garfo só até a gema sumir.",
      "Aqueça a frigideira em fogo baixo e derreta os 10 g de manteiga sem deixar dourar.",
      "Despeje os ovos e espere 20 segundos sem mexer, até começar a firmar nas bordas.",
      "Puxe as bordas para o centro com a espátula, em movimentos lentos, formando dobras grandes.",
      "Desligue o fogo quando ainda estiverem levemente úmidos — o calor da frigideira termina o cozimento.",
      "Corte o pão francês ao meio e sirva na hora, com os ovos por cima.",
    ],
    [
      "Fogo alto endurece o ovo e solta água no prato: baixo e paciente é o que deixa cremoso.",
      "Sal só no fim, se preferir — salgar muito antes de bater deixa a textura mais borrachuda.",
      "Precisa de mais proteína sem mexer nas calorias? Troque um ovo inteiro por duas claras.",
    ],
  ),
  br02: r(
    1,
    [
      "Cozinhe os 100 g de peito de frango em água temperada por cerca de 15 minutos, até soltar ao espetar.",
      "Desfie o frango ainda morno com dois garfos e misture com o tomate picado sem sementes.",
      "Peneire os 60 g de goma de tapioca direto sobre a frigideira antiaderente quente e sem óleo.",
      "Espalhe a goma numa camada fina e uniforme; em 1 a 2 minutos ela liga sozinha e vira um disco.",
      "Coloque o recheio de um lado, dobre ao meio e deixe mais 30 segundos para aquecer por dentro.",
    ],
    [
      "Peneirar a goma não é frescura: é o que evita as bolinhas duras e a tapioca quebradiça.",
      "Frigideira seca — óleo na tapioca só adiciona gordura e atrapalha a liga.",
      "Cozinhe o frango de uma vez para a semana e guarde desfiado na geladeira por até 3 dias.",
    ],
  ),
  br03: r(
    1,
    [
      "Corte o pão francês ao meio no sentido do comprimento.",
      "Passe os 12 g de manteiga nas duas metades, cobrindo até as bordas.",
      "Aqueça a chapa ou frigideira em fogo médio e coloque o pão com a manteiga para baixo.",
      "Prense levemente com a espátula por 2 a 3 minutos, até dourar e ficar crocante.",
      "Aqueça os 200 ml de leite e misture com o café coado para servir junto.",
    ],
    [
      "Fogo médio: no alto a manteiga queima antes de o miolo aquecer.",
      "Essa é a refeição mais leve em proteína do catálogo — um ovo ou uma fatia de queijo ao lado equilibra a manhã.",
    ],
  ),
  br04: r(
    1,
    [
      "Leve os 250 ml de leite ao fogo médio numa panela pequena.",
      "Quando começar a formar bolhas nas bordas, junte os 60 g de aveia de uma vez.",
      "Mexa sem parar por 4 a 5 minutos, até engrossar e soltar do fundo.",
      "Desligue, acrescente os 2 g de canela e misture.",
      "Sirva com a banana fatiada por cima, ainda quente.",
    ],
    [
      "Mexer sempre é o que impede a aveia de empelotar e grudar no fundo.",
      "Engrossou demais? Um fio de leite frio no fim volta ao ponto sem alterar quase nada as calorias.",
      "Adoce com a banana bem madura em vez de açúcar: mesmo doce, sem calorias extras.",
    ],
  ),
  br05: r(
    1,
    [
      "Descasque os 150 g de mamão, tire as sementes e corte em cubos.",
      "Coloque os 200 g de iogurte natural no fundo da tigela.",
      "Distribua o mamão por cima.",
      "Finalize com os 40 g de granola na hora de comer.",
    ],
    [
      "Granola só no último momento: misturada antes, ela amolece e perde a graça.",
      "Iogurte natural integral e desnatado mudam bem as calorias — confira o rótulo do que você comprou.",
      "Monte em pote com tampa na noite anterior, deixando a granola num saquinho à parte, e leve pronto.",
    ],
  ),
  br06: r(
    1,
    [
      "Umedeça os 70 g de flocão de milho com cerca de 60 ml de água e uma pitada de sal, misturando com as mãos.",
      "Deixe hidratar por 5 minutos — o floco deve ficar úmido e solto, nunca encharcado.",
      "Passe por uma peneira grossa e coloque na cuscuzeira com água fervendo embaixo.",
      "Cozinhe no vapor por 6 a 8 minutos, até soltar vapor por cima de forma uniforme.",
      "Enquanto isso, frite ou mexa os 2 ovos com os 8 g de manteiga.",
      "Desenforme o cuscuz e sirva com o ovo por cima.",
    ],
    [
      "Água demais vira massa pesada; de menos, esfarela. Úmido ao apertar na mão é o ponto.",
      "Sem cuscuzeira, use uma peneira de metal sobre uma panela com água e tampe.",
    ],
  ),

  // ---- Almoço ---------------------------------------------------------------
  br07: r(
    1,
    [
      "Tempere os 150 g de peito de frango com sal, alho e limão e deixe descansar 10 minutos.",
      "Refogue os 150 g de arroz com um pouco de alho, junte o dobro de água quente e cozinhe tampado por 15 minutos.",
      "Aqueça os 100 g de feijão carioca já cozido em fogo baixo enquanto o arroz termina.",
      "Grelhe o frango na frigideira bem quente, 4 a 5 minutos de cada lado, virando uma única vez.",
      "Deixe a carne descansar 3 minutos antes de cortar, para não perder o suco.",
      "Monte a salada de alface e tomate e regue com os 5 ml de azeite.",
    ],
    [
      "Virar o frango o tempo todo impede que ele doure: deixe formar a crosta antes de mexer.",
      "Os 5 ml de azeite já estão contados nos macros — o que passar disso vira caloria extra.",
      "É o prato que mais rende marmita: dobre tudo e congele em porções de 150 g de arroz.",
    ],
  ),
  br08: r(
    1,
    [
      "Tempere os 150 g de alcatra com sal e deixe fora da geladeira por 10 minutos.",
      "Corte a cebola em rodelas e reserve.",
      "Cozinhe os 150 g de arroz e aqueça os 100 g de feijão carioca.",
      "Aqueça bem a frigideira e sele o bife 2 a 3 minutos de cada lado, sem mexer.",
      "Tire a carne, junte a cebola na mesma frigideira e refogue até dourar, raspando o fundo.",
      "Corte os 80 g de couve em tiras finas e refogue rapidamente, por 2 minutos, só até murchar.",
    ],
    [
      "Frigideira lotada cozinha a carne no vapor em vez de selar: faça um bife por vez.",
      "A couve perde a cor e fica amarga se passar do ponto — 2 minutos bastam.",
      "A alcatra é o que carrega a gordura do prato; patinho no lugar dela corta cerca de 6 g de gordura.",
    ],
  ),
  br09: r(
    1,
    [
      "Corte os 150 g de peito de frango em cubos e tempere com sal e pimenta.",
      "Doure os cubos em fogo alto até ficarem bem corados por fora.",
      "Junte os 50 g de champignon fatiados e refogue por mais 2 minutos.",
      "Abaixe o fogo, acrescente os 100 g de creme de leite e mexa só até aquecer.",
      "Sirva sobre os 150 g de arroz cozido e finalize com os 30 g de batata palha na hora.",
    ],
    [
      "Nunca ferva depois do creme de leite: ele talha e o molho perde a textura.",
      "A batata palha sozinha responde por boa parte da gordura — usar metade corta cerca de 75 kcal.",
      "Creme de leite light no lugar do tradicional mantém o prato e reduz bem a gordura.",
    ],
  ),
  br10: r(
    1,
    [
      "Doure os 120 g de patinho moído em fogo alto, espalhando na panela sem mexer nos primeiros 2 minutos.",
      "Quebre os pedaços maiores com a colher e refogue até não sobrar carne rosada.",
      "Junte os 150 g de molho de tomate, tempere e deixe apurar em fogo baixo por 10 minutos.",
      "Cozinhe os 120 g de macarrão em água fervente bem salgada, um minuto a menos que a embalagem manda.",
      "Escorra reservando meia concha da água do cozimento e misture o macarrão direto no molho.",
      "Finalize com os 15 g de parmesão ralado.",
    ],
    [
      "Terminar o macarrão dentro do molho, com um pouco da água do cozimento, é o que faz o molho grudar na massa.",
      "Se a carne soltar muita água, deixe evaporar antes do molho — senão o resultado fica aguado.",
      "Massa integral mantém as calorias parecidas e segura mais a fome à tarde.",
    ],
  ),
  br11: r(
    1,
    [
      "Deixe os 80 g de carne seca de molho na geladeira por 12 horas, trocando a água 3 vezes.",
      "Ferva a carne seca por 10 minutos, descarte a água e corte em cubos.",
      "Cozinhe os 150 g de feijão preto na pressão por 20 minutos, com folha de louro.",
      "Doure os 60 g de lombo suíno em cubos e junte com a carne seca ao feijão.",
      "Deixe apurar em fogo baixo por 15 minutos, sem tampa, até o caldo encorpar.",
      "Sirva com os 120 g de arroz, a couve refogada e a laranja em gomos.",
    ],
    [
      "Dessalgar direito não é opcional: sem isso o prato fica intragável e cheio de sódio.",
      "Esta é a versão leve — sem paio, linguiça e bacon, que dobrariam a gordura.",
      "A laranja não é enfeite: ajuda na digestão e melhora o aproveitamento do ferro do feijão.",
    ],
  ),
  br12: r(
    1,
    [
      "Cozinhe os 130 g de arroz integral por cerca de 35 minutos, ou 20 na pressão.",
      "Tempere os 180 g de filé de tilápia com sal, limão e pimenta, 10 minutos antes.",
      "Corte a abobrinha e os 80 g de cenoura em rodelas e cozinhe no vapor por 6 a 8 minutos.",
      "Seque bem o peixe com papel-toalha e grelhe em frigideira quente, 3 minutos de cada lado.",
      "Regue tudo com os 5 ml de azeite na hora de servir.",
    ],
    [
      "Peixe úmido solta água e cozinha em vez de grelhar: secar antes é o passo que mais muda o resultado.",
      "Tilápia passa do ponto em segundos — quando a carne fica opaca e lasca, está pronta.",
      "Azeite cru no fim rende mais sabor por grama de gordura do que azeite na frigideira.",
    ],
  ),
  br13: r(
    2,
    [
      "Cozinhe os 130 g de arroz integral e os 80 g de feijão carioca.",
      "Doure os 150 g de patinho moído em fogo alto com alho e cebola, sem escorrer o líquido no começo.",
      "Deixe a água da carne evaporar por completo para ela dourar de verdade.",
      "Cozinhe os 120 g de brócolis no vapor por 5 minutos, até ficar verde vivo e ainda firme.",
      "Monte nos potes com o arroz de um lado, a carne do outro e o brócolis por cima.",
      "Espere esfriar completamente antes de tampar e levar à geladeira.",
    ],
    [
      "Tampar quente cria vapor dentro do pote e estraga a marmita antes do tempo.",
      "Brócolis mole vira papa ao reaquecer: deixe firme, o micro-ondas termina o cozimento.",
      "Dura 4 dias na geladeira e 3 meses no congelador. Congele já porcionado.",
    ],
  ),

  // ---- Lanche ---------------------------------------------------------------
  br14: r(
    1,
    [
      "Coloque os 200 ml de leite desnatado no liquidificador primeiro.",
      "Junte a banana em pedaços e os 30 g de whey por último.",
      "Bata por 20 a 30 segundos, sem exagerar.",
      "Beba na hora, enquanto está gelado e aerado.",
    ],
    [
      "Líquido antes do pó evita a bola de whey grudada na hélice.",
      "Bater demais aquece a mistura e deixa a textura rala.",
      "Banana congelada em rodelas deixa o shake cremoso sem adicionar nada.",
    ],
  ),
  br15: r(
    1,
    [
      "Toste levemente as 2 fatias de pão integral na frigideira ou torradeira.",
      "Passe os 20 g de requeijão light nas duas fatias.",
      "Distribua os 60 g de peito de peru dobrado, em camadas, em vez de esticado.",
      "Feche, corte na diagonal e sirva.",
    ],
    [
      "Peito de peru é bem salgado: confira o sódio no rótulo se você controla pressão.",
      "Dobrar o frio em camadas dá volume e a sensação de um lanche maior com a mesma quantidade.",
    ],
  ),
  br16: r(
    1,
    [
      "Coloque os 150 g de iogurte grego numa tigela.",
      "Pique grosseiramente os 20 g de castanha de caju.",
      "Toste a castanha por 2 minutos em frigideira seca, se quiser mais sabor.",
      "Espalhe por cima do iogurte e coma em seguida.",
    ],
    [
      "Pese as castanhas: 20 g é um punhado pequeno, e o olho costuma errar para mais.",
      'Iogurte grego de verdade é o coado — os "estilo grego" costumam ter mais açúcar e menos proteína.',
    ],
  ),
  br17: r(
    1,
    [
      "Corte a banana ao meio no sentido do comprimento.",
      "Espalhe os 30 g de pasta de amendoim sobre as metades.",
      "Coma na hora, ou junte as metades como um sanduíche para levar.",
    ],
    [
      "Pasta integral (só amendoim e sal) evita o açúcar e o óleo das versões açucaradas.",
      "30 g é uma colher de sopa cheia. Duas colheres já somam quase 180 kcal.",
      "Lanche ideal 40 a 60 minutos antes de treinar.",
    ],
  ),
  br18: r(
    1,
    [
      "Coloque os 2 ovos numa panela com água fria cobrindo dois dedos acima.",
      "Leve ao fogo e conte 8 minutos a partir da fervura para a gema firme.",
      "Transfira para uma tigela com água e gelo por 2 minutos.",
      "Descasque sob água corrente e sirva com a maçã.",
    ],
    [
      "O choque de gelo é o que solta a casca e evita o anel esverdeado na gema.",
      "Ovos cozidos duram 5 dias na geladeira com casca — cozinhe 6 de uma vez.",
    ],
  ),
  br19: r(
    1,
    [
      "Tire os 200 g de polpa de açaí do congelador 5 minutos antes, só para amaciar.",
      "Bata a polpa com metade da banana e pouquíssimo líquido, até virar creme firme.",
      "Despeje na tigela e alise a superfície.",
      "Cubra com os 40 g de granola e o resto da banana em rodelas.",
    ],
    [
      "Líquido demais transforma a tigela em suco: pare de bater no ponto de sorvete.",
      "Este é o lanche mais calórico e o de menos proteína da lista — 20 g de whey na batida corrigem isso.",
      "Polpa pura, sem xarope de guaraná, é o que mantém os números acima válidos.",
    ],
  ),

  // ---- Jantar ---------------------------------------------------------------
  br20: r(
    1,
    [
      "Bata os 3 ovos com uma pitada de sal até homogeneizar.",
      "Aqueça a frigideira antiaderente em fogo médio-baixo.",
      "Despeje os ovos e espalhe, deixando firmar por 2 minutos sem mexer.",
      "Coloque os 30 g de queijo minas ralado em metade da omelete.",
      "Dobre ao meio e deixe mais 1 minuto para o queijo derreter.",
      "Sirva com a salada de alface e tomate ao lado.",
    ],
    [
      "Mexer a omelete depois de despejar faz ela quebrar na hora de dobrar.",
      "Fogo médio-baixo mantém a omelete macia; alto deixa a base seca e a superfície crua.",
      "Jantar leve em carboidrato — se treinou à noite, acrescente uma fatia de pão.",
    ],
  ),
  br21: r(
    2,
    [
      "Cozinhe os 130 g de peito de frango em 1 litro de água com sal, alho e louro por 20 minutos.",
      "Retire o frango, desfie e guarde o caldo do cozimento.",
      "Corte os 100 g de batata, os 80 g de cenoura e os 100 g de chuchu em cubos iguais.",
      "Cozinhe os legumes no próprio caldo por 15 minutos, até ficarem macios.",
      "Amasse parte dos legumes contra a panela para engrossar sem precisar de farinha.",
      "Devolva o frango desfiado e ajuste o sal antes de servir.",
    ],
    [
      "Cubos do mesmo tamanho cozinham juntos — é o que evita batata desmanchada com cenoura dura.",
      "Cozinhar no caldo do frango, e não em água nova, é de onde vem o sabor.",
      "Congela bem por até 3 meses. Congele sem a batata se puder: ela fica arenosa.",
    ],
  ),
  br22: r(
    1,
    [
      "Cozinhe e desfie os 100 g de peito de frango.",
      "Rale os 50 g de cenoura no ralo grosso.",
      "Misture o frango, a cenoura e os 30 g de iogurte natural, e tempere com sal e pimenta.",
      "Recheie as 2 fatias de pão integral e prense de leve.",
      "Embrulhe em papel-filme se for levar, e mantenha refrigerado.",
    ],
    [
      "Iogurte natural no lugar da maionese é o que segura este lanche em 380 kcal.",
      "Monte no máximo algumas horas antes: o recheio úmido encharca o pão se ficar de um dia para o outro.",
    ],
  ),
  br23: r(
    1,
    [
      "Cozinhe os 200 g de batata em cubos, em água com sal, por 15 minutos, até espetar sem resistência.",
      "Tempere os 160 g de peito de frango e grelhe 5 minutos de cada lado em frigideira bem quente.",
      "Escorra a batata muito bem e deixe secar no vapor por 1 minuto na panela quente.",
      "Amasse ainda quente e junte os 50 ml de leite aos poucos, mexendo até ficar liso.",
      "Sirva o frango sobre o purê, com a salada de alface ao lado.",
    ],
    [
      "Batata mal escorrida faz purê aguado — o minuto secando na panela resolve.",
      "Amasse quente: fria, a batata vira uma massa elástica.",
      "Purê sem manteiga mantém as 480 kcal. Cada 10 g de manteiga soma cerca de 75.",
    ],
  ),
  br24: r(
    1,
    [
      "Grelhe os 120 g de peito de frango em tiras, temperados com páprica e sal.",
      "Aqueça a tortilha integral por 30 segundos de cada lado na frigideira seca.",
      "Passe os 20 g de requeijão light no centro da tortilha, deixando 3 cm livres nas bordas.",
      "Coloque o frango e os 40 g de alface em uma faixa, sem chegar às pontas.",
      "Dobre as laterais para dentro e enrole apertado, de baixo para cima.",
      "Corte na diagonal, com a emenda para baixo.",
    ],
    [
      "Aquecer a tortilha antes é o que impede que ela rache ao enrolar.",
      "Recheio no centro e bordas livres: cheio demais, o wrap abre.",
      "Frango morno, não quente — o calor murcha a alface e solta água dentro do wrap.",
    ],
  ),
};
