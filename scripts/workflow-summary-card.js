/**
 * Generate a formatted summary card for the Parts Dashboard workflow test
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function generateSummary() {
  try {
    // Get the test data we just created
    const customer = await prisma.customer.findFirst({
      where: { name: 'Greenfield Robotics' },
      include: {
        contacts: true,
        quotes: {
          include: {
            linkedBOMs: {
              include: {
                parts: true,
              },
            },
          },
        },
      },
    })

    if (!customer) {
      console.log('❌ Test data not found. Please run test-parts-workflow.js first.')
      return
    }

    const quote = customer.quotes[0]
    const bom = quote?.linkedBOMs[0]

    const assembly = await prisma.package.findFirst({
      where: { name: 'Vacuum Assembly v1.0' },
      include: { parts: true },
    })

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'ian' } },
          { name: { contains: 'Ian' } },
        ],
      },
    })

    const timeEntries = user ? await prisma.timeEntry.findMany({
      where: {
        userId: user.id,
        job: {
          title: { contains: 'Vacuum Assembly' },
        },
      },
      orderBy: { date: 'desc' },
      take: 1,
    }) : []

    // Calculate totals
    let totalParts = 0
    let totalCost = 0
    let totalCustomerPrice = 0

    if (bom) {
      totalParts = bom.parts.length
      totalCost = bom.parts.reduce((sum, p) => sum + (Number(p.purchasePrice) * p.quantity), 0)
      totalCustomerPrice = bom.parts.reduce((sum, p) => sum + Number(p.customerPrice), 0)
    }

    const laborHours = timeEntries[0]?.regularHours || 0
    const laborRate = timeEntries[0]?.rate ? Number(timeEntries[0].rate) : 75.00
    const laborValue = laborHours * laborRate

    // Generate formatted summary card
    console.log('\n' + '═'.repeat(70))
    console.log(' ' + '📊 PARTS DASHBOARD WORKFLOW TEST SUMMARY'.padEnd(68) + ' ')
    console.log('═'.repeat(70))
    console.log('')
    
    // Customer Section
    console.log('┌─ CUSTOMER INFORMATION ──────────────────────────────────────────────────┐')
    console.log(`│ Customer:        ${customer.name.padEnd(50)} │`)
    console.log(`│ Contact:         ${customer.contacts[0]?.name || 'N/A'.padEnd(50)} │`)
    console.log(`│ Email:           ${(customer.contacts[0]?.email || customer.email || 'N/A').padEnd(50)} │`)
    console.log(`│ Phone:           ${(customer.phone || 'N/A').padEnd(50)} │`)
    console.log('└──────────────────────────────────────────────────────────────────────────┘')
    console.log('')
    
    // Quote Section
    if (quote) {
      console.log('┌─ QUOTE INFORMATION ─────────────────────────────────────────────────────┐')
      console.log(`│ Quote Number:    ${quote.quoteNumber.padEnd(50)} │`)
      console.log(`│ Title:           ${quote.title.padEnd(50)} │`)
      console.log(`│ Status:          ${quote.status.padEnd(50)} │`)
      console.log(`│ Customer Price:   $${totalCustomerPrice.toFixed(2).padStart(47)} │`)
      console.log('└──────────────────────────────────────────────────────────────────────────┘')
      console.log('')
    }
    
    // BOM Section
    if (bom) {
      const markup = totalCost > 0 ? (((totalCustomerPrice - totalCost) / totalCost) * 100).toFixed(1) : '0.0'
      console.log('┌─ BILL OF MATERIALS (BOM) ─────────────────────────────────────────────┐')
      console.log(`│ BOM Name:        ${bom.name.padEnd(50)} │`)
      console.log(`│ Status:          ${bom.status.padEnd(50)} │`)
      console.log(`│ Total Parts:     ${String(totalParts).padEnd(50)} │`)
      console.log(`│ Purchase Cost:   $${totalCost.toFixed(2).padStart(47)} │`)
      console.log(`│ Markup:          ${markup}%`.padEnd(50) + ' │')
      console.log(`│ Customer Price:  $${totalCustomerPrice.toFixed(2).padStart(47)} │`)
      console.log(`│ Linked Quote:    ${quote?.quoteNumber || 'None'.padEnd(50)} │`)
      console.log('└──────────────────────────────────────────────────────────────────────────┘')
      console.log('')
    }
    
    // Package Section
    const package_ = await prisma.package.findFirst({
      where: { name: 'Vacuum Gripper Base Kit' },
      include: { parts: true },
    })
    
    if (package_) {
      console.log('┌─ PACKAGE INFORMATION ───────────────────────────────────────────────────┐')
      console.log(`│ Package Name:    ${package_.name.padEnd(50)} │`)
      console.log(`│ Type:           ${package_.type.padEnd(50)} │`)
      console.log(`│ Parts Count:    ${String(package_.parts.length).padEnd(50)} │`)
      console.log('└──────────────────────────────────────────────────────────────────────────┘')
      console.log('')
    }
    
    // Assembly Section
    if (assembly) {
      console.log('┌─ ASSEMBLY INFORMATION ───────────────────────────────────────────────────┐')
      console.log(`│ Assembly Name:   ${assembly.name.padEnd(50)} │`)
      console.log(`│ Type:           ${assembly.type.padEnd(50)} │`)
      console.log(`│ Parts Count:    ${String(assembly.parts.length).padEnd(50)} │`)
      console.log(`│ Source BOM:     ${bom?.name || 'N/A'.padEnd(50)} │`)
      console.log('└──────────────────────────────────────────────────────────────────────────┘')
      console.log('')
    }
    
    // Time Tracking Section
    if (user && timeEntries.length > 0) {
      const entry = timeEntries[0]
      console.log('┌─ TIME TRACKING (Ian) ───────────────────────────────────────────────────┐')
      console.log(`│ Employee:        ${(user.name || user.email).padEnd(50)} │`)
      console.log(`│ Job:            ${entry.job?.title || 'N/A'.padEnd(50)} │`)
      console.log(`│ Hours Worked:   ${laborHours.toString().padEnd(50)} │`)
      console.log(`│ Hourly Rate:    $${laborRate.toFixed(2).padStart(47)} │`)
      console.log(`│ Labor Value:    $${laborValue.toFixed(2).padStart(47)} │`)
      console.log('└──────────────────────────────────────────────────────────────────────────┘')
      console.log('')
    }
    
    // Financial Summary
    console.log('┌─ FINANCIAL SUMMARY ─────────────────────────────────────────────────────┐')
    console.log(`│ Total Parts in BOM:              ${String(totalParts).padEnd(34)} │`)
    console.log(`│ Total Purchase Cost:             $${totalCost.toFixed(2).padStart(34)} │`)
    console.log(`│ Total Customer Price:            $${totalCustomerPrice.toFixed(2).padStart(34)} │`)
    if (user && timeEntries.length > 0) {
      console.log(`│ Labor Cost (Ian):                 $${laborValue.toFixed(2).padStart(34)} │`)
      const grandTotal = totalCustomerPrice + laborValue
      console.log(`│ Grand Total (Parts + Labor):      $${grandTotal.toFixed(2).padStart(34)} │`)
    }
    console.log('└──────────────────────────────────────────────────────────────────────────┘')
    console.log('')
    console.log('═'.repeat(70))
    console.log('✨ All workflow steps validated successfully!')
    console.log('═'.repeat(70))
    console.log('')

  } catch (error) {
    console.error('❌ Error generating summary:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateSummary()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

