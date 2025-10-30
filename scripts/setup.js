#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Automation Firm Portal...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local file...');
  const envExample = fs.readFileSync(path.join(process.cwd(), 'env.example'), 'utf8');
  fs.writeFileSync(envPath, envExample);
  console.log('✅ .env.local created. Please update the database URL and other settings.\n');
} else {
  console.log('✅ .env.local already exists.\n');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed.\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Generate Prisma client
console.log('🔧 Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated.\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

// Push database schema
console.log('🗄️  Setting up database schema...');
try {
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Database schema created.\n');
} catch (error) {
  console.error('❌ Failed to push database schema:', error.message);
  console.log('Please make sure your PostgreSQL database is running and the DATABASE_URL is correct in .env.local');
  process.exit(1);
}

// Create initial admin user
console.log('👤 Creating initial admin user...');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists.\n');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.user.create({
      data: {
        email: 'admin@automationfirm.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      }
    });

    console.log('✅ Admin user created:');
    console.log('   Email: admin@automationfirm.com');
    console.log('   Password: admin123');
    console.log('   Please change the password after first login!\n');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

console.log('🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Update .env.local with your database URL and other settings');
console.log('2. Run "npm run dev" to start the development server');
console.log('3. Open http://localhost:3000 in your browser');
console.log('4. Login with admin@automationfirm.com / admin123');
console.log('5. Change the admin password and create additional users');
console.log('\nHappy coding! 🚀');


