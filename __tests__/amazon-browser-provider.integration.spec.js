"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../src/index");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
(0, vitest_1.describe)("AmazonBrowserProvider Integration", () => {
    // Aumentamos o timeout pois automação de browser é lenta
    const TIMEOUT = 60000;
    (0, vitest_1.it)("should generate an affiliate link from a real product", async () => {
        const cookiesPath = node_path_1.default.join(__dirname, "cookies.json");
        let cookies = [];
        if ((0, node_fs_1.existsSync)(cookiesPath)) {
            cookies = JSON.parse((0, node_fs_1.readFileSync)(cookiesPath, "utf-8"));
        }
        else {
            console.warn("⚠️ cookies.json não encontrado. O teste pode falhar se o SiteStrip não aparecer para usuários deslogados.");
            // Para alguns casos o SiteStrip não aparece sem login, então o teste falharia legitimamente.
            // Se você quiser apenas testar se o browser abre, pode prosseguir, mas para o link real precisa de cookies.
        }
        const provider = new index_1.AmazonBrowserProvider({
            cookies,
            puppeteer: {
                headless: false, // Colocamos false para você ver o teste acontecendo!
            }
        });
        const productUrl = "https://www.amazon.com.br/HyperX-Teclado-Gamer-Alloy-ABNT2/dp/B07TV9B7Z3";
        try {
            const affiliateUrl = await provider.createAffiliateUrl(productUrl);
            console.log("✅ Link gerado:", affiliateUrl);
            (0, vitest_1.expect)(affiliateUrl).toContain("amzn.to");
        }
        catch (error) {
            console.error("❌ Falha no teste:", error.message);
            throw error;
        }
    }, TIMEOUT);
});
