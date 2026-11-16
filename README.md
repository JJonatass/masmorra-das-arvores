# Masmorra das Árvores

Jogos para praticar **árvores** em aulas de Estruturas de Dados: árvore binária de busca, AVL, rubro-negra, splay, percursos, trie e Huffman. Fazem parte da Era 03 da *Trilha de Estruturas*.

Cada jogo é um arquivo HTML único. Funciona offline e não precisa de instalação: basta abrir no navegador.

**▶ Jogar:** https://masmorra-das-arvores.vercel.app (Vercel) · https://jjonatass.github.io/masmorra-das-arvores/ (GitHub Pages)

## Os jogos

| Jogo | Formato | Conteúdo |
|---|---|---|
| **A Queda das Chaves** | Arcade, individual | As chaves caem pela árvore e o jogador decide ← ou → em cada sala antes do anel apagar. A partir da onda 3 a árvore vira AVL, e as rotações são feitas com duas setas (← ← LL, ← → LR, → → RR, → ← RL). Tem combo, recorde, modo treino e escolha da onda inicial. |
| **O Herói da Cripta** | RPG por turnos, individual | O herói anda pelas salas e enfrenta três chefes. Passo errado é armadilha. Recolorir, girar, zig e zag são feitiços com custo de mana. Capítulos: rubro-negra, splay e um final misturando os dois. |
| **Arena das Árvores** | Quiz, individual ou turma toda | **Desafio individual:** 15 perguntas de todos os assuntos, até 30 s cada; 1 ponto por acerto e, no empate, vence o menor tempo total de resposta. **Modo equipes** no telão: as equipes respondem com cartões A, B, C e D e o professor marca quem acertou. |
| **A Forja de Huffman** | Contra o relógio, individual | Forjar a árvore de Huffman com as letras de duas palavras sorteadas, codificar a primeira em bits e decifrar a segunda. Ranking pela média de tempo por letra. |
| **A Biblioteca dos Ecos** | Contra o relógio, individual | Guardar palavras numa trie (seguir, cavar, marcar fim), classificar consultas (palavra, só prefixo, não existe) e fazer o autocompletar. Ranking pela média de tempo por letra. |
| **O Mercado da Torre** | Contra o relógio, individual | Atender 11 fregueses numa torre splay: descer até o item e subi-lo com zig, zig-zig e zig-zag, comparando o custo com uma torre que nunca gira. Ranking pelo tempo do dia. |
| **A Masmorra (perguntas)** | Desafios por andar | A primeira versão: cinco andares de desafios curtos (BST, AVL, rubro-negra, splay e chefão). |

Recursos comuns aos jogos:

- **Instruções antes de cada atividade:** uma janela com os passos numerados e um exemplo desenhado aparece antes de cada jogo, capítulo ou andar, e de novo quando a Queda das Chaves vira AVL. Os botões *Como jogar* e *Instruções* reabrem a janela durante o jogo.
- **Dica em camadas** (tecla `H`): a 1ª camada mostra os fatos da árvore na tela, por exemplo quais chaves ficam de cada lado, as cores de X, P, T e A ou as alturas. A 2ª conclui o raciocínio. Usar dica custa pontos ou mana.
- **Janela ao errar:** o jogo pausa e explica a jogada certa com os números daquela árvore. Nas rotações e recolorações, a árvore aparece antes e depois.
- **Rankings online** (top 10, nome de até 3 caracteres, três primeiros destacados), em dois grupos no menu:
  - **por pontos:** o *ranking geral* (recorde da Queda das Chaves + recordes de cada capítulo do Herói da Cripta) e o da *Arena individual* (acertos, desempate pelo tempo);
  - **por tempo:** Forja de Huffman e Biblioteca dos Ecos (média por letra) e Mercado da Torre (tempo do dia). O tempo é cronômetro + penalidades (erro +10 s, dica +5 s ou +15 s), e o cronômetro para enquanto uma janela está aberta.
