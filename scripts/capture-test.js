const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();

  // 8.5 × 11 inches at 300 DPI
  const PAGE_WIDTH = 2550;
  const PAGE_HEIGHT = 3300;

  // 63 × 88 mm at 300 DPI
  const CARD_WIDTH = 744;
  const CARD_HEIGHT = 1039;

  const page = await browser.newPage({
    viewport: {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT
    }
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

  /*
   * Build export pages from the ORIGINAL cards.
   *
   * The website itself is not changed. Everything below happens
   * only inside this temporary Playwright browser.
   */
  const result = await page.evaluate(
    ({ PAGE_WIDTH, PAGE_HEIGHT, CARD_WIDTH, CARD_HEIGHT }) => {
      const originalCards = [
        ...document.querySelectorAll(".card:not(.noprint)")
      ];

      if (!originalCards.length) {
        throw new Error("No printable cards found.");
      }

      // Remove the site's generated print container.
      document.querySelector(".print-container")?.remove();

      // Hide everything else on the page.
      [...document.body.children].forEach(child => {
        child.style.display = "none";
      });

      const exportRoot = document.createElement("div");
      exportRoot.id = "export-root";

      Object.assign(exportRoot.style, {
        display: "block",
        width: `${PAGE_WIDTH}px`,
        margin: "0",
        padding: "0",
        background: "white"
      });

      document.body.appendChild(exportRoot);

      /*
       * Scale factor:
       *
       * Existing card CSS is physically 63mm × 88mm.
       * Chromium treats 1in as 96 CSS px, so:
       *
       * 63mm ≈ 238.11 CSS px
       * 88mm ≈ 332.60 CSS px
       *
       * We scale that screen-rendered card to its desired
       * 300-DPI raster dimensions.
       */
      const cssCardWidth = 63 / 25.4 * 96;
      const cssCardHeight = 88 / 25.4 * 96;

      const scaleX = CARD_WIDTH / cssCardWidth;
      const scaleY = CARD_HEIGHT / cssCardHeight;

      const horizontalMargin =
        (PAGE_WIDTH - CARD_WIDTH * 3) / 2;

      const verticalMargin =
        (PAGE_HEIGHT - CARD_HEIGHT * 3) /
