/**
 * Тонкая обёртка над Яндекс Метрикой.
 *
 * - initYM() — поднимает счётчик при старте приложения, читает counter ID
 *   из VITE_YM_COUNTER_ID. В dev-сборке без этой переменной — все вызовы
 *   no-op, никаких ошибок.
 * - track(event, params) — кастомное событие («reachGoal» в терминах Метрики).
 * - hit(url) — pageview для SPA-роутинга (HashRouter не триггерит метрику сам).
 * - setUser(userId, params) — привязывает события к Telegram-юзеру и его тарифу.
 *
 * События, на которых строится funnel — см. константы в EVT.
 */

declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...args: unknown[]) => void
  }
}

// Counter ID Яндекс Метрики. Дефолт — наш прод-счётчик 109105326.
// VITE_YM_COUNTER_ID может переопределить его (например, поставить 0
// чтобы выключить метрику локально или указать тестовый счётчик).
const COUNTER_ID = Number(import.meta.env.VITE_YM_COUNTER_ID ?? 109105326) || 0

let initialized = false

export function initYM() {
  if (initialized) return
  if (!COUNTER_ID || typeof window.ym !== 'function') {
    // Метрика отключена (dev) или скрипт не успел загрузиться — молчим.
    return
  }
  window.ym(COUNTER_ID, 'init', {
    defer: false,
    accurateTrackBounce: true,
    trackLinks: true,
    webvisor: false,
  })
  initialized = true
}

/** Реджистрит pageview при смене hash-роута (HashRouter не делает это сам). */
export function hit(url: string) {
  if (!COUNTER_ID || typeof window.ym !== 'function') return
  window.ym(COUNTER_ID, 'hit', url)
}

/** Кастомное событие (reachGoal). params появятся в отчёте «Параметры визитов». */
export function track(event: keyof typeof EVT | string, params?: Record<string, unknown>) {
  if (!COUNTER_ID || typeof window.ym !== 'function') return
  if (params) {
    window.ym(COUNTER_ID, 'reachGoal', event, params)
  } else {
    window.ym(COUNTER_ID, 'reachGoal', event)
  }
}

/**
 * Привязывает текущую сессию к Telegram-юзеру.
 * userParams — поля плана, paid, perspective и т.п.
 * userParams появляются в отчёте «Параметры посетителей».
 */
export function setUser(userId: number | string, userParams?: Record<string, unknown>) {
  if (!COUNTER_ID || typeof window.ym !== 'function') return
  window.ym(COUNTER_ID, 'setUserID', String(userId))
  if (userParams) {
    window.ym(COUNTER_ID, 'userParams', userParams)
  }
}

/** Каталог событий — единый источник правды.
 *  Когда добавляешь новое событие — заводи константу здесь и используй
 *  в коде через EVT.X, чтобы не было опечаток. */
export const EVT = {
  app_open:                 'app_open',
  welcome_seen:             'welcome_seen',
  welcome_completed:        'welcome_completed',

  review_file_picked:       'review_file_picked',
  review_perspective_picked:'review_perspective_picked',
  review_submitted:         'review_submitted',
  review_result_shown:      'review_result_shown',
  review_failed:            'review_failed',

  letter_clicked:           'letter_clicked',
  letter_copied:            'letter_copied',
  pdf_clicked:              'pdf_clicked',

  generate_opened:          'generate_opened',
  generate_template_picked: 'generate_template_picked',
  generate_submitted:       'generate_submitted',
  generate_docx_sent:       'generate_docx_sent',

  explain_opened:           'explain_opened',
  explain_submitted:        'explain_submitted',

  subscribe_opened:         'subscribe_opened',
  subscribe_plan_picked:    'subscribe_plan_picked',
  subscribe_paid:           'subscribe_paid',
  subscribe_cancelled:      'subscribe_cancelled',

  etalons_opened:           'etalons_opened',
  etalon_uploaded:          'etalon_uploaded',
  etalon_removed:           'etalon_removed',

  referral_attributed:      'referral_attributed',
  referral_link_copied:     'referral_link_copied',
} as const
