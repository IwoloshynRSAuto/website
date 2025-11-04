const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAdminStatus() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'iwoloshyn@rsautomation.net' },
      select: {
        email: true,
        role: true,
        name: true,
        isActive: true
      }
    })

    if (user) {
      console.log('✅ User found in database:')
      console.log('  Email:', user.email)
      console.log('  Name:', user.name)
      console.log('  Role:', user.role)
      console.log('  Active:', user.isActive)
      
      if (user.role === 'ADMIN') {
        console.log('\n✅ User has ADMIN role in database')
        console.log('⚠️  If Admin dashboard still not visible, you may need to:')
        console.log('   1. Sign out and sign back in to refresh the session token')
        console.log('   2. Clear browser cookies/cache')
      } else {
        console.log('\n❌ User does NOT have ADMIN role')
        console.log('   Current role:', user.role)
        console.log('   Run: node scripts/make-admin.js')
      }
    } else {
      console.log('❌ User not found in database')
    }

    // Check parts table
    try {
      const partsCount = await prisma.part.count()
      console.log('\n✅ Parts table exists')
      console.log('  Total parts:', partsCount)
    } catch (error) {
      console.log('\n❌ Parts table does not exist or error:', error.message)
      console.log('   Run: npx prisma migrate dev')
      console.log('   Then: npx prisma generate')
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminStatus()

