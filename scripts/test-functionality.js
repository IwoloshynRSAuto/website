const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFunctionality() {
  try {
    console.log('🧪 Testing Automation Portal Functionality...\n');

    // Test 1: Create a test customer
    console.log('1. Creating test customer...');
    const customer = await prisma.customer.create({
      data: {
        name: 'Test Manufacturing Corp',
        email: 'test@manufacturing.com',
        phone: '555-0123',
        address: '123 Industrial Blvd',
        city: 'Detroit',
        state: 'MI',
        zipCode: '48201',
        country: 'USA'
      }
    });
    console.log('✅ Customer created:', customer.name, '(ID:', customer.id, ')');

    // Test 2: Create a test vendor
    console.log('\n2. Creating test vendor...');
    const vendor = await prisma.vendor.create({
      data: {
        name: 'Industrial Supply Co',
        email: 'sales@industrialsupply.com',
        phone: '555-0456',
        address: '456 Supply Street',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        category: 'Equipment'
      }
    });
    console.log('✅ Vendor created:', vendor.name, '(ID:', vendor.id, ')');

    // Test 3: Create a test job
    console.log('\n3. Creating test job...');
    const job = await prisma.job.create({
      data: {
        jobNumber: 'JOB-001',
        title: 'Conveyor System Installation',
        description: 'Install new conveyor system for production line',
        customerId: customer.id,
        createdById: 'cmgb3osdz000014mzq4aa9w79', // Admin user ID
        priority: 'HIGH',
        quotedAmount: 50000,
        pmStage: 'PM010',
        stageProgress: 0
      }
    });
    console.log('✅ Job created:', job.title, '(ID:', job.id, ')');

    // Test 4: Create a test quote
    console.log('\n4. Creating test quote...');
    const quote = await prisma.quote.create({
      data: {
        quoteNumber: 'Q-001',
        title: 'Conveyor System Quote',
        description: 'Complete conveyor system installation quote',
        customerId: customer.id,
        amount: 50000,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        paymentTerms: 'Net 30',
        estimatedHours: 200,
        hourlyRate: 150,
        materialCost: 30000,
        laborCost: 20000
      }
    });
    console.log('✅ Quote created:', quote.title, '(ID:', quote.id, ')');

    // Test 5: Create a test task
    console.log('\n5. Creating test task...');
    const task = await prisma.task.create({
      data: {
        title: 'Site Survey',
        description: 'Conduct initial site survey for conveyor installation',
        jobId: job.id,
        assignedToId: 'cmgb3osdz000014mzq4aa9w79', // Admin user ID
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'TODO'
      }
    });
    console.log('✅ Task created:', task.title, '(ID:', task.id, ')');

    console.log('\n🎉 All functionality tests passed!');
    console.log('\nTest data created:');
    console.log('- 1 Customer:', customer.name);
    console.log('- 1 Vendor:', vendor.name);
    console.log('- 1 Job:', job.title);
    console.log('- 1 Quote:', quote.title);
    console.log('- 1 Task:', task.title);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFunctionality();

