<a href="https://afilimax.net"><img src="https://raw.githubusercontent.com/Afilimax/.github/main/assets/npm-banner.svg" alt="Afilimax — Encontre a oferta. Gere o link. Divulgue sozinho." width="100%" /></a>

[![npm version](https://img.shields.io/npm/v/%40afilimax%2Famazon-browser-provider?logo=npm)](https://www.npmjs.com/package/@afilimax/amazon-browser-provider)
[![npm downloads](https://img.shields.io/npm/dm/%40afilimax%2Famazon-browser-provider?logo=npm)](https://www.npmjs.com/package/@afilimax/amazon-browser-provider)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Afilimax/amazon-browser-provider/blob/HEAD/LICENSE)
[![Website](https://img.shields.io/badge/website-afilimax.net-7857FF)](https://afilimax.net)

# @afilimax/amazon-browser-provider

Provedor de links de afiliado da Amazon para o ecossistema Afilimax. O pacote automatiza o SiteStripe com Puppeteer para obter links oficiais e também permite acrescentar uma tag de associado diretamente à URL, sem abrir o navegador.

## Recursos

- Geração de links oficiais pelo Amazon SiteStripe.
- Suporte a links curtos `amzn.to` e aos demais formatos devolvidos pelo SiteStripe.
- Automação com `puppeteer-extra`, modo stealth e suporte a CAPTCHA da Amazon.
- Uso de cookies de uma sessão autenticada no Amazon Associates.
- Remoção de parâmetros e segmentos de rastreamento antes do processamento.
- Alternativa síncrona para criar URL com tag, sem iniciar o navegador.
- Compatibilidade com `AffiliateProvider` e `AffiliateManager`.

## Instalação

```bash
npm install @afilimax/amazon-browser-provider @afilimax/core
```

O `@afilimax/core` é uma dependência de par obrigatória, na versão `>=0.4.1`.

## Como usar

Forneça os cookies da sessão de associado e chame `createAffiliateUrl`:

```typescript
import { readFileSync } from "node:fs"
import { AmazonBrowserProvider } from "@afilimax/amazon-browser-provider"

const provider = new AmazonBrowserProvider({
    cookies: JSON.parse(readFileSync("cookies.json", "utf8")),
    puppeteer: {
        headless: true,
    },
})

async function main() {
    const productUrl = "https://www.amazon.com.br/dp/B07TV9B7Z3"

    try {
        const affiliateUrl = await provider.createAffiliateUrl(productUrl)
        console.log("Affiliate URL:", affiliateUrl)
    } catch (error) {
        console.error("Failed to create affiliate URL:", error)
    }
}

main()
```

Cada chamada abre e fecha um navegador. Use `puppeteer.headless: false` para acompanhar a automação durante o diagnóstico.

### Uso sem navegador

Quando o link curto não for necessário, injete apenas a tag de associado:

```typescript
const provider = new AmazonBrowserProvider({ cookies: [] })
const affiliateUrl = provider.createAffiliateUrlWithTag(
    "https://www.amazon.com.br/dp/B07TV9B7Z3",
    "your-tag-20",
)

console.log("Affiliate URL:", affiliateUrl)
```

Esse método é síncrono, remove os parâmetros existentes e não executa o SiteStripe.

### Uso com AffiliateManager

```typescript
import { AffiliateManager } from "@afilimax/core"
import { AmazonBrowserProvider } from "@afilimax/amazon-browser-provider"

const manager = new AffiliateManager([
    new AmazonBrowserProvider({
        cookies: JSON.parse(readFileSync("cookies.json", "utf8")),
    }),
])

const affiliateUrl = await manager.createAffiliateUrl("https://www.amazon.com.br/dp/B07TV9B7Z3")
console.log(affiliateUrl)
```

O gerenciador retorna `null` se nenhum provedor registrado suportar o domínio da URL.

## Configuração

A interface `AmazonBrowserProviderOptions` aceita:

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `cookies` | `any[]` | Obrigatório | Cookies exportados da sessão autenticada no Amazon Associates. |
| `puppeteer` | `LaunchOptions` | `{}` | Opções repassadas ao lançamento do Puppeteer. |

O provedor usa `headless: true`, viewport padrão nulo e argumentos de compatibilidade do Chromium. As opções informadas em `puppeteer` sobrescrevem esses padrões.

### Como obter os cookies

1. Faça login na conta usada no Amazon Associates.
2. Confirme que o SiteStripe aparece nas páginas de produto.
3. Exporte os cookies da Amazon em JSON com sua extensão de preferência.
4. Salve o arquivo fora do controle de versão e carregue-o na opção `cookies`.

Nunca publique `cookies.json`: os valores permitem reutilizar sua sessão.

## Referência da API

### `createAffiliateUrl(url: string): Promise<string>`

Abre a página limpa do produto, aplica os cookies e solicita o link pelo SiteStripe. O método lança `Failed to create Amazon affiliate URL` quando nenhum link é obtido.

### `createAffiliateUrlWithTag(url: string, tag: string): string`

Remove parâmetros de rastreamento da URL e retorna uma nova URL com `?tag=<tag>`.

### `supportsUrl(url: string): boolean`

Método herdado de `AffiliateProvider` que verifica se o host pertence aos domínios suportados.

### Domínios suportados

- `amazon.com.br`
- `a.co`
- `amzn.to`
- `link.amazon`, incluindo seus subdomínios

### Erros comuns

| Sintoma | Causa provável | Ação |
| :--- | :--- | :--- |
| `Failed to create Amazon affiliate URL` | SiteStripe indisponível, sessão expirada ou seletores não encontrados. | Renove os cookies e execute com `headless: false` para inspecionar a página. |
| CAPTCHA ou redirecionamento de login | A Amazon recusou a sessão automatizada. | Faça login manualmente, exporte novos cookies e reduza a frequência das execuções. |
| Falha ao iniciar o Chromium | Navegador ou dependências do sistema ausentes. | Configure `puppeteer.executablePath` ou instale um Chromium compatível. |

## Desenvolvimento

Instale as dependências com `npm install`. Os scripts disponíveis são:

| Comando | Finalidade |
| :--- | :--- |
| `npm run dev` | Executa `src/index.ts` com `ts-node`. |
| `npm run build` | Compila o TypeScript para `dist/`. |
| `npm test` | Executa os testes com Vitest. |
| `npm run test:watch` | Executa os testes em modo de observação. |
| `npm run test:cov` | Executa os testes com cobertura. |
| `npm run lint` | Executa o ESLint com correção automática. |
| `npm run format` | Formata os arquivos de `src/` com Prettier. |

A suíte inclui um teste de integração que abre o navegador e tenta gerar um link real. Para autenticar esse teste, coloque os cookies em `__tests__/cookies.json`. A execução depende do SiteStripe e do estado da sessão.

## Licença

Distribuído sob a licença [MIT](./LICENSE).

---

## Automatize sua operação de afiliados

> Use este pacote para automatizar sua operação de afiliados. Conheça a plataforma Afilimax e transforme ofertas em links e divulgação automática.

[Conheça a Afilimax](https://afilimax.net) · [Pacote no npm](https://www.npmjs.com/package/@afilimax/amazon-browser-provider) · [Repositório no GitHub](https://github.com/Afilimax/amazon-browser-provider)
