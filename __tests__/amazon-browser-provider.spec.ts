import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AmazonBrowserProvider } from "../src/index"

const mocks = vi.hoisted(() => ({
    constructed: [] as unknown[][],
    use: vi.fn(),
    launch: vi.fn(),
}))

vi.mock("puppeteer-extra", () => ({
    PuppeteerExtra: class {
        constructor(...args: unknown[]) {
            mocks.constructed.push(args)
        }
        use = mocks.use
        launch = mocks.launch
    },
}))
vi.mock("@mihnea.dev/puppeteer-extra-amazon-captcha", () => ({ default: () => "captcha-plugin" }))
vi.mock("puppeteer-extra-plugin-stealth", () => ({ default: () => "stealth-plugin" }))
vi.mock("../src/utils/require-vanilla-puppeteer.util", () => ({
    requireVanillaPuppeteer: () => ["vanilla", undefined],
}))
vi.mock("../src/utils/browser.util", () => ({ getBrowserPath: () => "/fake/chrome" }))

const PRODUCT_URL = "https://www.amazon.com.br/Produto/dp/B07PPDN1S1/ref=sr_1_1?keywords=x"
const CLEAN_URL = "https://www.amazon.com.br/Produto/dp/B07PPDN1S1"
const API = "https://www.amazon.com.br/associates/sitestripe/getShortUrl"
const GET_LINK = "#amzn-ss-get-link-button"
const COPY_LINK = "#amzn-ss-copy-affiliate-link-btn-announce"
const TEXTAREA = "#amzn-ss-text-shortlink-textarea"

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void }

function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

const apiResponse = (body: unknown, { url = API, status = 200, jsonFails = false } = {}) => ({
    url: () => url,
    status: () => status,
    json: jsonFails ? async () => Promise.reject(new Error("bad json")) : async () => body,
})

function makeElement(onClick?: () => void, clickFails = false) {
    return {
        click: vi.fn(async () => {
            if (clickFails) throw new Error("not clickable")
            onClick?.()
        }),
    }
}

function makePage() {
    const api = deferred<unknown>()
    const page = {
        goto: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        waitForResponse: vi.fn(() => api.promise),
        $: vi.fn().mockResolvedValue(null) as ReturnType<typeof vi.fn>,
        evaluate: vi.fn(async (fn: (...args: unknown[]) => unknown, ...args: unknown[]) => fn(...args)) as ReturnType<
            typeof vi.fn
        >,
    }
    return { page, api }
}

function makeBrowser(page: unknown) {
    return { newPage: vi.fn().mockResolvedValue(page), setCookie: vi.fn(), close: vi.fn() }
}

function setup(options: Partial<ConstructorParameters<typeof AmazonBrowserProvider>[0]> = {}) {
    const { page, api } = makePage()
    const browser = makeBrowser(page)
    mocks.launch.mockResolvedValue(browser)
    const provider = new AmazonBrowserProvider({ cookies: [], ...options })
    return { provider, page, api, browser }
}

async function run<T>(promise: Promise<T>) {
    const settled = promise.then(
        (value) => ({ value }),
        (error) => ({ error }),
    )
    await vi.runAllTimersAsync()
    return settled
}

beforeEach(() => {
    vi.useFakeTimers()
    mocks.constructed.length = 0
    mocks.use.mockReset()
    mocks.launch.mockReset()
})

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe("AmazonBrowserProvider setup", () => {
    it("registers the plugins and exposes its domains", () => {
        const { provider } = setup()

        expect(mocks.constructed[0]).toEqual(["vanilla", undefined])
        expect(mocks.use).toHaveBeenCalledWith("captcha-plugin")
        expect(mocks.use).toHaveBeenCalledWith("stealth-plugin")
        expect(provider.name).toBe("Amazon Browser Provider")
        expect(provider.supportsUrl("https://amzn.to/abc")).toBe(true)
        expect(provider.supportsUrl("https://example.com")).toBe(false)
    })

    it("createAffiliateUrlWithTag appends the tag to the clean url", () => {
        const { provider } = setup()

        expect(provider.createAffiliateUrlWithTag(PRODUCT_URL, "minha-tag-20")).toBe(`${CLEAN_URL}?tag=minha-tag-20`)
    })
})

