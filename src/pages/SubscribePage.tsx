import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Crown, Loader2, Sparkles, Star } from 'lucide-react'

import { motion } from 'framer-motion'

import { DarkScreen } from '@/components/DarkScreen'
import { api, type MeResponse, ApiError } from '@/lib/api'
import { haptic, showAlert, openInvoice } from '@/lib/telegram'
import { humanError } from '@/lib/errors'
import { track, EVT } from '@/lib/analytics'

const BASE_URL = import.meta.env.BASE_URL

type PaidPlan = 'starter' | 'basic' | 'pro' | 'lawyer'

interface Plan {
  id: 'free' | PaidPlan
  name: string
  price: number
  priceLabel: string
  stars?: number
  desc: string
  perks: string[]
  highlight?: boolean
  badge?: string
}

// Цены в звёздах = РОВНО пакеты Telegram Stars (100/250/500/2500).
// Это значит юзер платит точную сумму без переплат за «лишние» звёзды:
//   Старт   100⭐ = 209 ₽
//   Базовый 250⭐ = 529 ₽
//   Pro     500⭐ = 1060 ₽
//   Юрист   2500⭐ = 5300 ₽
const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Бесплатный',
    price: 0,
    priceLabel: '0 ₽',
    desc: 'Чтобы попробовать',
    perks: [
      '1 проверка договора в месяц',
      '1 готовый договор в месяц',
      'Объяснения пунктов — без лимита',
    ],
  },
  {
    id: 'starter',
    name: 'Старт',
    price: 209,
    priceLabel: '209 ₽',
    stars: 100,
    desc: 'Для разовых проверок',
    perks: [
      '5 проверок договоров в месяц',
      '3 готовых договора в месяц',
      'Письма контрагенту и PDF-отчёты',
      'Объяснения пунктов — без лимита',
    ],
  },
  {
    id: 'basic',
    name: 'Базовый',
    price: 529,
    priceLabel: '529 ₽',
    stars: 250,
    desc: 'Для самозанятых и фрилансеров',
    perks: [
      '20 проверок договоров в месяц',
      '10 готовых договоров в месяц',
      'История на 6 месяцев',
      'Письма контрагенту и PDF-отчёты',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1060,
    priceLabel: '1060 ₽',
    stars: 500,
    desc: 'Для малого бизнеса и ИП',
    perks: [
      '80 проверок договоров в месяц',
      '40 готовых договоров в месяц',
      'История на год',
      'Эталоны для AI (до 5 шт.) — пишет в вашем стиле',
      'Приоритетная поддержка',
    ],
    highlight: true,
    badge: 'Популярный',
  },
  {
    id: 'lawyer',
    name: 'Юрист',
    price: 5300,
    priceLabel: '5300 ₽',
    stars: 2500,
    desc: 'Для юристов и юр-отделов',
    perks: [
      '400 проверок договоров в месяц',
      '150 готовых договоров в месяц',
      'История без ограничений',
      'Эталоны без лимита',
      'Прямой доступ к разработчику',
    ],
  },
]

