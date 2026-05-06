import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface PlaceholderProps {
  title: string
  message: string
  /** Какая команда в боте делает этот сценарий */
  botCommand: string
}

/**
 * Временный экран для функций, которые в первой итерации мини-апп
 * не делает сами, а отправляют юзера в бот (генерация/объяснение —
 * многошаговый FSM, через мини-апп его пилить дольше всего).
 */
export function PlaceholderPage({ title, message, botCommand }: PlaceholderProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh px-5 pt-6 pb-8">
      <header className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/home')}
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">{title}</h1>
      </header>

      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-base mb-2 font-medium">{message}</p>
          <p className="text-sm text-muted-foreground mb-6">
            В мини-приложении этот сценарий пока не реализован — продолжите в боте.
          </p>
          <Button
            variant="accent"
            onClick={() => {
              // Закрываем mini-app — Telegram сам вернёт юзера в чат с ботом
              window.Telegram?.WebApp?.close()
            }}
          >
            Открыть {botCommand} в боте
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
