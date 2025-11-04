/**
 * Test Script: Complete Parts Dashboard Workflow
 * 
 * This script simulates the full workflow:
 * 1. Create Customer (Greenfield Robotics)
 * 2. Create Quote
 * 3. Create Parts in Database
 * 4. Create Package
 * 5. Create BOM from Package
 * 6. Convert BOM to Assembly
 * 7. Link BOM to Quote
 * 8. Create Time Entry for Ian
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Starting Parts Dashboard Workflow Test...\n')

  try {
    // STEP 1: Create Customer
    console.log('📋 STEP 1: Creating Customer...')
    const customer = await prisma.customer.upsert({
      where: { name: 'Greenfield Robotics' },
      update: {},
      create: {
        name: 'Greenfield Robotics',
        email: 'sarah.nguyen@greenfieldrobotics.com',
        phone: '(212) 555-2398',
      },
    })
    console.log(`✅ Customer created: ${customer.name} (ID: ${customer.id})\n`)

    // Create Contact
    const existingContact = await prisma.contact.findFirst({
      where: {
        customerId: customer.id,
        email: 'sarah.nguyen@greenfieldrobotics.com',
      },
    })
    
    const contact = existingContact || await prisma.contact.create({
      data: {
        customerId: customer.id,
        name: 'Sarah Nguyen',
        email: 'sarah.nguyen@greenfieldrobotics.com',
        phone: '(212) 555-2398',
        position: 'Project Manager',
      },
    })
    console.log(`✅ Contact created: ${contact.name}\n`)

    // STEP 2: Create Parts in Database
    console.log('🔩 STEP 2: Creating Parts in Database...')
    
    const parts = await Promise.all([
      prisma.part.upsert({
        where: { partNumber: 'VNT-BASE-001' },
        update: {},
        create: {
          partNumber: 'VNT-BASE-001',
          manufacturer: 'Vention',
          description: 'Modular Base Plate',
          primarySource: 'Vention Direct',
          purchasePrice: 125.00,
        },
      }),
      prisma.part.upsert({
        where: { partNumber: 'VAC-CUP-75MM' },
        update: {},
        create: {
          partNumber: 'VAC-CUP-75MM',
          manufacturer: 'Festo',
          description: 'Vacuum Cup (75mm)',
          primarySource: 'Festo Distributor',
          purchasePrice: 45.00,
        },
      }),
      prisma.part.upsert({
        where: { partNumber: 'AIR-FIT-1-4NPT' },
        update: {},
        create: {
          partNumber: 'AIR-FIT-1-4NPT',
          manufacturer: 'Parker',
          description: 'Air Fitting (1/4" NPT)',
          primarySource: 'Parker Direct',
          purchasePrice: 12.50,
        },
      }),
      prisma.part.upsert({
        where: { partNumber: 'VAC-PUMP-MOTOR-450' },
        update: {},
        create: {
          partNumber: 'VAC-PUMP-MOTOR-450',
          manufacturer: 'Gardner Denver',
          description: 'Vacuum Pump Motor',
          primarySource: 'Gardner Denver Direct',
          purchasePrice: 450.00,
        },
      }),
      prisma.part.upsert({
        where: { partNumber: 'ELEC-CABLE-CONN' },
        update: {},
        create: {
          partNumber: 'ELEC-CABLE-CONN',
          manufacturer: 'TE Connectivity',
          description: 'Electrical Connector Cable',
          primarySource: 'TE Direct',
          purchasePrice: 15.00,
        },
      }),
      prisma.part.upsert({
        where: { partNumber: 'CONTROL-VALVE-90' },
        update: {},
        create: {
          partNumber: 'CONTROL-VALVE-90',
          manufacturer: 'SMC',
          description: 'Control Valve',
          primarySource: 'SMC Distributor',
          purchasePrice: 90.00,
        },
      }),
    ])
    console.log(`✅ Created ${parts.length} parts in database\n`)

    // STEP 3: Create Package
    console.log('📦 STEP 3: Creating Package...')
    const packageData = await prisma.package.create({
      data: {
        name: 'Vacuum Gripper Base Kit',
        description: 'Includes modular vacuum base and connector components for robotic arm integration.',
        type: 'Package',
        notes: 'Standard components for basic robotic gripper setup.',
        parts: {
          create: [
            { partId: parts[0].id }, // Modular Base Plate
            { partId: parts[1].id }, // Vacuum Cup
            { partId: parts[2].id }, // Air Fitting
          ],
        },
      },
      include: { parts: { include: { part: true } } },
    })
    console.log(`✅ Package created: ${packageData.name} (${packageData.parts.length} parts)\n`)

    // STEP 4: Create Quote
    console.log('🧾 STEP 4: Creating Quote...')
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: 'Q' + String(Math.floor(Math.random() * 9000) + 1000),
        title: 'Vacuum Gripper Automation System',
        description: 'Custom vacuum assembly for packaging automation',
        customerId: customer.id,
        status: 'PENDING',
        validUntil,
        amount: 0, // Will be calculated from BOM
      },
    })
    console.log(`✅ Quote created: ${quote.quoteNumber} - ${quote.title}\n`)

    // STEP 5: Create BOM from Package + Additional Parts
    console.log('🧱 STEP 5: Creating BOM...')
    
    // Calculate totals for BOM parts
    const bomParts = [
      // From package
      { part: parts[0], qty: 1, price: 125.00 }, // Base Plate
      { part: parts[1], qty: 1, price: 45.00 },  // Vacuum Cup
      { part: parts[2], qty: 1, price: 12.50 },  // Air Fitting
      // Additional parts
      { part: parts[3], qty: 1, price: 450.00 }, // Vacuum Pump Motor
      { part: parts[4], qty: 2, price: 15.00 },  // Electrical Cable (x2)
      { part: parts[5], qty: 1, price: 90.00 },  // Control Valve
    ]

    const markupPercent = 25.0
    const estimatedDelivery = new Date()
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 10)

    const bom = await prisma.bOM.create({
      data: {
        name: 'Vacuum Assembly Prototype A',
        status: 'ACTIVE',
        notes: 'Prototype setup for Greenfield Robotics automation line.',
        tags: JSON.stringify([`quote-${quote.quoteNumber}`]),
        parts: {
          create: bomParts.map(bp => {
            const customerPrice = bp.price * bp.qty * (1 + markupPercent / 100)
            return {
              partId: bp.part.id,
              partNumber: bp.part.partNumber,
              quantity: bp.qty,
              purchasePrice: bp.price,
              markupPercent,
              customerPrice,
              manufacturer: bp.part.manufacturer,
              description: bp.part.description,
              source: bp.part.primarySource,
              estimatedDelivery,
              status: 'ORDER',
            }
          }),
        },
      },
      include: { parts: true },
    })

    // Calculate totals
    const totalParts = bom.parts.length
    const totalCost = bom.parts.reduce((sum, p) => sum + (Number(p.purchasePrice) * p.quantity), 0)
    const totalCustomerPrice = bom.parts.reduce((sum, p) => sum + Number(p.customerPrice), 0)

    console.log(`✅ BOM created: ${bom.name}`)
    console.log(`   - Total Parts: ${totalParts}`)
    console.log(`   - Total Cost: $${totalCost.toFixed(2)}`)
    console.log(`   - Customer Price (${markupPercent}% markup): $${totalCustomerPrice.toFixed(2)}\n`)

    // Link BOM to Quote
    await prisma.bOM.update({
      where: { id: bom.id },
      data: { linkedQuoteId: quote.id },
    })

    // Update quote amount
    await prisma.quote.update({
      where: { id: quote.id },
      data: { amount: totalCustomerPrice },
    })

    console.log(`✅ BOM linked to Quote ${quote.quoteNumber}\n`)

    // STEP 6: Create Assembly from BOM
    console.log('⚙️ STEP 6: Creating Assembly from BOM...')
    const assembly = await prisma.package.create({
      data: {
        name: 'Vacuum Assembly v1.0',
        description: 'First production-ready version of the robotic gripper system.',
        type: 'Assembly',
        notes: `Created from BOM: ${bom.name} (BOM ID: ${bom.id})`,
        parts: {
          create: bom.parts.map(bp => ({
            partId: bp.partId || parts.find(p => p.partNumber === bp.partNumber)?.id,
          })).filter(pp => pp.partId), // Only include if partId exists
        },
      },
      include: { parts: true },
    })
    console.log(`✅ Assembly created: ${assembly.name} (${assembly.parts.length} parts)\n`)

    // STEP 7: Create Time Entry for Ian
    console.log('⏱️ STEP 7: Creating Time Entry for Ian...')
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'ian' } },
          { name: { contains: 'Ian' } },
        ],
      },
    })

    if (!user) {
      console.log('⚠️ Ian user not found, skipping time entry...\n')
    } else {
      // Create a job for the time entry
      const job = await prisma.job.create({
        data: {
          jobNumber: 'J' + String(Math.floor(Math.random() * 9000) + 1000),
          title: assembly.name,
          customerId: customer.id,
          status: 'IN_PROGRESS',
          createdById: user.id,
        },
      })

      const laborHours = 2.5
      const hourlyRate = 75.00
      const laborValue = laborHours * hourlyRate

      const timeEntry = await prisma.timeEntry.create({
        data: {
          userId: user.id,
          jobId: job.id,
          date: new Date(),
          regularHours: laborHours,
          overtimeHours: 0,
          billable: true,
          rate: hourlyRate,
          notes: 'Assembly review and quality verification. Verified component alignment and fitment for final assembly delivery.',
        },
      })
      console.log(`✅ Time entry created for ${user.name || user.email}`)
      console.log(`   - Duration: ${laborHours} hours`)
      console.log(`   - Hourly Rate: $${hourlyRate.toFixed(2)}/hr`)
      console.log(`   - Total Labor Value: $${laborValue.toFixed(2)}\n`)
    }

    // STEP 8: Generate Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY - Parts Dashboard Workflow')
    console.log('='.repeat(60))
    console.log(`\n✅ Customer: ${customer.name}`)
    console.log(`   Contact: ${contact.name}`)
    console.log(`   Email: ${contact.email}`)
    console.log(`\n✅ Quote: ${quote.quoteNumber}`)
    console.log(`   Title: ${quote.title}`)
    console.log(`   Status: ${quote.status}`)
    console.log(`   Customer Price: $${totalCustomerPrice.toFixed(2)}`)
    console.log(`\n✅ BOM: ${bom.name}`)
    console.log(`   Status: ${bom.status}`)
    console.log(`   Total Parts: ${totalParts}`)
    console.log(`   Total Purchase Cost: $${totalCost.toFixed(2)}`)
    console.log(`   Total Customer Price: $${totalCustomerPrice.toFixed(2)}`)
    console.log(`   Markup: ${markupPercent}%`)
    console.log(`   Linked Quote: ${quote.quoteNumber}`)
    console.log(`\n✅ Package: ${packageData.name}`)
    console.log(`   Parts: ${packageData.parts.length}`)
    console.log(`\n✅ Assembly: ${assembly.name}`)
    console.log(`   Type: ${assembly.type}`)
    console.log(`   Parts: ${assembly.parts.length}`)
    if (user) {
      const laborHours = 2.5
      const laborRate = 75.00
      const laborValue = laborHours * laborRate
      console.log(`\n✅ Time Tracking (Ian):`)
      console.log(`   Hours: ${laborHours}`)
      console.log(`   Rate: $${laborRate.toFixed(2)}/hr`)
      console.log(`   Total Labor Value: $${laborValue.toFixed(2)}`)
    }
    console.log('\n' + '='.repeat(60))
    console.log('✨ Workflow test completed successfully!')
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Error during workflow test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

