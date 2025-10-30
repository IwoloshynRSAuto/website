const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getAdminId() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (admin) {
      console.log('Admin User ID:', admin.id);
      return admin.id;
    } else {
      console.log('No admin user found');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

getAdminId();

