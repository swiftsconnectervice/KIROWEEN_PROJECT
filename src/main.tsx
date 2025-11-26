import * as React from 'react'
import ReactDOM from 'react-dom/client'
import { FrankenStackDashboard } from './ui/FrankenStackDashboard'
import './index.css'

// Aquí es donde deberías importar tu CSS. 
// Por ahora, lo dejaremos sin estilos.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FrankenStackDashboard />
  </React.StrictMode>,
)