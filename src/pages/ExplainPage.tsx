import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, BookOpen, Sparkles, RotateCcw, Home,
} from 'lucide-react'

import { api, ApiError } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'

const MAX_LEN = 8000

export function ExplainPage() {
  const navigate = useNavigate()
  const [clause, setClause] = useState('')
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)

  const submit = async () => {
    const trimmed = clause.trim()
    if (!trimmed || loading) return
    setLoading(true)
    haptic('medium')
    try {
      const r = await api.explain(trimmed)
      setExplanation(r.explanation)
      haptic('heavy')
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 401 || (e as ApiError) instanceof ApiError) {
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

  return (
    <div className="min-h-dvh bg-muted/40 pb-8">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1">Объяснить пункт</h1>
        <button
          onClick={() => navigate('/home')}
          className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Главная"
        >
          <Home className="w-5 h-5" />
        </button>
      </header>

      {!explanation ? (
        <>
          <section className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-5 pt-6 pb-7 rounded-b-[2rem] relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/15 blur-3xl" />
            <div className="relative">
              <BookOpen className="w-6 h-6 mb-2 text-emerald-100" />
              <h2 className="text-2xl font-extrabold leading-tight mb-1.5">
                Любой пункт простыми словами
              </h2>
              <p className="text-sm text-white/85">
                Скопируйте один пункт договора — AI объяснит, что он значит на практике
              </p>
            </div>
          </section>

          <section className="px-5 pt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Текст пункта
              </label>
              <textarea
                value={clause}
                onChange={(e) => setClause(e.target.value.slice(0, MAX_LEN))}
                rows={9}
                placeholder={'Например:\n\n«В случае одностороннего отказа Заказчика от исполнения настоящего Договора Заказчик возмещает Исполнителю фактически понесённые им расходы…»'}
                className="w-full rounded-xl bg-card border border-border px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] resize-none"
              />
              <div className="flex items-center justify-between mt-1.5 px-1">
                <p className="text-[11px] text-muted-foreground">
                  Без квоты — объясняем бесплатно
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {clause.length} / {MAX_LEN}
                </p>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={!clause.trim() || loading}
              className={`
                w-full h-14 rounded-2xl font-bold text-base transition-all
                ${clause.trim() && !loading
                  ? 'bg-[#F97316] text-white shadow-lg shadow-orange-500/30 active:scale-[0.99]'
                  : 'bg-muted text-muted-foreground'}
              `}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI думает…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Объяснить
                </span>
              )}
            </button>
          </section>
        </>
      ) : (
        <>
          <section className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-5 pt-6 pb-6 rounded-b-[2rem] relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/15 blur-3xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-wider text-white/80 mb-1">
                Объяснение
              </p>
              <h2 className="text-2xl font-extrabold leading-tight">
                Что это значит
              </h2>
            </div>
          </section>

          <section className="px-5 pt-4 space-y-4">
            <div className="doc-surface rounded-2xl border border-border p-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {explanation}
              </p>
            </div>

            <details className="rounded-xl bg-card border border-border">
              <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 cursor-pointer">
                Исходный пункт
              </summary>
              <p className="text-sm leading-relaxed text-foreground/80 px-4 pb-4 whitespace-pre-wrap">
                {clause}
              </p>
            </details>

            <button
              onClick={reset}
              className="w-full h-12 rounded-2xl bg-card border border-border text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-muted/50"
            >
              <RotateCcw className="w-4 h-4" />
              Объяснить другой пункт
            </button>
          </section>
        </>
      )}
    </div>
  )
}
