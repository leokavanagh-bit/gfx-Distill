import { useState, useEffect } from 'react'
import { MainScreen } from './components/MainScreen.jsx'
import { AdminScreen } from './components/AdminScreen.jsx'

export default function App() {
  const [screen, setScreen] = useState('main')

  useEffect(() => {
    window.api.navigation?.onGoAdmin(() => setScreen('admin'))
    window.api.navigation?.onGoMain(() => setScreen('main'))
    return () => {
      window.api.navigation?.removeListeners()
    }
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#1a1a2e', color: '#ccc', minHeight: '100vh' }}>
      {screen === 'admin' && (
        <div style={{ padding: '8px 16px', background: '#0f3460', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setScreen('main')}
            style={{ background: 'none', border: 'none', color: '#e94560', cursor: 'pointer', fontSize: 13 }}
          >
            ← Back to Main
          </button>
          <span style={{ fontSize: 13, color: '#888' }}>Admin Settings</span>
        </div>
      )}
      {screen === 'main' ? <MainScreen /> : <AdminScreen />}
    </div>
  )
}
