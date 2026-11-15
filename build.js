// Gera os HTML offline (fontes embutidas) a partir de src/.
// Uso: npm install && npm run build
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const engine = src('engine.js').replace("if (typeof module !== 'undefined') module.exports = Engine;\n", '');
const hints = src('hints.js');
const font = f => fs.readFileSync(require.resolve('@fontsource/' + f)).toString('base64');
let css = `@font-face{font-family:'IM Fell English SC';font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${font('im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff2')}) format('woff2')}\n`;
for (const w of [400, 500, 700, 800]) css += `@font-face{font-family:'Alegreya Sans';font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${font(`alegreya-sans/files/alegreya-sans-latin-${w}-normal.woff2`)}) format('woff2')}\n`;

function game(tpl, withHints) {
  let h = src(tpl).replace('/*ENGINE*/', () => engine + (withHints ? '\n' + hints : ''));
  return h.replace(/<!--FONTS-->[\s\S]*?<!--\/FONTS-->/, '');
}
function offline(h) {
  h = h.replace(/<link rel="preconnect"[^>]*>\n/g, '').replace(/<link href="https:\/\/fonts\.googleapis[^>]*>\n/, '');
  h = h.replace('<style>\n', '<style>\n' + css);
  if (/googleapis|gstatic/.test(h)) throw new Error('ainda há CDN de fontes');
  return h;
}
const out = (f, h) => { fs.writeFileSync(path.join(__dirname, f), h); console.log(f, (h.length / 1024 | 0) + ' KB'); };

const games = { queda: game('arcade.template.html', true), heroi: game('heroi.template.html', true), arena: game('arena.template.html', true) };
out('jogos/queda-das-chaves.html', offline(games.queda));
out('jogos/heroi-da-cripta.html', offline(games.heroi));
out('jogos/arena-das-arvores.html', offline(games.arena));
out('jogos/masmorra-perguntas.html', offline(src('perguntas.template.html').replace('/*ENGINE*/', () => engine)));

const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const safe = x => JSON.stringify(x).split('</').join('<\\/').split('<!--').join('<\\!--').split(LS).join('\\u2028').split(PS).join('\\u2029');
let menu = src('menu.template.html');
menu = menu.replace('/*FONTCSS*/', () => 'var FONTCSS = ' + safe(css) + ';')
  .replace('/*GAMES*/', () => 'var GAMES = {' + Object.keys(games).map(k => JSON.stringify(k) + ':' + safe(games[k])).join(',\n') + '};');
out('index.html', menu);
