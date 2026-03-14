export function requireVanillaPuppeteer(): [any | undefined, Error | undefined] {
    try {
        return [require("puppeteer"), undefined]
    } catch (_) {}

    try {
        return [require("puppeteer-core"), undefined]
    } catch (err) {
        return [undefined, err as Error]
    }
}
