const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }
    
    console.log(`📥 Importing data from: ${filePath}`);
    
    const importData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Clear existing data first (in correct order to respect foreign keys)
    console.log('🗑️  Clearing existing data...');
    await prisma.timeEntry.deleteMany();
    await prisma.timesheetSubmission.deleteMany();
    await prisma.jobLaborEstimate.deleteMany();
    await prisma.engineeringChangeOrder.deleteMany();
    await prisma.bOMPart.deleteMany();
    await prisma.bOM.deleteMany();
    await prisma.packagePart.deleteMany();
    await prisma.package.deleteMany();
    await prisma.partRelation.deleteMany();
    await prisma.part.deleteMany();
    await prisma.partsService.deleteMany();
    await prisma.laborCode.deleteMany();
    await prisma.job.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    
    // Import in order to respect foreign key constraints
    if (importData.users && importData.users.length > 0) {
      console.log(`📥 Importing ${importData.users.length} users...`);
      for (const user of importData.users) {
        await prisma.user.create({ data: user });
      }
    }
    
    if (importData.customers && importData.customers.length > 0) {
      console.log(`📥 Importing ${importData.customers.length} customers...`);
      for (const customer of importData.customers) {
        await prisma.customer.create({ data: customer });
      }
    }
    
    if (importData.laborCodes && importData.laborCodes.length > 0) {
      console.log(`📥 Importing ${importData.laborCodes.length} labor codes...`);
      for (const laborCode of importData.laborCodes) {
        await prisma.laborCode.create({ data: laborCode });
      }
    }
    
    // Import quotes before jobs (jobs reference quotes)
    if (importData.quotes && importData.quotes.length > 0) {
      console.log(`📥 Importing ${importData.quotes.length} quotes...`);
      for (const quote of importData.quotes) {
        await prisma.quote.create({ data: quote });
      }
    }
    
    if (importData.jobs && importData.jobs.length > 0) {
      console.log(`📥 Importing ${importData.jobs.length} jobs...`);
      for (const job of importData.jobs) {
        await prisma.job.create({ data: job });
      }
    }
    
    if (importData.timesheetSubmissions && importData.timesheetSubmissions.length > 0) {
      console.log(`📥 Importing ${importData.timesheetSubmissions.length} timesheet submissions...`);
      for (const submission of importData.timesheetSubmissions) {
        await prisma.timesheetSubmission.create({ data: submission });
      }
    }
    
    if (importData.timeEntries && importData.timeEntries.length > 0) {
      console.log(`📥 Importing ${importData.timeEntries.length} time entries...`);
      for (const timeEntry of importData.timeEntries) {
        await prisma.timeEntry.create({ data: timeEntry });
      }
    }
    
    // Import Parts data (before BOMs and Packages)
    if (importData.parts && importData.parts.length > 0) {
      console.log(`📥 Importing ${importData.parts.length} parts...`);
      for (const part of importData.parts) {
        await prisma.part.create({ data: part });
      }
    }
    
    // Import Packages (depends on Parts)
    if (importData.packages && importData.packages.length > 0) {
      console.log(`📥 Importing ${importData.packages.length} packages...`);
      for (const pkg of importData.packages) {
        await prisma.package.create({ data: pkg });
      }
    }
    
    // Import Package Parts (depends on Packages and Parts)
    if (importData.packageParts && importData.packageParts.length > 0) {
      console.log(`📥 Importing ${importData.packageParts.length} package parts...`);
      for (const packagePart of importData.packageParts) {
        await prisma.packagePart.create({ data: packagePart });
      }
    }
    
    // Import BOMs (depends on Quotes)
    if (importData.boms && importData.boms.length > 0) {
      console.log(`📥 Importing ${importData.boms.length} BOMs...`);
      for (const bom of importData.boms) {
        await prisma.bOM.create({ data: bom });
      }
    }
    
    // Import BOM Parts (depends on BOMs and Parts)
    if (importData.bomParts && importData.bomParts.length > 0) {
      console.log(`📥 Importing ${importData.bomParts.length} BOM parts...`);
      for (const bomPart of importData.bomParts) {
        await prisma.bOMPart.create({ data: bomPart });
      }
    }
    
    // Import Part Relations (depends on Parts)
    if (importData.partRelations && importData.partRelations.length > 0) {
      console.log(`📥 Importing ${importData.partRelations.length} part relations...`);
      for (const relation of importData.partRelations) {
        await prisma.partRelation.create({ data: relation });
      }
    }
    
    // Import Parts Services
    if (importData.partsServices && importData.partsServices.length > 0) {
      console.log(`📥 Importing ${importData.partsServices.length} parts services...`);
      for (const partsService of importData.partsServices) {
        await prisma.partsService.create({ data: partsService });
      }
    }
    
    // Import Contacts (depends on Customers)
    if (importData.contacts && importData.contacts.length > 0) {
      console.log(`📥 Importing ${importData.contacts.length} contacts...`);
      for (const contact of importData.contacts) {
        await prisma.contact.create({ data: contact });
      }
    }
    
    // Import Job Labor Estimates (depends on Jobs and Labor Codes)
    if (importData.jobLaborEstimates && importData.jobLaborEstimates.length > 0) {
      console.log(`📥 Importing ${importData.jobLaborEstimates.length} job labor estimates...`);
      for (const estimate of importData.jobLaborEstimates) {
        await prisma.jobLaborEstimate.create({ data: estimate });
      }
    }
    
    // Import Engineering Change Orders (depends on Jobs and Users)
    if (importData.engineeringChangeOrders && importData.engineeringChangeOrders.length > 0) {
      console.log(`📥 Importing ${importData.engineeringChangeOrders.length} engineering change orders...`);
      for (const eco of importData.engineeringChangeOrders) {
        await prisma.engineeringChangeOrder.create({ data: eco });
      }
    }
    
    console.log('🎉 Data imported successfully!');
    
  } catch (error) {
    console.error('❌ Error importing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
  console.log('Usage: node import-data.js <path-to-export-file>');
  console.log('Example: node import-data.js exports/database-export-2024-01-20.json');
  process.exit(1);
}

importData(filePath);
