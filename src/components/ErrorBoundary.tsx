import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Глобальный fallback для исключений в дереве React.
 * Без него любое необработанное исключение → пустой экран.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-sm text-center">
            <div className="text-5xl mb-4">😵</div>
            <h2 className="text-xl font-bold mb-2">Что-то пошло не так</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Перезагрузите приложение. Если ошибка повторится —
              напишите боту /feedback.
            </p>
            <p className="text-xs text-muted-foreground/70 mb-6 font-mono break-words">
              {this.state.error.message}
            </p>
            <button
              onClick={() => {
                this.setState({ error: null })
                location.hash = '#/home'
              }}
              className="rounded-xl bg-[#1E3A8A] text-white px-6 py-3 font-semibold"
            >
              На главную
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
