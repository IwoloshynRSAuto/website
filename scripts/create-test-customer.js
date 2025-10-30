const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestCustomer() {
  try {
    // Check if test customer already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: { name: 'Test Customer' }
    });

    if (existingCustomer) {
      console.log('✅ Test customer already exists.');
      console.log('   ID:', existingCustomer.id);
      console.log('   Name:', existingCustomer.name);
      return existingCustomer.id;
    }

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        email: 'test@customer.com',
        phone: '555-0123',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA',
        isActive: true,
      }
    });

    console.log('✅ Test customer created successfully!');
    console.log('   ID:', customer.id);
    console.log('   Name:', customer.name);
    return customer.id;
  } catch (error) {
    console.error('❌ Failed to create test customer:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCustomer();

