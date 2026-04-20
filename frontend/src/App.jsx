import { useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import RegisterForm from './components/RegisterForm'
import VerifyForm from './components/VerifyForm'
import ReportForm from './components/ReportForm'
import evidexLogo from './assets/evidex.svg'

import SystemFooter from './components/SystemFooter'

function App() {
  const [currentView, setCurrentView] = useState('home') // home, register, verify

  const renderView = () => {
    switch (currentView) {
      case 'register':
        return <RegisterForm onBack={() => setCurrentView('home')} />
      case 'verify':
        return <VerifyForm onBack={() => setCurrentView('home')} />
      case 'report':
        return <ReportForm onBack={() => setCurrentView('home')} />
      default:
        return <Dashboard onNavigate={setCurrentView} />
    }
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '30px' }}>
      <Navbar />

      {/* Background Watermark/Seal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          border: '18px solid rgba(255,255,255,0.03)',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.32 }}>
            <img
              src={evidexLogo}
              alt="Evidex watermark"
              style={{
                width: '340px',
                height: '340px',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      </div>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', flex: 1, position: 'relative', zIndex: 1, width: '100%' }}>
        {renderView()}
      </main>
      <SystemFooter />
    </div>
  )
}

export default App
