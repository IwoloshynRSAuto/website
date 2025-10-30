const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLaborCodes() {
  try {
    console.log('🔍 Checking labor codes status...');
    
    const count = await prisma.laborCode.count();
    console.log(`📊 Total labor codes in database: ${count}`);
    
    if (count > 0) {
      const codes = await prisma.laborCode.findMany({
        select: {
          code: true,
          name: true,
          category: true,
          hourlyRate: true,
          isActive: true
        },
        orderBy: { code: 'asc' }
      });
      
      console.log('\n📝 All labor codes:');
      codes.forEach(code => {
        console.log(`  ${code.code} - ${code.name} (${code.category}) - $${code.hourlyRate}`);
      });
      
      // Group by category
      const byCategory = codes.reduce((acc, code) => {
        acc[code.category] = (acc[code.category] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📋 Summary by category:');
      Object.entries(byCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} codes`);
      });
    } else {
      console.log('❌ No labor codes found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking labor codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLaborCodes();
