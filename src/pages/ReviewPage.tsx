import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, Loader2, AlertCircle, FileText,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { ReviewResult } from '@/components/ReviewResult'

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

  const handleSubmit = async () => {
    if (!file || !perspective) return
    setLoading(true)
    haptic('medium')
    try {
      const r = await api.reviewUpload(file, perspective)
      if (!r || typeof r.review_html !== 'string') {
        throw new Error('API вернул некорректный ответ')
      }
      setResult(r.review_html)
      haptic('heavy')
    } catch (e: unknown) {
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
        onBack={() => {
          setResult(null)
          setFile(null)
          setPerspective('')
        }}
        onHome={() => navigate('/home')}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/home')}
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base font-bold leading-none">Проверить договор</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI найдёт риски за 30 секунд
          </p>
        </div>
      </header>

      <div className="px-5 pt-5 pb-8">
        {/* Шаг 1 — файл */}
        <Step n={1} title="Загрузите договор">
          <FileDropZone
            file={file}
            onSelect={(f) => {
              setFile(f)
              haptic('light')
            }}
          />
        </Step>

        {/* Шаг 2 — роль */}
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
                  }}
                  className={`
                    rounded-xl border p-3 text-left transition-all
                    ${isActive
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md shadow-[#1E3A8A]/30'
                      : 'bg-card border-border'}
                  `}
                >
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className={`text-[11px] mt-0.5 ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {p.hint}
                  </p>
                </button>
              )
            })}
          </div>
        </Step>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!file || !perspective || loading}
          className="
            w-full h-14 rounded-2xl bg-[#F97316] text-white font-bold
            shadow-lg shadow-orange-500/30
            transition-all active:scale-[0.98]
            disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Анализирую…
            </>
          ) : (
            <>
              ⚡ Найти риски
            </>
          )}
        </button>

        <p className="text-[11px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          Анализ занимает 30–60 секунд
        </p>
      </div>
    </div>
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
        <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white text-xs flex items-center justify-center font-bold">
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
      <div className="rounded-2xl border-2 border-[#F97316] bg-orange-50 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#F97316] flex items-center justify-center text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} МБ
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => document.getElementById('contract-file')?.click()}
          type="button"
        >
          Заменить файл
        </Button>
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
        w-full rounded-2xl border-2 border-dashed border-border
        bg-card hover:bg-muted/50 transition-colors
        p-8 text-center
      "
    >
      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
      <p className="font-semibold mb-1">Выберите файл</p>
      <p className="text-xs text-muted-foreground">
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
