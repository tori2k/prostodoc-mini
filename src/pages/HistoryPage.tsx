import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileSearch, FilePen, BookOpen, Sparkles,
} from 'lucide-react'

import { DarkScreen } from '@/components/DarkScreen'
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
  review:   { icon: FileSearch, label: 'Проверка',   bg: 'bg-blue-500/15 border-blue-500/25',       color: 'text-blue-300' },
  generate: { icon: FilePen,    label: 'Создание',   bg: 'bg-orange-500/15 border-orange-500/25',   color: 'text-orange-300' },
  explain:  { icon: BookOpen,   label: 'Объяснение', bg: 'bg-emerald-500/15 border-emerald-500/25', color: 'text-emerald-300' },
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
    <DarkScreen>
      <motion.section
        className="px-5 pt-10 pb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs uppercase tracking-wider text-white/55 mb-1">История</p>
        <h1 className="text-2xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/55">
          Все ваши действия
        </h1>
        <p className="text-sm text-white/45 mt-1.5">
          Проверки, созданные договоры, объяснения
        </p>
      </motion.section>

      <div className="px-5">
        {loading ? (
          <div className="space-y-2">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
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
                <h3 className="text-xs uppercase tracking-wider text-white/45 font-semibold px-1 mb-2">
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
    </DarkScreen>
  )
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const meta = ACTION_META[item.action] ?? ACTION_META.review
  const Icon = meta.icon
  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-wider font-bold text-white/55">
            {meta.label}
          </span>
          <span className="text-[11px] text-white/40">
            · {formatTime(item.ts)}
          </span>
        </div>
        <p className="text-sm font-semibold leading-snug truncate text-white">
          {item.title}
        </p>
        {item.summary && item.summary !== '—' && (
          <p className="text-xs text-white/45 mt-1 line-clamp-2">
            {item.summary}
          </p>
        )}
      </div>
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4 flex items-start gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-3 w-20 bg-white/10 rounded mb-2" />
        <div className="h-4 w-full max-w-[14rem] bg-white/10 rounded mb-2" />
        <div className="h-3 w-32 bg-white/10 rounded" />
      </div>
    </div>
  )
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-8 text-center">
      <img
        src={`${BASE_URL}mascot/raccoon-friendly.png`}
        alt=""
        className="w-24 h-24 mx-auto mb-3 object-contain drop-shadow-2xl"
      />
      <h3 className="text-base font-bold mb-1">Здесь пока пусто</h3>
      <p className="text-sm text-white/45 mb-5 max-w-xs mx-auto">
        Сделайте первую проверку договора — она появится тут
      </p>
      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white font-semibold text-sm shadow-2xl shadow-orange-500/30 active:scale-[0.99]"
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
