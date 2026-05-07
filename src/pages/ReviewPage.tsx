import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Upload, AlertCircle, FileText, Home, Check,
} from 'lucide-react'

import { DarkScreen, GlassHeader } from '@/components/DarkScreen'
import { ProgressStepper, REVIEW_STEPS } from '@/components/ProgressStepper'
import { api } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { humanError } from '@/lib/errors'
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
  const [uploadProgress, setUploadProgress] = useState(0)  // 0..1
  const [result, setResult] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!file || !perspective) return
    setLoading(true)
    setUploadProgress(0)
    haptic('medium')
    track(EVT.review_submitted, { perspective, file_size_kb: Math.round(file.size / 1024) })
    try {
      const r = await api.reviewUpload(file, perspective, (ratio) => {
        setUploadProgress(ratio)
      })
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
      showAlert(humanError(e, 'review'))
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

  if (loading) {
    return (
      <DarkScreen noBottomPad>
        <ReviewLoadingOverlay
          fileName={file?.name ?? 'Договор'}
          uploadProgress={uploadProgress}
        />
      </DarkScreen>
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
              // Лимит 20 МБ совпадает с бэком (handlers/main.py 910/2318
              // и логика юзеров «1 файл = 1 договор»). Отлавливаем заранее
              // на фронте чтобы не гонять большой XHR на сервер впустую.
              if (f.size > 20 * 1024 * 1024) {
                showAlert('Файл больше 20 МБ. Сократите или сожмите PDF.')
                return
              }
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
          disabled={!file || !perspective}
          className="
            w-full h-14 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white font-bold
            shadow-2xl shadow-orange-500/30
            transition-all active:scale-[0.98]
            disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          "
        >
          ⚡ Найти риски
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
  // Скан-эффект — играем 1.5 секунды после выбора файла, потом галочка.
  // file?.name в deps чтобы триггерилось на каждый новый файл (replace тоже).
  const [scanning, setScanning] = useState(false)
  useEffect(() => {
    if (!file) return
    setScanning(true)
    const t = setTimeout(() => setScanning(false), 1500)
    return () => clearTimeout(t)
  }, [file?.name, file?.size])

  if (file) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#F97316]/40 bg-gradient-to-br from-[#F97316]/10 to-orange-500/5 backdrop-blur-xl p-5">
        {/* Скан-линия — синий градиент пробегает сверху вниз */}
        {scanning && (
          <motion.div
            className="absolute inset-x-0 h-16 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(96,165,250,0.35) 50%, transparent 100%)',
              boxShadow: '0 0 20px rgba(96,165,250,0.45)',
            }}
            initial={{ y: '-100%' }}
            animate={{ y: '600%' }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          />
        )}

        <div className="relative flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-white">{file.name}</p>
            <p className="text-xs text-white/50">
              {(file.size / 1024 / 1024).toFixed(2)} МБ
            </p>
          </div>
          {!scanning && (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 16 }}
              className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center"
            >
              <Check className="w-4 h-4 text-emerald-300" />
            </motion.div>
          )}
        </div>
        <button
          onClick={() => document.getElementById('contract-file')?.click()}
          type="button"
          className="relative w-full h-9 rounded-lg backdrop-blur-xl bg-white/[0.05] border border-white/[0.1] text-sm font-medium hover:bg-white/[0.08] transition-colors"
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

/**
 * Полноэкранный экран «AI работает». Две фазы:
 *  1) upload — пока файл льётся на сервер (real-time прогресс XHR)
 *  2) AI — после 100% upload показываем шаговый stepper с этапами анализа.
 *
 * Шаги — иллюзия: бэк не отдаёт промежуточные сигналы, мы просто
 * крутим их по таймеру (REVIEW_STEPS, ~36 секунд). Это создаёт ощущение
 * прогресса вместо безликого спиннера.
 */
function ReviewLoadingOverlay({
  fileName, uploadProgress,
}: {
  fileName: string
  uploadProgress: number
}) {
  const uploaded = uploadProgress >= 1
  return (
    <div className="px-5 pt-12 pb-8 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs uppercase tracking-wider text-white/55 mb-1.5">
          {uploaded ? 'AI анализирует' : 'Загружаю файл'}
        </p>
        <h2 className="text-2xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/55 mb-1">
          {fileName}
        </h2>
        <p className="text-sm text-white/45 mb-7">
          Обычно занимает 30–60 секунд. Можно свернуть мини-приложение —
          результат придёт сюда же.
        </p>

        {!uploaded && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="text-white/55">Загрузка</span>
              <span className="text-white/75 tabular-nums font-semibold">
                {Math.round(uploadProgress * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#FBBF24]"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        )}

        <ProgressStepper steps={REVIEW_STEPS} done={false} />
      </motion.div>
    </div>
  )
}
