import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown, Sparkles, AlertCircle, Compass, FileStack,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
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
    <div className="min-h-dvh bg-muted/40 pb-24">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1E3A8A] to-[#3B5FAE] text-white px-5 pt-10 pb-16 rounded-b-[2rem]">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-orange-500/40 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-white/70 mb-1">Профиль</p>
            {me ? (
              <>
                <h1 className="text-2xl font-extrabold leading-tight">
                  {me.tg.first_name} {me.tg.last_name ?? ''}
                </h1>
                {me.tg.username && (
                  <p className="text-sm text-white/70 mt-1">@{me.tg.username}</p>
                )}
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/20 font-semibold">
                    {me.is_paid && <Crown className="w-3 h-3" />}
                    {PLAN_LABELS[me.plan] ?? me.plan}
                  </span>
                </div>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="h-7 w-44 rounded bg-white/15 mb-2" />
                <div className="h-3 w-24 rounded bg-white/15" />
              </div>
            )}
          </div>
          <img
            src={`${BASE_URL}mascot/raccoon-friendly.png`}
            alt=""
            className="w-20 h-20 -mt-2 object-contain drop-shadow-xl"
          />
        </div>
      </section>

      {/* Контент */}
      <div className="px-5 -mt-8 relative z-10 space-y-3">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1">
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
                className="w-full text-left rounded-2xl bg-[#F97316] text-white p-5 shadow-lg shadow-orange-500/30 transition-transform active:scale-[0.99] relative overflow-hidden"
              >
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
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

            {/* Эталоны */}
            <button
              onClick={() => {
                haptic('light')
                navigate('/etalons')
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                <FileStack className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Эталоны</p>
                <p className="text-xs text-muted-foreground">
                  {me.is_paid ? 'Ваши образцы для AI' : 'Доступно на Pro и выше'}
                </p>
              </div>
            </button>

            {/* Перепосмотреть онбординг */}
            <button
              onClick={() => {
                haptic('light')
                localStorage.removeItem(SEEN_KEY)
                navigate('/welcome')
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Как работает ProstoDoc</p>
                <p className="text-xs text-muted-foreground">Посмотреть онбординг ещё раз</p>
              </div>
            </button>
          </>
        )}
      </div>

      <BottomNav active="profile" />
    </div>
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

  // Полоса показывает израсходованную часть. Цвет — бренд-акцент,
  // в крайних случаях красный/жёлтый
  const barColor =
    isExhausted        ? 'bg-red-500'   :
    remaining / Math.max(1, limit) < 0.15 ? 'bg-amber-500' :
    tone === 'primary' ? 'bg-[#1E3A8A]' : 'bg-[#F97316]'

  const textColor = tone === 'primary' ? 'text-[#1E3A8A]' : 'text-[#F97316]'

  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className={`text-3xl font-extrabold ${textColor} tabular-nums`}>
          {remaining}
        </span>
        <span className="text-base text-muted-foreground tabular-nums">
          / {limit}
        </span>
      </div>
      {/* Прогресс-бар показывает что уже потрачено */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${(usedRatio * 100).toFixed(1)}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Потрачено {used} из {limit}
      </p>
    </Card>
  )
}

function QuotaSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="h-3 w-12 bg-muted rounded mb-3" />
      <div className="h-8 w-20 bg-muted rounded mb-3" />
      <div className="h-2 bg-muted rounded-full mb-2" />
      <div className="h-3 w-24 bg-muted rounded" />
    </Card>
  )
}
