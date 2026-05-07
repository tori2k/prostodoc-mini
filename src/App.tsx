import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { WelcomePage, SEEN_KEY } from '@/pages/WelcomePage'
import { HomePage } from '@/pages/HomePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ReviewPage } from '@/pages/ReviewPage'
import { GeneratePage } from '@/pages/GeneratePage'
import { ExplainPage } from '@/pages/ExplainPage'
import { EtalonsPage } from '@/pages/EtalonsPage'
import { SubscribePage } from '@/pages/SubscribePage'
import { FeedbackPage } from '@/pages/FeedbackPage'
import { DeleteAccountPage } from '@/pages/DeleteAccountPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ready, expandViewport, isInTelegram } from '@/lib/telegram'
import { initYM, hit, track, EVT } from '@/lib/analytics'

function Root() {
  // Если юзер уже видел welcome — сразу домой
  const seen = localStorage.getItem(SEEN_KEY) === '1'
  return <Navigate to={seen ? '/home' : '/welcome'} replace />
}

/**
 * Чтобы избежать «прыжка» welcome→home при старте, до монтирования
 * HashRouter жёстко проставляем правильный хеш в location. Тогда первый
 * же рендер уже сразу нужный экран — никакого Navigate-replace на лету.
 */
function ensureInitialHash() {
  if (typeof window === 'undefined') return
  const h = window.location.hash
  if (h && h !== '#/' && h !== '#') return  // уже на каком-то экране — не трогаем
  const seen = localStorage.getItem(SEEN_KEY) === '1'
  window.location.hash = seen ? '#/home' : '#/welcome'
}

ensureInitialHash()

export default function App() {
  useEffect(() => {
    // Telegram-WebApp хочет два пинга при старте: ready() убирает лоадер,
    // expand() занимает весь экран чата (без свайпа закрытия).
    ready()
    expandViewport()
    // Метрика: счётчик инициализируется один раз, событие app_open фиксирует
    // факт открытия приложения. Pageview-ы за HashRouter — в RouteTracker.
    initYM()
    track(EVT.app_open)
    // Если юзер пришёл по реф-ссылке (Telegram кладёт ref_X в start_param) —
    // отдельным событием: даст в Метрике источник трафика «по приглашению».
    const sp = window.Telegram?.WebApp?.initDataUnsafe?.start_param
    if (sp && typeof sp === 'string' && sp.startsWith('ref_')) {
      track(EVT.referral_attributed, { ref: sp })
    }
  }, [])

  return (
    // HashRouter — потому что GH Pages не умеет server-side rewrites.
    // /prostodoc-mini/#/home работает везде без 404.
    // ErrorBoundary защищает от чёрных экранов при необработанных
    // исключениях в дереве React.
    <ErrorBoundary>
    {import.meta.env.DEV && !isInTelegram() && <DevBanner />}
    <HashRouter>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/welcome"  element={<WelcomePage />} />
        <Route path="/home"     element={<HomePage />} />
        <Route path="/history"  element={<HistoryPage />} />
        <Route path="/profile"  element={<ProfilePage />} />
        <Route path="/review"   element={<ReviewPage />} />
        <Route path="/subscribe" element={<SubscribePage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/explain"  element={<ExplainPage />} />
        <Route path="/etalons"  element={<EtalonsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/account/delete" element={<DeleteAccountPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </HashRouter>
    </ErrorBoundary>
  )
}

/** Реджистрит pageview каждый раз когда меняется hash-роут — это нужно
 *  для funnel-аналитики в Метрике (HashRouter не триггерит её сам). */
function RouteTracker() {
  const location = useLocation()
  useEffect(() => {
    hit(window.location.href)
  }, [location.pathname])
  return null
}

/**
 * Видна только в dev-сборке (npm run dev) и только если приложение
 * открыто в обычном браузере (не из Telegram). Объясняет почему API
 * отвечает 401 и куда идти за валидным initData.
 */
function DevBanner() {
  return (
    <div className="bg-amber-100 border-b-2 border-amber-300 text-amber-900 px-4 py-2 text-xs flex items-center gap-2">
      <span className="font-bold">DEV</span>
      <span className="flex-1">
        Не из Telegram — API будет 401. Открой <code className="bg-amber-200 px-1 rounded">@ProstoDocxBot</code> на телефоне для реального теста.
      </span>
    </div>
  )
}
