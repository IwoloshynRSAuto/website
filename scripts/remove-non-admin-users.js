const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeNonAdminUsers() {
  try {
    console.log('🗑️  Removing all users except admins...');
    
    // Find admin users first
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(admin => {
      console.log(`  - ${admin.name} (${admin.email}) - ${admin.role}`);
    });
    
    // Remove all non-admin users
    const deleteResult = await prisma.user.deleteMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      }
    });
    
    console.log(`✅ Removed ${deleteResult.count} non-admin users`);
    
    // Show final user count
    const finalUserCount = await prisma.user.count();
    const finalAdminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    
    console.log(`📊 Final user counts:`);
    console.log(`  Total users: ${finalUserCount}`);
    console.log(`  Admin users: ${finalAdminCount}`);
    console.log(`  Non-admin users: ${finalUserCount - finalAdminCount}`);
    
  } catch (error) {
    console.error('❌ Error removing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeNonAdminUsers();
