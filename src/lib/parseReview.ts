/**
 * Парсер review-разметки от Claude в структурированный объект.
 *
 * AI возвращает HTML вида:
 *   🎯 <b>Оценка:</b> 🟡 средние риски
 *   <b>Тип договора:</b> Договор оказания услуг
 *
 *   🔴 <b>Возврат денег при задержке более 5 дней</b>
 *   Подробное описание риска…
 *
 *   🟡 <b>Срок оплаты 30 дней</b>
 *   Описание спорного пункта…
 *
 * Парсим в три блока: meta (рейтинг + тип), risks (массив с уровнем),
 * footer (всё что после рисков — обычно рекомендации).
 */

export type RiskLevel = 'red' | 'yellow' | 'green'
export type Rating = 'red' | 'yellow' | 'green' | 'unknown'

export interface ReviewRisk {
  level: RiskLevel
  title: string
  body: string
}

export interface ParsedReview {
  rating: Rating
  ratingLabel: string
  ratingHint: string
  docType: string | null
  side: string | null
  risks: ReviewRisk[]
  footer: string
  /** raw text — для вкладки «Полный текст» если ничего не распарсилось */
  raw: string
}

const LEVEL_BY_EMOJI: Record<string, RiskLevel> = {
  '🔴': 'red',
  '🟡': 'yellow',
  '🟢': 'green',
}

const RATING_LABELS: Record<Rating, { label: string; hint: string }> = {
  red:     { label: 'Опасный',        hint: 'Подписывать в текущем виде нельзя' },
  yellow:  { label: 'Средние риски',  hint: 'Есть пункты для переговоров' },
  green:   { label: 'Безопасный',     hint: 'Серьёзных проблем нет' },
  unknown: { label: 'Проверен',       hint: 'Смотрите детали ниже' },
}

function stripHtml(s: string): string {
  return s.replace(/<\/?b>/g, '').replace(/<\/?i>/g, '').trim()
}

export function parseReview(text: string): ParsedReview {
  const raw = text || ''

  // Рейтинг
  let rating: Rating = 'unknown'
  const m = raw.match(/🎯[^🔴🟡🟢]*?([🔴🟡🟢])/)
  if (m) rating = LEVEL_BY_EMOJI[m[1]] as Rating

  // Тип договора
  const docTypeMatch = raw.match(/<b>Тип договора:<\/b>\s*([^\n<]+)/i)
  const docType = docTypeMatch ? docTypeMatch[1].trim() : null

  // Сторона
  const sideMatch = raw.match(/<b>Защищаем:<\/b>\s*([^\n<]+)/i)
  const side = sideMatch ? sideMatch[1].trim() : null

  // Риски — каждый блок начинается с emoji + <b>Заголовок</b>, потом текст до
  // следующего такого же блока или до конца.
  const risks: ReviewRisk[] = []
  const riskRegex = /([🔴🟡🟢])\s*<b>([^<]+)<\/b>([\s\S]*?)(?=\n\s*[🔴🟡🟢]\s*<b>|$)/g
  let rm: RegExpExecArray | null
  while ((rm = riskRegex.exec(raw))) {
    const level = LEVEL_BY_EMOJI[rm[1]]
    const title = rm[2].trim()
    const body  = stripHtml(rm[3] || '')
    if (level && title) {
      risks.push({ level, title, body })
    }
  }

  // Если рисков не нашли — fallback: показать всё raw текстом
  const meta = RATING_LABELS[rating]

  return {
    rating,
    ratingLabel: meta.label,
    ratingHint:  meta.hint,
    docType,
    side,
    risks,
    footer: '',
    raw,
  }
}
