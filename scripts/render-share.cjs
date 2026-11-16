// Requer Playwright/Chromium no ambiente de desenvolvimento; não participa do build.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
    await page.goto(pathToFileURL(path.join(__dirname,'share.html')).href);
    await page.screenshot({path:path.join(__dirname,'../public/share.png')});
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
