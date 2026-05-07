import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

interface DarkScreenProps {
  children: React.ReactNode
  className?: string
  /** Убрать pb-24 (нужно когда нет BottomNav снизу) */
  noBottomPad?: boolean
}

/**
 * Базовая обёртка для всех экранов мини-аппа: тёмный фон #0a0a0f + три
 * пульсирующих blur-круга в наших brand-цветах (синий/оранжевый/фиолетовый).
 *
 * Parallax: при скролле страницы круги едут с разной скоростью (синий
 * быстрее, фиолетовый медленнее). Глубина усиливает glass-эффект, фон
 * не выглядит статичным. Используем только translateY чтобы избежать
 * лишних reflow — transform идёт на GPU.
 */
export function DarkScreen({ children, className, noBottomPad }: DarkScreenProps) {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      // requestAnimationFrame чтобы не ддосить state — иначе каждое
      // событие scroll вызвало бы ре-рендер.
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setScrollY(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      className={cn(
        'min-h-dvh relative overflow-hidden bg-[#0a0a0f] text-white',
        noBottomPad ? '' : 'pb-24',
        className,
      )}
    >
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-[#1E3A8A]/25 rounded-full blur-[128px] animate-pulse will-change-transform"
          style={{ transform: `translateY(${scrollY * -0.4}px)` }}
        />
        <div
          className="absolute bottom-1/3 -right-20 w-80 h-80 bg-[#F97316]/15 rounded-full blur-[120px] animate-pulse [animation-delay:700ms] will-change-transform"
          style={{ transform: `translateY(${scrollY * -0.2}px)` }}
        />
        <div
          className="absolute top-1/2 -left-20 w-64 h-64 bg-violet-500/15 rounded-full blur-[96px] animate-pulse [animation-delay:1400ms] will-change-transform"
          style={{ transform: `translateY(${scrollY * -0.1}px)` }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/** Glass-карточка — тёмная полупрозрачная панель для контента поверх DarkScreen. */
export function GlassCard({
  children, className, onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'backdrop-blur-2xl bg-white/[0.03] border border-white/[0.06] rounded-2xl',
        'shadow-2xl shadow-black/20',
        onClick && 'cursor-pointer transition-colors hover:bg-white/[0.05] active:scale-[0.99] text-left w-full',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/** Шапка экрана в общем стиле (sticky top + backdrop-blur). */
export function GlassHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 backdrop-blur-xl bg-black/30 border-b border-white/5">
      {children}
    </header>
  )
}
