const express = require('express')
const {createProxyMiddleware} = require('http-proxy-middleware')
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

app.get('/health', (req, res) => {
    res.json({message: "API Gateway is running.."})
})

app.use('/api/consolidations', createProxyMiddleware({
    target: process.env.CONSOLIDATION_SERVICE_URL || 'http://localhost:8001',
    changeOrigin: true,
    pathRewrite: {'^/api/consolidations': ''}
}))

app.use('/api/parcels', createProxyMiddleware({
    target: process.env.PARCEL_SERVICE_URL || 'http://localhost:8002',
    changeOrigin: true,
    pathRewrite: {'^/api/parcels': ''}
}))

app.use('/api/users', createProxyMiddleware({
    target: process.env.USER_SERVICE_URL || 'http://localhost:8003',
    changeOrigin: true,
    pathRewrite: {'^/api/users': ''}
}))

app.use('/api/warehouses', createProxyMiddleware({
    target: process.env.WAREHOUSE_SERVICE_URL || 'http://localhost:8004',
    changeOrigin: true,
    pathRewrite: {'^/api/warehouses': ''}
}))



module.exports = app
