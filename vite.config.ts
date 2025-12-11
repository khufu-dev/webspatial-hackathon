import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webspatial from '@webspatial/vite-plugin'
import { createHtmlPlugin } from 'vite-plugin-html'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  base: '/',
  plugins: [
    mkcert(),
    react({
      jsxImportSource: '@webspatial/react-sdk'  // Required for spatial components
    }),
    webspatial({
      mode: process.env.XR_ENV === 'avp' ? 'avp' as const : undefined,
      outputDir: ""
    }),
    createHtmlPlugin({
      inject: { data: { XR_ENV: process.env.XR_ENV } }
    })
  ],
  server: { host: '0.0.0.0' }
})
