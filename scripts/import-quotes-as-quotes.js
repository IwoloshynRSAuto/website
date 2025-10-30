const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function importQuotesAsQuotes() {
  try {
    console.log('📋 Starting Quotes Import as Quote Entities...');
    
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
      console.log('❌ Quotes CSV file not found:', csvFilePath);
      return;
    }
    
    console.log('📄 Reading Quotes CSV file...');
    
    let count = 0;
    let created = 0;
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
                amount: 0, // Default amount
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
            
            if (count % 50 === 0) {
              console.log(`   📊 Processed ${count} quotes, created ${created} quote entities...`);
            }
            
          } catch (error) {
            console.log(`   ⚠️  Error on record ${count}:`, error.message);
          }
        })
        .on('end', async () => {
          const totalQuotes = await prisma.quote.count();
          const totalCustomers = await prisma.customer.count();
          
          console.log('\n🎉 Quotes Import Complete!');
          console.log('='.repeat(40));
          console.log(`📊 Records processed: ${count}`);
          console.log(`✅ Quotes created: ${created}`);
          console.log(`📋 Total quotes in database: ${totalQuotes}`);
          console.log(`🏢 Total customers: ${totalCustomers}`);
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Quotes import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importQuotesAsQuotes();
