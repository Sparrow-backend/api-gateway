
const {createProxyMiddleware} = require('http-proxy-middleware')
const cors = require('cors')
const dotenv = require('dotenv')
const http = require('http')
const app = require('./src/app')

dotenv.config()

const PORT = process.env.PORT || 8000

const server = http.createServer(app)

async function createServer() {
    try {
        
        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}..`)
        })

        
    } catch(err) {
        console.error('Internal server error: ', err)
        process.exit(1)
    }
}

createServer()


