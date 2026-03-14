import { describe, it, expect } from "vitest"
import { AmazonBrowserProvider } from "../src/index"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

describe("AmazonBrowserProvider Integration", () => {
    // Aumentamos o timeout pois automação de browser é lenta
    const TIMEOUT = 60000 

    it("should generate an affiliate link from a real product", async () => {
        const cookiesPath = path.join(__dirname, "cookies.json")
        let cookies = []

        if (existsSync(cookiesPath)) {
            cookies = JSON.parse(readFileSync(cookiesPath, "utf-8"))
        } else {
            console.warn("⚠️ cookies.json não encontrado. O teste pode falhar se o SiteStrip não aparecer para usuários deslogados.")
            // Para alguns casos o SiteStrip não aparece sem login, então o teste falharia legitimamente.
            // Se você quiser apenas testar se o browser abre, pode prosseguir, mas para o link real precisa de cookies.
        }

        const provider = new AmazonBrowserProvider({
            cookies,
            puppeteer: {
                headless: false, // Colocamos false para você ver o teste acontecendo!
            }
        })

        const productUrl = "https://www.amazon.com.br/HyperX-Teclado-Gamer-Alloy-ABNT2/dp/B07TV9B7Z3"
        
        try {
            const affiliateUrl = await provider.createAffiliateUrl(productUrl)
            console.log("✅ Link gerado:", affiliateUrl)
            
            expect(affiliateUrl).toContain("amzn.to")
        } catch (error: any) {
            console.error("❌ Falha no teste:", error.message)
            throw error
        }
    }, TIMEOUT)
})
