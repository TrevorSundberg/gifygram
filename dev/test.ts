import fetch from "node-fetch";
import puppeteer from "puppeteer";

const API_HEALTH_URL = "http://0.0.0.0:3000/api/health";
const MAIN_URL = "http://0.0.0.0:8080/";

const startupPromise = (async () => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  return {browser, page};
})();

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

export const test = async () => {
  const {browser, page} = await startupPromise;

  await waitForHealth(API_HEALTH_URL);
  await waitForHealth(MAIN_URL);

  await page.goto(MAIN_URL, {waitUntil: "networkidle2"});

  await browser.close();
};
