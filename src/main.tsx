import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Enable spatial window styling
const html = document.documentElement;
html.classList.add('is-spatial');
html.style.setProperty('--xr-background-material', 'translucent');
html.style.backgroundColor = 'transparent';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
