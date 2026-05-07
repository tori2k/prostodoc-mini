import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Upload, AlertCircle, FileText, Home,
} from 'lucide-react'

import { DarkScreen, GlassHeader } from '@/components/DarkScreen'
import { api, ApiError } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { ReviewResult } from '@/components/ReviewResult'
import { track, EVT } from '@/lib/analytics'

const PERSPECTIVES = [
  { value: 'Исполнитель',  label: 'Исполнитель',  hint: 'Я выполняю работу' },
  { value: 'Заказчик',     label: 'Заказчик',     hint: 'Я плачу за работу' },
  { value: 'Арендатор',    label: 'Арендатор',    hint: 'Я снимаю' },
  { value: 'Арендодатель', label: 'Арендодатель', hint: 'Я сдаю' },
] as const

export function ReviewPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [perspective, setPerspective] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!file || !perspective) return
    setLoading(true)
    haptic('medium')
    track(EVT.review_submitted, { perspective, file_size_kb: Math.round(file.size / 1024) })
    try {
      const r = await api.reviewUpload(file, perspective)
      if (!r || typeof r.review_html !== 'string') {
        throw new Error('API вернул некорректный ответ')
      }
      setResult(r.review_html)
      setReviewId(r.review_id ?? null)
      track(EVT.review_result_shown)
      haptic('heavy')
    } catch (e: unknown) {
      track(EVT.review_failed)
      // eslint-disable-next-line no-console
      console.error('Review upload failed:', e)
      const err = e as { name?: string; status?: number; message?: string }
      if (err?.name === 'ApiError' || (e as ApiError) instanceof ApiError) {
        const status = err.status ?? 0
        if (status === 429) {
          showAlert('Лимит проверок исчерпан. Загляните в Тарифы.')
        } else if (status === 400) {
          showAlert('Не получилось прочитать файл — возможно, скан без текстового слоя или пустой файл.')
        } else if (status === 401) {
          showAlert('Откройте мини-приложение из бота заново — авторизация устарела.')
        } else if (status === 503) {
          showAlert('AI временно недоступен. Попробуйте через минуту.')
        } else {
          showAlert(`Ошибка ${status}: ${err.message ?? 'неизвестная'}`)
        }
      } else {
        showAlert(`Сеть недоступна или ошибка: ${err?.message ?? String(e)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <ReviewResult
        text={result}
        fileName={file?.name ?? 'Договор'}
        reviewId={reviewId}
        onBack={() => {
          setResult(null)
          setReviewId(null)
          setFile(null)
          setPerspective('')
        }}
        onHome={() => navigate('/home')}
      />
    )
  }

  return (
    <DarkScreen noBottomPad>
      <GlassHeader>
        <button
          onClick={() => navigate('/home')}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold leading-none">Проверить договор</h1>
          <p className="text-xs text-white/45 mt-0.5">AI найдёт риски за 30 секунд</p>
        </div>
      </GlassHeader>

      <motion.div
        className="px-5 pt-5 pb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Step n={1} title="Загрузите договор">
          <FileDropZone
            file={file}
            onSelect={(f) => {
              setFile(f)
              haptic('light')
              track(EVT.review_file_picked, {
                size_kb: Math.round(f.size / 1024),
                ext: f.name.split('.').pop()?.toLowerCase(),
              })
            }}
          />
        </Step>

        <Step n={2} title="Чьи интересы защищать?">
          <div className="grid grid-cols-2 gap-2">
            {PERSPECTIVES.map((p) => {
              const isActive = perspective === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => {
                    setPerspective(p.value)
                    haptic('light')
                    track(EVT.review_perspective_picked, { perspective: p.value })
                  }}
                  className={`
                    rounded-xl border p-3 text-left transition-all
                    ${isActive
                      ? 'bg-[#F97316]/15 border-[#F97316]/50 shadow-lg shadow-orange-500/10'
                      : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'}
                  `}
                >
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className={`text-[11px] mt-0.5 ${isActive ? 'text-orange-200/80' : 'text-white/45'}`}>
                    {p.hint}
                  </p>
                </button>
              )
            })}
          </div>
        </Step>

        <button
          onClick={handleSubmit}
          disabled={!file || !perspective || loading}
          className="
            w-full h-14 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white font-bold
            shadow-2xl shadow-orange-500/30
            transition-all active:scale-[0.98]
            disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              Анализирую <TypingDots />
            </span>
          ) : (
            <>⚡ Найти риски</>
          )}
        </button>

        <p className="text-[11px] text-white/45 text-center mt-3 flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          Анализ занимает 30–60 секунд
        </p>

        <button
          onClick={() => navigate('/home')}
          className="mx-auto mt-6 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          На главную
        </button>
      </motion.div>
    </DarkScreen>
  )
}

// ─── Под-компоненты ────────────────────────────────────────────────────

function Step({
  n, title, children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#3B5FAE] text-white text-xs flex items-center justify-center font-bold shadow-lg shadow-blue-500/30">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function FileDropZone({
  file, onSelect,
}: {
  file: File | null
  onSelect: (f: File) => void
}) {
  if (file) {
    return (
      <div className="rounded-2xl border border-[#F97316]/40 bg-gradient-to-br from-[#F97316]/10 to-orange-500/5 backdrop-blur-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-white">{file.name}</p>
            <p className="text-xs text-white/50">
              {(file.size / 1024 / 1024).toFixed(2)} МБ
            </p>
          </div>
        </div>
        <button
          onClick={() => document.getElementById('contract-file')?.click()}
          type="button"
          className="w-full h-9 rounded-lg backdrop-blur-xl bg-white/[0.05] border border-white/[0.1] text-sm font-medium hover:bg-white/[0.08] transition-colors"
        >
          Заменить файл
        </button>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          id="contract-file"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onSelect(f)
          }}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => document.getElementById('contract-file')?.click()}
      type="button"
      className="
        w-full rounded-2xl border-2 border-dashed border-white/15
        bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25 transition-colors
        p-8 text-center
      "
    >
      <Upload className="w-10 h-10 mx-auto mb-3 text-white/55" />
      <p className="font-semibold mb-1">Выберите файл</p>
      <p className="text-xs text-white/45">
        PDF · DOCX · TXT — до 20 МБ
      </p>
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        id="contract-file"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onSelect(f)
        }}
      />
    </button>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 bg-current rounded-full"
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
    </span>
  )
}
