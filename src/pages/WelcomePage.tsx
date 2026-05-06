import { useNavigate } from 'react-router-dom'
import { Upload, Sparkles, AlertTriangle, Mail, ShieldCheck } from 'lucide-react'

import RadialOrbitalTimeline, { type OrbitalNode } from '@/components/ui/radial-orbital-timeline'
import { Button } from '@/components/ui/button'
import { haptic } from '@/lib/telegram'

const NODES: OrbitalNode[] = [
  {
    id: 1,
    title: 'Договор',
    date: 'шаг 1',
    content: 'Загрузите PDF, Word или вставьте текст. Поддерживаем сканы с текстовым слоем.',
    category: 'Загрузка',
    icon: Upload,
    relatedIds: [2],
    status: 'completed',
    energy: 100,
  },
  {
    id: 2,
    title: 'AI-юрист',
    date: 'шаг 2',
    content: 'Claude читает договор за 30 секунд. Понимает контекст: услуги, аренда, поставка, NDA.',
    category: 'Анализ',
    icon: Sparkles,
    relatedIds: [1, 3],
    status: 'in-progress',
    energy: 85,
  },
  {
    id: 3,
    title: 'Риски',
    date: 'шаг 3',
    content: 'Карточка-вердикт: 🔴 опасные, 🟡 спорные, 🟢 нормальные пункты — с конкретными цитатами.',
    category: 'Результат',
    icon: AlertTriangle,
    relatedIds: [2, 4],
    status: 'in-progress',
    energy: 70,
  },
  {
    id: 4,
    title: 'Письмо',
    date: 'шаг 4',
    content: 'Готовое письмо контрагенту со списком правок. Тапните по тексту — Telegram скопирует.',
    category: 'Действие',
    icon: Mail,
    relatedIds: [3, 5],
    status: 'pending',
    energy: 55,
  },
  {
    id: 5,
    title: 'Защита',
    date: 'шаг 5',
    content: 'Подписываете договор без скрытых рисков. PDF-отчёт остаётся у вас в истории.',
    category: 'Финал',
    icon: ShieldCheck,
    relatedIds: [4],
    status: 'pending',
    energy: 100,
  },
]

const SEEN_KEY = 'prostodoc:welcomeSeen'

export function WelcomePage() {
  const navigate = useNavigate()

  const goToHome = () => {
    haptic('medium')
    localStorage.setItem(SEEN_KEY, '1')
    navigate('/home')
  }

  return (
    <div className="flex flex-col h-dvh bg-black text-white">
      <div className="flex-1 relative">
        <RadialOrbitalTimeline timelineData={NODES} />
      </div>

      <div className="px-6 pt-4 pb-8 bg-gradient-to-t from-black via-black/95 to-transparent">
        <p className="text-center text-sm text-white/70 mb-4">
          Тапните по планетам, чтобы узнать как ProstoDoc проверяет договоры
        </p>
        <Button
          onClick={goToHome}
          variant="accent"
          size="lg"
          className="w-full font-semibold tracking-wide"
        >
          Начать пользоваться
        </Button>
      </div>
    </div>
  )
}

export { SEEN_KEY }
