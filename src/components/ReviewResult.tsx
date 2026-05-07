import { useMemo, useState } from 'react'
import {
  ArrowLeft, Home, Share2, Mail, Download,
  ChevronDown, AlertTriangle, CheckCircle2, Info,
  X, Copy, Check, Loader2,
} from 'lucide-react'

import { parseReview, type RiskLevel } from '@/lib/parseReview'
import { api } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'

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
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
    icon: AlertTriangle,
  },
  yellow: {
    label: 'Спорно',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    icon: Info,
  },
  green: {
    label: 'ОК',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
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
    setLetterLoading(true)
    try {
      const r = await api.letter(rid)
      setLetterText(r.letter)
    } catch (e: unknown) {
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
    setPdfLoading(true)
    try {
      const blob = await api.reviewPdf(rid)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName.replace(/\.[^.]+$/, '')}_review.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 410) {
        showAlert('Срок хранения проверки истёк, прогоните договор заново')
      } else {
        showAlert(`Не удалось скачать PDF: ${err?.message ?? String(e)}`)
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
    <div className="min-h-dvh bg-muted/40 pb-8">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold">Результат проверки</h1>
        <button
          onClick={onHome}
          className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Главная"
        >
          <Home className="w-5 h-5" />
        </button>
      </header>

      {/* HERO — рейтинг */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${RATING_BG[parsed.rating]} text-white px-5 pt-8 pb-6 rounded-b-[2rem]`}>
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-white/80 mb-1">
              Вердикт
            </p>
            <h2 className="text-3xl font-extrabold leading-tight mb-2">
              {parsed.ratingLabel}
            </h2>
            <p className="text-sm text-white/90">
              {parsed.ratingHint}
            </p>
            {(parsed.docType || parsed.side) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {parsed.docType && (
                  <span className="text-[11px] bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/20">
                    📄 {parsed.docType}
                  </span>
                )}
                {parsed.side && (
                  <span className="text-[11px] bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/20">
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
      </section>

      {/* Счётчики */}
      <section className="px-5 -mt-4 relative z-10 mb-5">
        <div className="grid grid-cols-3 gap-2">
          <CountBadge count={counts.red}    label="опасных"   level="red" />
          <CountBadge count={counts.yellow} label="спорных"   level="yellow" />
          <CountBadge count={counts.green}  label="нормально" level="green" />
        </div>
      </section>

      {/* Список рисков */}
      <section className="px-5 mb-6">
        {parsed.risks.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              AI не выделил конкретные риски — посмотрите полный текст ответа.
            </p>
            <button
              onClick={() => setShowRaw(true)}
              className="text-sm font-semibold text-[#1E3A8A] underline underline-offset-4"
            >
              Открыть полный текст
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
              Что нашёл AI
            </h3>
            {parsed.risks.map((risk, i) => (
              <RiskCard key={i} risk={risk} />
            ))}
          </div>
        )}
      </section>

      {/* Полный текст (свёрнутый) — для случая когда хочется проверить парсер */}
      {parsed.risks.length > 0 && (
        <section className="px-5 mb-6">
          <button
            onClick={() => {
              setShowRaw(!showRaw)
              haptic('light')
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border text-sm font-medium"
          >
            Полный текст ответа AI
            <ChevronDown className={`w-4 h-4 transition-transform ${showRaw ? 'rotate-180' : ''}`} />
          </button>
          {showRaw && (
            <div className="doc-surface mt-2 rounded-xl border border-border p-4">
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
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
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
          icon={pdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          title="PDF-отчёт"
          desc={pdfLoading ? 'Готовлю файл…' : 'Скачать полный отчёт на телефон'}
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

      {/* Подвал */}
      <p className="text-center text-[11px] text-muted-foreground mt-8 px-5">
        Проверено · {fileName}
      </p>

      {letterText && (
        <LetterModal
          text={letterText}
          onClose={() => setLetterText(null)}
        />
      )}
    </div>
  )
}

function LetterModal({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      haptic('heavy')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showAlert('Не удалось скопировать. Выделите текст вручную.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90dvh] flex flex-col"
      >
        <header className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-bold">Письмо контрагенту</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-lg hover:bg-muted"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="doc-surface rounded-xl border border-border p-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {text}
            </p>
          </div>
        </div>

        <footer className="px-5 py-4 border-t border-border">
          <button
            onClick={onCopy}
            className={`
              w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2
              transition-all active:scale-[0.99]
              ${copied
                ? 'bg-emerald-500 text-white'
                : 'bg-[#F97316] text-white shadow-lg shadow-orange-500/30'}
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
                Скопировать в буфер
              </>
            )}
          </button>
        </footer>
      </div>
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
    <div className={`rounded-2xl ${meta.bg} ${meta.border} border px-3 py-3 text-center`}>
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className={`text-2xl font-extrabold ${meta.text}`}>{count}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
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
        w-full text-left rounded-2xl ${meta.bg} ${meta.border} border
        transition-all
        ${hasBody ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.dot} text-white`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[10px] uppercase tracking-wider font-bold ${meta.text} mb-1`}>
              {meta.label}
            </div>
            <p className="text-sm font-semibold leading-snug text-slate-900">{risk.title}</p>
          </div>
          {hasBody && (
            <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>
        {expanded && hasBody && (
          <p className="text-sm text-slate-700 leading-relaxed mt-3 pt-3 border-t border-slate-200">
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
    orange: 'text-orange-600 bg-orange-50',
    blue:   'text-blue-600 bg-blue-50',
    green:  'text-emerald-600 bg-emerald-50',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accents[accent]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  )
}
