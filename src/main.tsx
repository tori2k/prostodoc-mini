import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ─── Применяем тёмную тему ──────────────────────────────────────────────
// Telegram WebApp передаёт scheme в window.Telegram.WebApp.colorScheme.
// Если открыто вне TG (dev) — берём системную prefers-color-scheme.
// Класс `.dark` вешается на <html>, в index.css он переопределяет токены.

function applyColorScheme() {
  const tg = window.Telegram?.WebApp
  const isDark = tg?.colorScheme
    ? tg.colorScheme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', isDark)
}

applyColorScheme()

// Реагируем на смену темы (TG присылает событие, или меняется системная)
window.addEventListener('storage', applyColorScheme)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyColorScheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
