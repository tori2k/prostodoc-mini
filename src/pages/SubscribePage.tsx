import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Crown, Loader2, Sparkles } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { api, type MeResponse, ApiError } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'

const BASE_URL = import.meta.env.BASE_URL

interface Plan {
  id: 'free' | 'basic' | 'pro' | 'lawyer'
  name: string
  price: number
  priceLabel: string
  desc: string
  perks: string[]
  highlight?: boolean
  badge?: string
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Бесплатный',
    price: 0,
    priceLabel: '0 ₽',
    desc: 'Чтобы попробовать',
    perks: [
      '1 проверка в месяц',
      '1 договор в месяц',
      'Объяснения пунктов без лимита',
    ],
  },
  {
    id: 'basic',
    name: 'Базовый',
    price: 390,
    priceLabel: '390 ₽',
    desc: 'Для самозанятых и фрилансеров',
    perks: [
      '10 проверок в месяц',
      '10 договоров в месяц',
      'История на 6 месяцев',
      'Письма контрагенту',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 990,
    priceLabel: '990 ₽',
    desc: 'Для малого бизнеса и ИП',
    perks: [
      '80 проверок в месяц',
      '40 договоров в месяц',
      'История на год',
      'Эталоны для AI (до 5 шт.)',
      'Приоритетная поддержка',
    ],
    highlight: true,
    badge: 'Популярный',
  },
  {
    id: 'lawyer',
    name: 'Юрист',
    price: 3900,
    priceLabel: '3900 ₽',
    desc: 'Для практикующих юристов',
    perks: [
      '400 проверок в месяц',
      '150 договоров в месяц',
      'История без ограничений',
      'Эталоны без ограничений',
      'Прямой доступ к разработчику',
    ],
  },
]

export function SubscribePage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me()
      .then(setMe)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          showAlert('Откройте мини-приложение из бота заново')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handlePick = (plan: Plan) => {
    haptic('medium')
    if (plan.id === 'free') return
    // Реальная оплата ещё не подключена — отправляем юзера в бот
    showAlert(
      'Оплата подключается. Для подписки сейчас напишите боту /subscribe или /feedback с темой «подписка».',
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-muted/40 pb-12">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1E3A8A] to-[#3B5FAE] text-white px-5 pt-6 pb-12 rounded-b-[2rem]">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-500/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-64 h-64 rounded-full bg-indigo-400/30 blur-3xl" />
        </div>

        <button
          onClick={() => navigate(-1)}
          className="relative inline-flex items-center gap-1 text-white/80 text-sm mb-4 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <div className="relative flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/70 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Тарифы
            </div>
            <h1 className="text-3xl font-extrabold leading-tight mb-2">
              Снимите лимиты
            </h1>
            <p className="text-sm text-white/85">
              Подписка добавляет проверок, договоров, историю и эталоны.
            </p>
          </div>
          <img
            src={`${BASE_URL}mascot/raccoon-friendly.png`}
            alt=""
            className="w-20 h-20 -mt-2 object-contain drop-shadow-xl"
          />
        </div>
      </section>

      {/* Список тарифов */}
      <section className="px-4 -mt-6 relative z-10 space-y-3">
        {PLANS.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            current={me?.plan === p.id}
            onPick={() => handlePick(p)}
          />
        ))}

        <p className="text-center text-xs text-muted-foreground pt-4 px-4">
          Оплата по карте подключается. Сейчас для подписки —
          напишите /subscribe в боте или /feedback с темой «подписка».
        </p>
      </section>
    </div>
  )
}

function PlanCard({
  plan, current, onPick,
}: {
  plan: Plan
  current: boolean
  onPick: () => void
}) {
  const isHighlight = plan.highlight

  return (
    <Card className={`
      relative overflow-hidden p-5
      ${isHighlight ? 'border-2 border-[#F97316] shadow-lg shadow-orange-500/20' : ''}
    `}>
      {plan.badge && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#F97316] text-white rounded-full px-2.5 py-1">
          <Crown className="w-3 h-3" />
          {plan.badge}
        </span>
      )}

      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-lg font-bold">{plan.name}</h3>
        {current && (
          <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-bold">
            ваш тариф
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{plan.desc}</p>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-extrabold">{plan.priceLabel}</span>
        {plan.price > 0 && (
          <span className="text-sm text-muted-foreground">/ месяц</span>
        )}
      </div>

      <ul className="space-y-2 mb-5">
        {plan.perks.map((perk, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isHighlight ? 'text-[#F97316]' : 'text-emerald-600'}`} />
            <span>{perk}</span>
          </li>
        ))}
      </ul>

      {!current && plan.id !== 'free' && (
        <button
          onClick={onPick}
          className={`
            w-full h-11 rounded-xl font-semibold transition-all active:scale-[0.98]
            ${isHighlight
              ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/30'
              : 'bg-[#1E3A8A] text-white'}
          `}
        >
          Выбрать
        </button>
      )}
    </Card>
  )
}
