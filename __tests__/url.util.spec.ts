import { describe, it, expect } from "vitest"

import { removeQueryParams, removeRefSegment } from "../src/utils/url.util"

describe("URL Utilities", () => {
    describe("removeRefSegment", () => {
        it("should remove ref segment from the path", () => {
            const url = "https://www.amazon.com.br/Produto-Exemplo/dp/B07PPDN1S1/ref=sr_1_1"
            const result = removeRefSegment(url)
            expect(result).toBe("https://www.amazon.com.br/Produto-Exemplo/dp/B07PPDN1S1")
        })

        it("should keep other path segments", () => {
            const url = "https://www.amazon.com.br/gp/product/B07PPDN1S1/ref=as_li_ss_tl"
            const result = removeRefSegment(url)
            expect(result).toBe("https://www.amazon.com.br/gp/product/B07PPDN1S1")
        })
    })

    describe("removeQueryParams", () => {
        it("should remove all query parameters and ref segments", () => {
            const url = "https://www.amazon.com.br/dp/B07PPDN1S1/ref=sxin_17?keywords=mouse&pd_rd_i=B07PPDN1S1"
            const result = removeQueryParams(url)
            expect(result).toBe("https://www.amazon.com.br/dp/B07PPDN1S1")
        })

        it("should handle URLs without query parameters", () => {
            const url = "https://www.amazon.com.br/dp/B07PPDN1S1/"
            const result = removeQueryParams(url)
            expect(result).toBe("https://www.amazon.com.br/dp/B07PPDN1S1/")
        })
    })
})
