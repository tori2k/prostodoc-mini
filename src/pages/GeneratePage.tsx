import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, AlertCircle, ChevronRight, Download, Home,
  FileText, Sparkles,
} from 'lucide-react'

import { api, ApiError, type Template } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'

type Step = 'list' | 'form' | 'result'

export function GeneratePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('list')

  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [tpl, setTpl] = useState<Template | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const [generating, setGenerating] = useState(false)
  const [contractHtml, setContractHtml] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.templates()
      .then((r) => setTemplates(r.templates))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setLoadError('Откройте мини-приложение из бота @ProstoDocxBot')
        } else {
          setLoadError('Не удалось загрузить шаблоны. Попробуйте позже.')
        }
      })
  }, [])

  const pickTemplate = (t: Template) => {
    haptic('light')
    setTpl(t)
    setFields({})
    setStep('form')
  }

  const allFilled = tpl
    ? tpl.fields.every((f) => (fields[f.key] ?? '').trim().length > 0)
    : false

  const submit = async () => {
    if (!tpl || !allFilled) return
    setGenerating(true)
    haptic('medium')
    try {
      const r = await api.generate(tpl.id, fields)
      setContractHtml(r.contract_html)
      setStep('result')
      haptic('heavy')
    } catch (e: unknown) {
      const err = e as { name?: string; status?: number; message?: string }
      if (err?.status === 429) {
        showAlert('Лимит договоров исчерпан. Загляните в Тарифы.')
      } else if (err?.status === 401) {
        showAlert('Откройте мини-приложение из бота заново.')
      } else if (err?.status === 503) {
        showAlert('AI временно недоступен. Попробуйте через минуту.')
      } else {
        showAlert(`Ошибка ${err?.status ?? '?'}: ${err?.message ?? String(e)}`)
      }
    } finally {
      setGenerating(false)
    }
  }

  const downloadDocx = async () => {
    if (!tpl || !contractHtml) return
    setDownloading(true)
    haptic('medium')
    try {
      const blob = await api.generateDocx(contractHtml, tpl.name.replace(/^\W+/, ''))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tpl.name.replace(/^\W+/, '').trim()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      const err = e as { message?: string }
      showAlert(`Не удалось скачать DOCX: ${err?.message ?? String(e)}`)
    } finally {
      setDownloading(false)
    }
  }

  const goBack = () => {
    haptic('light')
    if (step === 'result') {
      setStep('form')
    } else if (step === 'form') {
      setStep('list')
      setTpl(null)
    } else {
      navigate('/home')
    }
  }

  return (
    <div className="min-h-dvh bg-muted/40 pb-8">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={goBack}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1">
          {step === 'list'   ? 'Создать договор' :
           step === 'form'   ? tpl?.name ?? 'Заполните поля' :
                               'Готовый договор'}
        </h1>
        {step !== 'list' && (
          <button
            onClick={() => navigate('/home')}
            className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Главная"
          >
            <Home className="w-5 h-5" />
          </button>
        )}
      </header>

      {step === 'list' && (
        <ListView
          templates={templates}
          loadError={loadError}
          onPick={pickTemplate}
        />
      )}

      {step === 'form' && tpl && (
        <FormView
          tpl={tpl}
          fields={fields}
          onChange={(k, v) => setFields((p) => ({ ...p, [k]: v }))}
          allFilled={allFilled}
          generating={generating}
          onSubmit={submit}
        />
      )}

      {step === 'result' && tpl && (
        <ResultView
          tpl={tpl}
          html={contractHtml}
          onDownload={downloadDocx}
          downloading={downloading}
          onNew={() => {
            setStep('list')
            setTpl(null)
            setFields({})
            setContractHtml('')
          }}
        />
      )}
    </div>
  )
}

// ─── Список шаблонов ──────────────────────────────────────────────────────

