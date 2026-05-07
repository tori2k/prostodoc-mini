import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Loader2, AlertCircle, ChevronRight, Send, Home,
  FileText, Sparkles, Wand2,
} from 'lucide-react'

import { DarkScreen, GlassHeader } from '@/components/DarkScreen'
import { ProgressStepper, GENERATE_STEPS } from '@/components/ProgressStepper'
import { api, ApiError, type Template } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { track, EVT } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type Step = 'list' | 'form' | 'result'

/** Виртуальный шаблон «Свой вариант» — без quick_fields, форма = одна textarea. */
const CUSTOM_TEMPLATE: Template = {
  id: 'custom',
  name: '✨ Свой вариант',
  desc: 'Опишите своими словами что нужно — AI соберёт договор',
  fields: [
    { key: 'description', label: 'Что должно быть в договоре' },
  ],
}

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
    track(EVT.generate_opened)
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
    track(EVT.generate_template_picked, { template_id: t.id })
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
    track(EVT.generate_submitted, { template_id: tpl.id })
    try {
      const r = await api.generate(tpl.id, fields)
      setContractHtml(r.contract_html)
      setStep('result')
      haptic('heavy')
    } catch (e: unknown) {
      const err = e as { name?: string; status?: number; message?: string; detail?: { message?: string } }
      const detailMsg = err?.detail?.message
      if (err?.status === 429) {
        showAlert('Лимит договоров исчерпан. Загляните в Тарифы.')
      } else if (err?.status === 401) {
        showAlert('Откройте мини-приложение из бота заново.')
      } else if (err?.status === 503) {
        showAlert('AI временно недоступен. Попробуйте через минуту.')
      } else if (err?.status === 400 && detailMsg) {
        showAlert(detailMsg)
      } else {
        showAlert(`Ошибка ${err?.status ?? '?'}: ${err?.message ?? String(e)}`)
      }
    } finally {
      setGenerating(false)
    }
  }

  const sendDocxToChat = async () => {
    if (!tpl || !contractHtml) return
    setDownloading(true)
    haptic('medium')
    track(EVT.generate_docx_sent, { template_id: tpl.id })
    try {
      const cleanName = tpl.name.replace(/^\W+/, '').trim() || 'contract'
      // На iOS Telegram WebView <a download> не работает, поэтому вместо
      // скачивания шлём через бота прямо в чат — гарантированно дойдёт.
      await api.generateDocxToChat(contractHtml, cleanName)
      haptic('heavy')
      showAlert('DOCX готового договора прислал в чат бота 📎')
    } catch (e: unknown) {
      const err = e as { message?: string }
      showAlert(`Не удалось отправить DOCX: ${err?.message ?? String(e)}`)
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
    <DarkScreen noBottomPad>
      <GlassHeader>
        <button
          onClick={goBack}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
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
            className="p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Главная"
          >
            <Home className="w-5 h-5" />
          </button>
        )}
      </GlassHeader>

      {step === 'list' && (
        <ListView
          templates={templates}
          loadError={loadError}
          onPick={pickTemplate}
        />
      )}

      {step === 'form' && tpl && !generating && (
        <FormView
          tpl={tpl}
          fields={fields}
          onChange={(k, v) => setFields((p) => ({ ...p, [k]: v }))}
          allFilled={allFilled}
          onSubmit={submit}
        />
      )}

      {step === 'form' && tpl && generating && (
        <GenerateLoadingOverlay tplName={tpl.name} />
      )}

      {step === 'result' && tpl && (
        <ResultView
          tpl={tpl}
          html={contractHtml}
          onSendToChat={sendDocxToChat}
          sending={downloading}
          onNew={() => {
            setStep('list')
            setTpl(null)
            setFields({})
            setContractHtml('')
          }}
        />
      )}
    </DarkScreen>
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
        <div className="rounded-xl backdrop-blur-xl bg-red-500/10 border border-red-400/30 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-100">{loadError}</p>
        </div>
      </div>
    )
  }
  if (!templates) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
      </div>
    )
  }
  return (
    <motion.div
      className="px-5 pt-5 pb-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Inline-hero */}
      <section className="mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 mb-3">
          <Wand2 className="w-6 h-6 text-orange-300" />
        </div>
        <h2 className="text-2xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/55">
          AI соберёт договор
        </h2>
        <p className="text-sm text-white/45 mt-1.5">
          Выберите шаблон или опишите своими словами — получите готовый DOCX
        </p>
      </section>

      {/* «Свой вариант» — выделен отдельной premium-карточкой */}
      <button
        onClick={() => onPick(CUSTOM_TEMPLATE)}
        className="
          w-full text-left rounded-2xl mb-3 p-4 relative overflow-hidden
          bg-gradient-to-br from-violet-600/20 via-fuchsia-500/15 to-orange-500/15
          border border-violet-400/25 backdrop-blur-xl
          transition-transform active:scale-[0.99]
        "
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-violet-500/20 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-orange-500/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">Свой вариант</p>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-white/15 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                AI
              </span>
            </div>
            <p className="text-xs text-white/65 leading-snug mt-0.5">
              Опишите своими словами — соберу любой договор
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/50 flex-shrink-0" />
        </div>
      </button>

      <p className="text-[11px] text-white/35 uppercase tracking-wider px-1 mb-2 mt-5 font-semibold">
        Готовые шаблоны
      </p>
      <div className="space-y-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className="w-full text-left rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4 flex items-start gap-3 hover:bg-white/[0.07] transition-colors active:scale-[0.99]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight mb-1 text-white">{t.name}</p>
              <p className="text-xs text-white/50 leading-snug">{t.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-white/40 mt-6">
        Списывается 1 договор из месячного лимита
      </p>
    </motion.div>
  )
}

