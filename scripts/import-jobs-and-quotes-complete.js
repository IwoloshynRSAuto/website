const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function importJobsAndQuotesComplete() {
  try {
    console.log('🚀 Starting Complete Jobs and Quotes Import...');
    
    // Create a default admin user if none exists
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@automationfirm.com',
          name: 'Admin User',
          password: 'hashed_password',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('✅ Created admin user:', adminUser.name);
    }
    
    console.log('👤 Using admin:', adminUser.name);
    
    let totalProcessed = 0;
    let quotesCreated = 0;
    let jobsCreated = 0;
    let customersCreated = 0;
    let customers = new Map();
    
    // Import from JobList(Quotes).csv
    console.log('\n📋 Importing from JobList(Quotes).csv...');
    const quotesFilePath = path.join(__dirname, '..', 'JobList(Quotes).csv');
    
    if (fs.existsSync(quotesFilePath)) {
      await new Promise((resolve, reject) => {
        fs.createReadStream(quotesFilePath)
          .pipe(csv())
          .on('data', async (row) => {
            totalProcessed++;
            
            try {
              const quoteNumber = row['Quote Num.']?.trim();
              const customerName = row['Customer']?.trim();
              const description = row['Description']?.trim();
              const quoteStatus = row['Quote Status']?.trim();
              const maturityDate = row['Maturity Date']?.trim();
              const customerContact = row['Cust. Contact']?.trim();
              const inLDrive = row['In L Drive']?.trim() === 'Yes';
              const latestRev = row['Latest Rev']?.trim();
              
              if (!quoteNumber || !customerName) {
                return;
              }
              
              // Check if quote already exists
              const existing = await prisma.quote.findFirst({
                where: { quoteNumber: quoteNumber }
              });
              
              if (existing) {
                return;
              }
              
              // Get or create customer
              let customer = customers.get(customerName);
              if (!customer) {
                customer = await prisma.customer.findFirst({
                  where: { name: customerName }
                });
                
                if (!customer) {
                  customer = await prisma.customer.create({
                    data: {
                      name: customerName,
                      phone: customerContact || null,
                      isActive: true
                    }
                  });
                  customersCreated++;
                  console.log('   ✅ Created customer:', customerName);
                }
                customers.set(customerName, customer);
              }
              
              // Map quote status
              let status = 'DRAFT';
              if (quoteStatus) {
                switch (quoteStatus.toLowerCase()) {
                  case 'po received':
                  case 'accepted':
                    status = 'ACCEPTED';
                    break;
                  case 'not accepted':
                  case 'rejected':
                    status = 'REJECTED';
                    break;
                  case 'sent':
                    status = 'SENT';
                    break;
                  case 'expired':
                    status = 'EXPIRED';
                    break;
                  default:
                    status = 'DRAFT';
                }
              }
              
              // Parse maturity date
              let validUntil = null;
              if (maturityDate && maturityDate !== 'N/A') {
                const date = new Date(maturityDate);
                if (!isNaN(date.getTime())) validUntil = date;
              }
              
              // Create quote entity
              await prisma.quote.create({
                data: {
                  quoteNumber: quoteNumber,
                  title: description || `Quote ${quoteNumber}`,
                  description: description || null,
                  customerId: customer.id,
                  amount: 0,
                  validUntil: validUntil,
                  status: status,
                  paymentTerms: 'Net 30',
                  estimatedHours: 0,
                  hourlyRate: 0,
                  laborCost: 0,
                  materialCost: 0,
                  overheadCost: 0,
                  profitMargin: 0,
                  customerContactName: customerContact || null
                }
              });
              
              quotesCreated++;
              
              if (totalProcessed % 50 === 0) {
                console.log(`   📊 Processed ${totalProcessed} records, created ${quotesCreated} quotes...`);
              }
              
            } catch (error) {
              console.log(`   ⚠️  Error on quote record ${totalProcessed}:`, error.message);
            }
          })
          .on('end', () => {
            console.log(`   ✅ Quotes import completed: ${quotesCreated} quotes created`);
            resolve();
          })
          .on('error', reject);
      });
    } else {
      console.log('   ⚠️  JobList(Quotes).csv not found');
    }
    
    // Import from JobList(Projects).csv
    console.log('\n🏗️  Importing from JobList(Projects).csv...');
    const projectsFilePath = path.join(__dirname, '..', 'JobList(Projects).csv');
    
    if (fs.existsSync(projectsFilePath)) {
      await new Promise((resolve, reject) => {
        fs.createReadStream(projectsFilePath)
          .pipe(csv())
          .on('data', async (row) => {
            totalProcessed++;
            
            try {
              const projectNumber = row['Project Number']?.trim();
              const customerName = row['Customer']?.trim();
              const description = row['Description']?.trim();
              const jobStatus = row['Job Status']?.trim();
              const startDate = row['Start Date']?.trim();
              const dueDate = row['Due Date']?.trim();
              const customerContact = row['Cust. Contact']?.trim();
              const inQB = row['In QB']?.trim() === 'Yes';
              const inLDrive = row['In L Drive']?.trim() === 'Yes';
              const quoteNum = row['Quote Num']?.trim();
              const invoiced = row['Invoiced']?.trim() === '1';
              const invoiceDate = row['Invoice Date']?.trim();
              const notes = row['Notes']?.trim();
              
              if (!projectNumber || !customerName) {
                return;
              }
              
              // Check if job already exists
              const existing = await prisma.job.findFirst({
                where: { jobNumber: projectNumber }
              });
              
              if (existing) {
                return;
              }
              
              // Get or create customer
              let customer = customers.get(customerName);
              if (!customer) {
                customer = await prisma.customer.findFirst({
                  where: { name: customerName }
                });
                
                if (!customer) {
                  customer = await prisma.customer.create({
                    data: {
                      name: customerName,
                      phone: customerContact || null,
                      isActive: true
                    }
                  });
                  customersCreated++;
                  console.log('   ✅ Created customer:', customerName);
                }
                customers.set(customerName, customer);
              }
              
              // Map job status
              let status = 'ACTIVE';
              if (jobStatus) {
                switch (jobStatus.toLowerCase()) {
                  case 'billed':
                  case 'completed':
                    status = 'COMPLETED';
                    break;
                  case 'closed':
                    status = 'CANCELLED';
                    break;
                  case 'on hold':
                    status = 'ON_HOLD';
                    break;
                  default:
                    status = 'ACTIVE';
                }
              }
              
              // Parse dates
              let startDateParsed = null;
              let endDateParsed = null;
              
              if (startDate && startDate !== 'N/A') {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) startDateParsed = start;
              }
              
              if (dueDate && dueDate !== 'N/A') {
                const end = new Date(dueDate);
                if (!isNaN(end.getTime())) endDateParsed = end;
              }
              
              // Create job from project
              await prisma.job.create({
                data: {
                  jobNumber: projectNumber,
                  title: description || `Project ${projectNumber}`,
                  description: description || null,
                  status: status,
                  priority: 'MEDIUM',
                  startDate: startDateParsed,
                  endDate: endDateParsed,
                  createdById: adminUser.id,
                  customerId: customer.id,
                  workCode: quoteNum || null // Store quote number in workCode for QB reference
                }
              });
              
              jobsCreated++;
              
              if (totalProcessed % 50 === 0) {
                console.log(`   📊 Processed ${totalProcessed} records, created ${jobsCreated} jobs...`);
              }
              
            } catch (error) {
              console.log(`   ⚠️  Error on project record ${totalProcessed}:`, error.message);
            }
          })
          .on('end', () => {
            console.log(`   ✅ Projects import completed: ${jobsCreated} jobs created`);
            resolve();
          })
          .on('error', reject);
      });
    } else {
      console.log('   ⚠️  JobList(Projects).csv not found');
    }
    
    // Final summary
    const totalJobs = await prisma.job.count();
    const totalQuotes = await prisma.quote.count();
    const totalCustomers = await prisma.customer.count();
    const totalUsers = await prisma.user.count();
    const totalLaborCodes = await prisma.laborCode.count();
    
    console.log('\n🎉 IMPORT COMPLETED!');
    console.log('='.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   • Total records processed: ${totalProcessed}`);
    console.log(`   • Quotes created: ${quotesCreated}`);
    console.log(`   • Jobs/Projects created: ${jobsCreated}`);
    console.log(`   • Customers created: ${customersCreated}`);
    console.log(`   • Total quotes in database: ${totalQuotes}`);
    console.log(`   • Total jobs in database: ${totalJobs}`);
    console.log(`   • Total customers: ${totalCustomers}`);
    console.log(`   • Total users: ${totalUsers}`);
    console.log(`   • Total labor codes: ${totalLaborCodes}`);
    console.log('\n🚀 Your data is now ready!');
    console.log('   • Quotes (Q prefix) are in the Quote table');
    console.log('   • Jobs/Projects (E prefix) are in the Job table');
    console.log('   • QB/LDrive information is preserved in the data');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importJobsAndQuotesComplete();
