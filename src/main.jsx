import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Tell Telegram the app is ready and request the full viewport as early as
// possible — before React mounts — so the WebView doesn't briefly show the
// page at its default small/top-left size before snapping to full screen.
// (App.jsx also calls this again once mounted; both calls are harmless and
// idempotent, this one just removes the head start the old single call lost.)
try {
  const tg0 = window.Telegram?.WebApp;
  tg0?.ready?.();
  tg0?.expand?.();
} catch { /* noop */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
