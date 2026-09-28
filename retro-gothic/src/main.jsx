import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/press-start-2p';
import './styles.css';
import App from './App.jsx';
import { live } from './game/live.js';
import { store } from './store.js';
import * as quest from './game/quest.js';

// Development builds only: poke at the game from the console.
if (import.meta.env.DEV) window.__game = { live, store, quest };

// After every chapter module has registered itself.
quest.loadGame();

// Development builds only: `?chapter=2` jumps straight to a chapter.
const jump = Number(new URLSearchParams(window.location.search).get('chapter'));
if (import.meta.env.DEV && jump >= 1 && jump <= quest.LAST_CHAPTER) {
  store.set({ unlocked: Math.max(store.get().unlocked, jump) });
  quest.travelTo(jump);
  store.set({ intro: false });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
