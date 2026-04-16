import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_IS_ELECTRON': JSON.stringify(process.env.VITE_IS_ELECTRON === 'true'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
})
