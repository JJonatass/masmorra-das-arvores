# Masmorra das Árvores

Jogos para praticar **árvores de busca** em aulas de Estruturas de Dados: árvore binária de busca, AVL, rubro-negra, splay e percursos. Fazem parte da Era 03 da *Trilha de Estruturas*.

Cada jogo é um arquivo HTML único. Funciona offline e não precisa de instalação: basta abrir no navegador.

**▶ Jogar:** https://masmorra-das-arvores-js-j.vercel.app (Vercel) · https://jjonatass.github.io/masmorra-das-arvores/ (GitHub Pages)

## Os jogos

| Jogo | Formato | Conteúdo |
|---|---|---|
| **A Queda das Chaves** | Arcade, individual | As chaves caem pela árvore e o jogador decide ← ou → em cada sala antes do anel apagar. A partir da onda 3 a árvore vira AVL, e as rotações são feitas com duas setas (← ← LL, ← → LR, → → RR, → ← RL). Tem combo, recorde, modo treino e escolha da onda inicial. |
| **O Herói da Cripta** | RPG por turnos, individual | O herói anda pelas salas e enfrenta três chefes. Passo errado é armadilha. Recolorir, girar, zig e zag são feitiços com custo de mana. Capítulos: rubro-negra, splay e um final misturando os dois. |
| **Arena das Árvores** | Quiz no telão, turma toda | Perguntas sorteadas com a árvore desenhada, cronômetro, revelação com explicação, placar e pódio. Neste repositório roda no **modo equipes**: as equipes respondem com cartões A, B, C e D e o professor marca quem acertou. |
| **A Masmorra (perguntas)** | Desafios por andar | A primeira versão: cinco andares de desafios curtos (BST, AVL, rubro-negra, splay e chefão). |

Recursos comuns aos jogos:

- **Dica em camadas** (tecla `H`): a 1ª camada mostra os fatos da árvore na tela, por exemplo quais chaves ficam de cada lado, as cores de X, P, T e A ou as alturas. A 2ª conclui o raciocínio. Usar dica custa pontos ou mana.
- **Janela ao errar:** o jogo pausa e explica a jogada certa com os números daquela árvore. Nas rotações e recolorações, a árvore aparece antes e depois.
- **Todas as etapas liberadas:** dá para começar em qualquer onda, capítulo ou andar.

## Em sala

1. Abra `index.html` (ou o link acima) no projetor e use **Tela cheia**.
2. Ordem sugerida: Queda das Chaves no modo treino → Herói da Cripta → Arena em equipes para fechar.
3. Recordes e estrelas ficam salvos no navegador de cada aparelho.

## Estrutura

```
index.html            menu com os três jogos (arquivo único, offline)
jogos/                cada jogo em um arquivo separado (offline)
src/
  engine.js           árvores (BST, AVL, rubro-negra, splay) e geradores de desafios
  hints.js            dicas, explicações de erro e desenho das árvores em SVG
  *.template.html     interface de cada jogo
tests/                testes do motor e das dicas (Node)
build.js              gera index.html e jogos/ a partir de src/, com as fontes embutidas
```

## Gerar de novo

```bash
npm install     # baixa as fontes (IM Fell English SC e Alegreya Sans)
npm run build   # gera index.html e jogos/*.html
npm test        # cerca de 97 mil verificações do motor e das dicas
```

Os testes conferem, em milhares de árvores sorteadas, que:

- cada desafio tem exatamente uma resposta certa;
- a árvore continua válida (BST, AVL ou rubro-negra) depois de cada jogada;
- os 12 casos aparecem: LL, RR, LR e RL na AVL; os cinco passos da rubro-negra; zig, zig-zig e zig-zag no splay;
- a 2ª camada de cada dica aponta sempre a resposta certa.

## Autor

Prof. Jonatas, FICR (Faculdade Integrada do Recife).
