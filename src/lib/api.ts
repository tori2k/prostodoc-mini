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

  /** Загрузить договор для AI-проверки. */
  reviewUpload: (file: File, perspective: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('perspective', perspective)
    return request<{ review_html: string }>('/api/review', {
      method: 'POST',
      body: fd,
    })
  },

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
   * Скачать DOCX уже сгенерированного договора.
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
}

export { ApiError }
