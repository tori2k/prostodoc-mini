import { useNavigate } from 'react-router-dom'
import { Upload, Sparkles, AlertTriangle, Mail, ShieldCheck } from 'lucide-react'

import { haptic } from '@/lib/telegram'

const BASE_URL = import.meta.env.BASE_URL

interface Step {
  icon: React.ElementType
  title: string
  desc: string
}

const STEPS: Step[] = [
  { icon: Upload,        title: 'Загружаете договор',     desc: 'PDF, Word или текст из чата' },
  { icon: Sparkles,      title: 'AI читает за 30 секунд', desc: 'Понимает контекст любого договора' },
  { icon: AlertTriangle, title: 'Видите все риски',       desc: '🔴 опасные · 🟡 спорные · 🟢 нормальные' },
  { icon: Mail,          title: 'Получаете письмо',       desc: 'Готовый текст для контрагента' },
  { icon: ShieldCheck,   title: 'Подписываете без рисков',desc: 'Полный PDF-отчёт остаётся у вас' },
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
    <div className="min-h-dvh bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Декоративные размытые круги — те же brand-цвета, что в DarkScreen */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-[#1E3A8A]/30 blur-[128px] animate-pulse" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 rounded-full bg-[#F97316]/20 blur-[120px] animate-pulse [animation-delay:700ms]" />
        <div className="absolute -bottom-40 left-1/4 w-80 h-80 rounded-full bg-violet-500/20 blur-[96px] animate-pulse [animation-delay:1400ms]" />
      </div>

      <div className="relative px-6 pt-10 pb-6">
        {/* Маскот по центру */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-3xl scale-90" />
            <img
              src={`${BASE_URL}mascot/raccoon-friendly.png`}
              alt="Енот ProstoDoc"
              className="relative w-44 h-44 object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Заголовок */}
        <div className="text-center mb-8">
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/70 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI-юрист в Telegram
          </p>
          <h1 className="text-4xl font-extrabold leading-tight mb-3">
            ProstoDoc
          </h1>
          <p className="text-base text-white/85 max-w-sm mx-auto">
            Защитит вас от плохих договоров за 30 секунд
          </p>
        </div>

        {/* Шаги */}
        <div className="space-y-2.5 mb-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/10 px-4 py-3"
              >
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-semibold leading-tight mb-0.5">
                    {step.title}
                  </p>
                  <p className="text-xs text-white/65 leading-snug">
                    {step.desc}
                  </p>
                </div>
                <div className="text-[11px] font-mono text-white/40 self-center">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={goToHome}
          className="
            w-full h-14 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white font-bold
            shadow-2xl shadow-orange-500/40
            transition-all active:scale-[0.98]
            text-base
          "
        >
          Начать пользоваться →
        </button>

        <p className="text-center text-xs text-white/50 mt-4">
          Первая проверка — бесплатно
        </p>
      </div>
    </div>
  )
}

export { SEEN_KEY }
