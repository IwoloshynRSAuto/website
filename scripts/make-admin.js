const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function makeUserAdmin() {
  try {
    console.log('🔍 Looking for user: iwoloshyn@rsautomation.net')
    
    // First, let's check if the user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'iwoloshyn@rsautomation.net' }
    })
    
    if (existingUser) {
      console.log('✅ User found:', existingUser.name, `(${existingUser.email})`)
      console.log('📊 Current role:', existingUser.role)
      
      // Update the user to admin
      const updatedUser = await prisma.user.update({
        where: { email: 'iwoloshyn@rsautomation.net' },
        data: { role: 'ADMIN' }
      })
      
      console.log('🎉 Successfully updated user to ADMIN role!')
      console.log('📊 New role:', updatedUser.role)
    } else {
      console.log('❌ User not found in database')
      console.log('')
      console.log('📋 To make yourself an admin:')
      console.log('1. 🌐 Go to http://localhost:3000')
      console.log('2. 🔐 Sign in with Microsoft 365 (iwoloshyn@rsautomation.net)')
      console.log('3. 🔄 Run this script again: node scripts/make-admin.js')
      console.log('')
      console.log('💡 The user will be created automatically when you sign in for the first time')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

makeUserAdmin()
