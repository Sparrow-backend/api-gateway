const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({
    origin: [
        'https://sparrow.nivakaran.dev',
        'http://localhost:3000',
        'http://nivakaran.dev'
    ]
}))

app.use(express.json())

app.get('/', (req, res) => {
    res.json({message: "Sparrow: API Gateway"})
})

app.get('/health', (req, res) => {
    res.json({message: "API Gateway is running.."})
})

// Manual proxy function
const proxyRequest = async (req, res, targetUrl) => {
    try {
        const path = req.originalUrl.replace(/^\/api\/[^\/]+/, '') || '/'
        const url = new URL(path, targetUrl)
        
        const response = await fetch(url.toString(), {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                ...req.headers
            },
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        })

        const data = await response.json()
        res.status(response.status).json(data)
    } catch (error) {
        console.error('Proxy error:', error)
        res.status(500).json({ error: 'Proxy request failed', message: error.message })
    }
}

// Route handlers - use regex for wildcard matching
app.use('/api/consolidations', (req, res) => {
    const target = process.env.CONSOLIDATION_SERVICE_URL || 'https://consolidation-service.vercel.app'
    proxyRequest(req, res, target)
})

app.use('/api/parcels', (req, res) => {
    const target = process.env.PARCEL_SERVICE_URL || 'https://parcel-service-sigma.vercel.app'
    proxyRequest(req, res, target)
})

app.use('/api/users', (req, res) => {
    const target = process.env.USER_SERVICE_URL || 'https://user-service-tau.vercel.app'
    proxyRequest(req, res, target)
})

app.use('/api/warehouses', (req, res) => {
    const target = process.env.WAREHOUSE_SERVICE_URL || 'https://user-service-u11r.vercel.app'
    proxyRequest(req, res, target)
})

module.exports = app