/**
 * Безопасный рендер HTML от Claude.
 *
 * AI промпты ограничивают теги до <b>, <i>, <code>, <blockquote>, <br> —
 * но это soft-правило, не контракт. Если в договоре окажется
 * <img src=x onerror=...> и Claude его процитирует — без sanitize
 * это пройдёт прямо в dangerouslySetInnerHTML и выполнится в WebView.
 *
 * DOMPurify whitelist'ит только разрешённые теги/атрибуты, всё остальное
 * вырезается. Никаких скриптов, обработчиков событий, javascript:-URL.
 */
import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'code', 'br', 'blockquote', 'p']

/** Sanitize HTML для безопасной вставки через dangerouslySetInnerHTML. */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],  // никаких атрибутов — ни class, ни style, ни onclick
    KEEP_CONTENT: true,  // если тег не разрешён — оставить текст внутри
  })
}
