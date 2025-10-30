// server.js
const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const httpsOptions = {
  key: fs.readFileSync('./certs/localhost+1-key.pem'),
  cert: fs.readFileSync('./certs/localhost+1.pem')
}

app.prepare().then(() => {
    createServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    }).listen(3000, '0.0.0.0', err => {  // listen on all interfaces
      if (err) throw err
      console.log('> Ready on https://192.168.10.95:3000')
    })
  })
  
