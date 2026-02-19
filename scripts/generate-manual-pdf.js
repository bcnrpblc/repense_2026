#!/usr/bin/env node
/**
 * Gera PDF a partir do Manual do Facilitador (Manual_Facilitador_HTML.html).
 * Usa Puppeteer para renderizar o HTML com suporte a @page, quebras de página e estilos de impressão.
 *
 * Uso: npm run manual:pdf
 *      ou: node scripts/generate-manual-pdf.js
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(PROJECT_ROOT, 'Manual_Facilitador_HTML.html');
const PDF_PATH = path.join(PROJECT_ROOT, 'Manual_Facilitador.pdf');

async function main() {
  if (!fs.existsSync(HTML_PATH)) {
    console.error('Arquivo não encontrado:', HTML_PATH);
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('Puppeteer não encontrado. Instale com: npm install -D puppeteer');
    process.exit(1);
  }

  const normalizedPath = HTML_PATH.replace(/\\/g, '/');
  const htmlUrl = normalizedPath.startsWith('/') ? 'file://' + normalizedPath : 'file:///' + normalizedPath;
  console.log('Abrindo:', HTML_PATH);
  console.log('Gerando PDF...');

  const baseOptions = { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] };
  const systemPaths = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome'];

  let browser;
  let lastError;

  for (let i = 0; i <= systemPaths.length; i++) {
    const executablePath = i === 0 ? undefined : systemPaths[i - 1];
    if (executablePath && !fs.existsSync(executablePath)) continue;
    const launchOptions = { ...baseOptions };
    if (executablePath) launchOptions.executablePath = executablePath;

    try {
      browser = await puppeteer.launch(launchOptions);
      if (executablePath) {
        console.log('Usando navegador do sistema:', executablePath);
      }
      break;
    } catch (err) {
      lastError = err;
      if (i === systemPaths.length) {
        console.error('Falha ao iniciar o navegador.');
        console.error(lastError.message);
        if (lastError.message && lastError.message.includes('libnspr4')) {
          console.error('\nDica: libnspr4 é uma biblioteca do sistema (Linux), não um pacote npm.');
          console.error('Instale com: sudo apt-get install -y libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2');
          console.error('Ou instale o Chromium: sudo apt-get install -y chromium-browser');
        }
        process.exit(1);
      }
    }
  }

  try {
    const page = await browser.newPage();

    await page.goto(htmlUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.pdf({
      path: PDF_PATH,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });
  } finally {
    await browser.close();
  }

  console.log('PDF salvo em:', PDF_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