- **Todas as etapas liberadas:** dá para começar em qualquer onda, capítulo ou andar.

## Em sala

1. Abra `index.html` (ou o link acima) no projetor e use **Tela cheia**.
2. Ordem sugerida: Queda das Chaves no modo treino → Herói da Cripta → Arena em equipes para fechar. Forja, Biblioteca e Mercado cobrem Huffman, trie e splay.
3. Recordes e estrelas ficam salvos no navegador de cada aparelho.

## Estrutura

```
index.html            menu com os seis jogos (arquivo único, offline)
jogos/                cada jogo em um arquivo separado (offline)
src/
  engine.js           árvores (BST, AVL, rubro-negra, splay) e geradores de desafios
  hints.js            dicas, explicações de erro e desenho das árvores em SVG
  ranking.js          ranking geral (Queda + Herói)
  placar.js           rankings por jogo (Arena, Forja, Biblioteca, Mercado) e a janela com abas
  tempo.js            cronômetro com penalidades dos jogos por tempo
  huffman.js, trie.js, splay.js   motores da Forja, da Biblioteca e do Mercado
  *.template.html     interface de cada jogo
tests/                testes do motor, das dicas e da função do ranking (Node); tests/e2e/ tem os testes de navegador (Playwright)
build.js              gera index.html e jogos/ a partir de src/, com as fontes embutidas
api/ranking.js        função da Vercel que guarda o ranking no Vercel Blob
```

## Ranking

O ranking fica na Vercel. A função `api/ranking.js` grava cada jogador como um arquivo minúsculo no **Vercel Blob** (loja `masmorra-ranking`), com a pontuação no próprio nome do arquivo (`r1/<id>/<queda>_<heroi>_<NOME>.txt`). Assim o ranking inteiro sai de uma única listagem, e alunos jogando ao mesmo tempo não sobrescrevem uns aos outros.

- `GET /api/ranking?id=<id>` devolve o top 10 e a posição do jogador.
- `POST /api/ranking` com `{ id, tag, queda, heroi }` guarda o melhor de cada jogo.

Os outros quadros usam o parâmetro `board` (`arena`, `huffman`, `trie`, `splay`) e ficam em `b1/<quadro>/<id>/<NOME>/...`, um arquivo por aparelho e nome. Assim, num laboratório, alunos diferentes no mesmo computador têm linhas próprias.

- `GET /api/ranking?board=huffman&id=<id>&tag=<NOME>` devolve o top 10 do quadro.
- `POST /api/ranking` com `{ board, id, tag, ms, n, errs, hints }` (Arena: `{ board: 'arena', id, tag, hits, ms, n: 15 }`) guarda o melhor resultado daquele nome. O servidor calcula a média por letra e recusa valores implausíveis.

Sem conexão, os jogos por tempo e a Arena guardam o resultado num ranking deste aparelho.

Cada aparelho recebe um identificador próprio, guardado no navegador. Sem internet o jogo funciona normalmente: os pontos ficam guardados e são enviados na próxima vez que houver conexão. Não há login, então quem conhecer a API pode mandar pontuações falsas; para uso em sala isso costuma bastar.

## Gerar de novo

```bash
npm install     # baixa as fontes (IM Fell English SC e Alegreya Sans)
npm run build   # gera index.html e jogos/*.html
npm test        # motor, dicas e função do ranking
```

Os testes conferem, em milhares de árvores sorteadas, que:

- cada desafio tem exatamente uma resposta certa;
- a árvore continua válida (BST, AVL ou rubro-negra) depois de cada jogada;
- os 12 casos aparecem: LL, RR, LR e RL na AVL; os cinco passos da rubro-negra; zig, zig-zig e zig-zag no splay;
- a 2ª camada de cada dica aponta sempre a resposta certa.

## Autor

Prof. Jonatas, FICR (Faculdade Integrada do Recife).
