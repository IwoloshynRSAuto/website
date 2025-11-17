const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixNovemberWeekDates() {
  try {
    console.log('Fetching all timesheet submissions...')
    const submissions = await prisma.timesheetSubmission.findMany({
      select: {
        id: true,
        userId: true,
        weekStart: true,
        weekEnd: true,
        type: true,
        timeEntries: {
          select: {
            date: true,
            jobId: true
          }
        }
      }
    })

    console.log(`Found ${submissions.length} submissions to check`)

    // Define the correct week ranges
    // Last week: Nov 9-15 (Sunday Nov 9 to Saturday Nov 15, 2025)
    const lastWeekStart = new Date(Date.UTC(2025, 10, 9, 0, 0, 0, 0)) // Nov 9, 2025
    const lastWeekEnd = new Date(Date.UTC(2025, 10, 15, 23, 59, 59, 999)) // Nov 15, 2025
    
    // This week: Nov 16-22 (Sunday Nov 16 to Saturday Nov 22, 2025)
    const thisWeekStart = new Date(Date.UTC(2025, 10, 16, 0, 0, 0, 0)) // Nov 16, 2025
    const thisWeekEnd = new Date(Date.UTC(2025, 10, 22, 23, 59, 59, 999)) // Nov 22, 2025

    let fixed = 0
    let lastWeekCount = 0
    let thisWeekCount = 0

    for (const submission of submissions) {
      let submissionDates = []
      
      // Get dates from timeEntries if they exist
      if (submission.timeEntries && submission.timeEntries.length > 0) {
        submissionDates = submission.timeEntries.map(te => new Date(te.date))
      } else {
        // For attendance-only submissions, query timesheets for this user and week range
        const currentWeekStart = new Date(submission.weekStart)
        const currentWeekEnd = new Date(submission.weekEnd)
        
        // Query timesheets for this user in the submission's date range
        const timesheets = await prisma.timesheet.findMany({
          where: {
            userId: submission.userId,
            date: {
              gte: currentWeekStart,
              lte: currentWeekEnd
            }
          },
          include: {
            jobEntries: true
          }
        })
        
        // Filter to only attendance-only timesheets (no job entries)
        const attendanceTimesheets = timesheets.filter(ts => 
          !ts.jobEntries || ts.jobEntries.length === 0
        )
        
        if (attendanceTimesheets.length > 0) {
          submissionDates = attendanceTimesheets.map(ts => new Date(ts.date))
        }
      }

      // Determine which week based on entry/timesheet dates
      if (submissionDates.length > 0) {
        const earliestDate = new Date(Math.min(...submissionDates.map(d => d.getTime())))
        const latestDate = new Date(Math.max(...submissionDates.map(d => d.getTime())))
        
        // Normalize dates to UTC date components for comparison (start of day)
        const earliestUTC = new Date(Date.UTC(
          earliestDate.getUTCFullYear(),
          earliestDate.getUTCMonth(),
          earliestDate.getUTCDate(),
          0, 0, 0, 0
        ))
        const latestUTC = new Date(Date.UTC(
          latestDate.getUTCFullYear(),
          latestDate.getUTCMonth(),
          latestDate.getUTCDate(),
          23, 59, 59, 999
        ))
        
        // Check if dates fall within last week (Nov 9-15)
        // Earliest should be >= week start, latest should be <= week end
        const isLastWeek = earliestUTC.getTime() >= lastWeekStart.getTime() && latestUTC.getTime() <= lastWeekEnd.getTime()
        
        // Check if dates fall within this week (Nov 16-22)
        const isThisWeek = earliestUTC.getTime() >= thisWeekStart.getTime() && latestUTC.getTime() <= thisWeekEnd.getTime()
        
        if (isLastWeek) {
          const currentStart = new Date(submission.weekStart)
          const currentEnd = new Date(submission.weekEnd)
          
          if (currentStart.getTime() !== lastWeekStart.getTime() || 
              currentEnd.getTime() !== lastWeekEnd.getTime()) {
            const submissionType = submission.type || (submission.timeEntries && submission.timeEntries.length > 0 ? 'TIME' : 'ATTENDANCE')
            console.log(`Fixing ${submissionType} submission ${submission.id} to last week (Nov 9-15)`)
            
            // Check if another submission already exists with the correct dates
            const existingSubmission = await prisma.timesheetSubmission.findFirst({
              where: {
                userId: submission.userId,
                weekStart: lastWeekStart,
                type: submissionType
              }
            })
            
            if (existingSubmission && existingSubmission.id !== submission.id) {
              console.log(`  Deleting duplicate submission ${submission.id} (another submission ${existingSubmission.id} exists for this week)`)
              await prisma.timesheetSubmission.delete({
                where: { id: submission.id }
              })
            } else {
              await prisma.timesheetSubmission.update({
                where: { id: submission.id },
                data: {
                  weekStart: lastWeekStart,
                  weekEnd: lastWeekEnd
                }
              })
              fixed++
              lastWeekCount++
            }
          }
        } else if (isThisWeek) {
          const currentStart = new Date(submission.weekStart)
          const currentEnd = new Date(submission.weekEnd)
          
          if (currentStart.getTime() !== thisWeekStart.getTime() || 
              currentEnd.getTime() !== thisWeekEnd.getTime()) {
            const submissionType = submission.type || (submission.timeEntries && submission.timeEntries.length > 0 ? 'TIME' : 'ATTENDANCE')
            console.log(`Fixing ${submissionType} submission ${submission.id} to this week (Nov 16-22)`)
            
            // Check if another submission already exists with the correct dates
            const existingSubmission = await prisma.timesheetSubmission.findFirst({
              where: {
                userId: submission.userId,
                weekStart: thisWeekStart,
                type: submissionType
              }
            })
            
            if (existingSubmission && existingSubmission.id !== submission.id) {
              console.log(`  Deleting duplicate submission ${submission.id} (another submission ${existingSubmission.id} exists for this week)`)
              await prisma.timesheetSubmission.delete({
                where: { id: submission.id }
              })
            } else {
              await prisma.timesheetSubmission.update({
                where: { id: submission.id },
                data: {
                  weekStart: thisWeekStart,
                  weekEnd: thisWeekEnd
                }
              })
              fixed++
              thisWeekCount++
            }
          }
        }
      }
    }

    console.log(`\nFixed ${fixed} submissions:`)
    console.log(`  Last week (Nov 9-15): ${lastWeekCount}`)
    console.log(`  This week (Nov 16-22): ${thisWeekCount}`)
  } catch (error) {
    console.error('Error fixing week dates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixNovemberWeekDates()