// ─── Форма ────────────────────────────────────────────────────────────────

function FormView({
  tpl, fields, onChange, allFilled, onSubmit,
}: {
  tpl: Template
  fields: Record<string, string>
  onChange: (k: string, v: string) => void
  allFilled: boolean
  onSubmit: () => void
}) {
  const isCustom = tpl.id === 'custom'
  return (
    <motion.div
      className="px-5 pt-5 pb-6 space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="text-sm text-white/55">
        {isCustom
          ? 'Опишите подробно что должно быть в договоре: стороны, предмет, цена, сроки, особые условия.'
          : 'Заполните поля — AI соберёт договор и подсветит места, которые стоит уточнить.'}
      </p>

      <div className="space-y-3">
        {tpl.fields.map((f) => {
          const isLong = isCustom || /условия|опис|функц|субъект|предмет/i.test(f.label)
          return (
            <div key={f.key}>
              <label className="text-xs font-semibold uppercase tracking-wider text-white/55 block mb-1.5">
                {f.label}
              </label>
              {isLong ? (
                <textarea
                  value={fields[f.key] ?? ''}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  rows={isCustom ? 8 : 3}
                  placeholder={isCustom
                    ? 'Например: договор подряда на разработку сайта, исполнитель — ИП на УСН, заказчик — ООО, цена 300 000 ₽, срок 3 месяца, поэтапная сдача…'
                    : ''}
                  className="w-full rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={fields[f.key] ?? ''}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className="w-full h-11 rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] px-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40"
                />
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={onSubmit}
        disabled={!allFilled}
        className={cn(
          'w-full h-14 rounded-2xl font-bold text-base transition-all',
          allFilled
            ? 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-2xl shadow-orange-500/30 active:scale-[0.99]'
            : 'bg-white/[0.05] text-white/40',
        )}
      >
        Сгенерировать договор
      </button>

      <p className="text-center text-[11px] text-white/40">
        Обычно занимает 20-40 секунд
      </p>
    </motion.div>
  )
}

function GenerateLoadingOverlay({ tplName }: { tplName: string }) {
  return (
    <div className="px-5 pt-12 pb-8 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs uppercase tracking-wider text-white/55 mb-1.5">
          Создаю договор
        </p>
        <h2 className="text-2xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/55 mb-1">
          {tplName}
        </h2>
        <p className="text-sm text-white/45 mb-7">
          Обычно занимает 20–40 секунд. Можно свернуть мини-приложение —
          DOCX придёт в чат бота.
        </p>
        <ProgressStepper steps={GENERATE_STEPS} done={false} />
      </motion.div>
    </div>
  )
}

// ─── Результат ────────────────────────────────────────────────────────────

function ResultView({
  tpl, html, onSendToChat, sending, onNew,
}: {
  tpl: Template
  html: string
  onSendToChat: () => void
  sending: boolean
  onNew: () => void
}) {
  return (
    <motion.div
      className="px-5 pt-5 pb-6 space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/15 border border-emerald-400/30 backdrop-blur-xl px-5 py-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-400/15 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-emerald-200/80 mb-1">
            Готово
          </p>
          <h2 className="text-xl font-extrabold leading-tight mb-1">
            {tpl.name}
          </h2>
          <p className="text-sm text-emerald-100/85">
            Жёлтым подсвечены места, которые стоит проверить или уточнить
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={onSendToChat}
          disabled={sending}
          className="w-full h-14 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white font-bold flex items-center justify-center gap-2 shadow-2xl shadow-orange-500/30 transition-all active:scale-[0.99] disabled:opacity-60"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          Прислать DOCX в чат
        </button>

        <button
          onClick={onNew}
          className="w-full h-12 rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-white/[0.07]"
        >
          <FileText className="w-4 h-4" />
          Создать ещё один
        </button>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-white/45 font-semibold mb-2">
          Превью
        </h3>
        <div className="doc-surface rounded-2xl border border-white/10 p-5 max-h-[60dvh] overflow-y-auto shadow-2xl">
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </motion.div>
  )
}
