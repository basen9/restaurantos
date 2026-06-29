import { defineConfig, devices } from '@playwright/test'

// E2E zakłada uruchomiony serwer (npm run start) i zseedowaną bazę.
// Używa preinstalowanej przeglądarki (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers).
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    launchOptions: { executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
