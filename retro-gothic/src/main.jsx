import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/press-start-2p';
import './styles.css';
import App from './App.jsx';
import { live } from './game/live.js';
import { store } from './store.js';

// Development builds only: poke at the game from the console.
if (import.meta.env.DEV) window.__game = { live, store };

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
