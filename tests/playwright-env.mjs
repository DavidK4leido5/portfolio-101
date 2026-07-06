import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export function resolveUserBrowsersPath() {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return join(process.env.LOCALAPPDATA, 'ms-playwright')
  }
  return join(homedir(), '.cache', 'ms-playwright')
}

/** Prefer the real user cache over Cursor sandbox temp so Chromium isn't re-downloaded. */
export function useUserBrowsersCache() {
  const cache = resolveUserBrowsersPath()
  if (existsSync(cache)) process.env.PLAYWRIGHT_BROWSERS_PATH = cache
  return cache
}

export async function loadChromium() {
  useUserBrowsersCache()
  const { chromium } = await import('playwright')
  return chromium
}
