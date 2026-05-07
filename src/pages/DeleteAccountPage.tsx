import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Loader2, Trash2, ShieldAlert, Check,
} from 'lucide-react'

import { DarkScreen, GlassHeader } from '@/components/DarkScreen'
import { api } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { humanError } from '@/lib/errors'
import { track, EVT } from '@/lib/analytics'
import { cn } from '@/lib/utils'

const CONFIRM_WORD = 'УДАЛИТЬ'

export function DeleteAccountPage() {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [done, setDone] = useState<{ etalons: number; logs: number; feedback: number } | null>(null)

  const canDelete = confirm.trim() === CONFIRM_WORD && !deleting

  const submit = async () => {
    if (!canDelete) return
    setDeleting(true)
    haptic('heavy')
    track(EVT.account_delete_clicked)
    try {
      const r = await api.accountDelete(confirm.trim())
      setDone({
        etalons:  r.deleted.etalons,
        logs:     r.deleted.logs,
        feedback: r.deleted.feedback,
      })
    } catch (e: unknown) {
      showAlert(humanError(e, 'delete'))
    } finally {
      setDeleting(false)
    }
  }

  if (done) {
    return (
      <DarkScreen noBottomPad>
        <GlassHeader>
          <h1 className="text-base font-bold flex-1 text-center">Данные удалены</h1>
        </GlassHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 pt-12 text-center max-w-md mx-auto"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-4">
            <Check className="w-8 h-8 text-emerald-300" />
          </div>
          <h2 className="text-xl font-bold mb-2">Готово</h2>
          <p className="text-sm text-white/55 mb-5">Все ваши данные удалены безвозвратно.</p>

          <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4 text-sm text-left space-y-1.5">
            <DoneRow label="Эталонов удалено" value={done.etalons} />
            <DoneRow label="Записей в логах AI" value={done.logs} />
            <DoneRow label="Обращений в поддержку" value={done.feedback} />
          </div>

          <p className="text-xs text-white/40 mt-6">
            Чтобы вернуться — напишите боту /start
          </p>
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
        <h1 className="text-base font-bold flex-1">Удалить мои данные</h1>
      </GlassHeader>

      <motion.div
        className="px-5 pt-6 pb-6 space-y-4 max-w-md mx-auto"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <section>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 mb-3">
            <ShieldAlert className="w-6 h-6 text-red-300" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/55 mb-1.5">
            Право на забвение
          </h2>
          <p className="text-sm text-white/55">
            Можете удалить все свои данные одним нажатием — по ФЗ-152 ст. 17.
          </p>
        </section>

        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-2 text-sm">
          <p className="font-semibold text-white mb-1">Будут удалены:</p>
          <Item>История операций (последние сверки и договоры)</Item>
          <Item>Все эталонные договоры</Item>
          <Item>Тариф и счётчики использования</Item>
          <Item>Технические логи AI-запросов (метаданные, без содержимого договоров)</Item>
          <Item>Все обращения в обратную связь</Item>
        </div>

        <div className="rounded-2xl backdrop-blur-xl bg-red-500/10 border border-red-400/30 p-4 text-sm">
          <p className="font-semibold text-red-200 mb-1">⚠️ Это необратимо.</p>
          <p className="text-red-100/85 text-xs leading-relaxed">
            Подписку и накопленные бонусы придётся подключать заново. Чтобы продолжить — напишите слово{' '}
            <span className="font-mono font-bold text-white bg-white/10 px-1 rounded">УДАЛИТЬ</span>{' '}
            заглавными буквами в поле ниже.
          </p>
        </div>

        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="УДАЛИТЬ"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="w-full h-12 rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] px-3.5 text-base text-white text-center font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40"
        />

        <button
          onClick={submit}
          disabled={!canDelete}
          className={cn(
            'w-full h-12 rounded-2xl font-bold text-sm transition-all',
            'flex items-center justify-center gap-2',
            canDelete
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-500/30 active:scale-[0.99]'
              : 'bg-white/[0.05] text-white/40',
          )}
        >
          {deleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Удаляю…
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Удалить все мои данные
            </>
          )}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full h-11 rounded-xl text-sm text-white/55 hover:text-white transition-colors"
        >
          Отмена
        </button>
      </motion.div>
    </DarkScreen>
  )
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-white/70">
      <span className="text-white/40 mt-0.5">•</span>
      <span>{children}</span>
    </p>
  )
}

function DoneRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-white/75">
      <span>{label}</span>
      <span className="font-bold text-white tabular-nums">{value}</span>
    </div>
  )
}
