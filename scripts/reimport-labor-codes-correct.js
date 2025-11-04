const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// All labor codes from the current image (28 codes total)
const laborCodes = [
  // Administration Phase (6 codes)
  { code: 'AD', name: 'Paperwork (Timesheets, Email, ETC)', category: 'Administration Phase', hourlyRate: 100.00, description: 'AD - Paperwork (Timesheets, Email, ETC)' },
  { code: 'BR', name: 'Bereavement', category: 'Administration Phase', hourlyRate: 100.00, description: 'BR - Bereavement' },
  { code: 'HOL', name: 'Holiday', category: 'Administration Phase', hourlyRate: 100.00, description: 'HOL - Holiday' },
  { code: 'IT', name: 'Network / IT Work', category: 'Administration Phase', hourlyRate: 100.00, description: 'IT - Network / IT Work' },
  { code: 'MT', name: 'Buildings and Grounds/Maintenance', category: 'Administration Phase', hourlyRate: 100.00, description: 'MT - Buildings and Grounds/Maintenance' },
  { code: 'PTD', name: 'Paid Time Off', category: 'Administration Phase', hourlyRate: 100.00, description: 'PTD - Paid Time Off' },
  
  // Project Phase (22 codes)
  { code: 'CD', name: 'Controls Engineering', category: 'Project Phase', hourlyRate: 100.00, description: 'CD - Controls Engineering' },
  { code: 'CL', name: 'CNC Lathe', category: 'Project Phase', hourlyRate: 100.00, description: 'CL - CNC Lathe' },
  { code: 'EE', name: 'Electrical Engineering', category: 'Project Phase', hourlyRate: 100.00, description: 'EE - Electrical Engineering' },
  { code: 'FB', name: 'Fabrication', category: 'Project Phase', hourlyRate: 100.00, description: 'FB - Fabrication' },
  { code: 'HM', name: 'Horizontal Mill', category: 'Project Phase', hourlyRate: 100.00, description: 'HM - Horizontal Mill' },
  { code: 'ME', name: 'Mechanical Engineering', category: 'Project Phase', hourlyRate: 100.00, description: 'ME - Mechanical Engineering' },
  { code: 'MM', name: 'Manual Machining', category: 'Project Phase', hourlyRate: 100.00, description: 'MM - Manual Machining' },
  { code: 'MS', name: 'Machining Services', category: 'Project Phase', hourlyRate: 100.00, description: 'MS - Machining Services' },
  { code: 'OES', name: 'On-Site Time/Engineering Services', category: 'Project Phase', hourlyRate: 100.00, description: 'OES - On-Site Time/Engineering Services' },
  { code: 'OPM', name: 'On-Site Manager/Engineering Services', category: 'Project Phase', hourlyRate: 100.00, description: 'OPM - On-Site Manager/Engineering Services' },
  { code: 'OTS', name: 'On-Site Time/Technical Services', category: 'Project Phase', hourlyRate: 100.00, description: 'OTS - On-Site Time/Technical Services' },
  { code: 'OWS', name: 'On-Site Welding Services', category: 'Project Phase', hourlyRate: 100.00, description: 'OWS - On-Site Welding Services' },
  { code: 'PB', name: 'Panel Build', category: 'Project Phase', hourlyRate: 100.00, description: 'PB - Panel Build' },
  { code: 'PM', name: 'Project Management', category: 'Project Phase', hourlyRate: 100.00, description: 'PM - Project Management' },
  { code: 'QT', name: 'Quoting', category: 'Project Phase', hourlyRate: 100.00, description: 'QT - Quoting' },
  { code: 'SR', name: 'Shipping and Receiving', category: 'Project Phase', hourlyRate: 100.00, description: 'SR - Shipping and Receiving' },
  { code: 'TR', name: 'Travel', category: 'Project Phase', hourlyRate: 100.00, description: 'TR - Travel' },
  { code: 'TRN', name: 'Training', category: 'Project Phase', hourlyRate: 100.00, description: 'TRN - Training' },
  { code: 'VL', name: 'Vertical Mill - Large', category: 'Project Phase', hourlyRate: 100.00, description: 'VL - Vertical Mill - Large' },
  { code: 'VM', name: 'Vertical Mill - Small', category: 'Project Phase', hourlyRate: 100.00, description: 'VM - Vertical Mill - Small' },
  { code: 'WC', name: 'Welding', category: 'Project Phase', hourlyRate: 100.00, description: 'WC - Welding' },
  { code: 'WJ', name: 'Waterjet', category: 'Project Phase', hourlyRate: 100.00, description: 'WJ - Waterjet' },
]

async function reimportLaborCodes() {
  try {
    console.log('🗑️  Removing all existing labor codes...')
    
    // Delete all existing labor codes
    const deleted = await prisma.laborCode.deleteMany({})
    console.log(`   ✅ Deleted ${deleted.count} existing labor codes`)
    
    console.log(`\n🌱 Creating ${laborCodes.length} new labor codes...`)
    
    // Create all new labor codes
    for (const laborCode of laborCodes) {
      await prisma.laborCode.create({
        data: {
          ...laborCode,
          isActive: true
        }
      })
      console.log(`   ✅ Created: ${laborCode.code} - ${laborCode.name}`)
    }
    
    const total = await prisma.laborCode.count()
    console.log(`\n✅ Successfully reimported labor codes!`)
    console.log(`   Total labor codes in database: ${total}`)
    
  } catch (error) {
    console.error('❌ Error reimporting labor codes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  reimportLaborCodes()
}

module.exports = { reimportLaborCodes }

