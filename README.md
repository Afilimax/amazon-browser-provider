# @afilimax/amazon-browser-provider

[![npm version](https://img.shields.io/npm/v/@afilimax/amazon-browser-provider.svg)](https://www.npmjs.com/package/@afilimax/amazon-browser-provider)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Este pacote é um provedor de afiliação para o ecossistema **Afilimax**, implementando a interface `AffiliateProvider` do pacote [`@afilimax/core`](https://www.npmjs.com/package/@afilimax/core). Ele é especializado em gerar links de afiliados da Amazon através de automação de navegador (Puppeteer). 

Diferente de abordagens baseadas apenas em manipulação de strings, este provedor utiliza o **Amazon SiteStripe** real para gerar links curtos (`amzn.to`), garantindo que o link seja oficial e rastreável.

## 🚀 Principais Recursos

- 🤖 **Automação com Puppeteer**: Navega como um usuário real para interagir com o SiteStripe.
- 🔗 **Links amzn.to**: Gera links curtos oficiais da Amazon.
- 🛡️ **Stealth Mode**: Utiliza `puppeteer-extra-plugin-stealth` para evitar detecção de bots.
- 🧩 **Resolução de Captcha**: Integração nativa para lidar com captchas da Amazon.
- 🍪 **Gestão de Sessão**: Suporte a cookies para manter-se logado na conta de associado.
- 🇧🇷 **Focado no Brasil**: Otimizado para `amazon.com.br`.

## 📦 Instalação

```bash
npm install @afilimax/amazon-browser-provider @afilimax/core
```

### Peer Dependencies

Este pacote requer que o `@afilimax/core` esteja instalado em seu projeto:

```bash
npm install @afilimax/core
```

## 🛠️ Como Usar

Para que o provedor consiga gerar o link através do SiteStripe, você **precisa** fornecer cookies de uma sessão válida (logada) na Amazon Associates.

```typescript
import { AmazonBrowserProvider } from "@afilimax/amazon-browser-provider";

const provider = new AmazonBrowserProvider({
  cookies: [
    // Seus cookies da Amazon aqui
    { name: "session-id", value: "...", domain: ".amazon.com.br" },
    // ...
  ],
  puppeteer: {
    headless: true, // Defina como false para debugar visualmente
  }
});

const productUrl = "https://www.amazon.com.br/dp/B07TV9B7Z3";

async function generate() {
  try {
    const affiliateUrl = await provider.createAffiliateUrl(productUrl);
    console.log("Link de Afiliado:", affiliateUrl); // Ex: https://amzn.to/3xyzABC
  } catch (error) {
    console.error("Erro ao gerar link:", error);
  }
}

generate();
```

### Uso com Tag Direta (Sem Browser)

Se você não precisar de um link curto (`amzn.to`) e quiser apenas injetar sua tag de associado na URL, pode usar o método síncrono:

```typescript
const simpleUrl = provider.createAffiliateUrlWithTag(productUrl, "minhatag-20");
console.log(simpleUrl); 
// Saída: https://www.amazon.com.br/dp/B07TV9B7Z3?tag=minhatag-20
```

## ⚙️ Configurações (`AmazonBrowserProviderOptions`)

| Opção | Tipo | Descrição |
|-------|------|-----------|
| `cookies` | `any[]` | **Obrigatório.** Lista de cookies para autenticação no Amazon Associates. |
| `puppeteer` | `LaunchOptions` | Configurações opcionais para o lançamento do Puppeteer. |

## 🔍 Domínios Suportados

O provedor identifica e processa automaticamente URLs dos seguintes domínios:
- `amazon.com.br`
- `a.co`
- `amzn.to` (para expansão/tracking)

## 🏗️ Arquitetura e Contrato

Este provedor segue rigorosamente o contrato definido em `affiliate-provider.interface.ts` do `@afilimax/core`. Ele estende a classe base abstrata `AffiliateProvider`, garantindo compatibilidade com o `AffiliateManager` para uso em cadeias de provedores.

## 🧪 Desenvolvimento

Para rodar os testes:

```bash
npm test
```

Para gerar a build:

```bash
npm run build
```

---

Feito com ❤️ por **Afilimax**.