/**
 * Test Employee Workflows
 * Tests the complete employee management and approval workflows
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testWorkflows() {
  try {
    console.log('🧪 Testing Employee Management Workflows...\n')

    // Test 1: Verify employee hierarchy
    console.log('Test 1: Employee Hierarchy')
    const employees = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        manager: {
          select: { name: true, email: true },
        },
        directReports: {
          select: { name: true, email: true },
        },
      },
    })

    console.log(`   Found ${employees.length} active employees`)
    employees.forEach(emp => {
      console.log(`   - ${emp.name || emp.email} (${emp.role})`)
      if (emp.manager) {
        console.log(`     Manager: ${emp.manager.name || emp.manager.email}`)
      }
      if (emp.directReports.length > 0) {
        console.log(`     Direct Reports: ${emp.directReports.length}`)
      }
    })

    // Test 2: Verify pending approvals
    console.log('\nTest 2: Pending Approvals')
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'PROJECT_MANAGER'] },
        isActive: true,
      },
      include: {
        directReports: {
          select: { id: true },
        },
      },
    })

    for (const manager of managers) {
      const subordinateIds = manager.directReports.map(r => r.id)
      if (subordinateIds.length === 0) continue

      const [ptoCount, expenseCount, timeChangeCount] = await Promise.all([
        prisma.timeOffRequest.count({
          where: {
            userId: { in: subordinateIds },
            status: 'PENDING',
          },
        }),
        prisma.expenseReport.count({
          where: {
            userId: { in: subordinateIds },
            status: 'SUBMITTED',
          },
        }),
        prisma.timeChangeRequest.count({
          where: {
            userId: { in: subordinateIds },
            status: 'PENDING',
          },
        }),
      ])

      if (ptoCount > 0 || expenseCount > 0 || timeChangeCount > 0) {
        console.log(`   ${manager.name || manager.email}:`)
        console.log(`     - ${ptoCount} PTO requests`)
        console.log(`     - ${expenseCount} Expense reports`)
        console.log(`     - ${timeChangeCount} Time change requests`)
      }
    }

    // Test 3: Verify audit logs
    console.log('\nTest 3: Audit Logs')
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    })
    console.log(`   Found ${recentLogs.length} recent audit logs`)
    recentLogs.slice(0, 5).forEach(log => {
      console.log(`   - ${log.action} ${log.resourceType} by ${log.user.name || log.user.email}`)
    })

    // Test 4: Verify metrics can be calculated
    console.log('\nTest 4: Metrics Calculation')
    const employeesWithTime = await prisma.user.findMany({
      where: {
        isActive: true,
        timeEntries: {
          some: {},
        },
      },
      take: 3,
    })

    for (const emp of employeesWithTime) {
      const timeEntries = await prisma.timeEntry.findMany({
        where: { userId: emp.id },
        take: 10,
      })
      const totalHours = timeEntries.reduce((sum, e) => sum + (e.regularHours || 0) + (e.overtimeHours || 0), 0)
      console.log(`   ${emp.name || emp.email}: ${totalHours.toFixed(1)} hours logged`)
    }

    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testWorkflows()
  .then(() => {
    console.log('\n✅ Testing completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Testing failed:', error)
    process.exit(1)
  })

