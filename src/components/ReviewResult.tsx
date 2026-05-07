import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  ArrowLeft, Home, Share2, Mail, Send,
  ChevronDown, AlertTriangle, CheckCircle2, Info,
  X, Copy, Check, Loader2,
} from 'lucide-react'

import { DarkScreen, GlassHeader } from '@/components/DarkScreen'
import { ProgressStepper, LETTER_STEPS } from '@/components/ProgressStepper'
import { parseReview, type RiskLevel } from '@/lib/parseReview'
import { api } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { track, EVT } from '@/lib/analytics'

const BASE_URL = import.meta.env.BASE_URL

const RATING_BG: Record<string, string> = {
  red:     'from-rose-500 to-red-600',
  yellow:  'from-amber-400 to-orange-500',
  green:   'from-emerald-500 to-green-600',
  unknown: 'from-slate-500 to-slate-700',
}

const RATING_MASCOT: Record<string, string> = {
  red:     'raccoon-danger.png',
  yellow:  'raccoon-medium.png',
  green:   'raccoon-safe.png',
  unknown: 'raccoon-friendly.png',
}

const LEVEL_META: Record<RiskLevel, {
  label: string
  bg: string
  border: string
  text: string
  dot: string
  icon: typeof AlertTriangle
}> = {
  red: {
    label: 'Опасно',
    bg: 'bg-red-500/10',
    border: 'border-red-400/30',
    text: 'text-red-300',
    dot: 'bg-red-500',
    icon: AlertTriangle,
  },
  yellow: {
    label: 'Спорно',
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/30',
    text: 'text-amber-300',
    dot: 'bg-amber-500',
    icon: Info,
  },
  green: {
    label: 'ОК',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/30',
    text: 'text-emerald-300',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
}

interface ReviewResultProps {
  text: string
  fileName: string
  reviewId: string | null
  onBack: () => void
  onHome: () => void
}

export function ReviewResult({ text, fileName, reviewId, onBack, onHome }: ReviewResultProps) {
  const parsed = useMemo(() => parseReview(text), [text])
  const [showRaw, setShowRaw] = useState(false)

  // Эмоциональная реакция на вердикт.
  // 🟢 — конфетти-вспышка, 🔴 — shake на hero (см. атрибут animate ниже).
  // Срабатывает один раз при монтировании результата.
  useEffect(() => {
    if (parsed.rating === 'green') {
      // Эмеральдово-золотая палитра под наш бренд
      confetti({
        particleCount: 90,
        spread: 75,
        startVelocity: 38,
        origin: { y: 0.55 },
        colors: ['#10b981', '#34d399', '#fbbf24', '#f97316', '#ffffff'],
        scalar: 0.9,
      })
    }
  }, [parsed.rating])

  const [letterText, setLetterText] = useState<string | null>(null)
  const [letterLoading, setLetterLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const requireReviewId = (): string | null => {
    if (!reviewId) {
      showAlert('Срок хранения проверки истёк, прогоните договор заново')
      return null
    }
    return reviewId
  }

  const onLetter = async () => {
    const rid = requireReviewId()
    if (!rid) return
    haptic('medium')
    track(EVT.letter_clicked)
    // Открываем модалку сразу — внутри ProgressStepper крутится, пока
    // приходит текст. Ощущение «AI прямо сейчас пишет», без ожидания.
    setLetterLoading(true)
    setLetterText('')
    try {
      const r = await api.letter(rid)
      setLetterText(r.letter)
    } catch (e: unknown) {
      // Если упало — закрываем модалку, сообщение уже покажет showAlert
      setLetterText(null)
      const err = e as { status?: number; message?: string }
      if (err?.status === 410) {
        showAlert('Срок хранения проверки истёк, прогоните договор заново')
      } else if (err?.status === 503) {
        showAlert('AI временно недоступен. Попробуйте через минуту.')
      } else {
        showAlert(`Ошибка: ${err?.message ?? String(e)}`)
      }
    } finally {
      setLetterLoading(false)
    }
  }

  const onPdf = async () => {
    const rid = requireReviewId()
    if (!rid) return
    haptic('medium')
    track(EVT.pdf_clicked)
    setPdfLoading(true)
    try {
      // Используем «прислать в чат» вместо blob-скачивания —
      // на iOS Telegram WebView <a download> не работает, юзер
      // ничего не получает. Через бота — гарантированно доходит.
      await api.reviewPdfToChat(rid)
      haptic('heavy')
      showAlert('PDF-отчёт прислал в чат бота 📎')
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 410) {
        showAlert('Срок хранения проверки истёк, прогоните договор заново')
      } else {
        showAlert(`Не удалось отправить PDF: ${err?.message ?? String(e)}`)
      }
    } finally {
      setPdfLoading(false)
    }
  }

  const onShare = async () => {
    haptic('light')
    const summary =
      `Проверил договор через ProstoDoc — AI-юриста в Telegram.\n` +
      `Вердикт: ${parsed.ratingLabel}\n` +
      `Опасных: ${parsed.risks.filter(r => r.level === 'red').length}, ` +
      `спорных: ${parsed.risks.filter(r => r.level === 'yellow').length}, ` +
      `нормально: ${parsed.risks.filter(r => r.level === 'green').length}.\n\n` +
      `t.me/ProstoDocxBot`
    try {
      if (navigator.share) {
        await navigator.share({ text: summary })
      } else {
        await navigator.clipboard.writeText(summary)
        showAlert('Скопировано в буфер обмена')
      }
    } catch {
      // юзер закрыл share-меню — это ок, ничего не делаем
    }
  }

  const counts = useMemo(() => {
    const c = { red: 0, yellow: 0, green: 0 }
    parsed.risks.forEach((r) => { c[r.level]++ })
    return c
  }, [parsed])

  return (
    <DarkScreen noBottomPad>
      <GlassHeader>
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1 text-center">Результат проверки</h1>
        <button
          onClick={onHome}
          className="p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Главная"
        >
          <Home className="w-5 h-5" />
        </button>
      </GlassHeader>

      {/* HERO — рейтинг (фикс яркий цвет, белый текст — узнаваемо и читаемо).
          Для 🔴 hero коротко shake'ает — приковывает внимание к серьёзности
          вердикта. Конфетти на 🟢 — выше в useEffect. */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={
          parsed.rating === 'red'
            ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, -2, 2, 0] }
            : { opacity: 1, y: 0 }
        }
        transition={
          parsed.rating === 'red'
            ? { opacity: { duration: 0.4 }, y: { duration: 0.4 }, x: { duration: 0.5, delay: 0.2 } }
            : { duration: 0.4 }
        }
        className={`relative overflow-hidden bg-gradient-to-br ${RATING_BG[parsed.rating]} text-white px-5 pt-6 pb-6 mx-3 mt-3 rounded-3xl shadow-2xl`}
      >
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-white/85 mb-1">Вердикт</p>
            <h2 className="text-3xl font-extrabold leading-tight mb-2 text-white">
              {parsed.ratingLabel}
            </h2>
            <p className="text-sm text-white/95">{parsed.ratingHint}</p>
            {(parsed.docType || parsed.side) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {parsed.docType && (
                  <span className="text-[11px] bg-black/25 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/25 text-white">
                    📄 {parsed.docType}
                  </span>
                )}
                {parsed.side && (
                  <span className="text-[11px] bg-black/25 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/25 text-white">
                    👤 {parsed.side}
                  </span>
                )}
              </div>
            )}
          </div>
          <img
            src={`${BASE_URL}mascot/${RATING_MASCOT[parsed.rating]}`}
            alt=""
            className="w-20 h-20 -mt-2 object-contain drop-shadow-xl"
          />
        </div>
      </motion.section>

      {/* Счётчики */}
      <section className="px-5 mt-4 mb-5">
        <div className="grid grid-cols-3 gap-2">
          <CountBadge count={counts.red}    label="опасных"   level="red" />
          <CountBadge count={counts.yellow} label="спорных"   level="yellow" />
          <CountBadge count={counts.green}  label="нормально" level="green" />
        </div>
      </section>

      {/* Список рисков */}
      <section className="px-5 mb-6">
        {parsed.risks.length === 0 ? (
          <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-6 text-center">
            <p className="text-sm text-white/55 mb-3">
              AI не выделил конкретные риски — посмотрите полный текст ответа.
            </p>
            <button
              onClick={() => setShowRaw(true)}
              className="text-sm font-semibold text-orange-300 underline underline-offset-4"
            >
              Открыть полный текст
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold mb-3 text-white/45 uppercase tracking-wider">
              Что нашёл AI
            </h3>
            {parsed.risks.map((risk, i) => (
              <RiskCard key={i} risk={risk} />
            ))}
          </div>
        )}
      </section>

      {/* Полный текст */}
      {parsed.risks.length > 0 && (
        <section className="px-5 mb-6">
          <button
            onClick={() => {
              setShowRaw(!showRaw)
              haptic('light')
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] text-sm font-medium text-white"
          >
            Полный текст ответа AI
            <ChevronDown className={`w-4 h-4 text-white/55 transition-transform ${showRaw ? 'rotate-180' : ''}`} />
          </button>
          {showRaw && (
            <div className="doc-surface mt-2 rounded-xl border border-white/15 p-4 shadow-2xl">
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: parsed.raw }}
              />
            </div>
          )}
        </section>
      )}

      {/* Действия */}
      <section className="px-5 space-y-2">
        <h3 className="text-xs font-semibold mb-3 text-white/45 uppercase tracking-wider">
          Что дальше
        </h3>
        <ActionRow
          icon={letterLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
          title="Письмо контрагенту"
          desc={letterLoading ? 'AI пишет письмо…' : 'Готовый текст со списком правок'}
          onClick={onLetter}
          disabled={letterLoading}
          accent="orange"
        />
        <ActionRow
          icon={pdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          title="PDF-отчёт в чат бота"
          desc={pdfLoading ? 'Готовлю файл…' : 'Пришлю готовый PDF в наш чат'}
          onClick={onPdf}
          disabled={pdfLoading}
          accent="blue"
        />
        <ActionRow
          icon={<Share2 className="w-5 h-5" />}
          title="Поделиться вердиктом"
          desc="Скопировать или отправить ссылку на бота"
          onClick={onShare}
          accent="green"
        />
      </section>

      <p className="text-center text-[11px] text-white/40 mt-8 pb-6 px-5">
        Проверено · {fileName}
      </p>

      {/* letterText !== null — модалка открыта.
       *  '' = AI пишет (показываем stepper)
       *  непустая строка = готовое письмо */}
      {letterText !== null && (
        <LetterModal
          text={letterText}
          loading={letterLoading}
          onClose={() => {
            setLetterText(null)
            setLetterLoading(false)
          }}
        />
      )}
    </DarkScreen>
  )
}

