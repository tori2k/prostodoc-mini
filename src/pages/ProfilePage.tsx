import { useEffect, useState } from 'react'
import { Loader2, Crown, Sparkles } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, type MeResponse } from '@/lib/api'
import { BottomNav } from './HomePage'

const PLAN_LABELS: Record<string, string> = {
  free:   'Бесплатный',
  basic:  'Базовый',
  pro:    'Pro',
  lawyer: 'Юрист',
}

export function ProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me()
      .then(setMe)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh px-5 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Профиль</h1>
      </header>

      {me && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {me.tg.first_name} {me.tg.last_name ?? ''}
                </CardTitle>
                <Badge variant={me.is_paid ? 'accent' : 'outline'}>
                  {me.is_paid && <Crown className="w-3 h-3 mr-1" />}
                  {PLAN_LABELS[me.plan] ?? me.plan}
                </Badge>
              </div>
              {me.tg.username && (
                <p className="text-sm text-muted-foreground">@{me.tg.username}</p>
              )}
            </CardHeader>
            <CardContent>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Лимиты тарифа
              </h3>
              <div className="space-y-2 text-sm">
                <Row label="Проверок в месяц" value={`${me.remaining.review} / ${me.limits.review}`} />
                <Row label="Договоров в месяц" value={`${me.remaining.generate} / ${me.limits.generate}`} />
                {me.limits.explain !== undefined && (
                  <Row label="Объяснений в день"   value={`${me.remaining.explain} / ${me.limits.explain}`} />
                )}
              </div>
            </CardContent>
          </Card>

          {!me.is_paid && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-3">
                  <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Больше проверок и договоров</p>
                    <p className="text-sm text-muted-foreground">
                      Подписка снимает дневные лимиты, добавляет историю на год
                      и эталоны для AI.
                    </p>
                  </div>
                </div>
                <Button variant="accent" className="w-full">
                  Посмотреть тарифы
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <BottomNav active="profile" />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
