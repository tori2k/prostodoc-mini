import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke-тесты мини-аппа на dev-сервере. Запускаются в Telegram-like
 * viewport (Pixel 7) и проверяют что:
 *   — все hash-роуты рендерятся без console errors
 *   — навигация работает
 *   — нет «обрушений» от сломанных компонентов
 *
 * НЕ проверяют API-флоу (review/generate/etc) — для этого нужен
 * валидный Telegram initData которого у нас нет в headless.
 */
export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
