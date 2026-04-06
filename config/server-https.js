// server.js
const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Allow overriding cert paths or host-specific certs via env
const pfxPath = process.env.SSL_PFX_PATH
const pfxPass = process.env.SSL_PFX_PASS
const certHost = process.env.CERT_HOST || 'localhost+1'
const certPath = process.env.SSL_CERT_PATH || `./certs/${certHost}.pem`
const keyPath = process.env.SSL_KEY_PATH || `./certs/${certHost}-key.pem`

const httpsOptions = pfxPath
  ? { pfx: fs.readFileSync(pfxPath), passphrase: pfxPass }
  : { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }

app.prepare().then(() => {
    const port = parseInt(process.env.PORT || '3000', 10)
    const server = createServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    })
    
    // Note: Next.js handles WebSocket upgrades for HMR automatically in dev mode
    // No need to manually handle upgrade events - Next.js's internal dev server handles it
    
    server.listen(port, '0.0.0.0', err => {  // listen on all interfaces
      if (err) throw err
      const publicUrl = process.env.NEXTAUTH_URL || `https://localhost:${port}`
      console.log(`> Ready on ${publicUrl}`)
    })
  })
  
