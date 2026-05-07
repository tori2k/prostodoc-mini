import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Home, Loader2, MessageCircle, Send, Check,
} from 'lucide-react'

import { DarkScreen, GlassHeader } from '@/components/DarkScreen'
import { api } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { humanError } from '@/lib/errors'
import { cn } from '@/lib/utils'

const MAX_LEN = 5000

export function FeedbackPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    haptic('medium')
    try {
      await api.feedback(trimmed)
      setSent(true)
      haptic('heavy')
    } catch (e: unknown) {
      showAlert(humanError(e, 'feedback'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
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
          <h1 className="text-base font-bold flex-1">Обратная связь</h1>
        </GlassHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 pt-16 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-4">
            <Check className="w-8 h-8 text-emerald-300" />
          </div>
          <h2 className="text-xl font-bold mb-2">Спасибо!</h2>
          <p className="text-sm text-white/55 mb-6 max-w-sm mx-auto">
            Прочитаем в ближайшие пару дней. Если нужен ответ — приложите контакты в следующем сообщении.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl backdrop-blur-xl bg-white/[0.05] border border-white/[0.1] text-sm font-semibold hover:bg-white/[0.08] transition-colors"
          >
            <Home className="w-4 h-4" />
            В профиль
          </button>
        </motion.div>
      </DarkScreen>
    )
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
        <h1 className="text-base font-bold flex-1">Обратная связь</h1>
      </GlassHeader>

      <motion.div
        className="px-5 pt-6 pb-6 space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <section>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 mb-3">
            <MessageCircle className="w-6 h-6 text-blue-300" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/55 mb-1.5">
            Что улучшить?
          </h2>
          <p className="text-sm text-white/55">
            Баги, идеи, проблемы с подпиской — всё прочитаем. Отвечаем по контактам, которые укажете.
          </p>
        </section>

        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            rows={8}
            placeholder="Например: «Не открывается DOCX из конструктора на iOS Safari, договор аренды»"
            className="w-full rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 resize-none"
          />
          <p className="text-[11px] text-white/40 text-right mt-1.5 tabular-nums">
            {text.length} / {MAX_LEN}
          </p>
        </div>

        <button
          onClick={submit}
          disabled={!text.trim() || sending}
          className={cn(
            'w-full h-12 rounded-2xl font-bold text-sm transition-all',
            'flex items-center justify-center gap-2',
            text.trim() && !sending
              ? 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-2xl shadow-orange-500/30 active:scale-[0.99]'
              : 'bg-white/[0.05] text-white/40',
          )}
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Отправляю…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Отправить
            </>
          )}
        </button>
      </motion.div>
    </DarkScreen>
  )
}