describe("private helpers", () => {
    it("tryBypassCaptcha clicks the submit button and swallows errors", async () => {
        const { provider, page } = setup()

        await (provider as any).tryBypassCaptcha(page)
        expect(page.click).toHaveBeenCalledWith("button[type='submit']")

        page.waitForSelector.mockRejectedValueOnce(new Error("none"))
        await expect((provider as any).tryBypassCaptcha(page)).resolves.toBeUndefined()
    })

    it("tryWaitForApiResponse waits for the sitestripe response and swallows errors", async () => {
        const { provider, page, api } = setup()
        api.resolve(undefined)

        await (provider as any).tryWaitForApiResponse(page)
        const predicate = page.waitForResponse.mock.calls[0][0] as (r: { url: () => string }) => boolean
        expect(predicate({ url: () => API })).toBe(true)
        expect(predicate({ url: () => "https://other" })).toBe(false)

        page.waitForResponse.mockImplementationOnce(() => Promise.reject(new Error("timeout")))
        await expect((provider as any).tryWaitForApiResponse(page)).resolves.toBeUndefined()
    })

    describe("clickSingleButton", () => {
        it("clicks the element", async () => {
            const { provider, page } = setup()
            const el = makeElement()
            page.$.mockResolvedValue(el)

            await expect((provider as any).clickSingleButton(page, GET_LINK)).resolves.toBe(true)
            expect(el.click).toHaveBeenCalled()
        })

        it("falls back to a DOM click when the element click fails", async () => {
            const { provider, page } = setup()
            const target = { click: vi.fn() }
            vi.stubGlobal("document", { querySelector: vi.fn(() => target) })
            page.$.mockResolvedValue(makeElement(undefined, true))

            await expect((provider as any).clickSingleButton(page, GET_LINK)).resolves.toBe(true)
            expect(target.click).toHaveBeenCalled()
        })

        it("tolerates a missing DOM target in the fallback", async () => {
            const { provider, page } = setup()
            vi.stubGlobal("document", { querySelector: vi.fn(() => null) })
            page.$.mockResolvedValue(makeElement(undefined, true))

            await expect((provider as any).clickSingleButton(page, GET_LINK)).resolves.toBe(true)
        })

        it("returns false when the element does not exist", async () => {
            const { provider, page } = setup()

            await expect((provider as any).clickSingleButton(page, GET_LINK)).resolves.toBe(false)
        })

        it("returns false when the lookup throws", async () => {
            const { provider, page } = setup()
            page.$.mockRejectedValue(new Error("detached"))

            await expect((provider as any).clickSingleButton(page, GET_LINK)).resolves.toBe(false)
        })
    })
})

