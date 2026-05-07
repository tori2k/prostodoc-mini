import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Crown, Sparkles, AlertCircle, Compass, FileStack,
} from 'lucide-react'

import { DarkScreen } from '@/components/DarkScreen'
import { api, type MeResponse, ApiError } from '@/lib/api'
import { haptic } from '@/lib/telegram'
import { BottomNav } from './HomePage'
import { SEEN_KEY } from './WelcomePage'

const BASE_URL = import.meta.env.BASE_URL

const PLAN_LABELS: Record<string, string> = {
  free:   'Бесплатный',
  basic:  'Базовый',
  pro:    'Pro',
  lawyer: 'Юрист',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.me()
      .then(setMe)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setError('Откройте мини-приложение из бота @ProstoDocxBot')
        } else {
          setError('Не удалось загрузить профиль. Попробуйте позже.')
        }
      })
  }, [])

  return (
    <DarkScreen>
      <motion.section
        className="px-5 pt-10 pb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Профиль</p>
            {me ? (
              <>
                <h1 className="text-2xl font-extrabold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  {me.tg.first_name} {me.tg.last_name ?? ''}
                </h1>
                {me.tg.username && (
                  <p className="text-sm text-white/45 mt-1">@{me.tg.username}</p>
                )}
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] backdrop-blur-xl bg-white/[0.06] rounded-full px-2.5 py-1 border border-white/[0.12] font-semibold">
                    {me.is_paid && <Crown className="w-3 h-3 text-orange-300" />}
                    {PLAN_LABELS[me.plan] ?? me.plan}
                  </span>
                </div>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="h-7 w-44 rounded bg-white/10 mb-2" />
                <div className="h-3 w-24 rounded bg-white/10" />
              </div>
            )}
          </div>
          <img
            src={`${BASE_URL}mascot/raccoon-friendly.png`}
            alt=""
            className="w-20 h-20 -mt-2 object-contain drop-shadow-2xl"
          />
        </div>
      </motion.section>

      <div className="px-5 space-y-3">
        {error && (
          <div className="rounded-xl backdrop-blur-xl bg-red-500/10 border border-red-400/30 p-4 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-100">{error}</p>
          </div>
        )}

        <h3 className="text-xs uppercase tracking-wider text-white/45 font-semibold px-1 mb-1 mt-1">
          Остаток лимитов
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {me ? (
            <>
              <QuotaCard
                label="Проверок"
                remaining={me.remaining.review}
                limit={me.limits.review}
                tone="primary"
              />
              <QuotaCard
                label="Договоров"
                remaining={me.remaining.generate}
                limit={me.limits.generate}
                tone="accent"
              />
            </>
          ) : (
            <>
              <QuotaSkeleton />
              <QuotaSkeleton />
            </>
          )}
        </div>

        {me && (
          <>
            {!me.is_paid && (
              <button
                onClick={() => {
                  haptic('medium')
                  navigate('/subscribe')
                }}
                className="w-full text-left rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white p-5 shadow-2xl shadow-orange-500/30 transition-transform active:scale-[0.99] relative overflow-hidden"
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
                <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-yellow-300/15 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-base font-bold">Больше проверок</h3>
                  </div>
                  <p className="text-sm text-white/85">
                    Подписка снимает лимиты, добавляет историю на год и эталоны для AI.
                  </p>
                </div>
              </button>
            )}

            <button
              onClick={() => {
                haptic('light')
                navigate('/etalons')
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-300 flex items-center justify-center flex-shrink-0">
                <FileStack className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Эталоны</p>
                <p className="text-xs text-white/45">
                  {me.is_paid ? 'Ваши образцы для AI' : 'Доступно на Pro и выше'}
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                haptic('light')
                localStorage.removeItem(SEEN_KEY)
                navigate('/welcome')
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-300 flex items-center justify-center flex-shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Как работает ProstoDoc</p>
                <p className="text-xs text-white/45">Посмотреть онбординг ещё раз</p>
              </div>
            </button>
          </>
        )}
      </div>

      <BottomNav active="profile" />
    </DarkScreen>
  )
}

function QuotaCard({
  label, remaining, limit, tone,
}: {
  label: string
  remaining: number
  limit: number
  tone: 'primary' | 'accent'
}) {
  const used = Math.max(0, limit - remaining)
  const usedRatio = limit > 0 ? used / limit : 0
  const isExhausted = remaining === 0

  const barColor =
    isExhausted        ? 'bg-red-500' :
    remaining / Math.max(1, limit) < 0.15 ? 'bg-amber-400' :
    tone === 'primary' ? 'bg-gradient-to-r from-[#1E3A8A] to-[#3B5FAE]' :
                         'bg-gradient-to-r from-[#F97316] to-[#FBBF24]'

  const textColor = tone === 'primary' ? 'text-blue-300' : 'text-orange-300'

  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/55 mb-2 font-semibold">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className={`text-3xl font-extrabold ${textColor} tabular-nums`}>
          {remaining}
        </span>
        <span className="text-base text-white/45 tabular-nums">
          / {limit}
        </span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${(usedRatio * 100).toFixed(1)}%` }}
        />
      </div>
      <p className="text-[11px] text-white/45">
        Потрачено {used} из {limit}
      </p>
    </div>
  )
}

function QuotaSkeleton() {
  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4 animate-pulse">
      <div className="h-3 w-12 bg-white/10 rounded mb-3" />
      <div className="h-8 w-20 bg-white/10 rounded mb-3" />
      <div className="h-2 bg-white/10 rounded-full mb-2" />
      <div className="h-3 w-24 bg-white/10 rounded" />
    </div>
  )
}
