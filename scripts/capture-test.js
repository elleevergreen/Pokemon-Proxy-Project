const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();

  const page = await browser.newPage({
    viewport: {
      width: 816,
      height: 1056
    },
    deviceScaleFactor: 3
  });

  console.log("Opening Pokemon Proxy Project...");

  await page.goto(
    "https://elleevergreen.github.io/Pokemon-Proxy-Project/",
    {
      waitUntil: "networkidle",
      timeout: 120000
    }
  );

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  await page.waitForTimeout(5000);

  const printPages = page.locator(".print-page");
  const count = await printPages.count();

  console.log(`Found ${count} print pages.`);

  if (count === 0) {
    throw new Error("No .print-page elements were found.");
  }

  /*
   * Export-only override.
   *
   * This does NOT modify the website. It exists only inside
   * Playwright's temporary browser session.
   */
  await page.addStyleTag({
    content: `
      .print-container {
        display: block !important;
        visibility: visible !important;
      }

      .print-page {
        display: grid !important;
        visibility: visible !important;
      }
    `
  });

  const firstPage = printPages.first();

  await firstPage.waitFor({
    state: "visible",
    timeout: 10000
  });

  console.log("First print page is visible.");

  await firstPage.screenshot({
    path: "test-page.png",
    animations: "disabled"
  });

  console.log("Saved test-page.png");

  await browser.close();
})();
