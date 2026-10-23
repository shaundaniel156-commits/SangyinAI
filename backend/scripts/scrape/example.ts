import * as cheerio from 'cheerio'
import { chromium } from 'playwright'

// Starter for scraping. Two ways to get a page:
//   1. Simple pages (content is in the HTML): fetch + Cheerio. Fast, no browser.
//   2. Interactive pages (content loaded by JavaScript, clicks, logins): Playwright drives a real browser.
// Run from backend:  npm run scrape:example
//
// Before scraping a site: check its terms and robots.txt, scrape slowly, and never collect personal data
// about children or anyone else. Prefer official downloads or APIs when a site offers them.

const USER_AGENT = 'SangyinAI-research/1.0 (education project; contact: your-email@example.com)'
const DELAY_MS = 2000

let lastRequest = 0

// A polite fetch: says who is asking and waits between requests so the site isn't overloaded.
export async function politeFetch(url: string): Promise<string> {
  const wait = lastRequest + DELAY_MS - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequest = Date.now()
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${url} replied ${res.status}`)
  return res.text()
}

// 1. Simple page: read the title, headings and links with Cheerio (CSS selectors, like jQuery).
async function simplePage(url: string) {
  const $ = cheerio.load(await politeFetch(url))
  return {
    title: $('title').text().trim(),
    headings: $('h1, h2').map((_, el) => $(el).text().trim()).get(),
    links: $('a[href]').map((_, el) => ({ text: $(el).text().trim(), href: new URL($(el).attr('href')!, url).href })).get(),
  }
}

// 2. Interactive page: open it in a headless browser, wait for it to load, then read what is on screen.
async function interactivePage(url: string) {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ userAgent: USER_AGENT })
    await page.goto(url, { waitUntil: 'networkidle' })
    return {
      title: await page.title(),
      headings: await page.locator('h1, h2').allInnerTexts(),
      paragraphs: (await page.locator('p').allInnerTexts()).map((t) => t.trim()).filter(Boolean),
    }
  } finally {
    await browser.close()
  }
}

const url = process.argv[2] ?? 'https://example.com'
console.log('Cheerio (simple page):', JSON.stringify(await simplePage(url), null, 2))
console.log('Playwright (browser):', JSON.stringify(await interactivePage(url), null, 2))
