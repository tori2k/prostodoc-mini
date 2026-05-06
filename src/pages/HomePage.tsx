import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, FileText, BookOpen, Clock, User, Loader2,
  Sparkles, ArrowRight,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { api, type MeResponse, ApiError } from '@/lib/api'
import { haptic, getCurrentUser } from '@/lib/telegram'

const BASE_URL = import.meta.env.BASE_URL

export function HomePage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me()
      .then((data) => setMe(data))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setError('Откройте мини-приложение из бота @ProstoDocxBot')
        } else {
          setError('Не удалось загрузить данные. Попробуйте позже.')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const tgUser = getCurrentUser()
  const firstName = me?.tg.first_name ?? tgUser?.first_name ?? 'Пользователь'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-muted/40 pb-24">
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1E3A8A] to-[#3B5FAE] text-white px-5 pt-10 pb-12 rounded-b-[2rem]">
        {/* Декоративные орбиты на фоне */}
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-orange-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-indigo-400/30 blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/70 mb-1">
                <Sparkles className="inline w-3.5 h-3.5 mr-1 -translate-y-0.5" />
                AI-юрист
              </p>
              <h1 className="text-3xl font-bold leading-tight">
                Привет,<br/>{firstName} 👋
              </h1>
            </div>
            <img
              src={`${BASE_URL}mascot/raccoon-friendly.png`}
              alt="Енот ProstoDoc"
              className="w-24 h-24 -mt-2 object-contain drop-shadow-xl"
            />
          </div>

          {error && (
            <div className="bg-red-500/15 backdrop-blur-sm border border-red-300/30 rounded-lg px-3 py-2 mb-4">
              <p className="text-sm text-red-100">{error}</p>
            </div>
          )}

          {/* Лимиты в виде капсул */}
          {me && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>
      </section>

      {/* ─── ОСНОВНЫЕ ДЕЙСТВИЯ ──────────────────────────────────────── */}
      <section className="px-5 -mt-6 relative z-10 space-y-3 mb-6">
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
      </section>

      <section className="px-5 space-y-3 mb-8">
        <SecondaryCard
          icon={<FileText className="w-5 h-5" />}
          title="Создать договор"
          desc="5 шаблонов или своими словами"
          onClick={() => {
            haptic('medium')
            navigate('/generate')
          }}
          accent="orange"
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
      </section>

      <BottomNav active="home" />
    </div>
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
  const tone = ratio === 0 ? 'bg-red-500/20 border-red-300/40' : 'bg-white/10 border-white/20'
  return (
    <div className={`flex-1 rounded-2xl ${tone} backdrop-blur-sm border px-4 py-3`}>
      <p className="text-[11px] uppercase tracking-wider text-white/70 mb-0.5">{label}</p>
      <p className="text-xl font-bold tabular-nums">
        {remaining}<span className="text-white/50 text-base font-normal"> / {limit}</span>
      </p>
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
        w-full text-left rounded-2xl bg-[#F97316] text-white
        p-5 shadow-lg shadow-orange-500/30
        transition-transform active:scale-[0.98]
        relative overflow-hidden
      "
    >
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <ArrowRight className="ml-auto w-5 h-5 opacity-70" />
        </div>
        <p className="text-sm text-white/80 mb-1">{desc}</p>
        <p className="text-xs font-semibold text-white/90 inline-flex items-center">
          ⚡ {highlight}
        </p>
      </div>
    </button>
  )
}

function SecondaryCard({
  icon, title, desc, onClick, accent,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
  accent: 'orange' | 'green' | 'blue'
}) {
  const accents = {
    orange: 'text-orange-600 bg-orange-50',
    green:  'text-emerald-600 bg-emerald-50',
    blue:   'text-blue-600 bg-blue-50',
  }
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer p-4 hover:bg-muted/50 transition-colors active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accents[accent]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </Card>
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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20">
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
                ${isActive ? 'text-[#F97316]' : 'text-muted-foreground'}
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
