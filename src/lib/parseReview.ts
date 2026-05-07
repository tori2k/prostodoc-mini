/**
 * Парсер review-разметки от Claude в структурированный объект.
 *
 * AI возвращает HTML вида:
 *   📋 <b>Тип договора:</b> услуг
 *   👤 <b>Защищаем:</b> Исполнитель
 *   🎯 <b>Оценка:</b> 🔴 опасный — <i>...</i>
 *
 *   ⚠️ <b>Что не так</b>
 *
 *   🔴 <b>Заголовок риска</b> · раздел "..."
 *   Текст описания...
 *
 *   🔴 <b>Следующий риск</b>
 *   Описание...
 *
 *   💡 <b>Итого:</b> ...
 *
 * Парсим через split по emoji-маркерам — надёжнее чем regex с lookahead
 * (на JS unicode emoji в regex character-class неоднозначны).
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
  /** raw text — для вкладки «Полный текст» */
  raw: string
}

const RED = '🔴'
const YELLOW = '🟡'
const GREEN = '🟢'

const LEVEL_BY_EMOJI: Record<string, RiskLevel> = {
  [RED]: 'red',
  [YELLOW]: 'yellow',
  [GREEN]: 'green',
}

const RATING_LABELS: Record<Rating, { label: string; hint: string }> = {
  red:     { label: 'Опасный',        hint: 'Подписывать в текущем виде нельзя' },
  yellow:  { label: 'Средние риски',  hint: 'Есть пункты для переговоров' },
  green:   { label: 'Безопасный',     hint: 'Серьёзных проблем нет' },
  unknown: { label: 'Проверен',       hint: 'Смотрите детали ниже' },
}

function stripHtml(s: string): string {
  return s.replace(/<\/?[bi]>/g, '').trim()
}

export function parseReview(text: string): ParsedReview {
  const raw = text || ''
  try {
    return _parseReviewUnsafe(raw)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('parseReview failed:', e)
    return {
      rating: 'unknown',
      ratingLabel: RATING_LABELS.unknown.label,
      ratingHint:  RATING_LABELS.unknown.hint,
      docType: null,
      side: null,
      risks: [],
      footer: '',
      raw,
    }
  }
}

function _parseReviewUnsafe(raw: string): ParsedReview {
  // ─── Рейтинг ─────────────────────────────────────────────────────────
  // 🎯 <b>Оценка:</b> 🔴 опасный — ...
  let rating: Rating = 'unknown'
  const ratingMatch = raw.match(/🎯[^]*?(🔴|🟡|🟢)/)
  if (ratingMatch) rating = LEVEL_BY_EMOJI[ratingMatch[1]] as Rating

  // ─── Тип договора ───────────────────────────────────────────────────
  const docTypeMatch = raw.match(/<b>Тип договора:<\/b>\s*([^\n<]+)/i)
  const docType = docTypeMatch ? docTypeMatch[1].trim() : null

  // ─── Сторона ────────────────────────────────────────────────────────
  const sideMatch = raw.match(/<b>Защищаем:<\/b>\s*([^\n<]+)/i)
  const side = sideMatch ? sideMatch[1].trim() : null

  // ─── Риски ──────────────────────────────────────────────────────────
  // Разрезаем текст по строкам начинающимся с 🔴/🟡/🟢 + <b>
  // Игнорируем строки где после emoji идёт обычный текст (не <b>) —
  // это упоминания цвета риска внутри текста («🔴 опасные»), не заголовок
  const lines = raw.split('\n')
  const risks: ReviewRisk[] = []
  let currentRisk: ReviewRisk | null = null
  let currentBodyLines: string[] = []

  const flushRisk = () => {
    if (currentRisk) {
      currentRisk.body = stripHtml(currentBodyLines.join('\n').trim())
      risks.push(currentRisk)
    }
    currentRisk = null
    currentBodyLines = []
  }

  for (const line of lines) {
    // Проверяем, начинается ли строка с emoji-уровня + <b>заголовок</b>
    const headerMatch = line.match(/^(🔴|🟡|🟢)\s*<b>([^<]+)<\/b>(.*)$/)
    if (headerMatch) {
      // Перед открытием нового риска — закрываем текущий
      flushRisk()
      const level = LEVEL_BY_EMOJI[headerMatch[1]]
      const title = headerMatch[2].trim()
      const tail  = headerMatch[3].trim()  // например «· раздел "..."»
      currentRisk = { level, title, body: '' }
      // Хвост строки заголовка (раздел/цитата) — добавляем как первую строку body
      if (tail) currentBodyLines.push(tail)
      continue
    }

    // Если встретили строку 🎯/💡/⚠️ или просто пустую — закрываем риск
    if (/^(🎯|💡|⚠️)/.test(line)) {
      flushRisk()
      continue
    }

    // Иначе — это продолжение текущего риска (если он открыт)
    if (currentRisk) {
      currentBodyLines.push(line)
    }
  }
  flushRisk()

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
