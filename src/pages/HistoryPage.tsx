import { useEffect, useState } from 'react'
import { Loader2, FileSearch, FilePen, BookOpen } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, type HistoryItem } from '@/lib/api'
import { BottomNav } from './HomePage'

const ICONS = {
  review:   FileSearch,
  generate: FilePen,
  explain:  BookOpen,
} as const

const LABELS = {
  review:   'Проверка',
  generate: 'Создание',
  explain:  'Объяснение',
} as const

export function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.history(50)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-dvh px-5 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">История</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Все ваши проверки и созданные договоры
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, i) => {
            const Icon = ICONS[item.action] ?? FileSearch
            const label = LABELS[item.action] ?? item.action
            return (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="text-primary mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(item.ts)}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {item.title}
                      </p>
                      {item.summary && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {item.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">Здесь пока пусто</p>
            <p className="text-xs text-muted-foreground mt-2">
              Сделайте первую проверку договора — она появится здесь
            </p>
          </CardContent>
        </Card>
      )}

      <BottomNav active="history" />
    </div>
  )
}

function formatDate(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ts
  }
}
