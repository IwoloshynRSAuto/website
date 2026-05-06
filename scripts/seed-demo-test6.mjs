/**
 * Populate job TEST6 with demo customer, tasks, deliverables, sample time/PO/milestone rows
 * so Insights and My Work show realistic data.
 *
 * Usage (from repo root, DATABASE_URL available — .env / .env.local auto-loaded):
 *   node scripts/seed-demo-test6.mjs
 *   node scripts/seed-demo-test6.mjs you@company.com
 *
 * Idempotent: removes prior rows tagged with DEMO_SEED_MARKER on this job / related demo PO.
 */
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const DEMO_SEED_MARKER = '[demo insights seed]'
const JOB_NUMBER = 'TEST6'
const CUSTOMER_NAME = 'Demo Customer (Insights Preview)'

function loadDotEnv() {
  const root = process.cwd()
  for (const file of ['.env', '.env.production', '.env.local']) {
    const fp = path.join(root, file)
    if (!fs.existsSync(fp)) continue
    const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    }
  }
}

loadDotEnv()

const prisma = new PrismaClient()

async function main() {
  const assigneeEmail = (process.argv[2] || '').trim()

  let user = assigneeEmail
    ? await prisma.user.findFirst({
        where: { email: { equals: assigneeEmail, mode: 'insensitive' } },
      })
    : null
  if (!user) {
    user = await prisma.user.findFirst({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
    })
  }
  if (!user) {
    console.error('No active user found. Create a user or pass an email: node scripts/seed-demo-test6.mjs you@email.com')
    process.exit(1)
  }

  console.log('Assign tasks/deliverables/booking to:', user.email || user.id)

  let customer = await prisma.customer.findUnique({ where: { name: CUSTOMER_NAME } })
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: CUSTOMER_NAME,
        email: 'demo-insights@example.invalid',
      },
    })
  }

  let job = await prisma.job.findFirst({
    where: { jobNumber: { equals: JOB_NUMBER, mode: 'insensitive' } },
  })

  if (!job) {
    job = await prisma.job.create({
      data: {
        jobNumber: JOB_NUMBER,
        title: 'Demo job — Insights & My Work preview',
        description: `Filled by seed script ${DEMO_SEED_MARKER}`,
        status: 'ACTIVE',
        priority: 'HIGH',
        customerId: customer.id,
        createdById: user.id,
        estimatedHours: 140,
        startDate: new Date(),
        endDate: new Date(Date.now() + 21 * 86400000),
      },
    })
    console.log('Created job', job.jobNumber)
  } else {
    job = await prisma.job.update({
      where: { id: job.id },
      data: {
        title: 'Demo job — Insights & My Work preview',
        customerId: customer.id,
        status: 'ACTIVE',
        estimatedHours: 140,
        description: `Filled by seed script ${DEMO_SEED_MARKER}`,
        endDate: new Date(Date.now() + 21 * 86400000),
      },
    })
    console.log('Updated job', job.jobNumber)
  }

  // --- Cleanup prior demo seed for this job ---
  await prisma.timeEntry.deleteMany({
    where: { jobId: job.id, notes: { contains: DEMO_SEED_MARKER } },
  })
  await prisma.billingMilestone.deleteMany({
    where: { jobId: job.id, notes: { contains: DEMO_SEED_MARKER } },
  })
  await prisma.taskCard.deleteMany({
    where: { jobId: job.id, name: { startsWith: '[Demo]' } },
  })
  await prisma.jobDeliverable.deleteMany({
    where: { jobId: job.id, name: { startsWith: '[Demo]' } },
  })
  await prisma.machineShopAssignment.deleteMany({
    where: { jobId: job.id, notes: { contains: DEMO_SEED_MARKER } },
  })

  const demoPoNumbers = await prisma.purchaseOrder.findMany({
    where: { notes: { contains: DEMO_SEED_MARKER } },
    select: { id: true },
  })
  if (demoPoNumbers.length) {
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: { in: demoPoNumbers.map((p) => p.id) } },
    })
    await prisma.purchaseOrder.deleteMany({
      where: { id: { in: demoPoNumbers.map((p) => p.id) } },
    })
  }

  // --- Tasks ---
  const tasks = [
    {
      name: '[Demo] Kickoff & scope review',
      description: 'Internal demo task',
      status: 'IN_PROGRESS',
      estimatedHours: 4,
      daysDue: 2,
    },
    {
      name: '[Demo] Panel wiring checklist',
      description: 'Demo task for My Work',
      status: 'BACKLOG',
      estimatedHours: 12,
      daysDue: 9,
    },
    {
      name: '[Demo] FAT prep support',
      description: 'Demo task',
      status: 'WAITING',
      estimatedHours: 8,
      daysDue: 14,
    },
  ]

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    await prisma.taskCard.create({
      data: {
        jobId: job.id,
        name: t.name,
        description: `${t.description} ${DEMO_SEED_MARKER}`,
        assignedToId: user.id,
        status: t.status,
        estimatedHours: t.estimatedHours,
        position: i,
        dueDate: new Date(Date.now() + t.daysDue * 86400000),
      },
    })
  }

  // --- Deliverables ---
  const dels = [
    {
      name: '[Demo] Electrical drawings rev A',
      deliverableType: 'DOCUMENT',
      status: 'IN_PROGRESS',
      daysDue: 5,
    },
    {
      name: '[Demo] PLC program backup',
      deliverableType: 'SOFTWARE',
      status: 'PENDING',
      daysDue: 10,
    },
    {
      name: '[Demo] Spare parts kit',
      deliverableType: 'HARDWARE',
      status: 'PENDING',
      daysDue: 18,
    },
  ]

  for (const d of dels) {
    await prisma.jobDeliverable.create({
      data: {
        jobId: job.id,
        name: d.name,
        description: DEMO_SEED_MARKER,
        deliverableType: d.deliverableType,
        status: d.status,
        dueDate: new Date(Date.now() + d.daysDue * 86400000),
        assignedToId: user.id,
      },
    })
  }

  // --- Billable time entries (YTD, spread by month for charts) ---
  const y = new Date().getFullYear()
  const monthsToSeed = Math.min(new Date().getMonth() + 1, 12)
  for (let monthIdx = 0; monthIdx < monthsToSeed; monthIdx++) {
    const hours = 6 + monthIdx * 1.5
    await prisma.timeEntry.create({
      data: {
        jobId: job.id,
        userId: user.id,
        date: new Date(y, monthIdx, 12, 12, 0, 0),
        regularHours: Math.round(hours * 4) / 4,
        overtimeHours: 0,
        billable: true,
        notes: `${DEMO_SEED_MARKER} month ${monthIdx + 1}`,
      },
    })
  }

  // --- Paid billing milestone (Insights paid column) ---
  await prisma.billingMilestone.create({
    data: {
      jobId: job.id,
      amount: 42500,
      percentage: 35,
      status: 'PAID',
      notes: DEMO_SEED_MARKER,
      createdById: user.id,
      invoicedAt: new Date(y, new Date().getMonth(), 1),
    },
  })

  // --- Vendor PO (Insights vendor spend) ---
  let vendor = await prisma.vendor.findFirst({
    where: { name: 'Demo Vendor (Insights Preview)' },
  })
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: 'Demo Vendor (Insights Preview)',
        category: 'SUPPLIES',
        notes: DEMO_SEED_MARKER,
      },
    })
  }

  const poNumber = `DEMO-${JOB_NUMBER}-${y}-${Date.now().toString(36).slice(-6)}`
  await prisma.purchaseOrder.create({
    data: {
      poNumber,
      vendorId: vendor.id,
      jobId: job.id,
      status: 'SENT',
      totalAmount: 18750,
      notes: `${DEMO_SEED_MARKER} for ${JOB_NUMBER}`,
      orderDate: new Date(y, new Date().getMonth(), 3),
      items: {
        create: [
          {
            description: `Demo line item ${DEMO_SEED_MARKER}`,
            quantity: 10,
            unitPrice: 125,
            totalPrice: 1250,
          },
          {
            description: `Demo hardware bundle ${DEMO_SEED_MARKER}`,
            quantity: 5,
            unitPrice: 3500,
            totalPrice: 17500,
          },
        ],
      },
    },
  })

  // --- Machine shop booking (My Work) ---
  let machine = await prisma.shopMachine.findFirst({ where: { isActive: true } })
  if (!machine) {
    machine = await prisma.shopMachine.create({
      data: { name: 'Demo CNC (seed)', sortOrder: 999, isActive: true },
    })
  }

  const bookingStart = new Date(Date.now() + 2 * 86400000)
  bookingStart.setHours(8, 0, 0, 0)
  const bookingEnd = new Date(bookingStart.getTime() + 4 * 3600000)

  await prisma.machineShopAssignment.create({
    data: {
      shopMachineId: machine.id,
      jobId: job.id,
      userId: user.id,
      plannedStart: bookingStart,
      plannedEnd: bookingEnd,
      hours: 4,
      notes: DEMO_SEED_MARKER,
    },
  })

  console.log('')
  console.log('Done. Open:')
  console.log('  /dashboard/insights/metrics and /dashboard/insights/tables')
  console.log('  /dashboard/my-work — tasks, deliverables, machine booking')
  console.log(`  /dashboard/jobs/${job.id} — ${JOB_NUMBER}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
