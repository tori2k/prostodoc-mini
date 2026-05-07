import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, AlertCircle, Crown, FileText, Trash2,
  Upload, Home,
} from 'lucide-react'

import { motion } from 'framer-motion'

import { DarkScreen, GlassHeader } from '@/components/DarkScreen'
import { api, type Etalon } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { humanError } from '@/lib/errors'
import { track, EVT } from '@/lib/analytics'

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

  useEffect(() => {
    track(EVT.etalons_opened)
    refresh()
  }, [])

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
      track(EVT.etalon_uploaded)
      haptic('heavy')
    } catch (e: unknown) {
      showAlert(humanError(e, 'etalon'))
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
      track(EVT.etalon_removed)
    } catch (e: unknown) {
      showAlert(humanError(e, 'etalon'))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <DarkScreen noBottomPad>
      <GlassHeader>
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1">Эталоны</h1>
        <button
          onClick={() => navigate('/home')}
          className="p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Главная"
        >
          <Home className="w-5 h-5" />
        </button>
      </GlassHeader>

      <motion.section
        className="px-5 pt-6 pb-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 mb-3">
          <Crown className="w-6 h-6 text-orange-300" />
        </div>
        <h2 className="text-2xl font-extrabold leading-tight mb-1.5 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          Ваши эталоны
        </h2>
        <p className="text-sm text-white/55">
          Загрузите свои образцовые договоры — AI будет генерировать в вашем стиле
        </p>
      </motion.section>

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

      <div className="px-5 pb-8 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl backdrop-blur-xl bg-red-500/10 border border-red-400/30 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-100">{error}</p>
          </div>
        )}

        {!loading && planLocked && (
          <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-5 text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-orange-500/15 blur-2xl" />
            <div className="relative">
              <Crown className="w-10 h-10 text-orange-300 mx-auto mb-2" />
              <h3 className="text-base font-bold mb-1">Только для Pro и Юрист</h3>
              <p className="text-sm text-white/55 mb-4 max-w-xs mx-auto">
                Эталоны — это ваши образцовые договоры, по стилю которых AI делает новые.
              </p>
              <button
                onClick={() => navigate('/subscribe')}
                className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white font-semibold text-sm shadow-2xl shadow-orange-500/30 active:scale-[0.99]"
              >
                Посмотреть тарифы
              </button>
            </div>
          </div>
        )}

        {!loading && !planLocked && items && (
          <>
            {items.length === 0 ? (
              <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-6 text-center">
                <FileText className="w-10 h-10 text-white/45 mx-auto mb-2" />
                <p className="text-sm text-white/55">
                  Эталонов пока нет. Загрузите первый — AI учтёт его при генерации.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((e) => (
                  <div
                    key={e.idx}
                    className="rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-300 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-white">{e.name}</p>
                      <p className="text-[11px] text-white/45">
                        {(e.length / 1000).toFixed(1)}k символов
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(e.idx)}
                      disabled={removing === e.idx}
                      className="p-2 rounded-lg hover:bg-red-500/15 text-white/55 hover:text-red-300 transition-colors disabled:opacity-50"
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
                  ? 'bg-white/[0.05] text-white/40'
                  : 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-2xl shadow-orange-500/30'}
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

            <p className="text-center text-[11px] text-white/40 pt-1">
              {items.length} из {max} · PDF, DOCX или TXT, до 50k символов
            </p>
          </>
        )}
      </div>
    </DarkScreen>
  )
}
