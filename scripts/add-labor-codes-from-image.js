const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// All 30 labor codes from the image
const laborCodes = [
  // Administrative Phase (6 codes)
  { code: 'A1', name: 'Engineering (Framework, CAD, ETC)', category: 'Administrative Phase', hourlyRate: 100.00, description: 'A1 - Engineering (Framework, CAD, ETC)' },
  { code: 'A2', name: 'Assessment', category: 'Administrative Phase', hourlyRate: 100.00, description: 'A2 - Assessment' },
  { code: 'H01', name: 'H01BW', category: 'Administrative Phase', hourlyRate: 100.00, description: 'H01 - H01BW' },
  { code: 'IT', name: 'Network / IT hours', category: 'Administrative Phase', hourlyRate: 100.00, description: 'IT - Network / IT hours' },
  { code: 'M1', name: 'Buildings and Grounds Maintenance', category: 'Administrative Phase', hourlyRate: 100.00, description: 'M1 - Buildings and Grounds Maintenance' },
  { code: 'PTG', name: 'Real Time Off', category: 'Administrative Phase', hourlyRate: 100.00, description: 'PTG - Real Time Off' },
  
  // Project Phase (24 codes)
  { code: 'G0', name: 'General Engineering', category: 'Project Phase', hourlyRate: 100.00, description: 'G0 - General Engineering' },
  { code: 'G1', name: 'CNC Lathe', category: 'Project Phase', hourlyRate: 100.00, description: 'G1 - CNC Lathe' },
  { code: 'G4', name: 'General Engineering', category: 'Project Phase', hourlyRate: 100.00, description: 'G4 - General Engineering' },
  { code: 'H6', name: 'H6B001', category: 'Project Phase', hourlyRate: 100.00, description: 'H6 - H6B001' },
  { code: 'LM', name: 'Lasermentals', category: 'Project Phase', hourlyRate: 100.00, description: 'LM - Lasermentals' },
  { code: 'ME', name: 'Mechanical Engineering', category: 'Project Phase', hourlyRate: 100.00, description: 'ME - Mechanical Engineering' },
  { code: 'MM', name: 'Manual Machining', category: 'Project Phase', hourlyRate: 100.00, description: 'MM - Manual Machining' },
  { code: 'MS', name: 'Machining services', category: 'Project Phase', hourlyRate: 100.00, description: 'MS - Machining services' },
  { code: 'OGE', name: 'On-Site Time Engineering Services', category: 'Project Phase', hourlyRate: 100.00, description: 'OGE - On-Site Time Engineering Services' },
  { code: 'OME', name: 'On-Site Managed Engineering Services', category: 'Project Phase', hourlyRate: 100.00, description: 'OME - On-Site Managed Engineering Services' },
  { code: 'OST', name: 'On-Site Time Technical Services', category: 'Project Phase', hourlyRate: 100.00, description: 'OST - On-Site Time Technical Services' },
  { code: 'OWS', name: 'On-Site Welding Services', category: 'Project Phase', hourlyRate: 100.00, description: 'OWS - On-Site Welding Services' },
  { code: 'PM', name: 'Project Management', category: 'Project Phase', hourlyRate: 100.00, description: 'PM - Project Management' },
  { code: 'Q7', name: 'Quality', category: 'Project Phase', hourlyRate: 100.00, description: 'Q7 - Quality' },
  { code: 'S4', name: 'Shipping and Receiving', category: 'Project Phase', hourlyRate: 100.00, description: 'S4 - Shipping and Receiving' },
  { code: 'T4', name: 'Travel', category: 'Project Phase', hourlyRate: 100.00, description: 'T4 - Travel' },
  { code: 'TRN', name: 'Training', category: 'Project Phase', hourlyRate: 100.00, description: 'TRN - Training' },
  { code: 'VL', name: 'VersaMill - Large', category: 'Project Phase', hourlyRate: 100.00, description: 'VL - VersaMill - Large' },
  { code: 'VS', name: 'VersaMill - Small', category: 'Project Phase', hourlyRate: 100.00, description: 'VS - VersaMill - Small' },
  { code: 'WD', name: 'Welding', category: 'Project Phase', hourlyRate: 100.00, description: 'WD - Welding' },
  { code: 'WX', name: 'Weldgen', category: 'Project Phase', hourlyRate: 100.00, description: 'WX - Weldgen' },
  { code: 'A0', name: 'Design', category: 'Project Phase', hourlyRate: 100.00, description: 'A0 - Design' },
  // Project Phase versions of A1 and A2 (codes must be unique)
  { code: 'A1-P', name: 'Engineering (Framework, CAD, ETC)', category: 'Project Phase', hourlyRate: 100.00, description: 'A1 - Engineering (Framework, CAD, ETC)' },
  { code: 'A2-P', name: 'Assessment', category: 'Project Phase', hourlyRate: 100.00, description: 'A2 - Assessment' },
]

async function addLaborCodes() {
  try {
    console.log('🌱 Adding labor codes from image...')
    
    let created = 0
    let skipped = 0
    
    for (const laborCode of laborCodes) {
      // Check if code already exists
      const existing = await prisma.laborCode.findUnique({
        where: { code: laborCode.code }
      })
      
      if (existing) {
        // Update existing code with new data
        await prisma.laborCode.update({
          where: { code: laborCode.code },
          data: {
            name: laborCode.name,
            category: laborCode.category,
            hourlyRate: laborCode.hourlyRate,
            description: laborCode.description,
            isActive: true
          }
        })
        console.log(`   🔄 Updated: ${laborCode.code} - ${laborCode.name}`)
        skipped++
      } else {
        // Create new code
        await prisma.laborCode.create({
          data: {
            ...laborCode,
            isActive: true
          }
        })
        console.log(`   ✅ Created: ${laborCode.code} - ${laborCode.name}`)
        created++
      }
    }
    
    const total = await prisma.laborCode.count()
    console.log(`\n✅ Labor codes processed!`)
    console.log(`   Created: ${created}`)
    console.log(`   Updated: ${skipped}`)
    console.log(`   Total labor codes in database: ${total}`)
    
  } catch (error) {
    console.error('❌ Error adding labor codes:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  addLaborCodes()
}

module.exports = { addLaborCodes }

