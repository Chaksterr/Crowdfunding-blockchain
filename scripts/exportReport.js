// Exporte le rapport docs/commun/rapport/RAPPORT.md en PDF (A4), avec une
// page de garde, un sommaire, les diagrammes Mermaid et les captures d'écran.
// Usage : npm run report:pdf
// Prérequis : Chromium de Playwright (npx playwright install chromium) et une
// connexion Internet (Markdown, Mermaid et polices chargés depuis un CDN).
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const root = path.join(__dirname, "..");
const reportDir = path.join(root, "docs", "commun", "rapport");
const source = path.join(reportDir, "RAPPORT.md");
const output = path.join(reportDir, "RAPPORT.pdf");
const coverImage = path.join(root, "docs", "commun", "captures", "01-accueil-ordinateur.png");

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };

function dataUri(file) {
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type || !fs.existsSync(file)) return null;
  return `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
}

// Les images sont intégrées au PDF : chaque chemin relatif devient une data URI.
function inlineImages(markdown) {
  const inline = (url) => dataUri(path.resolve(reportDir, url)) ?? url;
  return markdown
    .replace(/(!\[[^\]]*\]\()([^)\s]+)(\))/g, (_, start, url, end) => start + inline(url) + end)
    .replace(/(<img[^>]*\bsrc=")([^"]+)(")/g, (_, start, url, end) => start + inline(url) + end);
}

const CSS = `
  @page { size: A4; }
  :root { --text: #1e293b; --muted: #64748b; --accent: #047857; --line: #e2e8f0; --soft: #f1f5f9; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 10.5pt/1.55 "Source Serif 4", Georgia, serif; color: var(--text); }
  h1, h2, h3, h4, th, .toc, .cover p { font-family: Inter, "Helvetica Neue", Arial, sans-serif; }
  h1, h2, h3, h4 { color: #0f172a; line-height: 1.25; break-after: avoid; }
  h2 { font-size: 18pt; margin: 0 0 12pt; padding-bottom: 6pt; border-bottom: 2px solid var(--accent); break-before: page; }
  h3 { font-size: 12.5pt; margin: 16pt 0 6pt; }
  h4 { font-size: 11pt; margin: 14pt 0 6pt; }
  p { margin: 0 0 8pt; text-align: justify; hyphens: auto; }
  a { color: var(--accent); text-decoration: none; }
  ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
  li { margin: 2pt 0; }
  hr { display: none; }
  code { font: 8.8pt "JetBrains Mono", monospace; background: var(--soft); padding: 0.5pt 3pt; border-radius: 3px; }
  pre { background: var(--soft); border: 1px solid var(--line); border-radius: 6px; padding: 8pt 10pt;
        white-space: pre-wrap; word-break: break-word; break-inside: avoid; line-height: 1.45; }
  pre code { background: none; padding: 0; font-size: 8.4pt; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0 12pt; font: 8.8pt/1.4 Inter, Arial, sans-serif; }
  th, td { border: 1px solid var(--line); padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 600; }
  tr { break-inside: avoid; }
  img { max-width: 100%; border: 1px solid var(--line); border-radius: 6px; }
  p:has(> img) { text-align: center; break-after: avoid; margin-bottom: 4pt; }
  p.caption { text-align: center; font-size: 9pt; color: var(--muted); margin-bottom: 14pt; }
  .mermaid { display: flex; justify-content: center; margin: 8pt 0 12pt; break-inside: avoid; }
  .mermaid svg { max-width: 100%; max-height: 140mm; height: auto; }
  /* Les libellés Mermaid sont des <p> : ils ne suivent pas le style des paragraphes du rapport. */
  .mermaid p { margin: 0; text-align: center; hyphens: none; line-height: 1.5; }
  .cover { height: 225mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
  .cover h1 { font-size: 26pt; margin: 0 0 18pt; }
  .cover h1 .eyebrow { display: block; font-size: 11pt; font-weight: 600; letter-spacing: 0.12em;
                       text-transform: uppercase; color: var(--accent); margin-bottom: 8pt; }
  .cover p { text-align: left; font-size: 10.5pt; color: var(--muted); line-height: 1.9; }
  .cover strong { color: var(--text); }
  .cover img { margin-top: 18pt; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12); }
  .toc { break-after: page; }
  .toc h2 { break-before: auto; }
  .toc ul { list-style: none; padding: 0; margin: 0; }
  .toc li.chapter { font-weight: 600; margin-top: 7pt; }
  .toc li.section { padding-left: 16pt; font-size: 9.5pt; margin: 1.5pt 0; }
  .toc a { color: var(--text); }
`;

// Exécuté dans la page : Markdown -> HTML, page de garde, sommaire, diagrammes.
async function buildReport({ markdown, cover }) {
  const main = document.getElementById("report");
  main.innerHTML = window.marked.parse(markdown, { gfm: true });

  const coverSection = document.createElement("section");
  coverSection.className = "cover";
  const firstRule = main.querySelector("hr");
  while (main.firstChild && main.firstChild !== firstRule) coverSection.appendChild(main.firstChild);
  firstRule?.remove();
  const title = coverSection.querySelector("h1");
  if (title?.textContent.includes(" — ")) {
    const [eyebrow, rest] = title.textContent.split(" — ");
    title.innerHTML = `<span class="eyebrow">${eyebrow}</span>${rest}`;
  }
  if (cover) {
    const image = document.createElement("img");
    image.src = cover;
    image.alt = "Page d'accueil de l'application";
    coverSection.appendChild(image);
  }

  const items = [...main.querySelectorAll("h2, h3")].map((heading, index) => {
    heading.id = `section-${index}`;
    const kind = heading.tagName === "H2" ? "chapter" : "section";
    return `<li class="${kind}"><a href="#${heading.id}">${heading.textContent}</a></li>`;
  });
  const toc = document.createElement("nav");
  toc.className = "toc";
  toc.innerHTML = `<h2>Sommaire</h2><ul>${items.join("")}</ul>`;
  main.prepend(coverSection, toc);

  main.querySelectorAll("p").forEach((paragraph) => {
    const only = paragraph.children.length === 1 && paragraph.firstElementChild;
    if (only?.tagName === "EM" && paragraph.textContent.trim().startsWith("Figure")) {
      paragraph.classList.add("caption");
    }
  });

  main.querySelectorAll("pre code.language-mermaid").forEach((code) => {
    const diagram = document.createElement("div");
    diagram.className = "mermaid";
    diagram.textContent = code.textContent;
    code.parentElement.replaceWith(diagram);
  });
  // Les diagrammes mesurent leurs textes : la police doit être chargée avant,
  // sinon les libellés débordent de leurs boîtes.
  await document.fonts.load("14px Inter");
  await document.fonts.ready;
  const mermaid = window.mermaid.initialize ? window.mermaid : window.mermaid.default;
  mermaid.initialize({ startOnLoad: false, theme: "neutral", fontFamily: "Inter, Arial, sans-serif" });
  await mermaid.run({ querySelector: ".mermaid" });
}

const FOOTER = `
  <div style="width:100%; font: 7.5pt Arial, sans-serif; color:#64748b; padding: 0 18mm; display:flex; justify-content:space-between;">
    <span>Plateforme de financement participatif sur blockchain — rapport de projet</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

async function main() {
  const markdown = inlineImages(fs.readFileSync(source, "utf8"));
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
  <style>${CSS}</style>
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
</head>
<body><main id="report"></main></body>
</html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(buildReport, { markdown, cover: dataUri(coverImage) });
    await page.pdf({
      path: output,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: FOOTER,
      margin: { top: "18mm", bottom: "20mm", left: "18mm", right: "18mm" },
    });
    console.log(`PDF du rapport : ${path.relative(root, output)}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("❌ Export du rapport impossible :", error.message);
  process.exit(1);
});
