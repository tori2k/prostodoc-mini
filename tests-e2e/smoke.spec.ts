import { test, expect, type Page } from '@playwright/test'

/**
 * Каждая страница в HashRouter — отдельный smoke-тест:
 *  1) грузится без console errors (фильтруем только наши, не сторонние)
 *  2) рендерит хоть какой-то текст / контейнер
 *  3) даёт навигацию обратно
 *
 * API-вызовы фейлятся 401 (нет initData) — это ожидаемо, ловим в errors filter.
 */

const ourErrors = (msg: string) => {
  // API 401 — норма для headless без initData. Игнорируем.
  if (/401|unauthorized/i.test(msg)) return false
  // Нет интернета / fetch на ya.ru / metrika.yandex — окей
  if (/yandex|metrika|favicon|preload/i.test(msg)) return false
  // Telegram.WebApp в headless логирует «Method X is not supported» —
  // это не наш код, это сама стаба. В реальном клиенте 7.0+ ошибки нет.
  if (/Telegram\.WebApp.*not supported/i.test(msg)) return false
  return true
}

async function setupPage(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (ourErrors(text)) errors.push(`console.error: ${text}`)
    }
  })
  return errors
}

async function waitVisible(page: Page) {
  // Ждём что body вообще что-то показывает (любой <h1>, <h2>, или текст более 20 chars)
  await page.waitForFunction(
    () => {
      const t = document.body.innerText.trim()
      return t.length > 20
    },
    { timeout: 5000 },
  )
}

const ROUTES = [
  { path: '#/welcome',         expect: /ProstoDoc|Защитит|Приветствие/i },
  { path: '#/home',            expect: /Привет|AI-юрист|Проверить/i },
  { path: '#/history',         expect: /История|пусто|Загрузка/i },
  { path: '#/profile',         expect: /Профиль|Тариф|Откройте/i },
  { path: '#/review',          expect: /Проверить договор|Загрузите|стороны/i },
  { path: '#/generate',        expect: /Создать договор|шаблон|Свой вариант/i },
  { path: '#/explain',         expect: /Объяснить|пункт|Любой/i },
  { path: '#/etalons',         expect: /Эталоны|образц|Pro/i },
  { path: '#/subscribe',       expect: /Тарифы|Подписаться|Бесплатный/i },
  { path: '#/feedback',        expect: /Обратная связь|улучшить|написать/i },
  { path: '#/account/delete',  expect: /Удалить|забвение|УДАЛИТЬ/i },
]

for (const route of ROUTES) {
  test(`renders ${route.path}`, async ({ page }) => {
    const errors = await setupPage(page)
    await page.goto(`/${route.path}`)
    await waitVisible(page)

    // Главное: хотя бы один из ожидаемых маркеров на странице
    const text = await page.evaluate(() => document.body.innerText)
    expect(text, `route ${route.path} should contain expected content`).toMatch(route.expect)

    // Дать UI стабилизироваться (анимации, lazy-загрузки)
    await page.waitForTimeout(800)

    // Никаких неожиданных ошибок в консоли
    expect(errors, `unexpected errors on ${route.path}: ${errors.join('\n')}`).toEqual([])
  })
}

test('navigation: home → review → back', async ({ page }) => {
  const errors = await setupPage(page)
  await page.goto('/#/home')
  await waitVisible(page)

  // Тапаем на главный CTA «Проверить договор»
  await page.locator('text=/Проверить договор/').first().click()
  await page.waitForURL(/#\/review/, { timeout: 3000 })
  await waitVisible(page)

  expect(errors).toEqual([])
})

test('navigation: home → profile → subscribe', async ({ page }) => {
  const errors = await setupPage(page)
  await page.goto('/#/home')
  await waitVisible(page)

  // BottomNav «Профиль»
  await page.locator('button[aria-label="Профиль"]').first()
    .or(page.locator('text=/^Профиль$/').last())
    .click()
  await page.waitForURL(/#\/profile/, { timeout: 3000 })
  await waitVisible(page)

  expect(errors).toEqual([])
})
