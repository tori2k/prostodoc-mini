/**
 * Клиент HTTP-API ProstoDoc.
 * Бэкенд: https://prostodoc-api.kirillbaryev.ru (Cloudflare Tunnel → VPS).
 *
 * Все запросы шлют X-Telegram-Init-Data из window.Telegram.WebApp.initData
 * для авторизации. Ответы на 401 значат «вне Telegram» или протух initData.
 */
import { getInitData } from './telegram'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? 'https://prostodoc-api.kirillbaryev.ru'

class ApiError extends Error {
  status: number
  detail?: unknown
  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('X-Telegram-Init-Data', getInitData())

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    let detail: unknown
    try { detail = await res.json() } catch {}
    throw new ApiError(res.status, res.statusText, detail)
  }

  return res.json() as Promise<T>
}

// ─── Типы ответов ──────────────────────────────────────────────────────

export interface MeResponse {
  user_id: number
  tg: { id: number; first_name: string; last_name?: string; username?: string }
  plan: 'free' | 'basic' | 'pro' | 'lawyer'
  is_paid: boolean
  limits: { review: number; generate: number; explain?: number }
  // explain сейчас не лимитируется — может прийти null
  remaining: { review: number; generate: number; explain: number | null }
  // Реферальные бонусы сверх лимита плана. По умолчанию 0/0.
  bonus?: { review: number; generate: number }
  // Включены ли push-уведомления от бота (рассылки + AI-finished).
  notifications_enabled?: boolean
}

export interface ReferralInfo {
  link: string
  invited: number
  bonus_review: number
  bonus_generate: number
  is_partner: boolean
  reward_per_invite: { review: number; generate: number }
}

export interface HistoryItem {
  ts: string
  action: 'review' | 'generate' | 'explain'
  title: string
  summary?: string
}

export interface HistoryResponse {
  items: HistoryItem[]
}

export interface Etalon {
  idx: number
  name: string
  length: number
}

export interface TemplateField {
  key: string
  label: string
}

export interface Template {
  id: string
  name: string
  desc: string
  fields: TemplateField[]
}

// ─── Эндпоинты ─────────────────────────────────────────────────────────

export const api = {
  health:  () => request<{ status: string }>('/api/health'),
  me:      () => request<MeResponse>('/api/me'),
  history: (limit = 20) =>
    request<HistoryResponse>(`/api/history?limit=${limit}`),

  /** Загрузить договор для AI-проверки.
   *  onUploadProgress — колбэк 0..1 на прогресс upload-фазы. Используется
   *  чтобы показать реальную полоску загрузки файла; фаза AI-обработки
   *  идёт уже после 100% и контролируется отдельным шаговым stepper'ом.
   */
  reviewUpload: (
    file: File,
    perspective: string,
    onUploadProgress?: (ratio: number) => void,
  ) => {
    return new Promise<{ review_html: string; review_id: string }>((resolve, reject) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('perspective', perspective)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/api/review`)
      xhr.setRequestHeader('X-Telegram-Init-Data', getInitData())

      if (onUploadProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onUploadProgress(e.loaded / e.total)
          }
        })
        // upload завершился — 100%, дальше серверная обработка
        xhr.upload.addEventListener('load', () => onUploadProgress(1))
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch (e) {
            reject(new ApiError(xhr.status, 'Invalid JSON'))
          }
        } else {
          let detail: unknown
          try { detail = JSON.parse(xhr.responseText) } catch {}
          reject(new ApiError(xhr.status, xhr.statusText, detail))
        }
      }
      xhr.onerror = () => reject(new ApiError(0, 'Network error'))
      xhr.send(fd)
    })
  },

  /** Сгенерировать письмо контрагенту по review_id. */
  letter: (reviewId: string) =>
    request<{ letter: string }>('/api/letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId }),
    }),

  /** Объяснить произвольный пункт договора. */
  explain: (clause: string) =>
    request<{ explanation: string }>('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clause }),
    }),

  /** Скачать PDF-отчёт по review_id (blob — для desktop). */
  reviewPdf: async (reviewId: string): Promise<Blob> => {
    const headers = new Headers()
    headers.set('X-Telegram-Init-Data', getInitData())
    const res = await fetch(
      `${API_BASE}/api/review/pdf?review_id=${encodeURIComponent(reviewId)}`,
      { headers },
    )
    if (!res.ok) {
      let detail: unknown
      try { detail = await res.json() } catch {}
      throw new ApiError(res.status, res.statusText, detail)
    }
    return res.blob()
  },

  /** Прислать PDF-отчёт юзеру в чат бота (mobile-friendly). */
  reviewPdfToChat: (reviewId: string) =>
    request<{ ok: true }>('/api/review/pdf/to-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId }),
    }),

  /** Реферальная статистика и ссылка для шаринга. */
  referral: () => request<ReferralInfo>('/api/referral'),

  /** Включить/выключить push-уведомления (рассылки и AI-finished пуши). */
  notificationsToggle: (enabled: boolean) =>
    request<{ ok: true; enabled: boolean }>('/api/notifications/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }),

  /** Отправить обратную связь админу. */
  feedback: (text: string) =>
    request<{ ok: true }>('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }),

  /**
   * Удалить все данные юзера (право на забвение, ФЗ-152 ст.17).
   * confirm должно быть строго "УДАЛИТЬ" — защита от случайного клика.
   */
  accountDelete: (confirm: string) =>
    request<{ ok: true; deleted: { etalons: number; usage: boolean; logs: number; feedback: number } }>(
      '/api/account/delete',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
      },
    ),

  /** Эталоны (Pro / Lawyer). */
  etalonsList: () => request<{ items: Etalon[]; max: number }>('/api/etalons'),
  etalonsAdd: (file: File, name?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (name) fd.append('name', name)
    return request<{ ok: true; message: string; items: Etalon[] }>('/api/etalons', {
      method: 'POST',
      body: fd,
    })
  },
  etalonsRemove: (idx: number) =>
    request<{ ok: true; items: Etalon[] }>(`/api/etalons/${idx}`, {
      method: 'DELETE',
    }),

  /** Создать invoice link для оплаты тарифа звёздами. */
  subscribeInvoice: (plan: 'basic' | 'pro' | 'lawyer') =>
    request<{ url: string; plan: string; stars: number }>('/api/subscribe/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    }),

  /** Список шаблонов для конструктора. */
  templates: () => request<{ templates: Template[] }>('/api/templates'),

  /** Сгенерировать договор по шаблону + полям. */
  generate: (templateId: string, fields: Record<string, string>) =>
    request<{ contract_html: string; template_name: string }>('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, fields }),
    }),

  /**
   * Скачать DOCX уже сгенерированного договора (blob — для desktop).
   * Запрос идёт мимо обычного request<T>() — нужен blob, не json.
   */
  generateDocx: async (contractHtml: string, title: string): Promise<Blob> => {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.set('X-Telegram-Init-Data', getInitData())
    const res = await fetch(`${API_BASE}/api/generate/docx`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contract_html: contractHtml, title }),
    })
    if (!res.ok) {
      let detail: unknown
      try { detail = await res.json() } catch {}
      throw new ApiError(res.status, res.statusText, detail)
    }
    return res.blob()
  },

  /** Прислать DOCX готового договора в чат бота (mobile-friendly). */
  generateDocxToChat: (contractHtml: string, title: string) =>
    request<{ ok: true }>('/api/generate/docx/to-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_html: contractHtml, title }),
    }),
}

export { ApiError }
