#!/usr/bin/env node
/**
 * Gera as páginas estáticas do Radar Femture e do Radar de Femtechs
 * a partir dos arquivos JSON em radar/data/.
 *
 * Uso: node build-radar.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA = join(ROOT, 'radar', 'data');
const OUT = join(ROOT, 'radar');
const SITE = 'https://femture.co';

const RADARS = {
  femture: {
    slug: 'femture',
    name: 'Radar Femture',
    eyebrow: 'Radar Femture',
    tagline: 'O que os principais futuristas do mundo estão dizendo, lido pela lente do mercado feminino de saúde e bem-estar.',
    cardText: 'Varredura semanal do que Amy Webb, Ray Kurzweil, Gerd Leonhard, Peter Diamandis e outros estão publicando, traduzido para o que isso significa em saúde e bem-estar da mulher.',
  },
  femtechs: {
    slug: 'femtechs',
    name: 'Radar de Femtechs',
    eyebrow: 'Radar de Femtechs',
    tagline: 'Quem está surgindo em saúde e bem-estar da mulher no mundo, com um bloco próprio para Brasil e América Latina.',
    cardText: 'Rodadas, lançamentos, aprovações e teses de produto das empresas que estão entrando no mercado de saúde da mulher, semana a semana.',
  },
};

/* ---------- helpers ---------- */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// inline: **negrito** e [texto](url)
function inline(s) {
  let out = esc(s);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return out;
}

function block(b) {
  switch (b.type) {
    case 'h2': return `<h2>${inline(b.text)}</h2>`;
    case 'p': return `<p>${inline(b.text)}</p>`;
    case 'ul': return `<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`;
    case 'ol': return `<ol>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ol>`;
    case 'callout':
      return `<div class="callout">${b.title ? `<div class="callout-title">${esc(b.title)}</div>` : ''}<p>${inline(b.text)}</p></div>`;
    case 'stats':
      return `<div class="stats">${b.items.map((s) =>
        `<div class="stat"><div class="val">${esc(s.value)}</div><div class="lbl">${inline(s.label)}</div></div>`).join('')}</div>`;
    case 'table':
      return `<div class="table-scroll"><table><thead><tr>${
        b.head.map((h) => `<th scope="col">${inline(h)}</th>`).join('')
      }</tr></thead><tbody>${
        b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')
      }</tbody></table></div>`;
    default:
      throw new Error(`Tipo de bloco desconhecido: ${b.type}`);
  }
}

