/**
 * Setup Test Employee Data
 * Creates a hierarchical employee structure for testing
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function setupTestData() {
  try {
    console.log('🔧 Setting up test employee data...\n')

    // Create managers
    const ceo = await prisma.user.upsert({
      where: { email: 'ceo@rsautomation.net' },
      update: {},
      create: {
        email: 'ceo@rsautomation.net',
        name: 'CEO Manager',
        role: 'ADMIN',
        position: 'Chief Executive Officer',
        isActive: true,
      },
    })

    const engineeringManager = await prisma.user.upsert({
      where: { email: 'eng-manager@rsautomation.net' },
      update: {},
      create: {
        email: 'eng-manager@rsautomation.net',
        name: 'Engineering Manager',
        role: 'PROJECT_MANAGER',
        position: 'Engineering Manager',
        managerId: ceo.id,
        isActive: true,
      },
    })

    const salesManager = await prisma.user.upsert({
      where: { email: 'sales-manager@rsautomation.net' },
      update: {},
      create: {
        email: 'sales-manager@rsautomation.net',
        name: 'Sales Manager',
        role: 'PROJECT_MANAGER',
        position: 'Sales Manager',
        managerId: ceo.id,
        isActive: true,
      },
    })

    // Create engineers under engineering manager
    const engineer1 = await prisma.user.upsert({
      where: { email: 'engineer1@rsautomation.net' },
      update: {},
      create: {
        email: 'engineer1@rsautomation.net',
        name: 'Engineer One',
        role: 'ENGINEER',
        position: 'Senior Engineer',
        managerId: engineeringManager.id,
        isActive: true,
      },
    })

    const engineer2 = await prisma.user.upsert({
      where: { email: 'engineer2@rsautomation.net' },
      update: {},
      create: {
        email: 'engineer2@rsautomation.net',
        name: 'Engineer Two',
        role: 'ENGINEER',
        position: 'Engineer',
        managerId: engineeringManager.id,
        isActive: true,
      },
    })

    // Create technicians
    const technician1 = await prisma.user.upsert({
      where: { email: 'technician1@rsautomation.net' },
      update: {},
      create: {
        email: 'technician1@rsautomation.net',
        name: 'Technician One',
        role: 'TECHNICIAN',
        position: 'Field Technician',
        managerId: engineeringManager.id,
        isActive: true,
      },
    })

    // Create sales people
    const salesperson1 = await prisma.user.upsert({
      where: { email: 'salesperson1@rsautomation.net' },
      update: {},
      create: {
        email: 'salesperson1@rsautomation.net',
        name: 'Salesperson One',
        role: 'SALES',
        position: 'Sales Representative',
        managerId: salesManager.id,
        isActive: true,
      },
    })

    console.log('✅ Test employee hierarchy created:')
    console.log(`   CEO: ${ceo.name} (${ceo.email})`)
    console.log(`   ├─ Engineering Manager: ${engineeringManager.name}`)
    console.log(`   │  ├─ ${engineer1.name}`)
    console.log(`   │  ├─ ${engineer2.name}`)
    console.log(`   │  └─ ${technician1.name}`)
    console.log(`   └─ Sales Manager: ${salesManager.name}`)
    console.log(`      └─ ${salesperson1.name}`)

    // Create some test requests
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // PTO request
    await prisma.timeOffRequest.create({
      data: {
        userId: engineer1.id,
        startDate: nextWeek,
        endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
        requestType: 'VACATION',
        reason: 'Family vacation',
        hours: 24,
        status: 'PENDING',
      },
    })

    // Expense report
    await prisma.expenseReport.create({
      data: {
        userId: technician1.id,
        reportDate: now,
        description: 'Travel expenses for job site visit',
        amount: 150.00,
        category: 'TRAVEL',
        status: 'SUBMITTED',
        submittedAt: now,
      },
    })

    console.log('\n✅ Test requests created:')
    console.log('   - 1 PTO request (pending)')
    console.log('   - 1 Expense report (submitted)')

    console.log('\n✅ Test data setup complete!')
  } catch (error) {
    console.error('❌ Error setting up test data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setupTestData()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

