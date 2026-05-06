import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Loader2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api, ApiError } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'

const PERSPECTIVES = [
  { value: 'Исполнитель',  label: 'Я Исполнитель / Подрядчик' },
  { value: 'Заказчик',     label: 'Я Заказчик / Покупатель' },
  { value: 'Арендатор',    label: 'Я Арендатор' },
  { value: 'Арендодатель', label: 'Я Арендодатель' },
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
      setResult(r.review_html)
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 429) {
          showAlert('Лимит проверок исчерпан. Загляните в /subscribe.')
        } else if (e.status === 400) {
          showAlert('Не получилось прочитать файл — возможно, скан без текстового слоя.')
        } else {
          showAlert(`Ошибка ${e.status}: ${e.message}`)
        }
      } else {
        showAlert('Сеть недоступна. Попробуйте через минуту.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-dvh px-5 pt-6 pb-8">
        <header className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/home')}
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Результат проверки</h1>
        </header>
        <Card>
          <CardContent className="pt-6">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: result }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-dvh px-5 pt-6 pb-8">
      <header className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/home')}
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Проверить договор</h1>
      </header>

      {/* Загрузка файла */}
      <label className="block mb-4">
        <span className="text-sm font-medium block mb-2">Договор</span>
        <div className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${file ? 'border-accent bg-accent/5' : 'border-border bg-muted/30'}
        `}>
          {file ? (
            <>
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024 / 1024).toFixed(1)} МБ
              </p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Выберите файл</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, TXT — до 20 МБ
              </p>
            </>
          )}
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            id="contract-file"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                setFile(f)
                haptic('light')
              }
            }}
          />
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => document.getElementById('contract-file')?.click()}
            type="button"
          >
            {file ? 'Заменить' : 'Выбрать файл'}
          </Button>
        </div>
      </label>

      {/* Роль */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-2">Чьи интересы защищать?</p>
        <div className="grid grid-cols-2 gap-2">
          {PERSPECTIVES.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setPerspective(p.value)
                haptic('light')
              }}
              className={`
                rounded-lg border p-3 text-sm text-left transition-colors
                ${perspective === p.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:bg-muted'}
              `}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={handleSubmit}
        disabled={!file || !perspective || loading}
        variant="accent"
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Анализирую…
          </>
        ) : (
          'Проверить договор'
        )}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Анализ занимает 30–60 секунд
      </p>
    </div>
  )
}
