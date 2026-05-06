/**
 * Тонкая обёртка над window.Telegram.WebApp.
 *
 * Когда мини-апп открывается из чата, Telegram инжектит глобальный
 * объект `Telegram.WebApp` со всем API. При локальной разработке
 * (npm run dev в браузере) этого объекта нет — поэтому везде делаем
 * безопасные fallback'и.
 *
 * Документация: https://core.telegram.org/bots/webapps
 */

interface TelegramWebAppUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe?: {
    user?: TelegramWebAppUser
    auth_date?: number
    hash?: string
    start_param?: string
  }
  themeParams: TelegramThemeParams
  colorScheme: 'light' | 'dark'
  version: string
  platform: string
  ready: () => void
  expand: () => void
  close: () => void
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  showAlert: (msg: string) => void
  showConfirm: (msg: string, cb: (ok: boolean) => void) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

/** Возвращает true если приложение реально открыто из Telegram. */
export function isInTelegram(): boolean {
  const tg = getTelegramWebApp()
  return !!tg && !!tg.initData
}

/** initData строкой — для X-Telegram-Init-Data заголовка к нашему API. */
export function getInitData(): string {
  const tg = getTelegramWebApp()
  // В dev (без TG) шлём пустую строку — наш API ответит 401, это норма
  return tg?.initData ?? ''
}

export function getCurrentUser(): TelegramWebAppUser | null {
  const tg = getTelegramWebApp()
  return tg?.initDataUnsafe?.user ?? null
}

/** Лёгкая вибрация на тапе по кнопке. На веб-версии TG молча игнорится. */
export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  const tg = getTelegramWebApp()
  tg?.HapticFeedback?.impactOccurred(style)
}

/** Дружественный alert через нативный TG-диалог если есть, иначе window.alert */
export function showAlert(msg: string) {
  const tg = getTelegramWebApp()
  if (tg?.showAlert) tg.showAlert(msg)
  else alert(msg)
}

/** Telegram-WebApp занимает всю высоту экрана в чате (без свайпа закрытия) */
export function expandViewport() {
  const tg = getTelegramWebApp()
  tg?.expand()
}

/** Сообщает Telegram что приложение готово — убирает лоадер */
export function ready() {
  const tg = getTelegramWebApp()
  tg?.ready()
}
