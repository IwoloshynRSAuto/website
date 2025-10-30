const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function importProjectsAsJobs() {
  try {
    console.log('🏗️  Starting Projects Import as Jobs...');
    
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
    
    const csvFilePath = path.join(__dirname, '..', 'JobList(Projects).csv');
    
    if (!fs.existsSync(csvFilePath)) {
      console.log('❌ Projects CSV file not found:', csvFilePath);
      return;
    }
    
    console.log('📄 Reading Projects CSV file...');
    
    let count = 0;
    let created = 0;
    let customers = new Map();
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', async (row) => {
          count++;
          
          try {
            const projectNumber = row['Project Number']?.trim();
            const customerName = row['Customer']?.trim();
            const description = row['Description']?.trim();
            const jobStatus = row['Job Status']?.trim();
            const startDate = row['Start Date']?.trim();
            const dueDate = row['Due Date']?.trim();
            
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
                    isActive: true
                  }
                });
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
                customerId: customer.id
              }
            });
            
            created++;
            
            if (count % 50 === 0) {
              console.log(`   📊 Processed ${count} projects, created ${created} jobs...`);
            }
            
          } catch (error) {
            console.log(`   ⚠️  Error on record ${count}:`, error.message);
          }
        })
        .on('end', async () => {
          const totalJobs = await prisma.job.count();
          const totalCustomers = await prisma.customer.count();
          
          console.log('\n🎉 Projects Import Complete!');
          console.log('='.repeat(40));
          console.log(`📊 Records processed: ${count}`);
          console.log(`✅ Jobs created: ${created}`);
          console.log(`📋 Total jobs in database: ${totalJobs}`);
          console.log(`🏢 Total customers: ${totalCustomers}`);
          
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Projects import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importProjectsAsJobs();
