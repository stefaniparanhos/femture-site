#!/usr/bin/env node
// Gera as páginas HTML do Radar (hub, páginas de cada radar e edições datadas)
// a partir de radar/data/femture.json e radar/data/femtechs.json.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(text) {
  return escapeHtml(text).replaceAll('"', "&quot;");
}

function md(text) {
  let out = escapeAttr(text);
  out = out.replace(/\[(.+?)\]\((.+?)\)/g, (_m, label, url) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return out;
}

function renderBlock(block) {
  switch (block.type) {
    case "h2":
      return `<h2>${md(block.text)}</h2>`;
    case "p":
      return `<p>${md(block.text)}</p>`;
    case "ul":
      return `<ul>${block.items.map((it) => `<li>${md(it)}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${block.items.map((it) => `<li>${md(it)}</li>`).join("")}</ol>`;
    case "table": {
      const head = `<thead><tr>${block.head.map((h) => `<th scope="col">${md(h)}</th>`).join("")}</tr></thead>`;
      const body = `<tbody>${block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${md(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      return `<div class="table-scroll"><table>${head}${body}</table></div>`;
    }
    case "callout":
      return `<div class="callout"><div class="callout-title">${md(block.title)}</div><p>${md(block.text)}</p></div>`;
    case "stats":
      return `<div class="stats">${block.items
        .map((it) => `<div class="stat"><div class="val">${md(it.value)}</div><div class="lbl">${md(it.label)}</div></div>`)
        .join("")}</div>`;
    default:
      throw new Error(`Tipo de bloco desconhecido: ${block.type}`);
  }
}

function renderSources(sources) {
  const items = sources
    .map((s) => `<li><a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></li>`)
    .join("");
  return `<div class="sources"><h2>Fontes desta edição</h2><ul>${items}</ul></div>`;
}

function renderArticle(edition) {
  return edition.blocks.map(renderBlock).join("\n") + "\n" + renderSources(edition.sources);
}

const RADARS = {
  femture: {
    label: "Radar Femture",
    hubDescription:
      "O que os principais futuristas do mundo estão dizendo, lido pela lente do mercado feminino de saúde e bem-estar.",
    cardDescription:
      "Varredura semanal do que Amy Webb, Ray Kurzweil, Gerd Leonhard, Peter Diamandis e outros estão publicando, traduzido para o que isso significa em saúde e bem-estar da mulher.",
  },
  femtechs: {
    label: "Radar de Femtechs",
    hubDescription:
      "Quem está surgindo em saúde e bem-estar da mulher no mundo, com um bloco próprio para Brasil e América Latina.",
    cardDescription:
      "Rodadas, lançamentos, aprovações e teses de produto das empresas que estão entrando no mercado de saúde da mulher, semana a semana.",
  },
};

function pageShell({ depth, title, description, canonicalPath, ogType, jsonLd, navCurrent, body }) {
  const up = "../".repeat(depth);
  const stylesheet = `${up}radar/assets/radar.css`;
  const rootHref = `${up}index.html`;
  const radarHref = `${up}radar/`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}">
<link rel="canonical" href="https://femture.co${canonicalPath}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:url" content="https://femture.co${canonicalPath}">
<meta property="og:site_name" content="Femture">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Work+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Poppins:wght@700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${stylesheet}">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
</head>
<body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<nav>
  <div class="nav-inner">
    <a href="${rootHref}" class="wordmark">femture</a>
    <ul class="navlinks">
      <li><a href="${rootHref}#empresas">Empresas</a></li>
      <li><a href="${rootHref}#profissionais">Profissionais</a></li>
      <li><a href="${radarHref}"${navCurrent ? ' aria-current="page"' : ""}>Radar</a></li>
      <li><a href="${rootHref}#sobre">Sobre</a></li>
    </ul>
    <a class="nav-cta" href="https://wa.me/5511961752244?text=Ol%C3%A1%2C%20quero%20agendar%20uma%20conversa%20com%20a%20Femture" target="_blank" rel="noopener">Agende uma conversa</a>
  </div>
</nav>
<main id="conteudo">
${body}
</main>
<section class="cta-band">
  <div class="wrap">
    <div>
      <h2>Quer esta leitura aplicada ao seu negócio?</h2>
      <p>O radar é público. A tradução dele para a sua estratégia é o que fazemos em consultoria.</p>
    </div>
    <a class="btn btn-primary" href="mailto:hello@femture.co">Escrever para hello@femture.co</a>
  </div>
</section>
<footer>
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
      <span>&copy; 2026 Femture. Todos os direitos reservados.</span>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function editionBody({ eyebrow, edition, wrapClass, article }) {
  return `<header class="masthead">
  <div class="${wrapClass}">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1>${escapeHtml(edition.title)}</h1>
    <p class="deck">${escapeHtml(edition.lead)}</p>
    <div class="meta"><span>Edição de ${formatDate(edition.date)}</span><span>Femture</span></div>
  </div>
</header>
<article class="article">
  <div class="wrap-narrow">
${article}
  </div>
</article>`;
}

function buildDatedPage(radarKey, radar, edition) {
  const title = `${edition.title} | ${radar.label}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: edition.title,
    datePublished: edition.date,
    inLanguage: "pt-BR",
    author: { "@type": "Organization", name: "Femture" },
    publisher: { "@type": "Organization", name: "Femture", url: "https://femture.co" },
    mainEntityOfPage: `https://femture.co/radar/${radarKey}/${edition.date}/`,
  });
  const body = editionBody({
    eyebrow: radar.label,
    edition,
    wrapClass: "wrap-narrow",
    article: renderArticle(edition),
  });
  return pageShell({
    depth: 3,
    title,
    description: edition.lead,
    canonicalPath: `/radar/${radarKey}/${edition.date}/`,
    ogType: "article",
    jsonLd,
    navCurrent: true,
    body,
  });
}

function buildArchiveSection(radarKey, olderEditions) {
  if (olderEditions.length === 0) return "";
  const items = olderEditions
    .map(
      (e) =>
        `<li><a href="${e.date}/"><span class="at">${escapeHtml(e.title)}</span><span class="ad">${formatDate(e.date)}</span></a></li>`
    )
    .join("");
  return `<section class="archive">
  <div class="wrap-narrow">
    <h2>Edições anteriores</h2>
    <ul class="archive-list">${items}</ul>
  </div>
</section>`;
}

function buildRadarIndexPage(radarKey, radar, editions) {
  const latest = editions[0];
  const older = editions.slice(1);
  const title = `${radar.label} | Femture`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: radar.label,
    description: radar.hubDescription,
    url: `https://femture.co/radar/${radarKey}/`,
    publisher: { "@type": "Organization", name: "Femture", url: "https://femture.co" },
  });
  const body =
    editionBody({
      eyebrow: radar.label,
      edition: latest,
      wrapClass: "wrap-narrow",
      article: renderArticle(latest),
    }) + "\n" + buildArchiveSection(radarKey, older);
  return pageShell({
    depth: 2,
    title,
    description: radar.hubDescription,
    canonicalPath: `/radar/${radarKey}/`,
    ogType: "article",
    jsonLd,
    navCurrent: true,
    body,
  });
}

