import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Тёмная тема зафиксирована принудительно — выглядит дороже + совпадает
// с эстетикой Telegram, и нам не нужно поддерживать оба контраста.
// Класс `.dark` вешается один раз и не переключается.
document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
