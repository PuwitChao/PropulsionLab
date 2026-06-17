import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Plotly is the dominant dependency (~4.6 MB). Pin it to its own named
    // chunk so all chart pages share one cached vendor bundle instead of
    // folding it into whichever lazy page loads first.
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('plotly.js') || id.includes('react-plotly.js')) {
            return 'plotly'
          }
        },
      },
    },
  },
})

