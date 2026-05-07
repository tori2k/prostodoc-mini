import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import { WelcomePage, SEEN_KEY } from '@/pages/WelcomePage'
import { HomePage } from '@/pages/HomePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ReviewPage } from '@/pages/ReviewPage'
import { GeneratePage } from '@/pages/GeneratePage'
import { ExplainPage } from '@/pages/ExplainPage'
import { SubscribePage } from '@/pages/SubscribePage'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ready, expandViewport } from '@/lib/telegram'

function Root() {
  // Если юзер уже видел welcome — сразу домой
  const seen = localStorage.getItem(SEEN_KEY) === '1'
  return <Navigate to={seen ? '/home' : '/welcome'} replace />
}

export default function App() {
  useEffect(() => {
    // Telegram-WebApp хочет два пинга при старте: ready() убирает лоадер,
    // expand() занимает весь экран чата (без свайпа закрытия).
    ready()
    expandViewport()
  }, [])

  return (
    // HashRouter — потому что GH Pages не умеет server-side rewrites.
    // /prostodoc-mini/#/home работает везде без 404.
    // ErrorBoundary защищает от чёрных экранов при необработанных
    // исключениях в дереве React.
    <ErrorBoundary>
    <HashRouter>
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
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </HashRouter>
    </ErrorBoundary>
  )
}
