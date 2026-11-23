import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      input: {
        dashboard: resolve(projectRoot, 'index.html'),
        login: resolve(projectRoot, 'login.html'),
        trainee: resolve(projectRoot, 'trainee.html'),
        program: resolve(projectRoot, 'program.html'),
        sessions: resolve(projectRoot, 'sessions.html'),
        payments: resolve(projectRoot, 'payments.html'),
      },
    },
  },
})