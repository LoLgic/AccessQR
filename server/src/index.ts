import { createApp } from './app.js'
import { config } from './config.js'
import { pool } from './db.js'

const app = createApp()
const server = app.listen(config.port, () => {
  console.log(`AccessQR API escuchando en http://localhost:${config.port} (${config.nodeEnv})`)
})

function shutdown() {
  server.close(() => {
    pool.end().finally(() => process.exit(0))
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
