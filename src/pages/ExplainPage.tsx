import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Sparkles, RotateCcw, Home, SendIcon,
} from 'lucide-react'

import { ProgressStepper, EXPLAIN_STEPS } from '@/components/ProgressStepper'
import { api, ApiError } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { track, EVT } from '@/lib/analytics'
import { cn } from '@/lib/utils'

const MAX_LEN = 8000

export function ExplainPage() {
  const navigate = useNavigate()
  const [clause, setClause] = useState('')
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { track(EVT.explain_opened) }, [])

  // mouse-follow gradient — даёт эффект «живого» света за курсором.
  // Расход на ре-рендер компенсируется тем что рисуем только когда
  // textarea в фокусе (всё остальное время событие просто игнорится).
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Авто-resize textarea: высота растёт по контенту, но не выше 220px.
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = '60px'
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`
  }, [clause])

  const submit = async () => {
    const trimmed = clause.trim()
    if (!trimmed || loading) return
    setLoading(true)
    haptic('medium')
    track(EVT.explain_submitted, { len: trimmed.length })
    try {
      const r = await api.explain(trimmed)
      setExplanation(r.explanation)
      haptic('heavy')
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if ((e as ApiError) instanceof ApiError) {
        if (err?.status === 503) {
          showAlert('AI временно недоступен. Попробуйте через минуту.')
        } else if (err?.status === 400) {
          showAlert('Слишком длинный пункт — урежьте до 8 000 символов.')
        } else if (err?.status === 401) {
          showAlert('Откройте мини-приложение из бота заново.')
        } else {
          showAlert(`Ошибка ${err?.status}: ${err?.message ?? 'неизвестная'}`)
        }
      } else {
        showAlert(`Сеть недоступна: ${err?.message ?? String(e)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    haptic('light')
    setExplanation(null)
    setClause('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="min-h-dvh relative overflow-hidden bg-[#0a0a0f] text-white pb-8">
      {/* Glow blobs — три пульсирующих круга в наших brand-цветах */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#1E3A8A]/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-[#F97316]/15 rounded-full blur-[120px] animate-pulse [animation-delay:700ms]" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-violet-500/15 rounded-full blur-[96px] animate-pulse [animation-delay:1400ms]" />
      </div>

      {/* Mouse-follow gradient — виден только когда textarea в фокусе */}
      {focused && (
        <motion.div
          className="fixed w-[40rem] h-[40rem] rounded-full pointer-events-none z-0 opacity-[0.06] bg-gradient-to-r from-[#1E3A8A] via-[#F97316] to-violet-500 blur-[96px]"
          animate={{ x: mouse.x - 320, y: mouse.y - 320 }}
          transition={{ type: 'spring', damping: 25, stiffness: 150, mass: 0.5 }}
        />
      )}

      {/* Header */}
      <header className="relative z-10 px-4 py-3 flex items-center gap-3 sticky top-0 backdrop-blur-xl bg-black/20 border-b border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1">Объяснить пункт</h1>
        <button
          onClick={() => navigate('/home')}
          className="p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Главная"
        >
          <Home className="w-5 h-5" />
        </button>
      </header>

      {loading ? (
        <ExplainLoadingOverlay />
      ) : !explanation ? (
        <FormView
          clause={clause}
          setClause={setClause}
          textareaRef={textareaRef}
          loading={loading}
          submit={submit}
          onKeyDown={onKeyDown}
          setFocused={setFocused}
        />
      ) : (
        <ResultView
          clause={clause}
          explanation={explanation}
          onReset={reset}
        />
      )}
    </div>
  )
}

// ─── Форма ввода ──────────────────────────────────────────────────────────

function FormView({
  clause, setClause, textareaRef, loading, submit, onKeyDown, setFocused,
}: {
  clause: string
  setClause: (s: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  loading: boolean
  submit: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  setFocused: (v: boolean) => void
}) {
  return (
    <div className="relative z-10 px-5 pt-8 pb-6">
      <motion.div
        className="max-w-2xl mx-auto space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="text-center space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
              <BookOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/95 to-white/50">
              Любой пункт простыми словами
            </h2>
            <motion.div
              className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mt-3"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.7 }}
            />
          </motion.div>
          <motion.p
            className="text-sm text-white/45 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Скопируйте один пункт договора — AI объяснит, что он значит на практике
          </motion.p>
        </div>

        {/* Glass-morphism контейнер */}
        <motion.div
          className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.06] shadow-2xl"
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={clause}
              onChange={(e) => setClause(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Например: «В случае одностороннего отказа Заказчика…»"
              className={cn(
                'w-full px-2 py-2 resize-none bg-transparent border-none',
                'text-white/90 text-sm leading-relaxed focus:outline-none',
                'placeholder:text-white/25 min-h-[60px] max-h-[220px]',
              )}
              style={{ overflow: 'auto' }}
            />
          </div>

          <div className="px-4 py-3 border-t border-white/[0.05] flex items-center justify-between gap-4">
            <div className="text-[11px] text-white/40 tabular-nums">
              {clause.length} / {MAX_LEN}
            </div>

            <motion.button
              type="button"
              onClick={submit}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={loading || !clause.trim()}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                'flex items-center gap-2',
                clause.trim() && !loading
                  ? 'bg-[#F97316] text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white/[0.05] text-white/40',
              )}
            >
              {loading ? (
                <>
                  <span>Думаю</span>
                  <TypingDots />
                </>
              ) : (
                <>
                  <SendIcon className="w-4 h-4" />
                  <span>Объяснить</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-[11px] text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Бесплатно · без квот · ⌘+Enter чтобы отправить
        </motion.p>
      </motion.div>
    </div>
  )
}

// ─── Результат ────────────────────────────────────────────────────────────

function ResultView({
  clause, explanation, onReset,
}: {
  clause: string
  explanation: string
  onReset: () => void
}) {
  return (
    <motion.div
      className="relative z-10 px-5 pt-6 pb-6 max-w-2xl mx-auto space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
          Объяснение
        </p>
      </div>

      <motion.div
        className="doc-surface rounded-2xl border border-white/10 p-5 shadow-2xl"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.05 }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {explanation}
        </p>
      </motion.div>

      <details className="rounded-xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06]">
        <summary className="text-xs font-semibold text-white/60 uppercase tracking-wider px-4 py-3 cursor-pointer">
          Исходный пункт
        </summary>
        <p className="text-sm leading-relaxed text-white/75 px-4 pb-4 whitespace-pre-wrap">
          {clause}
        </p>
      </details>

      <motion.button
        onClick={onReset}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full h-12 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/[0.06] transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Объяснить другой пункт
      </motion.button>
    </motion.div>
  )
}

// ─── Typing dots ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-current rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function ExplainLoadingOverlay() {
  return (
    <div className="relative z-10 px-5 pt-12 pb-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
          <BookOpen className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/55 mb-1.5">
          AI разбирает пункт
        </h2>
        <p className="text-sm text-white/45 mb-7">
          Это пара секунд — простыми словами объясню что значит и есть ли подвох.
        </p>
        <ProgressStepper steps={EXPLAIN_STEPS} done={false} />
      </motion.div>
    </div>
  )
}

