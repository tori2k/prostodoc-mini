import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, AlertCircle, Crown, FileText, Trash2,
  Upload, Home,
} from 'lucide-react'

import { api, ApiError, type Etalon } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'

export function EtalonsPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Etalon[] | null>(null)
  const [max, setMax] = useState(5)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [planLocked, setPlanLocked] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await api.etalonsList()
      setItems(r.items)
      setMax(r.max)
      setError(null)
      setPlanLocked(false)
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 403) {
        setPlanLocked(true)
        setItems([])
      } else if (err?.status === 401) {
        setError('Откройте мини-приложение из бота заново')
      } else {
        setError('Не удалось загрузить эталоны.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const onPickFile = () => {
    if (planLocked) {
      navigate('/subscribe')
      return
    }
    inputRef.current?.click()
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    haptic('medium')
    try {
      const r = await api.etalonsAdd(file)
      setItems(r.items)
      haptic('heavy')
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string; detail?: { message?: string } }
      const msg = err?.detail?.message ?? err?.message ?? 'Ошибка загрузки'
      if (err?.status === 403) {
        showAlert('Эталоны доступны на тарифах Pro и Юрист')
      } else if (err?.status === 400) {
        showAlert(msg)
      } else if (err?.status === 401) {
        showAlert('Откройте мини-приложение из бота заново')
      } else {
        showAlert(`Ошибка: ${msg}`)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onRemove = async (idx: number) => {
    haptic('light')
    setRemoving(idx)
    try {
      const r = await api.etalonsRemove(idx)
      setItems(r.items)
    } catch (e: unknown) {
      const err = e as ApiError
      showAlert(`Не удалось удалить: ${err.message}`)
    } finally {
      setRemoving(null)
    }
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
        <h1 className="text-base font-bold flex-1">Эталоны</h1>
        <button
          onClick={() => navigate('/home')}
          className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Главная"
        >
          <Home className="w-5 h-5" />
        </button>
      </header>

      <section className="bg-gradient-to-br from-[#1E3A8A] to-[#3B5FAE] text-white px-5 pt-6 pb-7 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="relative">
          <Crown className="w-6 h-6 mb-2 text-orange-300" />
          <h2 className="text-2xl font-extrabold leading-tight mb-1.5">
            Ваши эталоны
          </h2>
          <p className="text-sm text-white/85">
            Загрузите свои образцовые договоры — AI будет генерировать в вашем стиле
          </p>
        </div>
      </section>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onUpload(f)
        }}
      />

      <div className="px-5 -mt-4 relative z-10 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!loading && planLocked && (
          <div className="rounded-2xl bg-card border border-border p-5 text-center">
            <Crown className="w-10 h-10 text-[#F97316] mx-auto mb-2" />
            <h3 className="text-base font-bold mb-1">Только для Pro и Юрист</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Эталоны — это ваши образцовые договоры, по стилю которых AI делает новые.
            </p>
            <button
              onClick={() => navigate('/subscribe')}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-[#F97316] text-white font-semibold text-sm shadow-lg shadow-orange-500/30 active:scale-[0.99]"
            >
              Посмотреть тарифы
            </button>
          </div>
        )}

        {!loading && !planLocked && items && (
          <>
            {items.length === 0 ? (
              <div className="rounded-2xl bg-card border border-border p-6 text-center">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Эталонов пока нет. Загрузите первый — AI учтёт его при генерации.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((e) => (
                  <div
                    key={e.idx}
                    className="rounded-xl bg-card border border-border p-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(e.length / 1000).toFixed(1)}k символов
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(e.idx)}
                      disabled={removing === e.idx}
                      className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                      aria-label="Удалить эталон"
                    >
                      {removing === e.idx ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onPickFile}
              disabled={uploading || items.length >= max}
              className={`
                w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2
                transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed
                ${items.length >= max
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-[#F97316] text-white shadow-lg shadow-orange-500/30'}
              `}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Загружаю…
                </>
              ) : items.length >= max ? (
                `Лимит ${max} эталонов`
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Добавить эталон
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-muted-foreground pt-1">
              {items.length} из {max} · PDF, DOCX или TXT, до 50k символов
            </p>
          </>
        )}
      </div>
    </div>
  )
}
