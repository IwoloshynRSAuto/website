// This is a temporary fix - replace the server.listen section with this
// The issue is Windows binding to IPv6 or localhost only

// Get network IP
const networkInterfaces = os.networkInterfaces();
let networkIP = '192.168.10.70'; // Your known IP
for (const name of Object.keys(networkInterfaces)) {
  for (const iface of networkInterfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      networkIP = iface.address;
      break;
    }
  }
  if (networkIP !== '192.168.10.70') break;
}

// Create two servers: one for localhost, one for network
const PORT = process.env.PORT || 5000;

// Server for network access
const networkServer = app.listen(PORT, networkIP, () => {
  console.log(`🌐 Network server running on http://${networkIP}:${PORT}`);
});

// Server for localhost access  
const localServer = app.listen(PORT + 1, '127.0.0.1', () => {
  console.log(`🏠 Local server running on http://localhost:${PORT + 1}`);
  console.log(`💡 Use port ${PORT + 1} for localhost, port ${PORT} for network`);
});

console.log(`🚀 Servers started:`);
console.log(`   - Network: http://${networkIP}:${PORT}`);
console.log(`   - Local: http://localhost:${PORT + 1}`);

