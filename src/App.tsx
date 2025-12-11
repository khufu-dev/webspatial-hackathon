import { useState } from 'react'
import './App.css'
import { openScene } from './utils/xr'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="header">
        <h1>Welcome to WebSpatial</h1>
        <p className="subtitle">Build immersive spatial web apps for Apple Vision Pro</p>
      </header>

      <main className="main">
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            Count: {count}
          </button>
          <p>Click the button to test interactivity</p>
        </div>

        <div className="card">
          <button
            onClick={() => openScene('demo-scene', '/demo', { width: 800, height: 600 })}
          >
            Open Demo Scene
          </button>
          <p>Open a new spatial window</p>
        </div>
      </main>

      <footer className="footer">
        <p>
          Built with <a href="https://webspatial.dev" target="_blank" rel="noopener noreferrer">WebSpatial</a> + React + Vite
        </p>
      </footer>
    </div>
  )
}

export default App
