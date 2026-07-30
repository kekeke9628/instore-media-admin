import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/instore-media-admin/',
  plugins: [react()],
});
