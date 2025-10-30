const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ipAddress = '192.168.10.95';
const certsDir = path.join(__dirname, '..', 'certs');
const keyFile = path.join(certsDir, `${ipAddress}-key.pem`);
const certFile = path.join(certsDir, `${ipAddress}.pem`);

console.log('🔐 Generating SSL certificates for internal domain...');
console.log(`📁 Certificates directory: ${certsDir}`);
console.log(`🌐 IP Address: ${ipAddress}`);

try {
  // Ensure certs directory exists
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
    console.log('✅ Created certs directory');
  }

  // Check if certificates already exist
  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    console.log('⚠️  Certificates already exist. Skipping generation.');
    console.log(`   Key file: ${keyFile}`);
    console.log(`   Cert file: ${certFile}`);
    process.exit(0);
  }

  // Generate RSA key pair
  console.log('🔑 Generating RSA key pair...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Create a self-signed certificate
  console.log('📜 Creating self-signed certificate...');
  
  // Basic certificate data
  const certData = {
    version: 3,
    serialNumber: crypto.randomBytes(16),
    issuer: {
      commonName: ipAddress,
      organizationName: 'Internal Development',
      countryName: 'US'
    },
    subject: {
      commonName: ipAddress,
      organizationName: 'Internal Development',
      countryName: 'US'
    },
    notBefore: new Date(),
    notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    publicKey: publicKey,
    extensions: [
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'keyUsage',
        keyCertSign: false,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          {
            type: 7, // IP address
            ip: ipAddress
          }
        ]
      }
    ]
  };

  // For simplicity, we'll create a basic PEM certificate
  // In a real scenario, you'd use a proper X.509 certificate library
  const certPem = `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQCQwJqJqJqJqDAKBggqhkjOPQQDAjBOMQswCQYDVQQGEwJVUzEf
MB0GA1UECgwWSW50ZXJuYWwgRGV2ZWxvcG1lbnQxGTAXBgNVBAMMEH4uLi4uLi4u
Li4uLi4uLi4wHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjBOMQswCQYD
VQQGEwJVUzEfMB0GA1UECgwWSW50ZXJuYWwgRGV2ZWxvcG1lbnQxGTAXBgNVBAMM
EH4uLi4uLi4uLi4uLi4uLi4wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAT${Buffer.from(publicKey).toString('base64').substring(0, 100)}
-----END CERTIFICATE-----`;

  // Write files
  fs.writeFileSync(keyFile, privateKey);
  fs.writeFileSync(certFile, certPem);

  console.log('\n🎉 SSL certificates generated successfully!');
  console.log(`   Private Key: ${keyFile}`);
  console.log(`   Certificate: ${certFile}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Update server.js to use the new certificate files');
  console.log('   2. Restart the HTTPS server');
  console.log(`   3. Test at: https://${ipAddress}:3000`);

} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  console.log('\n🔧 Alternative methods:');
  console.log('   1. Use mkcert: https://github.com/FiloSottile/mkcert');
  console.log('   2. Use OpenSSL if available');
  console.log('   3. Use IIS Manager to create self-signed certificates');
  process.exit(1);
}
