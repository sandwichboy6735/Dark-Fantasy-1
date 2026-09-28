import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // three + drei make one ~1.2 MB bundle; that's expected for a single scene.
  build: { chunkSizeWarningLimit: 1500 },
});
