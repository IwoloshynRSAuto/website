const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function reimportQuotesOnly() {
  try {
    console.log('📋 Reimporting Quotes Only...');
    
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
    
    const csvFilePath = path.join(__dirname, '..', 'JobList(Quotes).csv');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ JobList(Quotes).csv file not found:', csvFilePath);
      return;
    }
    
    console.log('📄 Reading JobList(Quotes).csv...');
    
    let count = 0;
    let created = 0;
    let skipped = 0;
    let customers = new Map();
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', async (row) => {
          count++;
          
          try {
            const quoteNumber = row['Quote Num.']?.trim();
            const customerName = row['Customer']?.trim();
            const description = row['Description']?.trim();
            const quoteStatus = row['Quote Status']?.trim();
            const maturityDate = row['Maturity Date']?.trim();
            const customerContact = row['Cust. Contact']?.trim();
            const inLDrive = row['In L Drive']?.trim() === 'Yes';
            const latestRev = row['Latest Rev']?.trim();
            
            // Skip if no quote number or customer
            if (!quoteNumber || !customerName) {
              return;
            }
            
            // Only process items that start with 'Q' (quotes)
            if (!quoteNumber.toUpperCase().startsWith('Q')) {
              return;
            }
            
            // Check if quote already exists
            const existing = await prisma.quote.findFirst({
              where: { quoteNumber: quoteNumber }
            });
            
            if (existing) {
              skipped++;
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
            if (maturityDate && maturityDate !== 'N/A' && maturityDate !== '?') {
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
            
            created++;
            
            if (count % 25 === 0) {
              console.log(`   📊 Processed ${count} records, created ${created} quotes, skipped ${skipped}...`);
            }
            
          } catch (error) {
            console.log(`   ⚠️  Error on record ${count}:`, error.message);
          }
        })
        .on('end', async () => {
          const totalQuotes = await prisma.quote.count();
          const totalJobs = await prisma.job.count();
          const totalCustomers = await prisma.customer.count();
          
          console.log('\n🎉 Quotes Reimport Complete!');
          console.log('='.repeat(40));
          console.log(`📊 Records processed: ${count}`);
          console.log(`✅ Quotes created: ${created}`);
          console.log(`⏭️  Quotes skipped (already exist): ${skipped}`);
          console.log(`📋 Total quotes in database: ${totalQuotes}`);
          console.log(`🏗️  Total jobs in database: ${totalJobs}`);
          console.log(`🏢 Total customers: ${totalCustomers}`);
          console.log('\n💡 Note: Duplicates between quotes and jobs are expected');
          console.log('   since jobs are quotes that have moved forward in the process.');
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Quotes reimport failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reimportQuotesOnly();
