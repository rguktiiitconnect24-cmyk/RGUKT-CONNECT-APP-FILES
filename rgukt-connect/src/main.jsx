import App from '../../admin-panel/src/App';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
