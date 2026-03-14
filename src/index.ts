import AmazonCaptchaPlugin from "@mihnea.dev/puppeteer-extra-amazon-captcha"
import { PuppeteerExtra, VanillaPuppeteer } from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { Page } from "puppeteer"

import { AffiliateProvider } from "@afilimax/core"

import { removeQueryParams, requireVanillaPuppeteer, getBrowserPath } from "./utils"

export type AmazonBrowserProviderOptions = {
    cookies: any[]
    puppeteer?: Parameters<VanillaPuppeteer["launch"]>[0]
}

export class AmazonBrowserProvider extends AffiliateProvider<AmazonBrowserProviderOptions> {
    name = "Amazon Browser Provider"

    private readonly puppeteer: PuppeteerExtra

    constructor(options: AmazonBrowserProviderOptions) {
        super(options)
        this.puppeteer = new PuppeteerExtra(...requireVanillaPuppeteer())
        this.puppeteer.use(AmazonCaptchaPlugin())
        this.puppeteer.use(StealthPlugin())
    }

    readonly domains = ["amazon.com.br", "a.co", "amzn.to"]

    private async tryBypassCaptcha(page: Page) {
        try {
            await page.waitForSelector("button[type='submit']", { timeout: 3000 })
            await page.click("button[type='submit']")
        } catch {}
    }

    private async tryWaitForApiResponse(page: Page) {
        try {
            await page.waitForResponse(
                (response) => response.url().includes("amazon.com.br/associates/sitestripe/getShortUrl"),
                { timeout: 6000 },
            )
        } catch {}
    }

    async createAffiliateUrl(url: string): Promise<string> {
        const browser = await this.puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu",
                "--start-maximized",
            ],
            defaultViewport: null,
            executablePath: getBrowserPath(),
            ...this.options.puppeteer,
        })

        try {
            const cleanUrl = removeQueryParams(url)
            const page = await browser.newPage()

            if (this.options.cookies && this.options.cookies.length > 0) {
                await browser.setCookie(...this.options.cookies)
            }

            await page.goto(cleanUrl, { waitUntil: "domcontentloaded" })

            await this.tryBypassCaptcha(page)

            await page.waitForSelector("#amzn-ss-get-link-button", { timeout: 12000 })
            await page.click("#amzn-ss-get-link-button")

            await this.tryWaitForApiResponse(page)

            await page.waitForSelector("#amzn-ss-text-shortlink-textarea", { timeout: 12000, visible: true })

            const affiliateUrl = await page.evaluate(
                () =>
                    document.querySelector("#amzn-ss-text-shortlink-textarea")?.textContent ||
                    (document.querySelector("#amzn-ss-text-shortlink-textarea") as HTMLTextAreaElement)?.value,
            )

            if (!affiliateUrl) {
                throw new Error("Failed to create Amazon affiliate URL")
            }

            return affiliateUrl.trim()
        } catch (error) {
            throw error
        } finally {
            await browser.close()
        }
    }

    createAffiliateUrlWithTag(url: string, tag: string) {
        const cleanUrl = removeQueryParams(url)
        return `${cleanUrl}?tag=${tag}`
    }
}
