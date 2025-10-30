const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists.');
      console.log('   Email:', existingAdmin.email);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@automationfirm.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Email: admin@automationfirm.com');
    console.log('   Password: admin123');
    console.log('   ⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

