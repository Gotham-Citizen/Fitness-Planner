import { httpServerHandler } from 'cloudflare:node'
import { createApp } from './app.js'

const app = createApp()
app.listen(8787)

export default httpServerHandler({ port: 8787 })