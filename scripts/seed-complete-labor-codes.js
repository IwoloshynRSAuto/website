const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Complete list of 28 labor codes from the image
const laborCodes = [
  // Administration Phase (6 codes)
  { code: 'AD', name: 'Paperwork (Timesheets, Email, ETC)', category: 'Administration Phase', hourlyRate: 100.00 },
  { code: 'BR', name: 'Bereavement', category: 'Administration Phase', hourlyRate: 100.00 },
  { code: 'HOL', name: 'Holiday', category: 'Administration Phase', hourlyRate: 100.00 },
  { code: 'IT', name: 'Network / IT Work', category: 'Administration Phase', hourlyRate: 100.00 },
  { code: 'MT', name: 'Buildings and Grounds/Maintenance', category: 'Administration Phase', hourlyRate: 100.00 },
  { code: 'PTD', name: 'Paid Time Off', category: 'Administration Phase', hourlyRate: 100.00 },
  
  // Project Phase (22 codes)
  { code: 'CD', name: 'Controls Engineering', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'CL', name: 'CNC Lathe', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'EE', name: 'Electrical Engineering', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'FB', name: 'Fabrication', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'HM', name: 'Horizontal Mill', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'ME', name: 'Mechanical Engineering', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'MM', name: 'Manual Machining', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'MS', name: 'Machining Services', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'OES', name: 'On-Site Time/Engineering Services', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'OPM', name: 'On-Site Manager/Engineering Services', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'OTS', name: 'On-Site Time/Technical Services', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'OWS', name: 'On-Site Welding Services', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'PB', name: 'Panel Build', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'PM', name: 'Project Management', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'QT', name: 'Quoting', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'SR', name: 'Shipping and Receiving', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'TR', name: 'Travel', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'TRN', name: 'Training', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'VL', name: 'Vertical Mill - Large', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'VM', name: 'Vertical Mill - Small', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'WC', name: 'Welding', category: 'Project Phase', hourlyRate: 100.00 },
  { code: 'WJ', name: 'Waterjet', category: 'Project Phase', hourlyRate: 100.00 }
]

async function seedLaborCodes() {
  try {
    console.log('🌱 Seeding complete labor codes...')
    
    // Clear existing labor codes
    await prisma.laborCode.deleteMany({})
    console.log('✅ Cleared existing labor codes')
    
    // Create all labor codes
    for (const laborCode of laborCodes) {
      const created = await prisma.laborCode.create({
        data: {
          ...laborCode,
          description: `${laborCode.code} - ${laborCode.name}`,
          isActive: true
        }
      })
      console.log(`   📝 Created: ${created.code} - ${created.name}`)
    }
    
    console.log(`✅ Successfully seeded ${laborCodes.length} labor codes`)
    
    // Verify the count
    const count = await prisma.laborCode.count()
    console.log(`📊 Total labor codes in database: ${count}`)
    
  } catch (error) {
    console.error('❌ Error seeding labor codes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seedLaborCodes()
}

module.exports = { seedLaborCodes }