describe("createAffiliateUrl", () => {
    it("launches the browser with the default options merged with the user options", async () => {
        const { provider, page, api, browser } = setup({ puppeteer: { headless: false } })
        api.resolve(apiResponse({ shortUrl: "https://amzn.to/abc" }))
        page.$.mockResolvedValue(makeElement())

        await run(provider.createAffiliateUrl(PRODUCT_URL))

        const launchOptions = mocks.launch.mock.calls[0][0]
        expect(launchOptions).toMatchObject({
            headless: false,
            executablePath: "/fake/chrome",
            defaultViewport: null,
        })
        expect(launchOptions.args).toContain("--no-sandbox")
        expect(browser.close).toHaveBeenCalled()
    })

    it("sets cookies only when provided", async () => {
        const cookies = [{ name: "session", value: "1" }]
        const withCookies = setup({ cookies })
        withCookies.api.resolve(apiResponse({ shortUrl: "https://amzn.to/abc" }))
        await run(withCookies.provider.createAffiliateUrl(PRODUCT_URL))
        expect(withCookies.browser.setCookie).toHaveBeenCalledWith(...cookies)

        const withoutCookies = setup({ cookies: [] })
        withoutCookies.api.resolve(apiResponse({ shortUrl: "https://amzn.to/abc" }))
        await run(withoutCookies.provider.createAffiliateUrl(PRODUCT_URL))
        expect(withoutCookies.browser.setCookie).not.toHaveBeenCalled()

        const undefinedCookies = setup({ cookies: undefined })
        undefinedCookies.api.resolve(apiResponse({ shortUrl: "https://amzn.to/abc" }))
        await run(undefinedCookies.provider.createAffiliateUrl(PRODUCT_URL))
        expect(undefinedCookies.browser.setCookie).not.toHaveBeenCalled()
    })

    it("returns the short url from the api response and filters responses by url and status", async () => {
        const { provider, page, api } = setup()
        api.resolve(apiResponse({ shortUrl: "  https://amzn.to/abc  " }))

        const result = await run(provider.createAffiliateUrl(PRODUCT_URL))

        expect(result).toEqual({ value: "https://amzn.to/abc" })
        expect(page.goto).toHaveBeenCalledWith(CLEAN_URL, { waitUntil: "domcontentloaded" })
        expect(page.waitForSelector).toHaveBeenCalledWith(`${GET_LINK}, ${COPY_LINK}`, { timeout: 15000 })

        const predicate = page.waitForResponse.mock.calls[0][0] as (r: unknown) => boolean
        expect(predicate(apiResponse({}))).toBe(true)
        expect(predicate(apiResponse({}, { status: 500 }))).toBe(false)
        expect(predicate(apiResponse({}, { url: "https://other" }))).toBe(false)
    })

    it("uses the long url when there is no short url", async () => {
        const { provider, api } = setup()
        api.resolve(apiResponse({ longUrl: "https://www.amazon.com.br/dp/B07PPDN1S1?tag=x" }))

        await expect(run(provider.createAffiliateUrl(PRODUCT_URL))).resolves.toEqual({
            value: "https://www.amazon.com.br/dp/B07PPDN1S1?tag=x",
        })
    })

    it("clicks the copy button when the first click yields no link in time", async () => {
        const { provider, page, api } = setup()
        const copyEl = makeElement(() => api.resolve(apiResponse({ shortUrl: "https://amzn.to/second" })))
        page.$.mockImplementation(async (selector: string) => (selector === COPY_LINK ? copyEl : makeElement()))

        const result = await run(provider.createAffiliateUrl(PRODUCT_URL))

        expect(result).toEqual({ value: "https://amzn.to/second" })
        expect(copyEl.click).toHaveBeenCalled()
    })

    describe("when the api never provides a link", () => {
        const textarea = (value: string | null, text: string | null = null) => {
            vi.stubGlobal("document", {
                querySelector: vi.fn(() => (value === null && text === null ? null : { textContent: text, value })),
            })
        }

        it.each([
            ["an api response without urls", () => apiResponse({})],
            ["an invalid json body", () => apiResponse({}, { jsonFails: true })],
        ])("reads the link from the textarea after %s", async (_name, response) => {
            const { provider, page, api } = setup()
            api.resolve(response())
            textarea(null, "  https://amzn.to/from-text  ")

            await expect(run(provider.createAffiliateUrl(PRODUCT_URL))).resolves.toEqual({
                value: "https://amzn.to/from-text",
            })
            expect(page.waitForSelector).toHaveBeenCalledWith(TEXTAREA, { timeout: 5000, visible: true })
        })

        it("falls back to the textarea value when there is no text content", async () => {
            const { provider, api } = setup()
            api.resolve(null)
            textarea("https://amzn.to/from-value", "")

            await expect(run(provider.createAffiliateUrl(PRODUCT_URL))).resolves.toEqual({
                value: "https://amzn.to/from-value",
            })
        })

        it("fails when the api request itself fails and the textarea is empty", async () => {
            const { provider, api, browser } = setup()
            api.reject(new Error("timeout"))
            textarea("", "")

            const result = (await run(provider.createAffiliateUrl(PRODUCT_URL))) as { error: Error }

            expect(result.error.message).toBe("Failed to create Amazon affiliate URL")
            expect(browser.close).toHaveBeenCalled()
        })

        it("fails when the textarea does not exist", async () => {
            const { provider, page, api } = setup()
            api.resolve(null)
            textarea(null, null)
            page.waitForSelector.mockImplementation(async (selector: string) => {
                if (selector === TEXTAREA) throw new Error("not found")
            })

            const result = (await run(provider.createAffiliateUrl(PRODUCT_URL))) as { error: Error }

            expect(result.error.message).toBe("Failed to create Amazon affiliate URL")
        })

        it("fails when the textarea element is missing from the page", async () => {
            const { provider, api } = setup()
            api.resolve(null)
            textarea(null, null)

            const result = (await run(provider.createAffiliateUrl(PRODUCT_URL))) as { error: Error }

            expect(result.error.message).toBe("Failed to create Amazon affiliate URL")
        })
    })

    it("closes the browser and rethrows when navigation fails", async () => {
        const { provider, page, browser } = setup()
        page.goto.mockRejectedValue(new Error("net::ERR"))

        const result = (await run(provider.createAffiliateUrl(PRODUCT_URL))) as { error: Error }

        expect(result.error.message).toBe("net::ERR")
        expect(browser.close).toHaveBeenCalled()
    })
})
