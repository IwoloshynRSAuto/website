const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');
const ipAddress = '192.168.10.95';
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

  // Generate private key
  console.log('🔑 Generating private key...');
  execSync(`openssl genrsa -out "${keyFile}" 2048`, { stdio: 'inherit' });
  console.log('✅ Private key generated');

  // Generate certificate
  console.log('📜 Generating certificate...');
  const subject = `/CN=${ipAddress}/O=Internal Development/C=US`;
  execSync(`openssl req -new -x509 -key "${keyFile}" -out "${certFile}" -days 365 -subj "${subject}"`, { 
    stdio: 'inherit' 
  });
  console.log('✅ Certificate generated');

  console.log('\n🎉 SSL certificates generated successfully!');
  console.log(`   Private Key: ${keyFile}`);
  console.log(`   Certificate: ${certFile}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Update Azure AD app registration with redirect URIs');
  console.log('   2. Run: npm run dev:https');
  console.log('   3. Navigate to: https://192.168.10.95:3000');

} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  console.log('\n🔧 Manual certificate generation:');
  console.log('   If OpenSSL is not available, you can generate certificates manually:');
  console.log(`   1. openssl genrsa -out "${keyFile}" 2048`);
  console.log(`   2. openssl req -new -x509 -key "${keyFile}" -out "${certFile}" -days 365 -subj "/CN=${ipAddress}"`);
  process.exit(1);
}
