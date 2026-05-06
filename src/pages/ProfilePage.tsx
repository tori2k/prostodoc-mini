import { useEffect, useState } from 'react'
import {
  Loader2, Crown, Sparkles, AlertCircle,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { api, type MeResponse, ApiError } from '@/lib/api'
import { BottomNav } from './HomePage'

const BASE_URL = import.meta.env.BASE_URL

const PLAN_LABELS: Record<string, string> = {
  free:   'Бесплатный',
  basic:  'Базовый',
  pro:    'Pro',
  lawyer: 'Юрист',
}

export function ProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    )
  }

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
              <h1 className="text-2xl font-extrabold leading-tight">
                {me.tg.first_name} {me.tg.last_name ?? ''}
              </h1>
            ) : (
              <h1 className="text-2xl font-extrabold leading-tight">Профиль</h1>
            )}
            {me?.tg.username && (
              <p className="text-sm text-white/70 mt-1">@{me.tg.username}</p>
            )}
            {me && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/20 font-semibold">
                  {me.is_paid && <Crown className="w-3 h-3" />}
                  {PLAN_LABELS[me.plan] ?? me.plan}
                </span>
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

        {me && (
          <>
            <Card>
              <CardContent className="pt-5 pb-5">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
                  Остаток лимитов
                </h3>
                <div className="space-y-2.5">
                  <Row label="Проверок"   remaining={me.remaining.review}   limit={me.limits.review} />
                  <Row label="Договоров"  remaining={me.remaining.generate} limit={me.limits.generate} />
                  {me.limits.explain !== undefined && (
                    <Row label="Объяснений" remaining={me.remaining.explain} limit={me.limits.explain} />
                  )}
                </div>
              </CardContent>
            </Card>

            {!me.is_paid && (
              <button
                onClick={() => window.Telegram?.WebApp?.close()}
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
          </>
        )}
      </div>

      <BottomNav active="profile" />
    </div>
  )
}

function Row({ label, remaining, limit }: {
  label: string
  remaining: number
  limit: number
}) {
  const ratio = limit > 0 ? remaining / limit : 0
  const barColor = ratio === 0 ? 'bg-red-500' : ratio < 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-mono tabular-nums">
          <span className="font-bold">{remaining}</span>
          <span className="text-muted-foreground"> / {limit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${(ratio * 100).toFixed(0)}%` }}
        />
      </div>
    </div>
  )
}
