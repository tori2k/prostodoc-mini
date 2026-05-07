import { useNavigate } from 'react-router-dom'
import { Search, Clock, User } from 'lucide-react'

import { haptic } from '@/lib/telegram'

/**
 * Нижняя навигация на главных экранах: Главная / История / Профиль.
 * fixed bottom + safe-area inset чтобы не съедал нижний bezel iPhone.
 * Вынесен в `components/` чтобы все три экрана импортировали отсюда,
 * а не друг-у-друга через barrel.
 */
export function BottomNav({ active }: { active: 'home' | 'history' | 'profile' }) {
  const navigate = useNavigate()
  const items = [
    { id: 'home',    label: 'Главная', icon: <Search className="w-5 h-5" />, path: '/home' },
    { id: 'history', label: 'История', icon: <Clock  className="w-5 h-5" />, path: '/history' },
    { id: 'profile', label: 'Профиль', icon: <User   className="w-5 h-5" />, path: '/profile' },
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
