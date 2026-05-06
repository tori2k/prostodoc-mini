import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, BookOpen, Clock, User, Loader2 } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, type MeResponse, ApiError } from '@/lib/api'
import { haptic, getCurrentUser } from '@/lib/telegram'

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
          // Открыто не из Telegram — показываем dev-плейсхолдер
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
    <div className="min-h-dvh px-5 pt-6 pb-24">
      {/* Шапка */}
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Привет,</p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName} 👋</h1>
      </header>

      {error && (
        <Card className="p-4 mb-6 border-danger/30 bg-danger/5">
          <p className="text-sm">{error}</p>
        </Card>
      )}

      {/* Лимиты */}
      {me && (
        <div className="grid grid-cols-2 gap-3 mb-6">
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
        </div>
      )}

      {/* Главные действия */}
      <div className="space-y-3 mb-8">
        <ActionCard
          icon={<Search className="w-5 h-5" />}
          title="Проверить договор"
          desc="PDF · Word · до 10 МБ. Найду риски за 30 секунд."
          onClick={() => {
            haptic('medium')
            navigate('/review')
          }}
          accent
        />
        <ActionCard
          icon={<FileText className="w-5 h-5" />}
          title="Создать договор"
          desc="Опишите ситуацию своими словами. Получите готовый Word и PDF."
          onClick={() => {
            haptic('medium')
            navigate('/generate')
          }}
        />
        <ActionCard
          icon={<BookOpen className="w-5 h-5" />}
          title="Объяснить пункт"
          desc="Скопируйте один пункт — объясню что он значит. Бесплатно."
          onClick={() => {
            haptic('light')
            navigate('/explain')
          }}
        />
      </div>

      {/* Низ — навигация */}
      <BottomNav active="home" />
    </div>
  )
}

// ─── Под-компоненты ────────────────────────────────────────────────────

function QuotaCard({
  label, remaining, limit, tone,
}: {
  label: string
  remaining: number
  limit: number
  tone: 'primary' | 'accent'
}) {
  const ringColor = tone === 'primary' ? 'text-primary' : 'text-accent'
  const isLow = remaining === 0
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${ringColor}`}>{remaining}</span>
        <span className="text-sm text-muted-foreground">/ {limit}</span>
      </div>
      {isLow && (
        <Badge variant="outline" className="mt-2 text-[10px]">
          Лимит на сегодня исчерпан
        </Badge>
      )}
    </Card>
  )
}

function ActionCard({
  icon, title, desc, onClick, accent = false,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-lg border p-4 transition-colors
        ${accent
          ? 'bg-accent text-accent-foreground border-accent shadow-md hover:bg-accent/90'
          : 'bg-card text-card-foreground border-border hover:bg-muted'}
      `}
    >
      <div className="flex items-center gap-3 mb-1">
        <div className={accent ? 'text-white' : 'text-primary'}>{icon}</div>
        <span className="text-base font-semibold">{title}</span>
      </div>
      <p className={`text-sm ${accent ? 'text-white/85' : 'text-muted-foreground'}`}>
        {desc}
      </p>
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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around max-w-md mx-auto">
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
                ${isActive ? 'text-primary' : 'text-muted-foreground'}
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
