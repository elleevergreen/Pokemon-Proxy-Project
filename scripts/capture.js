const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");

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
].filter(card => !card.closest(".print-container"));

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
        (PAGE_HEIGHT - CARD_HEIGHT * 3) / 2;

      for (let i = 0; i < originalCards.length; i += 9) {
        const exportPage = document.createElement("div");
        exportPage.className = "export-page";

        Object.assign(exportPage.style, {
          position: "relative",
          width: `${PAGE_WIDTH}px`,
          height: `${PAGE_HEIGHT}px`,
          background: "white",
          overflow: "hidden"
        });

        originalCards.slice(i, i + 9).forEach((card, index) => {
          const clone = card.cloneNode(true);

          const column = index % 3;
          const row = Math.floor(index / 3);

          const slot = document.createElement("div");

          Object.assign(slot.style, {
            position: "absolute",
            left: `${horizontalMargin + column * CARD_WIDTH}px`,
            top: `${verticalMargin + row * CARD_HEIGHT}px`,
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`,
            overflow: "hidden"
          });

          Object.assign(clone.style, {
            display: "block",
            position: "absolute",
            left: "0",
            top: "0",
            margin: "0",
            transformOrigin: "top left",
            transform: `scale(${scaleX}, ${scaleY})`
          });

          slot.appendChild(clone);
          exportPage.appendChild(slot);
        });

        exportRoot.appendChild(exportPage);
      }

      document.documentElement.style.margin = "0";
      document.documentElement.style.padding = "0";

      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.background = "white";

      return {
        cards: originalCards.length,
        pages: Math.ceil(originalCards.length / 9)
      };
    },
    {
      PAGE_WIDTH,
      PAGE_HEIGHT,
      CARD_WIDTH,
      CARD_HEIGHT
    }
  );

  console.log(
    `Built ${result.pages} export pages from ${result.cards} cards.`
  );

  const exportPages = page.locator(".export-page");
  const pageCount = await exportPages.count();

  for (let i = 0; i < pageCount; i++) {
    const filename =
      `page-${String(i + 1).padStart(2, "0")}.png`;

    console.log(`Capturing ${filename}...`);

    await exportPages.nth(i).screenshot({
      path: filename,
      animations: "disabled"
    });
  }

  console.log(`Finished ${pageCount} PNG pages.`);

await browser.close();

/*
 * Build the final multipage PDF.
 *
 * PDF coordinates use points:
 * 72 points = 1 inch.
 *
 * US Letter:
 * 8.5 × 11 inches
 * = 612 × 792 points
 */
console.log("Building final PDF...");

const pdf = await PDFDocument.create();

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;

for (let i = 0; i < pageCount; i++) {
  const filename =
    `page-${String(i + 1).padStart(2, "0")}.png`;

  console.log(`Adding ${filename} to PDF...`);

  const pngBytes = fs.readFileSync(filename);
  const png = await pdf.embedPng(pngBytes);

  const pdfPage = pdf.addPage([
    LETTER_WIDTH,
    LETTER_HEIGHT
  ]);

  pdfPage.drawImage(png, {
    x: 0,
    y: 0,
    width: LETTER_WIDTH,
    height: LETTER_HEIGHT
  });
}

const pdfBytes = await pdf.save();

fs.writeFileSync(
  "Pokemon-Proxy-Project.pdf",
  pdfBytes
);

console.log(
  `Saved Pokemon-Proxy-Project.pdf with ${pageCount} pages.`
);
})();
