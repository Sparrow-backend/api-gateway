const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch'); // add this

const app = express()

app.use(cors({
    origin: [
        'https://sparrow.nivakaran.dev',
        'http://localhost:3000',
        'http://nivakaran.dev'
    ]
}))

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    next();
})

app.use(express.json())
app.use(cookieParser())


app.get('/check-cookie', (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({message: 'Unauthorized: No token provided'})
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({role: decoded.role, id: decoded.id})

    } catch(err) {
        console.error('Error in verifying token: ', err.message)
        return res.status(401).json({message: 'Unauthorized: Invalid or expired token'})
    }
})

app.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none'
    });
    res.json({message: 'Logged out successfully!'})
})

app.get('/', (req, res) => {
    res.json({message: "Sparrow: API Gateway"})
})

app.get('/health', (req, res) => {
    res.json({message: "API Gateway is running.."})
})



const proxyRequest = async (req, res, targetUrl) => {
    try {
        const path = req.originalUrl.replace(/^\/api\/[^\/]+/, '') || '/';
        const url = new URL(path, targetUrl);

        const headers = { ...req.headers };
        delete headers['host']; // avoid host mismatch

        const fetchOptions = { method: req.method, headers };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            const bodyString = JSON.stringify(req.body);
            fetchOptions.body = bodyString;
            fetchOptions.headers['Content-Type'] = 'application/json';
            fetchOptions.headers['Content-Length'] = Buffer.byteLength(bodyString).toString();
        }

        console.log(`Proxying ${req.method} ${req.originalUrl} -> ${url.toString()}`);

        const response = await fetch(url.toString(), fetchOptions);
        const contentType = response.headers.get('content-type');

        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            res.setHeader('Set-Cookie', setCookieHeader);
        }

        // Return correct type
        if (typeof data === 'string') {
            res.status(response.status).send(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: 'Proxy request failed',
            message: error.message,
            details: error.cause?.message
        });
    }
};


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

app.use((req, res) => {
    console.warn(`404 Error: ${req.method} ${req.url}`)
    res.status(404).json({message: 'Route not found'})
})

app.use((err, req, res, next) => {
    console.error('Unhandled server error: ', err.stack || err.message)
    res.status(500).json({message: 'Internal Server Error'})
})

module.exports = app