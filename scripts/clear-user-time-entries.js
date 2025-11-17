const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearUserTimeEntries() {
  try {
    // Find the user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'woloshyn', mode: 'insensitive' } },
          { name: { contains: 'Woloshyn', mode: 'insensitive' } },
          { name: { contains: 'Ian', mode: 'insensitive' } }
        ]
      }
    })
    
    if (!user) {
      console.log('❌ User not found')
      console.log('💡 Searching for users with "woloshyn" or "Ian" in name/email...')
      
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true
        }
      })
      
      console.log('\n📋 Available users:')
      allUsers.forEach(u => {
        console.log(`  - ${u.name || 'No name'} (${u.email}) [ID: ${u.id}]`)
      })
      return
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`)
    console.log(`   User ID: ${user.id}`)
    
    // Count existing entries
    const timesheetCount = await prisma.timesheet.count({
      where: { userId: user.id }
    })
    
    const jobEntryCount = await prisma.jobEntry.count({
      where: {
        timesheet: {
          userId: user.id
        }
      }
    })
    
    const submissionCount = await prisma.timesheetSubmission.count({
      where: { userId: user.id }
    })
    
    const timeEntryCount = await prisma.timeEntry.count({
      where: {
        OR: [
          { userId: user.id },
          { submission: { userId: user.id } }
        ]
      }
    })
    
    console.log('\n📊 Current entries:')
    console.log(`   Timesheets: ${timesheetCount}`)
    console.log(`   Job Entries: ${jobEntryCount}`)
    console.log(`   Submissions: ${submissionCount}`)
    console.log(`   Time Entries: ${timeEntryCount}`)
    
    if (timesheetCount === 0 && jobEntryCount === 0 && submissionCount === 0 && timeEntryCount === 0) {
      console.log('\n✅ No entries to delete')
      return
    }
    
    console.log('\n🗑️  Deleting entries...')
    
    // Delete in correct order (respecting foreign key constraints)
    // 1. Delete time entries (linked to submissions or directly to user)
    const deletedTimeEntries = await prisma.timeEntry.deleteMany({
      where: {
        OR: [
          { userId: user.id },
          { submission: { userId: user.id } }
        ]
      }
    })
    console.log(`   ✅ Deleted ${deletedTimeEntries.count} time entries`)
    
    // 2. Delete job entries (linked to timesheets)
    const deletedJobEntries = await prisma.jobEntry.deleteMany({
      where: {
        timesheet: {
          userId: user.id
        }
      }
    })
    console.log(`   ✅ Deleted ${deletedJobEntries.count} job entries`)
    
    // 3. Delete timesheet submissions (linked to user)
    const deletedSubmissions = await prisma.timesheetSubmission.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${deletedSubmissions.count} timesheet submissions`)
    
    // 4. Delete timesheets (linked to user)
    const deletedTimesheets = await prisma.timesheet.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${deletedTimesheets.count} timesheets`)
    
    console.log('\n🎉 Successfully cleared all time entries for', user.name)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

clearUserTimeEntries()

