import { httpServerHandler } from 'cloudflare:node'
import { createApp } from './app.js'
import db from './db.js'

const app = createApp()
app.listen(8787)

export default {
  ...httpServerHandler({ port: 8787 }),
  // Weekly demo reset (cron in wrangler.jsonc, Mondays 03:00 UTC): delete
  // every registered user and their data from the production DB. Local dev
  // sets DEMO_RESET=off in .dev.vars so the local DB is never wiped.
  async scheduled(controller, env) {
    if (String(env.DEMO_RESET ?? '').toLowerCase() === 'off') {
      console.log('Demo reset skipped (DEMO_RESET=off)')
      return
    }
    try {
      const { deletedUsers } = await db.resetDemoData()
      console.log(`Demo reset: cleared ${deletedUsers} user(s) at ${new Date(controller.scheduledTime).toISOString()}`)
    } catch (err) {
      console.error('Weekly demo reset failed:', err)
    }
  },
}
