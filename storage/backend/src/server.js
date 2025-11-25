import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';

// Import routes
import listingsRouter from './routes/listings.js';
import listingsV2Router from './routes/listings-v2.js';
import ebayRouter from './routes/ebay.js';
import settingsRouter from './routes/settings.js';
import aiRouter from './routes/ai.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://192.168.10.70:5000", "http://localhost:5000", "http://localhost:5001"],
    },
  },
}));
// CORS configuration - allow local network access and development
const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin');
      return callback(null, true);
    }
    
    console.log('[CORS] Request from origin:', origin);
    
    // Allow localhost and local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x, etc.)
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || 
        /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) {
      console.log('[CORS] Allowing local network origin');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('[CORS] Allowing configured origin');
      callback(null, true);
    } else {
      // In development, allow all origins for easier testing
      const allow = process.env.NODE_ENV !== 'production';
      console.log(`[CORS] ${allow ? 'Allowing' : 'Blocking'} origin (development mode)`);
      callback(null, allow);
    }
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads - with CORS headers for images
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for image requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(join(__dirname, '../uploads')));

// Static files for listings folder structure
app.use('/listings', (req, res, next) => {
  // Set CORS headers for image requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(join(__dirname, '../listings')));

// Routes
app.use('/api/listings', listingsRouter);
app.use('/api/listing', listingsV2Router); // New simplified workflow
app.use('/api/ebay', ebayRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

// Start server - bind directly to Wi-Fi IP
// Get network IP - explicitly prefer Wi-Fi interface
const networkInterfaces = os.networkInterfaces();
let networkIP = '192.168.10.70'; // Default to Wi-Fi IP
let foundWiFi = false;

// First, try to find Wi-Fi interface specifically
for (const name of Object.keys(networkInterfaces)) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('wi-fi') || nameLower.includes('wifi') || nameLower.includes('wireless') || nameLower.includes('wlan')) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkIP = iface.address;
        foundWiFi = true;
        console.log(`📡 Found Wi-Fi interface: ${name} - ${networkIP}`);
        break;
      }
    }
    if (foundWiFi) break;
  }
}

// If Wi-Fi not found, look for 192.168.10.x (your Wi-Fi subnet)
if (!foundWiFi) {
  for (const name of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.10.')) {
        networkIP = iface.address;
        console.log(`📡 Found 192.168.10.x interface: ${name} - ${networkIP}`);
        foundWiFi = true;
        break;
      }
    }
    if (foundWiFi) break;
  }
}

// Fallback to first non-internal IPv4 if Wi-Fi still not found
if (!foundWiFi) {
  for (const name of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkIP = iface.address;
        console.log(`⚠️ Wi-Fi not found, using: ${name} - ${networkIP}`);
        break;
      }
    }
    if (networkIP !== '192.168.10.70') break;
  }
}

// Create server on network IP for network access
const networkServer = app.listen(PORT, networkIP, () => {
  console.log(`🌐 Network server running on http://${networkIP}:${PORT}`);
  console.log(`💡 Access from other devices: http://${networkIP}:${PORT}`);
});

// Also create server on localhost for local access (PC)
// Use a separate Express app instance to avoid conflicts
const localApp = express();
localApp.use(helmet());
localApp.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
localApp.use(morgan('dev'));
localApp.use(express.json());
localApp.use(express.urlencoded({ extended: true }));
localApp.use('/uploads', express.static(join(__dirname, '../uploads')));
localApp.use('/api/listings', listingsRouter);
localApp.use('/api/ebay', ebayRouter);
localApp.use('/api/settings', settingsRouter);
localApp.use('/api/ai', aiRouter);
localApp.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const localServer = localApp.listen(PORT + 1, '127.0.0.1', () => {
  console.log(`🏠 Local server running on http://localhost:${PORT + 1}`);
});

console.log(`🚀 Servers started:`);
console.log(`   - Network (mobile): http://${networkIP}:${PORT}`);
console.log(`   - Local (computer): http://localhost:${PORT + 1}`);
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

export default app;
