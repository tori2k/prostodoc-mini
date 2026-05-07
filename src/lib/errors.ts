/**
 * Карта ошибок: переводит ApiError / Error / unknown в читабельный
 * русский текст для showAlert.
 *
 * Контекст важен: 429 при review = «лимит проверок», 429 при generate =
 * «лимит договоров». Контекст передаётся явно через context-аргумент.
 */
import { ApiError } from './api'

export type ErrorContext =
  | 'review'
  | 'generate'
  | 'explain'
  | 'letter'
  | 'pdf'
  | 'docx'
  | 'etalon'
  | 'subscribe'
  | 'feedback'
  | 'delete'
  | 'me'
  | 'history'

interface ApiErrorShape {
  status?: number
  message?: string
  detail?: { error?: string; message?: string }
  name?: string
}

const QUOTA_BY_CONTEXT: Partial<Record<ErrorContext, string>> = {
  review:   'Лимит проверок исчерпан до конца месяца. Подписка снимает ограничения.',
  generate: 'Лимит договоров исчерпан до конца месяца. Подписка снимает ограничения.',
  // explain — 429 это rate-limit, не квота
  explain:  'Слишком часто. Подождите минуту и попробуйте снова.',
}

const EXPIRED_BY_CONTEXT: Partial<Record<ErrorContext, string>> = {
  letter: 'Прошёл час с проверки — данные стёрлись из памяти. Прогоните договор ещё раз.',
  pdf:    'Прошёл час с проверки — данные стёрлись из памяти. Прогоните договор ещё раз.',
}

const SERVICE_UNAVAILABLE_BY_CONTEXT: Partial<Record<ErrorContext, string>> = {
  review:   'AI занят прямо сейчас. Попробуйте через минуту.',
  generate: 'AI занят прямо сейчас. Попробуйте через минуту.',
  letter:   'AI занят. Подождите минуту и попробуйте снова.',
  explain:  'AI занят. Попробуйте через минуту.',
}

/** Главная функция — превращает любую ошибку в строку для алерта. */
export function humanError(e: unknown, context?: ErrorContext): string {
  const err = e as ApiErrorShape
  const isApi = err?.name === 'ApiError' || (e instanceof ApiError)

  // Сетевые / неопознанные
  if (!isApi) {
    if (e instanceof Error && /network|fetch|connection/i.test(e.message)) {
      return 'Нет интернета. Проверьте связь и попробуйте снова.'
    }
    return e instanceof Error ? `Что-то пошло не так: ${e.message}` : 'Что-то пошло не так'
  }

  const status = err?.status ?? 0
  const detailMsg = err?.detail?.message
  const detailCode = err?.detail?.error

  // Специальные коды бэка важнее общих статусов
  if (detailCode === 'review_expired') {
    return EXPIRED_BY_CONTEXT[context ?? 'letter']
        ?? 'Срок хранения проверки истёк. Прогоните договор заново.'
  }
  if (detailCode === 'plan_required') {
    return detailMsg ?? 'Эта функция доступна на тарифах Pro и Юрист.'
  }
  if (detailCode === 'scan_pdf') {
    return 'Это PDF-скан без распознанного текста. Откройте в Word и сохраните как DOCX, либо пришлите текстовый PDF.'
  }
  if (detailCode === 'extract_failed') {
    return 'Не получилось прочитать файл. Возможно он повреждён или защищён паролем.'
  }
  if (detailCode === 'too_large') {
    return 'Файл слишком большой. Сократите до 20 МБ.'
  }
  if (detailCode === 'too_long') {
    return detailMsg ?? 'Слишком длинный текст.'
  }
  if (detailCode === 'empty_description') {
    return detailMsg ?? 'Опишите хотя бы пару фраз — что должно быть в договоре.'
  }
  if (detailCode === 'unknown_template') {
    return 'Шаблон не найден. Обновите приложение.'
  }
  if (detailCode === 'not_a_contract') {
    return detailMsg ?? 'Описание слишком короткое или непонятное. Уточните: тип договора, стороны, сумма, сроки.'
  }
  if (detailCode === 'rate_limited') {
    return detailMsg ?? 'Слишком часто. Подождите минуту и попробуйте снова.'
  }
  if (detailCode === 'send_failed') {
    return 'Не удалось отправить файл в чат. Откройте бота и напишите /start, затем попробуйте снова.'
  }

  // Общие статусы
  switch (status) {
    case 401:
      return 'Откройте мини-приложение из бота заново — авторизация устарела.'
    case 429:
      return QUOTA_BY_CONTEXT[context ?? 'review'] ?? 'Лимит исчерпан до конца месяца.'
    case 410:
      return EXPIRED_BY_CONTEXT[context ?? 'letter']
          ?? 'Срок хранения данных истёк, повторите действие.'
    case 503:
      return SERVICE_UNAVAILABLE_BY_CONTEXT[context ?? 'review']
          ?? 'Сервис временно недоступен. Попробуйте через минуту.'
    case 500:
      return 'Внутренняя ошибка сервера. Попробуйте ещё раз через минуту.'
    case 400:
      return detailMsg ?? 'Что-то не так с запросом. Проверьте данные и попробуйте снова.'
    case 403:
      return detailMsg ?? 'Доступ ограничен.'
    case 404:
      return 'Не найдено. Возможно, объект уже удалён.'
    case 0:
      return 'Нет интернета. Проверьте связь и попробуйте снова.'
  }

  return detailMsg ?? err?.message ?? 'Что-то пошло не так'
}