export function SubscribePage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [buyingPlan, setBuyingPlan] = useState<PaidPlan | null>(null)

  const refreshMe = () => {
    api.me().then(setMe).catch(() => {})
  }

  useEffect(() => {
    track(EVT.subscribe_opened)
    api.me()
      .then(setMe)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          showAlert('Откройте мини-приложение из бота заново')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handlePick = async (plan: Plan) => {
    haptic('medium')
    if (plan.id === 'free' || buyingPlan) return

    setBuyingPlan(plan.id)
    track(EVT.subscribe_plan_picked, { plan: plan.id, stars: plan.stars })
    try {
      const inv = await api.subscribeInvoice(plan.id)
      const status = await openInvoice(inv.url)
      if (status === 'paid') {
        haptic('heavy')
        track(EVT.subscribe_paid, { plan: plan.id, stars: plan.stars })
        // Telegram уже показал свой success-экран и пишет «Платёж принят»
        // в чат бота. Доп. алерт от нас — двойное уведомление,
        // юзеры жалуются что раздражает. Просто рефрешим /me чтобы UI
        // обновился (тариф сменится, на карточке появится бейдж «ваш»).
        refreshMe()
      } else if (status === 'cancelled') {
        // Юзер закрыл sheet — без алерта, не раздражаем
        track(EVT.subscribe_cancelled, { plan: plan.id })
      } else if (status === 'pending') {
        showAlert('Платёж в обработке. Тариф активируется автоматически.')
      } else {
        showAlert('Не удалось завершить оплату. Попробуйте ещё раз.')
      }
    } catch (e: unknown) {
      showAlert(humanError(e, 'subscribe'))
    } finally {
      setBuyingPlan(null)
    }
  }

  if (loading) {
    return (
      <DarkScreen noBottomPad>
        <div className="flex items-center justify-center h-dvh">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
        </div>
      </DarkScreen>
    )
  }

  return (
    <DarkScreen noBottomPad>
      <motion.section
        className="px-5 pt-6 pb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-white/55 text-sm mb-5 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1.5 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-300" />
              Тарифы
            </p>
            <h1 className="text-3xl font-extrabold leading-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Снимите лимиты
            </h1>
            <p className="text-sm text-white/55">
              Подписка добавляет проверок, договоров, историю и эталоны.
            </p>
          </div>
          <img
            src={`${BASE_URL}mascot/raccoon-friendly.png`}
            alt=""
            className="w-20 h-20 -mt-2 object-contain drop-shadow-2xl"
          />
        </div>
      </motion.section>

      <motion.section
        className="px-5 pb-10 space-y-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {PLANS.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            current={me?.plan === p.id}
            buying={buyingPlan === p.id}
            onPick={() => handlePick(p)}
          />
        ))}

        <p className="text-center text-xs text-white/40 pt-4 px-4 leading-relaxed">
          Оплата через Telegram Stars — Telegram сам конвертирует в рубли по
          курсу СБП/карты. Подписка возобновляется каждый месяц.
          Отменить — в настройках Telegram → Платежи и подписки.
        </p>
      </motion.section>
    </DarkScreen>
  )
}

function PlanCard({
  plan, current, buying, onPick,
}: {
  plan: Plan
  current: boolean
  buying: boolean
  onPick: () => void
}) {
  const isHighlight = plan.highlight

  return (
    <div
      className={`
        relative overflow-hidden p-5 rounded-2xl backdrop-blur-xl
        ${isHighlight
          ? 'bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-orange-500/5 border-2 border-orange-500/40 shadow-2xl shadow-orange-500/20'
          : 'bg-white/[0.04] border border-white/[0.08]'}
      `}
    >
      {isHighlight && (
        <>
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-orange-400/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl pointer-events-none" />
        </>
      )}

      {plan.badge && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white rounded-full px-2.5 py-1 shadow-lg shadow-orange-500/30">
          <Crown className="w-3 h-3" />
          {plan.badge}
        </span>
      )}

      <div className="relative">
        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
          {current && (
            <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 rounded-full px-2 py-0.5 font-bold">
              ваш тариф
            </span>
          )}
        </div>
        <p className="text-xs text-white/55 mb-3">{plan.desc}</p>

        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-white">{plan.priceLabel}</span>
            {plan.price > 0 && (
              <span className="text-sm text-white/45">/ месяц</span>
            )}
          </div>
          {plan.stars && (
            <p className="text-[11px] text-white/40 mt-0.5 inline-flex items-center gap-1">
              или
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="tabular-nums">{plan.stars}</span>
              · оплата звёздами Telegram
            </p>
          )}
        </div>

        <ul className="space-y-2 mb-5">
          {plan.perks.map((perk, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/85">
              <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isHighlight ? 'text-orange-300' : 'text-emerald-300'}`} />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

        {!current && plan.id !== 'free' && (
          <button
            onClick={onPick}
            disabled={buying}
            className={`
              w-full h-12 rounded-xl font-semibold transition-all active:scale-[0.98]
              inline-flex items-center justify-center gap-2
              disabled:opacity-70
              ${isHighlight
                ? 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-2xl shadow-orange-500/30'
                : 'bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.12]'}
            `}
          >
            {buying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Открываю оплату…
              </>
            ) : (
              <>
                Подписаться · {plan.priceLabel}
                {plan.stars && (
                  <span className="opacity-75 inline-flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {plan.stars}
                  </span>
                )}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