function buildHubPage(latestByRadar) {
  const title = "Radar | Femture";
  const description =
    "Dois radares semanais sobre o futuro do mercado feminino de saúde e bem-estar: o que os futuristas estão dizendo e quais femtechs estão surgindo.";
  const cards = Object.entries(RADARS)
    .map(([radarKey, radar]) => {
      const latest = latestByRadar[radarKey];
      return `<a class="hub-card" href="${radarKey}/">
      <p class="eyebrow">${escapeHtml(radar.label)}</p>
      <h2>${escapeHtml(latest.title)}</h2>
      <p>${escapeHtml(radar.cardDescription)}</p>
      <span class="more">Ler a edição de ${formatDate(latest.date)} &rarr;</span>
    </a>`;
    })
    .join("");
  const body = `<header class="masthead">
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
  return pageShell({
    depth: 1,
    title,
    description,
    canonicalPath: "/radar/",
    ogType: "article",
    jsonLd: "",
    navCurrent: true,
    body,
  });
}

function buildSitemap(dataByRadar) {
  const urls = ["https://femture.co/", "https://femture.co/radar/"];
  for (const radarKey of Object.keys(RADARS)) {
    urls.push(`https://femture.co/radar/${radarKey}/`);
    for (const edition of dataByRadar[radarKey].editions) {
      urls.push(`https://femture.co/radar/${radarKey}/${edition.date}/`);
    }
  }
  const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function main() {
  const dataByRadar = {};
  const latestByRadar = {};

  for (const radarKey of Object.keys(RADARS)) {
    const radar = RADARS[radarKey];
    const data = JSON.parse(readFileSync(join(ROOT, "radar", "data", `${radarKey}.json`), "utf8"));
    dataByRadar[radarKey] = data;
    latestByRadar[radarKey] = data.editions[0];

    for (const edition of data.editions) {
      const dir = join(ROOT, "radar", radarKey, edition.date);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "index.html"), buildDatedPage(radarKey, radar, edition));
    }

    writeFileSync(
      join(ROOT, "radar", radarKey, "index.html"),
      buildRadarIndexPage(radarKey, radar, data.editions)
    );
  }

  writeFileSync(join(ROOT, "radar", "index.html"), buildHubPage(latestByRadar));
  writeFileSync(join(ROOT, "sitemap.xml"), buildSitemap(dataByRadar));

  console.log("Radar gerado com sucesso.");
}

main();