function LetterModal({
  text, loading, onClose,
}: {
  text: string
  loading: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    // В буфер кладём plain-text без HTML-тегов: получатель будет пастить
    // в Gmail/мессенджер где разметка не нужна.
    const plain = text
      .replace(/<\/?(b|i|strong|em|u)>/gi, '')
      .replace(/<blockquote>/gi, '\n\n')
      .replace(/<\/blockquote>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    try {
      await navigator.clipboard.writeText(plain)
      setCopied(true)
      haptic('heavy')
      track(EVT.letter_copied)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showAlert('Не удалось скопировать. Выделите текст вручную.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-[#0f0f15] border-t border-white/10 sm:border w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90dvh] flex flex-col shadow-2xl"
      >
        <header className="px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-300" />
            <h3 className="text-base font-bold text-white">Письмо контрагенту</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-lg hover:bg-white/5 text-white/55"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="py-4">
              <p className="text-xs uppercase tracking-wider text-white/55 mb-3">
                AI пишет письмо…
              </p>
              <ProgressStepper steps={LETTER_STEPS} done={false} />
            </div>
          ) : (
            // Письмо как HTML — AI присылает <b>/<i>/<blockquote>. На листе.
            <div className="doc-surface rounded-xl border border-white/15 p-4 shadow-2xl">
              <div
                className="text-sm leading-relaxed [&>blockquote]:border-l-4 [&>blockquote]:border-orange-400 [&>blockquote]:pl-3 [&>blockquote]:my-3 [&>blockquote]:text-slate-700"
                dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br />') }}
              />
            </div>
          )}
        </div>

        {!loading && (
          <footer className="px-5 py-4 border-t border-white/10">
            <button
              onClick={onCopy}
              className={`
                w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2
                transition-all active:scale-[0.99]
                ${copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-2xl shadow-orange-500/30'}
              `}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Скопировать без разметки
                </>
              )}
            </button>
          </footer>
        )}
      </motion.div>
    </div>
  )
}

