const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function importQuotes() {
  try {
    console.log('🚀 Starting Simple Quotes Import...');
    
    // Get the first admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!adminUser) {
      console.log('❌ No admin user found. Creating a default admin...');
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@automationfirm.com',
          name: 'Admin User',
          password: 'hashed_password',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('✅ Created admin user:', newAdmin.name);
    }
    
    const admin = adminUser || await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log('👤 Using admin:', admin.name);
    
    const csvFilePath = path.join(__dirname, '..', 'JobList(Quotes).csv');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ CSV file not found:', csvFilePath);
      return;
    }
    
    console.log('📄 Reading CSV file...');
    
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
            
            if (!quoteNumber || !customerName) {
              return;
            }
            
            // Check if quote already exists
            const existing = await prisma.job.findFirst({
              where: { jobNumber: quoteNumber }
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
                    isActive: true
                  }
                });
                console.log('   ✅ Created customer:', customerName);
              }
              customers.set(customerName, customer);
            }
            
            // Create job from quote
            await prisma.job.create({
              data: {
                jobNumber: quoteNumber,
                title: description || `Quote ${quoteNumber}`,
                description: description || null,
                status: 'ACTIVE',
                priority: 'MEDIUM',
                createdById: admin.id,
                customerId: customer.id
              }
            });
            
            created++;
            
            if (count % 100 === 0) {
              console.log(`   📊 Processed ${count} records, created ${created} jobs...`);
            }
            
          } catch (error) {
            console.log(`   ⚠️  Error on record ${count}:`, error.message);
          }
        })
        .on('end', async () => {
          const totalJobs = await prisma.job.count();
          const totalCustomers = await prisma.customer.count();
          
          console.log('\n🎉 Import Complete!');
          console.log('='.repeat(40));
          console.log(`📊 Records processed: ${count}`);
          console.log(`✅ Jobs created: ${created}`);
          console.log(`📋 Total jobs in database: ${totalJobs}`);
          console.log(`🏢 Total customers: ${totalCustomers}`);
          console.log(`👤 Admin user: ${admin.name}`);
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importQuotes();
