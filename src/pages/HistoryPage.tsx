import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileSearch, FilePen, BookOpen, Sparkles, X,
} from 'lucide-react'

import { DarkScreen } from '@/components/DarkScreen'
import { api, type HistoryItem, type HistoryItemDetail } from '@/lib/api'
import { haptic, showAlert } from '@/lib/telegram'
import { humanError } from '@/lib/errors'
import { sanitize } from '@/lib/sanitize'
import { track, EVT } from '@/lib/analytics'
import { BottomNav } from '@/components/BottomNav'

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
  const [opened, setOpened] = useState<HistoryItemDetail | null>(null)
  const [openLoading, setOpenLoading] = useState(false)

  useEffect(() => {
    track(EVT.history_opened)
    api.history(100)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const onOpen = async (item: HistoryItem) => {
    haptic('light')
    track(EVT.history_item_opened, { action: item.action })
    setOpenLoading(true)
    try {
      const detail = await api.historyItem(item.id)
      if (!detail.payload) {
        // Старая запись (до миграции) или action без payload — фолбэк
        showAlert('Эта запись была сделана до того как мы начали хранить полный текст. Прогоните заново, чтобы получить вердикт.')
        return
      }
      setOpened(detail)
    } catch (e) {
      showAlert(humanError(e, 'history'))
    } finally {
      setOpenLoading(false)
    }
  }

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
                    <HistoryRow
                      key={`${day}-${i}`}
                      item={item}
                      loading={openLoading}
                      onOpen={() => onOpen(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="history" />

      {opened && (
        <HistoryDetailModal
          item={opened}
          onClose={() => setOpened(null)}
        />
      )}
    </DarkScreen>
  )
}

function HistoryRow({
  item, loading, onOpen,
}: {
  item: HistoryItem
  loading: boolean
  onOpen: () => void
}) {
  const meta = ACTION_META[item.action] ?? ACTION_META.review
  const Icon = meta.icon
  return (
    <button
      onClick={onOpen}
      disabled={loading}
      className="w-full text-left rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-4 flex items-start gap-3 transition-colors hover:bg-white/[0.07] active:scale-[0.99] disabled:opacity-60"
    >
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
    </button>
  )
}

function HistoryDetailModal({
  item, onClose,
}: {
  item: HistoryItemDetail
  onClose: () => void
}) {
  // Простая «бумажка» — показываем raw HTML результата на белом листе.
  // Для полноценного вердикта со счётчиками/хиро лучше прогнать договор
  // заново — здесь главное «вспомнить что было», не повторять весь UX.
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-[#0f0f15] border-t border-white/10 sm:border w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[90dvh] flex flex-col shadow-2xl"
      >
        <header className="px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/55">
              {ACTION_META[item.action]?.label ?? 'Запись'} · {formatTime(item.ts)}
            </p>
            <h3 className="text-base font-bold text-white truncate">{item.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 ml-3 rounded-lg hover:bg-white/5 text-white/55"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="doc-surface rounded-xl border border-white/15 p-4 shadow-2xl">
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitize(item.payload || '') }}
            />
          </div>
        </div>
      </motion.div>
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

// Intl.RelativeTimeFormat решает русские склонения автоматически:
// 1 → «1 день назад», 2-4 → «N дня назад», 5-20 → «N дней назад» и т.д.
const _rtf = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto' })

function dayLabel(ts: string): string {
  const d = new Date(ts)
  const today = startOfDay(new Date())
  const target = startOfDay(d)
  const diffDays = Math.round((today - target) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7) {
    // RelativeTimeFormat корректно склоняет: «2 дня назад», «5 дней назад»
    return _rtf.format(-diffDays, 'day')
  }
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
