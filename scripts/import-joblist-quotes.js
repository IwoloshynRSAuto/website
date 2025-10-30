const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function importJobListQuotes() {
  try {
    console.log('📋 Starting JobList(Quotes) Import...\n');
    
    const quotes = [];
    const customers = new Map();
    const users = new Map();
    
    // First, create or get the admin user
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
    }
    
    console.log(`✅ Admin user ready: ${adminUser.name}`);
    
    // Read and parse the CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream('./JobList(Quotes).csv')
        .pipe(csv())
        .on('data', (row) => {
          // Skip empty rows
          if (!row['Quote Num.'] || !row['Customer']) return;
          
          // Create customer entry
          const customerName = row['Customer'].trim();
          if (!customers.has(customerName)) {
            customers.set(customerName, {
              name: customerName,
              email: row['Cust. Contact'] ? `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com` : null,
              phone: null,
              address: null,
              city: null,
              state: null,
              zipCode: null,
              country: 'USA',
              isActive: true
            });
          }
          
          // Create user entry for Created By
          const createdBy = row['Created By'].trim();
          if (!users.has(createdBy)) {
            users.set(createdBy, {
              email: `${createdBy.toLowerCase()}@automationfirm.com`,
              name: createdBy,
              password: 'hashed_password',
              role: 'USER',
              isActive: true
            });
          }
          
          // Create quote entry
          const quote = {
            quoteNumber: row['Quote Num.'].trim(),
            title: row['Description'] || `Quote ${row['Quote Num.']}`,
            description: row['Description'] || '',
            customerName: customerName,
            createdBy: createdBy,
            contactPerson: row['Cust. Contact'] || null,
            startDate: row['Start Date'] ? new Date(row['Start Date']) : null,
            dueDate: row['Due Date'] ? new Date(row['Due Date']) : null,
            maturityDate: row['Maturity Date'] ? new Date(row['Maturity Date']) : null,
            status: mapQuoteStatus(row['Quote Status']),
            inLDrive: row['In L Drive'] === 'Yes',
            latestRev: row['Latest Rev'] || null,
            amount: 0, // We'll need to add amounts later
            validUntil: row['Maturity Date'] ? new Date(row['Maturity Date']) : null
          };
          
          quotes.push(quote);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 Parsed ${quotes.length} quotes and ${customers.size} unique customers`);
    
    // Create users first
    console.log('\n👥 Creating users...');
    const userMap = new Map();
    for (const [userName, userData] of users) {
      try {
        let user = await prisma.user.findFirst({
          where: { email: userData.email }
        });
        
        if (!user) {
          user = await prisma.user.create({
            data: userData
          });
          console.log(`   ✅ Created user: ${user.name}`);
        } else {
          console.log(`   ℹ️  User exists: ${user.name}`);
        }
        
        userMap.set(userName, user);
      } catch (error) {
        console.log(`   ❌ Error creating user ${userName}: ${error.message}`);
      }
    }
    
    // Create customers
    console.log('\n🏢 Creating customers...');
    const customerMap = new Map();
    for (const [customerName, customerData] of customers) {
      try {
        let customer = await prisma.customer.findFirst({
          where: { name: customerName }
        });
        
        if (!customer) {
          customer = await prisma.customer.create({
            data: customerData
          });
          console.log(`   ✅ Created customer: ${customer.name}`);
        } else {
          console.log(`   ℹ️  Customer exists: ${customer.name}`);
        }
        
        customerMap.set(customerName, customer);
      } catch (error) {
        console.log(`   ❌ Error creating customer ${customerName}: ${error.message}`);
      }
    }
    
    // Create quotes
    console.log('\n💰 Creating quotes...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const quoteData of quotes) {
      try {
        // Check if quote already exists
        const existingQuote = await prisma.quote.findFirst({
          where: { quoteNumber: quoteData.quoteNumber }
        });
        
        if (existingQuote) {
          console.log(`   ℹ️  Quote exists: ${quoteData.quoteNumber}`);
          continue;
        }
        
        const customer = customerMap.get(quoteData.customerName);
        const createdByUser = userMap.get(quoteData.createdBy) || adminUser;
        
        if (!customer) {
          console.log(`   ❌ Customer not found: ${quoteData.customerName}`);
          errorCount++;
          continue;
        }
        
        const quote = await prisma.quote.create({
          data: {
            quoteNumber: quoteData.quoteNumber,
            title: quoteData.title,
            description: quoteData.description,
            customerId: customer.id,
            amount: quoteData.amount,
            validUntil: quoteData.validUntil,
            status: quoteData.status,
            paymentTerms: 'Net 30',
            estimatedHours: 0,
            hourlyRate: 0,
            laborCost: 0,
            materialCost: 0,
            overheadCost: 0,
            profitMargin: 0
          }
        });
        
        console.log(`   ✅ Created quote: ${quote.quoteNumber} - ${quote.title}`);
        successCount++;
        
      } catch (error) {
        console.log(`   ❌ Error creating quote ${quoteData.quoteNumber}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 IMPORT COMPLETED!');
    console.log(`✅ Successfully created: ${successCount} quotes`);
    console.log(`❌ Errors: ${errorCount} quotes`);
    console.log(`👥 Users: ${userMap.size}`);
    console.log(`🏢 Customers: ${customerMap.size}`);
    console.log('\n🚀 Your quotes are now available in the portal!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

function mapQuoteStatus(status) {
  if (!status) return 'DRAFT';
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('po received') || statusLower.includes('accepted')) {
    return 'ACCEPTED';
  } else if (statusLower.includes('not accepted') || statusLower.includes('rejected')) {
    return 'REJECTED';
  } else if (statusLower.includes('sent')) {
    return 'SENT';
  } else if (statusLower.includes('expired')) {
    return 'EXPIRED';
  } else {
    return 'DRAFT';
  }
}

importJobListQuotes();





