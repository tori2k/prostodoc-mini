import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, FileSearch, FilePen, BookOpen, Sparkles,
} from 'lucide-react'

import { api, type HistoryItem } from '@/lib/api'
import { haptic } from '@/lib/telegram'
import { BottomNav } from './HomePage'

const BASE_URL = import.meta.env.BASE_URL

const ACTION_META: Record<HistoryItem['action'], {
  icon: typeof FileSearch
  label: string
  bg: string
  color: string
}> = {
  review:   { icon: FileSearch, label: 'Проверка',   bg: 'bg-blue-50',    color: 'text-blue-600' },
  generate: { icon: FilePen,    label: 'Создание',   bg: 'bg-orange-50',  color: 'text-orange-600' },
  explain:  { icon: BookOpen,   label: 'Объяснение', bg: 'bg-emerald-50', color: 'text-emerald-600' },
}

export function HistoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<HistoryItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.history(100)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const grouped = items ? groupByDay(items) : []

  return (
    <div className="min-h-dvh bg-muted/40 pb-24">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1E3A8A] to-[#3B5FAE] text-white px-5 pt-10 pb-12 rounded-b-[2rem]">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-orange-500/40 blur-3xl" />
        </div>
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-white/70 mb-1">История</p>
          <h1 className="text-2xl font-extrabold leading-tight mb-1">
            Все ваши действия
          </h1>
          <p className="text-sm text-white/75">
            Проверки, созданные договоры, объяснения
          </p>
        </div>
      </section>

      <div className="px-5 -mt-6 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
          </div>
        ) : !items || items.length === 0 ? (
          <EmptyState onStart={() => {
            haptic('medium')
            navigate('/review')
          }} />
        ) : (
          <div className="space-y-5">
            {grouped.map(([day, group]) => (
              <section key={day}>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-2">
                  {day}
                </h3>
                <div className="space-y-2">
                  {group.map((item, i) => (
                    <HistoryRow key={`${day}-${i}`} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="history" />
    </div>
  )
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const meta = ACTION_META[item.action] ?? ACTION_META.review
  const Icon = meta.icon
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            {meta.label}
          </span>
          <span className="text-[11px] text-muted-foreground">
            · {formatTime(item.ts)}
          </span>
        </div>
        <p className="text-sm font-semibold leading-snug truncate">
          {item.title}
        </p>
        {item.summary && item.summary !== '—' && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {item.summary}
          </p>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-8 text-center">
      <img
        src={`${BASE_URL}mascot/raccoon-friendly.png`}
        alt=""
        className="w-24 h-24 mx-auto mb-3 object-contain"
      />
      <h3 className="text-base font-bold mb-1">Здесь пока пусто</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
        Сделайте первую проверку договора — она появится тут
      </p>
      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-[#F97316] text-white font-semibold text-sm shadow-lg shadow-orange-500/30 active:scale-[0.99]"
      >
        <Sparkles className="w-4 h-4" />
        Проверить договор
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function dayLabel(ts: string): string {
  const d = new Date(ts)
  const today = startOfDay(new Date())
  const target = startOfDay(d)
  const diffDays = Math.round((today - target) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7) return `${diffDays} дня назад`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('ru-RU', {
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ts
  }
}

/**
 * Группирует историю по дням, в порядке от свежего к старому.
 * Внутри одного дня — порядок как пришёл с бэка (там тоже DESC).
 */
function groupByDay(items: HistoryItem[]): [string, HistoryItem[]][] {
  const map = new Map<string, HistoryItem[]>()
  for (const item of items) {
    const day = dayLabel(item.ts)
    const arr = map.get(day) ?? []
    arr.push(item)
    map.set(day, arr)
  }
  return Array.from(map.entries())
}
