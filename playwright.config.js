import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 30_000, workers: 1,
  reporter: [['list'], ['json', { outputFile: 'qa/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] },
    reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 }
  },
  webServer: { command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory dist', url: 'http://127.0.0.1:4173', reuseExistingServer: false, stdout: 'ignore', stderr: 'ignore' }
});
