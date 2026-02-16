import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Only sync page-level files, not project config
const SYNC_WHITELIST = [
  'src/pages/',
  'src/app.tsx',
  'src/app.config.ts',
  'src/app.scss',
]

function shouldSync(filePath: string): boolean {
  return SYNC_WHITELIST.some(prefix => filePath.startsWith(prefix))
}

export function previewSyncPlugin(): Plugin {
  return {
    name: 'preview-sync',
    configureServer(server) {
      server.middlewares.use('/api/sync-preview', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
        })

        req.on('end', () => {
          try {
            const { files } = JSON.parse(body)
            const previewRoot = path.resolve(__dirname, '../preview-taro')
            const synced: string[] = []

            for (const file of files) {
              if (!shouldSync(file.path)) continue

              const fullPath = path.join(previewRoot, file.path)
              const dir = path.dirname(fullPath)

              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
              }

              fs.writeFileSync(fullPath, file.content, 'utf-8')
              synced.push(file.path)
            }

            console.log(`[preview-sync] Synced ${synced.length} files:`, synced)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, synced }))
          } catch (error) {
            console.error('Sync error:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Sync failed' }))
          }
        })
      })
    }
  }
}
