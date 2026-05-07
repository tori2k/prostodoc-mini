import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Crown, Sparkles, AlertCircle, Compass, FileStack, Gift, Copy, Check,
  MessageCircle, Trash2, Bell, BellOff,
} from 'lucide-react'

import { DarkScreen } from '@/components/DarkScreen'
import { api, type MeResponse, type ReferralInfo, ApiError } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { track, EVT } from '@/lib/analytics'
import { humanError } from '@/lib/errors'
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
  const [ref, setRef] = useState<ReferralInfo | null>(null)
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
    api.referral()
      .then(setRef)
      .catch(() => {})  // если 401 — info уже на /me
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
            {/* Бонусные квоты от рефералки — показываем только если реально начислены */}
            {(me.bonus && (me.bonus.review > 0 || me.bonus.generate > 0)) && (
              <div className="rounded-xl backdrop-blur-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3 flex items-center gap-3">
                <Gift className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                <p className="text-xs text-emerald-100">
                  <span className="font-semibold text-emerald-200">Бонус от рефералки</span> ·{' '}
                  +{me.bonus.review} проверок и +{me.bonus.generate} договоров сверх плана.
                  Бонусы не сгорают.
                </p>
              </div>
            )}

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

            {/* Реферальная карточка */}
            {ref && <ReferralCard info={ref} />}

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

            <button
              onClick={() => {
                haptic('light')
                navigate('/feedback')
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Обратная связь</p>
                <p className="text-xs text-white/45">Баг, идея, проблема — напишите</p>
              </div>
            </button>

            <NotificationsToggle me={me} onToggle={(v) => setMe({ ...me, notifications_enabled: v })} />

            <h3 className="text-xs uppercase tracking-wider text-white/35 font-semibold px-1 mt-5 mb-1">
              Управление данными
            </h3>
            <button
              onClick={() => {
                haptic('light')
                navigate('/account/delete')
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl backdrop-blur-xl bg-white/[0.02] border border-white/[0.05] hover:bg-red-500/[0.06] hover:border-red-500/20 transition-colors active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300/80 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white/85">Удалить мои данные</p>
                <p className="text-xs text-white/40">Право на забвение, ФЗ-152 ст. 17</p>
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

function ReferralCard({ info }: { info: ReferralInfo }) {
  const [copied, setCopied] = useState(false)

  const onShare = async () => {
    haptic('medium')
    track(EVT.referral_link_copied, { invited: info.invited })
    const text =
      `Я пользуюсь @ProstoDocxBot — AI-юристом в Telegram, который проверяет договоры и находит риски за 30 секунд.\n\n` +
      `По ссылке тебе сразу +${info.reward_per_invite.review} проверка и +${info.reward_per_invite.generate} договор:\n\n` +
      info.link
    try {
      // Сначала пробуем нативный share — на мобиле красивее
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      }
    } catch {
      // Fallback на копирование если share не сработал
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      } catch {
        showAlert('Не удалось скопировать. Ссылка: ' + info.link)
      }
    }
  }

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br from-violet-600/20 via-fuchsia-500/15 to-orange-500/15 border border-violet-400/25 backdrop-blur-xl">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-orange-500/15 blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1.5">
          <Gift className="w-5 h-5 text-violet-300" />
          <h3 className="text-base font-bold">Пригласи друга</h3>
          {info.is_partner && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-yellow-400/20 text-yellow-200 border border-yellow-400/40 rounded-full px-1.5 py-0.5 ml-auto">
              партнёр
            </span>
          )}
        </div>
        <p className="text-sm text-white/75 mb-4 leading-snug">
          За каждого друга — <b className="text-white">+{info.reward_per_invite.review} проверка
          и +{info.reward_per_invite.generate} договор</b>.
          Друг получит то же самое сразу при первом открытии.
        </p>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <RefStat label="Привёл" value={info.invited} />
          <RefStat label="Бонусных проверок" value={info.bonus_review} />
          <RefStat label="Бонусных договоров" value={info.bonus_generate} />
        </div>

        <button
          onClick={onShare}
          className={`
            w-full h-11 rounded-xl font-semibold text-sm
            flex items-center justify-center gap-2 transition-all active:scale-[0.99]
            ${copied
              ? 'bg-emerald-500 text-white'
              : 'bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur-xl'}
          `}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Скопировано
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Поделиться ссылкой
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function RefStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.05] border border-white/[0.08] px-2 py-2 text-center">
      <p className="text-2xl font-extrabold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-white/55 leading-tight">{label}</p>
    </div>
  )
}

function NotificationsToggle({
  me, onToggle,
}: {
  me: MeResponse
  onToggle: (enabled: boolean) => void
}) {
  const enabled = me.notifications_enabled !== false
  const [busy, setBusy] = useState(false)

  const click = async () => {
    if (busy) return
    haptic('light')
    setBusy(true)
    try {
      const r = await api.notificationsToggle(!enabled)
      onToggle(r.enabled)
    } catch (e: unknown) {
      showAlert(humanError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={click}
      disabled={busy}
      className="w-full flex items-center gap-3 p-3 rounded-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors active:scale-[0.99] disabled:opacity-60"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
        enabled
          ? 'bg-violet-500/15 border-violet-500/25 text-violet-300'
          : 'bg-white/[0.04] border-white/[0.1] text-white/45'
      }`}>
        {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold">Уведомления от бота</p>
        <p className="text-xs text-white/45">
          {enabled ? 'Готовый вердикт + советы' : 'Выключены — присылать не буду'}
        </p>
      </div>
      {/* Стилизованный switch */}
      <div className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-violet-500/50' : 'bg-white/10'
      }`}>
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
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
