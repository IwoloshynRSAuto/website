const { PrismaClient } = require('@prisma/client')
const { startOfWeek, endOfWeek } = require('date-fns')

const prisma = new PrismaClient()

async function fixWeekDates() {
  try {
    console.log('Fetching all timesheet submissions...')
    const submissions = await prisma.timesheetSubmission.findMany({
      include: {
        timeEntries: {
          select: {
            date: true,
            jobId: true
          }
        }
      }
    })

    console.log(`Found ${submissions.length} submissions to check`)

    let fixed = 0
    for (const submission of submissions) {
      // Find the earliest and latest dates from timeEntries
      if (submission.timeEntries && submission.timeEntries.length > 0) {
        const dates = submission.timeEntries.map(te => new Date(te.date))
        const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())))
        const latestDate = new Date(Math.max(...dates.map(d => d.getTime())))
        
        // Calculate correct weekStart (Sunday) and weekEnd (Saturday) for the earliest date
        const correctWeekStart = startOfWeek(earliestDate, { weekStartsOn: 0 })
        const correctWeekEnd = endOfWeek(earliestDate, { weekStartsOn: 0 })
        
        // Normalize to UTC using local date components (to avoid timezone shifts)
        const weekStartUTC = new Date(Date.UTC(
          correctWeekStart.getFullYear(),
          correctWeekStart.getMonth(),
          correctWeekStart.getDate(),
          0, 0, 0, 0
        ))
        const weekEndUTC = new Date(Date.UTC(
          correctWeekEnd.getFullYear(),
          correctWeekEnd.getMonth(),
          correctWeekEnd.getDate(),
          23, 59, 59, 999
        ))
        
        // Check if dates need to be fixed
        const currentWeekStart = new Date(submission.weekStart)
        const currentWeekEnd = new Date(submission.weekEnd)
        
        const weekStartNeedsFix = currentWeekStart.getTime() !== weekStartUTC.getTime()
        const weekEndNeedsFix = currentWeekEnd.getTime() !== weekEndUTC.getTime()
        
        if (weekStartNeedsFix || weekEndNeedsFix) {
          console.log(`Fixing submission ${submission.id}:`)
          console.log(`  Current: ${currentWeekStart.toISOString()} - ${currentWeekEnd.toISOString()}`)
          console.log(`  Correct: ${weekStartUTC.toISOString()} - ${weekEndUTC.toISOString()}`)
          
          // Check if another submission exists with the same userId and weekStart
          const existingSubmission = await prisma.timesheetSubmission.findUnique({
            where: {
              userId_weekStart: {
                userId: submission.userId,
                weekStart: weekStartUTC
              }
            }
          })
          
          if (existingSubmission && existingSubmission.id !== submission.id) {
            console.log(`  Warning: Another submission exists for this week (${existingSubmission.id}).`)
            console.log(`  Deleting duplicate submission ${submission.id} and keeping ${existingSubmission.id}`)
            // Delete the duplicate submission
            await prisma.timesheetSubmission.delete({
              where: { id: submission.id }
            })
            console.log(`  Deleted duplicate submission`)
          } else {
            await prisma.timesheetSubmission.update({
              where: { id: submission.id },
              data: {
                weekStart: weekStartUTC,
                weekEnd: weekEndUTC
              }
            })
            
            fixed++
          }
        }
      } else {
        // For submissions without timeEntries, use the stored weekStart to recalculate
        // But first, convert storedWeekStart from UTC back to local to get the actual date
        const storedWeekStart = new Date(submission.weekStart)
        // Create a local date from the UTC date components
        const localWeekStart = new Date(storedWeekStart.getUTCFullYear(), storedWeekStart.getUTCMonth(), storedWeekStart.getUTCDate())
        const correctWeekStart = startOfWeek(localWeekStart, { weekStartsOn: 0 })
        const correctWeekEnd = endOfWeek(localWeekStart, { weekStartsOn: 0 })
        
        const weekStartUTC = new Date(Date.UTC(
          correctWeekStart.getFullYear(),
          correctWeekStart.getMonth(),
          correctWeekStart.getDate(),
          0, 0, 0, 0
        ))
        const weekEndUTC = new Date(Date.UTC(
          correctWeekEnd.getFullYear(),
          correctWeekEnd.getMonth(),
          correctWeekEnd.getDate(),
          23, 59, 59, 999
        ))
        
        const currentWeekStart = new Date(submission.weekStart)
        const currentWeekEnd = new Date(submission.weekEnd)
        
        const weekStartNeedsFix = currentWeekStart.getTime() !== weekStartUTC.getTime()
        const weekEndNeedsFix = currentWeekEnd.getTime() !== weekEndUTC.getTime()
        
        if (weekStartNeedsFix || weekEndNeedsFix) {
          console.log(`Fixing submission ${submission.id} (no timeEntries):`)
          console.log(`  Current: ${currentWeekStart.toISOString()} - ${currentWeekEnd.toISOString()}`)
          console.log(`  Correct: ${weekStartUTC.toISOString()} - ${weekEndUTC.toISOString()}`)
          
          await prisma.timesheetSubmission.update({
            where: { id: submission.id },
            data: {
              weekStart: weekStartUTC,
              weekEnd: weekEndUTC
            }
          })
          
          fixed++
        }
      }
    }

    console.log(`\nFixed ${fixed} submissions`)
  } catch (error) {
    console.error('Error fixing week dates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixWeekDates()