function CountBadge({ count, label, level }: {
  count: number
  label: string
  level: RiskLevel
}) {
  const meta = LEVEL_META[level]
  return (
    <div className={`rounded-2xl backdrop-blur-xl ${meta.bg} ${meta.border} border px-3 py-3 text-center`}>
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className={`text-2xl font-extrabold ${meta.text}`}>{count}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wide text-white/55">{label}</p>
    </div>
  )
}

function RiskCard({ risk }: { risk: { level: RiskLevel; title: string; body: string } }) {
  const [expanded, setExpanded] = useState(false)
  const meta = LEVEL_META[risk.level]
  const Icon = meta.icon
  const hasBody = risk.body.length > 0

  return (
    <button
      onClick={() => {
        if (hasBody) {
          setExpanded(!expanded)
          haptic('light')
        }
      }}
      className={`
        w-full text-left rounded-2xl backdrop-blur-xl ${meta.bg} ${meta.border} border
        transition-all
        ${hasBody ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.dot} text-white shadow-lg`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[10px] uppercase tracking-wider font-bold ${meta.text} mb-1`}>
              {meta.label}
            </div>
            <p className="text-sm font-semibold leading-snug text-white">{risk.title}</p>
          </div>
          {hasBody && (
            <ChevronDown className={`w-4 h-4 text-white/45 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>
        {expanded && hasBody && (
          <p className="text-sm text-white/80 leading-relaxed mt-3 pt-3 border-t border-white/10">
            {risk.body}
          </p>
        )}
      </div>
    </button>
  )
}

function ActionRow({ icon, title, desc, onClick, accent, disabled }: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
  accent: 'orange' | 'blue' | 'green'
  disabled?: boolean
}) {
  const accents = {
    orange: 'text-orange-300 bg-orange-500/15 border-orange-500/25',
    blue:   'text-blue-300 bg-blue-500/15 border-blue-500/25',
    green:  'text-emerald-300 bg-emerald-500/15 border-emerald-500/25',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${accents[accent]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/45">{desc}</p>
      </div>
    </button>
  )
}
