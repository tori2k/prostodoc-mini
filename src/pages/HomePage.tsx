import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search, FileText, BookOpen, Clock, User,
  Sparkles, ArrowRight,
} from 'lucide-react'

import { BorderBeam } from '@/components/ui/border-beam'
import { DarkScreen } from '@/components/DarkScreen'
import { api, type MeResponse, ApiError } from '@/lib/api'
import { haptic, getCurrentUser } from '@/lib/telegram'
import { setUser } from '@/lib/analytics'

const BASE_URL = import.meta.env.BASE_URL

export function HomePage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.me()
      .then((data) => {
        setMe(data)
        // Привязываем сессию метрики к Telegram-юзеру + параметры тарифа.
        // Делаем тут, потому что HomePage всегда грузится после welcome.
        setUser(data.user_id, {
          plan: data.plan,
          is_paid: data.is_paid,
        })
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setError('Откройте мини-приложение из бота @ProstoDocxBot')
        } else {
          setError('Не удалось загрузить данные. Попробуйте позже.')
        }
      })
  }, [])

  const tgUser = getCurrentUser()
  const firstName = me?.tg.first_name ?? tgUser?.first_name ?? 'Пользователь'

  return (
    <DarkScreen>
      {/* HERO */}
      <section className="px-5 pt-10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex items-start gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1.5 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-300" />
              AI-юрист
            </p>
            <h1 className="text-3xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Привет,<br />{firstName} 👋
            </h1>
          </div>
          <img
            src={`${BASE_URL}mascot/raccoon-friendly.png`}
            alt=""
            className="w-24 h-24 -mt-2 object-contain drop-shadow-2xl"
          />
        </motion.div>

        {error && (
          <div className="mt-4 backdrop-blur-xl bg-red-500/10 border border-red-400/30 rounded-xl px-3 py-2">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Лимиты */}
        <motion.div
          className="grid grid-cols-2 gap-3 mt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {me ? (
            <>
              <QuotaBadge
                label="Проверок"
                remaining={me.remaining.review}
                limit={me.limits.review}
              />
              <QuotaBadge
                label="Договоров"
                remaining={me.remaining.generate}
                limit={me.limits.generate}
              />
            </>
          ) : (
            <>
              <QuotaSkeleton />
              <QuotaSkeleton />
            </>
          )}
        </motion.div>
      </section>

      {/* ОСНОВНОЕ ДЕЙСТВИЕ */}
      <motion.section
        className="px-5 mb-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
      >
        <PrimaryCTA
          icon={<Search className="w-6 h-6" />}
          title="Проверить договор"
          desc="PDF · Word · до 10 МБ"
          highlight="Найду риски за 30 секунд"
          onClick={() => {
            haptic('medium')
            navigate('/review')
          }}
        />
      </motion.section>

      {/* ВТОРИЧНЫЕ */}
      <motion.section
        className="px-5 space-y-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <SecondaryCard
          icon={<FileText className="w-5 h-5" />}
          title="Создать договор"
          desc="6 шаблонов или своими словами"
          onClick={() => {
            haptic('medium')
            navigate('/generate')
          }}
          accent="orange"
          glow
        />
        <SecondaryCard
          icon={<BookOpen className="w-5 h-5" />}
          title="Объяснить пункт"
          desc="Бесплатно. Просто скопируйте текст."
          onClick={() => {
            haptic('light')
            navigate('/explain')
          }}
          accent="green"
        />
      </motion.section>

      <BottomNav active="home" />
    </DarkScreen>
  )
}

// ─── Под-компоненты ────────────────────────────────────────────────────

function QuotaBadge({
  label, remaining, limit,
}: {
  label: string
  remaining: number
  limit: number
}) {
  const ratio = limit > 0 ? remaining / limit : 0
  const exhausted = remaining === 0
  return (
    <div
      className={`
        rounded-2xl backdrop-blur-xl border px-4 py-3
        ${exhausted
          ? 'bg-red-500/10 border-red-400/30'
          : 'bg-white/[0.04] border-white/[0.08]'}
      `}
    >
      <p className="text-[11px] uppercase tracking-wider text-white/55 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">
        {remaining}
        <span className="text-white/40 text-base font-normal"> / {limit}</span>
      </p>
      {/* мини-полоска */}
      <div className="h-1 mt-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={exhausted ? 'h-full bg-red-400' : 'h-full bg-gradient-to-r from-[#F97316] to-[#FBBF24]'}
          style={{ width: `${Math.max(4, ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}

function QuotaSkeleton() {
  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 animate-pulse">
      <div className="h-3 w-12 bg-white/10 rounded mb-2" />
      <div className="h-7 w-20 bg-white/10 rounded mb-2" />
      <div className="h-1 bg-white/10 rounded-full" />
    </div>
  )
}

function PrimaryCTA({
  icon, title, desc, highlight, onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  highlight: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="
        w-full text-left rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white
        p-5 shadow-2xl shadow-orange-500/30
        transition-transform active:scale-[0.98]
        relative overflow-hidden
      "
    >
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-yellow-300/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <ArrowRight className="ml-auto w-5 h-5 opacity-80" />
        </div>
        <p className="text-sm text-white/85 mb-1">{desc}</p>
        <p className="text-xs font-semibold text-white/95 inline-flex items-center">
          ⚡ {highlight}
        </p>
      </div>
    </button>
  )
}

function SecondaryCard({
  icon, title, desc, onClick, accent, glow,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
  accent: 'orange' | 'green' | 'blue'
  glow?: boolean
}) {
  const accents = {
    orange: 'text-orange-300 bg-orange-500/15 border-orange-500/25',
    green:  'text-emerald-300 bg-emerald-500/15 border-emerald-500/25',
    blue:   'text-blue-300 bg-blue-500/15 border-blue-500/25',
  }
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden w-full text-left rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4 transition-colors hover:bg-white/[0.07] active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${accents[accent]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-white/50">{desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-white/40" />
      </div>
      {glow && (
        <>
          <BorderBeam size={150} duration={9} colorFrom="#F97316" colorTo="#FBBF24" />
          <BorderBeam size={150} duration={9} delay={4.5} colorFrom="#F97316" colorTo="#FBBF24" />
        </>
      )}
    </button>
  )
}

export function BottomNav({ active }: { active: 'home' | 'history' | 'profile' }) {
  const navigate = useNavigate()
  const items = [
    { id: 'home',    label: 'Главная',  icon: <Search className="w-5 h-5" />, path: '/home' },
    { id: 'history', label: 'История',  icon: <Clock  className="w-5 h-5" />, path: '/history' },
    { id: 'profile', label: 'Профиль',  icon: <User   className="w-5 h-5" />, path: '/profile' },
  ] as const

  return (
    <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-2xl bg-black/60 border-t border-white/10 z-20">
      <div className="flex items-center justify-around max-w-md mx-auto pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                haptic('light')
                navigate(item.path)
              }}
              className={`
                flex flex-col items-center gap-1 py-3 px-6 transition-colors
                ${isActive ? 'text-[#F97316]' : 'text-white/45'}
              `}
            >
              {item.icon}
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
