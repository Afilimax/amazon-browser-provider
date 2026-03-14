import { executablePath } from "puppeteer"
import { existsSync } from "node:fs"
import path from "node:path"

export function getBrowserPath(): string {
    const defaultPath = executablePath()
    
    if (existsSync(defaultPath)) {
        return defaultPath
    }

    const commonPaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\Chrome\\Application\\chrome.exe",
        path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
        "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ]

    for (const p of commonPaths) {
        if (existsSync(p)) {
            return p
        }
    }

    return defaultPath // Fallback to default even if not exists, to let puppeteer throw its own error if needed
}