function ListView({
  templates, loadError, onPick,
}: {
  templates: Template[] | null
  loadError: string | null
  onPick: (t: Template) => void
}) {
  if (loadError) {
    return (
      <div className="px-5 pt-6">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      </div>
    )
  }
  if (!templates) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    )
  }
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1E3A8A] to-[#3B5FAE] text-white px-5 pt-6 pb-8 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="relative">
          <Sparkles className="w-6 h-6 mb-2 text-orange-300" />
          <h2 className="text-2xl font-extrabold leading-tight mb-1.5">
            AI соберёт договор
          </h2>
          <p className="text-sm text-white/80">
            Выберите шаблон, заполните 4-5 полей — получите готовый DOCX
          </p>
        </div>
      </section>

      <section className="px-5 -mt-4 relative z-10 space-y-2.5">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className="w-full text-left rounded-2xl bg-card border border-border p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors active:scale-[0.99]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight mb-1">{t.name}</p>
              <p className="text-xs text-muted-foreground leading-snug">{t.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          </button>
        ))}
      </section>

      <p className="text-center text-[11px] text-muted-foreground mt-6 px-5">
        Списывается 1 договор из месячного лимита
      </p>
    </>
  )
}

// ─── Форма ────────────────────────────────────────────────────────────────

function FormView({
  tpl, fields, onChange, allFilled, generating, onSubmit,
}: {
  tpl: Template
  fields: Record<string, string>
  onChange: (k: string, v: string) => void
  allFilled: boolean
  generating: boolean
  onSubmit: () => void
}) {
  return (
    <div className="px-5 pt-5 pb-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Заполните поля — AI соберёт договор и подсветит места, которые
        стоит уточнить.
      </p>

      <div className="space-y-3">
        {tpl.fields.map((f) => {
          const isLong = /условия|опис|функц|субъект|предмет/i.test(f.label)
          return (
            <div key={f.key}>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                {f.label}
              </label>
              {isLong ? (
                <textarea
                  value={fields[f.key] ?? ''}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={fields[f.key] ?? ''}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className="w-full h-11 rounded-xl bg-card border border-border px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={onSubmit}
        disabled={!allFilled || generating}
        className={`
          w-full h-14 rounded-2xl font-bold text-base transition-all
          ${allFilled && !generating
            ? 'bg-[#F97316] text-white shadow-lg shadow-orange-500/30 active:scale-[0.99]'
            : 'bg-muted text-muted-foreground'}
        `}
      >
        {generating ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            AI собирает договор…
          </span>
        ) : (
          'Сгенерировать договор'
        )}
      </button>

      <p className="text-center text-[11px] text-muted-foreground">
        Обычно занимает 20-40 секунд
      </p>
    </div>
  )
}

// ─── Результат ────────────────────────────────────────────────────────────

function ResultView({
  tpl, html, onDownload, downloading, onNew,
}: {
  tpl: Template
  html: string
  onDownload: () => void
  downloading: boolean
  onNew: () => void
}) {
  return (
    <div className="space-y-4">
      <section className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-5 pt-6 pb-6 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/15 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-white/80 mb-1">
            Готово
          </p>
          <h2 className="text-2xl font-extrabold leading-tight mb-1.5">
            {tpl.name}
          </h2>
          <p className="text-sm text-white/85">
            Жёлтым подсвечены места, которые стоит проверить или уточнить
          </p>
        </div>
      </section>

      <section className="px-5 space-y-2.5">
        <button
          onClick={onDownload}
          disabled={downloading}
          className="w-full h-14 rounded-2xl bg-[#1E3A8A] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          Скачать DOCX
        </button>

        <button
          onClick={onNew}
          className="w-full h-12 rounded-2xl bg-card border border-border text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-muted/50"
        >
          <FileText className="w-4 h-4" />
          Создать ещё один
        </button>
      </section>

      <section className="px-5">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Превью
        </h3>
        <div className="rounded-2xl bg-card border border-border p-4 max-h-[60dvh] overflow-y-auto">
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap [&>b]:font-bold [&>b]:text-foreground"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>
    </div>
  )
}
