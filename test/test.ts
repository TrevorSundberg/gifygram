import fetch from "node-fetch";
import puppeteer from "puppeteer";

const API_HEALTH_URL = "http://0.0.0.0:8000/api/health";
const MAIN_URL = "http://0.0.0.0:8080/";

const waitForHealth = async (url: string) => {
  const timeoutMs = 500;
  for (;;) {
    try {
      const response = await fetch(url, {timeout: timeoutMs});
      if (response.status === 200) {
        return;
      }
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    }
  }
};

const click = async (page: puppeteer.Page, selector: string) => {
  await page.waitForSelector(selector, {visible: true});
  await page.click(selector);
};

const type = async (page: puppeteer.Page, selector: string, text: string) => {
  await page.waitForSelector(selector, {visible: true});
  await page.type(selector, text);
};

interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

interface Point {
  x: number;
  y: number;
}

const getRect = async (page: puppeteer.Page, selector: string): Promise<Rect> => {
  const elementHandle = await page.waitForSelector(selector);
  return page.evaluate((element) => {
    const {top, left, bottom, right} = element.getBoundingClientRect();
    return {top, left, bottom, right};
  }, elementHandle);
};

const getCenter = (rect: Rect): Point => ({
  x: (rect.left + rect.right) / 2,
  y: (rect.top + rect.bottom) / 2
});

(async () => {
  const browser = await puppeteer.launch({headless: false});
  try {
    const page = await browser.newPage();

    // Handle the dev login (username is test).
    page.on("dialog", async (dialog) => {
      await dialog.accept("test.user");
    });

    await waitForHealth(API_HEALTH_URL);
    await waitForHealth(MAIN_URL);

    await page.goto(MAIN_URL, {waitUntil: "networkidle2"});

    // Start creating a new animation.
    await click(page, "#create");

    await page.waitForSelector("#spinner-complete-0", {visible: true});

    // Add text to the animation.
    await click(page, "#text");
    await type(page, "#text-input", "TEST");
    await click(page, "#button-OK");

    // Move the newly created text widget to the top left (first frame).
    const widgetCenter = getCenter(await getRect(page, ".widget"));
    const widgetsRect = await getRect(page, "#widgets");
    await page.mouse.move(widgetCenter.x, widgetCenter.y);
    await page.mouse.down();
    await page.mouse.move(widgetsRect.left, widgetsRect.top);
    await page.mouse.up();

    // Move to the last frame on the animation timeline.
    const timelineRect = await getRect(page, ".videoTimeline");
    await page.mouse.click(timelineRect.right - 1, timelineRect.top);

    // Move the text widget from the top left corner to the top right corner (adds a keyframe).
    await page.mouse.move(widgetsRect.left, widgetsRect.top);
    await page.mouse.down();
    await page.mouse.move(widgetsRect.right, widgetsRect.top);
    await page.mouse.up();

    // Post and render the animation.
    await click(page, "#post");
    await type(page, "#post-title", "This title fills the room!");
    await type(page, "#post-message", "This is a test of then word wrapping or truncation features.");
    await click(page, "#button-Post");

    // When the login prompt appears click login with Google (in dev this prompts).
    await click(page, "#login-google");
  } catch (err) {
    await browser.close();
    throw err;
  }
})();
