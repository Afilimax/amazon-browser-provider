"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const url_util_1 = require("../src/utils/url.util");
(0, vitest_1.describe)("URL Utilities", () => {
    (0, vitest_1.describe)("removeRefSegment", () => {
        (0, vitest_1.it)("should remove ref segment from the path", () => {
            const url = "https://www.amazon.com.br/Produto-Exemplo/dp/B07PPDN1S1/ref=sr_1_1";
            const result = (0, url_util_1.removeRefSegment)(url);
            (0, vitest_1.expect)(result).toBe("https://www.amazon.com.br/Produto-Exemplo/dp/B07PPDN1S1");
        });
        (0, vitest_1.it)("should keep other path segments", () => {
            const url = "https://www.amazon.com.br/gp/product/B07PPDN1S1/ref=as_li_ss_tl";
            const result = (0, url_util_1.removeRefSegment)(url);
            (0, vitest_1.expect)(result).toBe("https://www.amazon.com.br/gp/product/B07PPDN1S1");
        });
    });
    (0, vitest_1.describe)("removeQueryParams", () => {
        (0, vitest_1.it)("should remove all query parameters and ref segments", () => {
            const url = "https://www.amazon.com.br/dp/B07PPDN1S1/ref=sxin_17?keywords=mouse&pd_rd_i=B07PPDN1S1";
            const result = (0, url_util_1.removeQueryParams)(url);
            (0, vitest_1.expect)(result).toBe("https://www.amazon.com.br/dp/B07PPDN1S1");
        });
        (0, vitest_1.it)("should handle URLs without query parameters", () => {
            const url = "https://www.amazon.com.br/dp/B07PPDN1S1/";
            const result = (0, url_util_1.removeQueryParams)(url);
            (0, vitest_1.expect)(result).toBe("https://www.amazon.com.br/dp/B07PPDN1S1/");
        });
    });
});