const NAV = (depth, current) => {
  const up = '../'.repeat(depth);
  const link = (href, label, key) =>
    `<li><a href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a></li>`;
  return `<nav>
  <div class="nav-inner">
    <a href="${up}index.html" class="wordmark">femture</a>
    <ul class="navlinks">
      ${link(`${up}index.html#empresas`, 'Empresas')}
      ${link(`${up}index.html#profissionais`, 'Profissionais')}
      ${link(`${up}radar/`, 'Radar', 'radar')}
      ${link(`${up}index.html#sobre`, 'Sobre')}
    </ul>
    <a class="nav-cta" href="https://wa.me/5511961752244?text=Ol%C3%A1%2C%20quero%20agendar%20uma%20conversa%20com%20a%20Femture" target="_blank" rel="noopener">Agende uma conversa</a>
  </div>
</nav>`;
};

const CTA = `<section class="cta-band">
  <div class="wrap">
    <div>
      <h2>Quer esta leitura aplicada ao seu negócio?</h2>
      <p>O radar é público. A tradução dele para a sua estratégia é o que fazemos em consultoria.</p>
    </div>
    <a class="btn btn-primary" href="mailto:hello@femture.co">Escrever para hello@femture.co</a>
  </div>
</section>`;

const FOOTER = `<footer>
  <div class="wrap">
    <div class="foot-top">
      <div>
        <div class="foot-word">femture</div>
        <p class="foot-slogan">Building the future of women's wellbeing and health.</p>
      </div>
      <div class="foot-contact">
        <a href="mailto:hello@femture.co">hello@femture.co</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>&copy; ${new Date().getFullYear()} Femture. Todos os direitos reservados.</span>
    </div>
  </div>
</footer>`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Work+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Poppins:wght@700;800&display=swap" rel="stylesheet">`;

function page({ title, description, canonical, depth, current, body, jsonLd }) {
  const up = '../'.repeat(depth);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="Femture">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
${FONTS}
<link rel="stylesheet" href="${up}radar/assets/radar.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
${NAV(depth, current)}
<main id="conteudo">
${body}
</main>
${CTA}
${FOOTER}
</body>
</html>
`;
}

/* ---------- carregar edições ---------- */
function load(slug) {
  const raw = JSON.parse(readFileSync(join(DATA, `${slug}.json`), 'utf8'));
  const eds = [...raw.editions].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const e of eds) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) throw new Error(`Data inválida em ${slug}: ${e.date}`);
    if (!e.title || !e.lead) throw new Error(`Edição sem título ou lead em ${slug}: ${e.date}`);
  }
  return eds;
}

const fmtDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

/* ---------- renderizar ---------- */
function editionBody(radar, ed) {
  const blocks = ed.blocks.map(block).join('\n');
  const sources = ed.sources?.length
    ? `<div class="sources"><h2>Fontes desta edição</h2><ul>${
        ed.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')
      }</ul></div>`
    : '';
  return `<header class="masthead">
  <div class="wrap-narrow">
    <p class="eyebrow">${esc(radar.eyebrow)}</p>
    <h1>${esc(ed.title)}</h1>
    <p class="deck">${inline(ed.lead)}</p>
    <div class="meta"><span>Edição de ${fmtDate(ed.date)}</span><span>Femture</span></div>
  </div>
</header>
<article class="article">
  <div class="wrap-narrow">
${blocks}
${sources}
  </div>
</article>`;
}

function indexBody(radar, eds) {
  const latest = eds[0];
  const rest = eds.slice(1);
  const archive = rest.length
    ? `<section class="archive">
  <div class="wrap-narrow">
    <p class="eyebrow">Edições anteriores</p>
    <ul class="archive-list">${
      rest.map((e) => `<li><a href="${e.date}/"><span class="at">${esc(e.title)}</span><span class="ad">${fmtDate(e.date)}</span></a></li>`).join('')
    }</ul>
  </div>
</section>`
    : '';
  return editionBody(radar, latest) + archive;
}

function hubBody(all) {
  const cards = Object.values(RADARS).map((r) => {
    const latest = all[r.slug][0];
    return `<a class="hub-card" href="${r.slug}/">
      <p class="eyebrow">${esc(r.name)}</p>
      <h2>${esc(latest.title)}</h2>
      <p>${esc(r.cardText)}</p>
      <span class="more">Ler a edição de ${fmtDate(latest.date)} &rarr;</span>
    </a>`;
  }).join('');
  return `<header class="masthead">
  <div class="wrap">
    <p class="eyebrow">Radar</p>
    <h1>Leitura semanal do futuro do mercado feminino.</h1>
    <p class="deck">Dois radares publicados toda semana. Um acompanha o que os futuristas do mundo estão dizendo e traduz para saúde e bem-estar da mulher. O outro acompanha as empresas que estão surgindo nesse mercado.</p>
  </div>
</header>
<section class="hub">
  <div class="wrap">
    <div class="hub-grid">${cards}</div>
  </div>
</section>`;
}

/* ---------- escrever ---------- */
function write(path, html) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html, 'utf8');
  console.log('  ->', path.replace(ROOT + '/', ''));
}

const all = {};
for (const r of Object.values(RADARS)) all[r.slug] = load(r.slug);

console.log('Gerando páginas do radar...');
for (const r of Object.values(RADARS)) {
  const eds = all[r.slug];
  write(join(OUT, r.slug, 'index.html'), page({
    title: `${r.name} | Femture`,
    description: r.tagline,
    canonical: `${SITE}/radar/${r.slug}/`,
    depth: 2, current: 'radar',
    body: indexBody(r, eds),
    jsonLd: { '@context': 'https://schema.org', '@type': 'Blog', name: r.name, description: r.tagline, url: `${SITE}/radar/${r.slug}/`, publisher: { '@type': 'Organization', name: 'Femture', url: SITE } },
  }));
  for (const ed of eds) {
    write(join(OUT, r.slug, ed.date, 'index.html'), page({
      title: `${ed.title} | ${r.name}`,
      description: ed.lead.replace(/\*\*/g, '').slice(0, 300),
      canonical: `${SITE}/radar/${r.slug}/${ed.date}/`,
      depth: 3, current: 'radar',
      body: editionBody(r, ed),
      jsonLd: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: ed.title, datePublished: ed.date, inLanguage: 'pt-BR', author: { '@type': 'Organization', name: 'Femture' }, publisher: { '@type': 'Organization', name: 'Femture', url: SITE }, mainEntityOfPage: `${SITE}/radar/${r.slug}/${ed.date}/` },
    }));
  }
}
write(join(OUT, 'index.html'), page({
  title: 'Radar | Femture',
  description: 'Dois radares semanais sobre o futuro do mercado feminino de saúde e bem-estar: o que os futuristas estão dizendo e quais femtechs estão surgindo.',
  canonical: `${SITE}/radar/`,
  depth: 1, current: 'radar',
  body: hubBody(all),
}));

// sitemap
const urls = [`${SITE}/`, `${SITE}/radar/`];
for (const r of Object.values(RADARS)) {
  urls.push(`${SITE}/radar/${r.slug}/`);
  for (const ed of all[r.slug]) urls.push(`${SITE}/radar/${r.slug}/${ed.date}/`);
}
write(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')
  }\n</urlset>\n`);

console.log(`\nOK. ${Object.values(all).flat().length} edições, ${urls.length} URLs.`);
