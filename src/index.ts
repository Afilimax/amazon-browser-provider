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

    readonly domains = ["amazon.com.br", "a.co", "amzn.to", "link.amazon"]

    private async tryBypassCaptcha(page: Page) {
        try {
            await page.waitForSelector("button[type='submit']", { timeout: 3000 })
            await page.click("button[type='submit']")
        } catch {}
    }

    private async tryWaitForApiResponse(page: Page) {
        try {
            await page.waitForResponse(
                (response) => response.url().includes("associates/sitestripe/getShortUrl"),
                { timeout: 6000 },
            )
        } catch {}
    }

    private async clickSingleButton(page: Page, selector: string): Promise<boolean> {
        try {
            const el = await page.$(selector)
            
            if (el) {
                try {
                    await el.click()
                } catch {
                    await page.evaluate((sel) => {
                        const target = document.querySelector(sel) as HTMLElement
                        if (target) target.click()
                    }, selector)
                }
                return true
            }
        } catch {}

        return false
    }

    private async clickGetLinkButton(page: Page): Promise<boolean> {
        return this.clickSingleButton(page, "#amzn-ss-get-link-button")
    }

    private async clickCopyAffiliateLinkButton(page: Page): Promise<boolean> {
        return this.clickSingleButton(page, "#amzn-ss-copy-affiliate-link-btn-announce")
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

            const apiResponsePromise = page
                .waitForResponse(
                    (response) =>
                        response.url().includes("associates/sitestripe/getShortUrl") &&
                        response.status() === 200,
                    { timeout: 35000 },
                )
                .then(async (res) => {
                    try {
                        const data = (await res.json()) as { shortUrl?: string; longUrl?: string }
                        if (data && (data.shortUrl || data.longUrl)) {
                            return (data.shortUrl || data.longUrl) as string
                        }
                    } catch {}
                    return null
                })
                .catch(() => null)

            const waitForSelectors = "#amzn-ss-get-link-button, #amzn-ss-copy-affiliate-link-btn-announce"

            await page.waitForSelector(waitForSelectors, { timeout: 15000 })

            // 1. Clica no primeiro botão ("Obter link")
            await this.clickGetLinkButton(page)

            // Espera até 15 segundos pela resposta da API
            let affiliateUrl = await Promise.race([
                apiResponsePromise,
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
            ])

            // 2. Se não obteve o link em 15 segundos, clica no segundo botão ("Copiar link de associado")
            if (!affiliateUrl) {
                await this.clickCopyAffiliateLinkButton(page)
                affiliateUrl = await Promise.race([
                    apiResponsePromise,
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
                ])
            }

            if (!affiliateUrl) {
                try {
                    await page.waitForSelector("#amzn-ss-text-shortlink-textarea", {
                        timeout: 5000,
                        visible: true,
                    })
                    const textUrl = await page.evaluate(
                        () =>
                            document.querySelector("#amzn-ss-text-shortlink-textarea")?.textContent ||
                            (document.querySelector("#amzn-ss-text-shortlink-textarea") as HTMLTextAreaElement)?.value,
                    )
                    if (textUrl) {
                        affiliateUrl = textUrl.trim()
                    }
                } catch {}
            }

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
