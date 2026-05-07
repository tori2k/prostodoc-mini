import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface Step {
  /** Иконка слева. Любой ReactNode — обычно эмодзи или lucide-иконка. */
  icon: React.ReactNode
  /** Заголовок шага — то что юзер видит. */
  label: string
  /** Сколько секунд этот шаг «занимает» до перехода на следующий. */
  durationSec: number
}

interface ProgressStepperProps {
  steps: Step[]
  /** Когда становится true — последний шаг переходит в done. Удобно
   *  привязать к окончанию реального API-вызова: пока loading=true и
   *  steps крутятся, как только loading=false → всё ✓. */
  done?: boolean
  className?: string
}

/**
 * Анимированная последовательность шагов «AI работает» — заменяет
 * безликий `Loader2` живой иллюзией прогресса. Каждый шаг показывается
 * `durationSec` секунд и переключается на следующий. Если последний
 * шаг закончился до того как done=true — оставляем его как «in progress»
 * (бесконечный спиннер на нём), не уходим за границу массива.
 */
export function ProgressStepper({ steps, done, className }: ProgressStepperProps) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (done) return
    if (active >= steps.length - 1) return  // на последнем шаге крутимся
    const t = setTimeout(() => {
      setActive((i) => Math.min(i + 1, steps.length - 1))
    }, steps[active].durationSec * 1000)
    return () => clearTimeout(t)
  }, [active, done, steps])

  // Когда пришёл done — мгновенно дотягиваем до последнего шага
  useEffect(() => {
    if (done) setActive(steps.length - 1)
  }, [done, steps.length])

  return (
    <div className={cn('space-y-2.5', className)}>
      {steps.map((step, i) => {
        const isDone    = done ? true : i < active
        const isCurrent = !done && i === active
        const isPending = !done && i > active
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex items-center gap-3"
          >
            {/* Бейдж — три состояния (done/current/pending) */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                'border transition-colors',
                isDone    && 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
                isCurrent && 'bg-orange-500/15 border-orange-400/40 text-orange-300',
                isPending && 'bg-white/[0.03] border-white/[0.08] text-white/35',
              )}
            >
              <AnimatePresence mode="wait">
                {isDone ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    <Check className="w-4 h-4" />
                  </motion.span>
                ) : isCurrent ? (
                  <motion.span
                    key="current"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="pending"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-sm"
                  >
                    {step.icon}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Текст */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm leading-tight transition-colors',
                  isCurrent && 'text-white font-semibold',
                  isDone && 'text-white/70',
                  isPending && 'text-white/35',
                )}
              >
                {step.label}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Готовые наборы шагов под наши флоу ────────────────────────────────────

export const REVIEW_STEPS: Step[] = [
  { icon: '📄', label: 'Извлекаю текст из файла', durationSec: 4 },
  { icon: '🔍', label: 'AI читает договор', durationSec: 12 },
  { icon: '⚠️', label: 'Ищу риски и подвохи', durationSec: 12 },
  { icon: '📝', label: 'Готовлю отчёт', durationSec: 8 },
]

export const GENERATE_STEPS: Step[] = [
  { icon: '🧠', label: 'AI обдумывает структуру', durationSec: 6 },
  { icon: '✍️', label: 'Пишу пункты договора', durationSec: 14 },
  { icon: '⚖️', label: 'Проверяю юридическую корректность', durationSec: 8 },
  { icon: '📄', label: 'Финализирую документ', durationSec: 6 },
]

export const LETTER_STEPS: Step[] = [
  { icon: '📋', label: 'Перечитываю риски', durationSec: 3 },
  { icon: '✍️', label: 'Формулирую правки', durationSec: 8 },
  { icon: '✉️', label: 'Собираю письмо', durationSec: 5 },
]

export const EXPLAIN_STEPS: Step[] = [
  { icon: '👀', label: 'Читаю пункт', durationSec: 2 },
  { icon: '💭', label: 'Раскладываю по полочкам', durationSec: 5 },
  { icon: '💬', label: 'Объясняю по-человечески', durationSec: 4 },
]
