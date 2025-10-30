const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRegularJobCreation() {
  console.log('🧪 Testing Regular Job Creation API...\n');

  // First, get a customer ID
  console.log('📋 Fetching customers...');
  const customersResponse = await fetch('http://localhost:3000/api/customers');
  const customers = await customersResponse.json();
  
  if (customers.length === 0) {
    console.log('❌ No customers found. Please create a customer first.');
    return;
  }

  const customer = customers[0];
  console.log(`✅ Using customer: ${customer.name} (ID: ${customer.id})`);

  const testJob = {
    jobNumber: 'JOB-REGULAR-001',
    title: 'Regular Job Creation Test',
    description: 'Testing the regular job creation API',
    customerId: customer.id,
    priority: 'MEDIUM',
    quotedAmount: 35000,
    startDate: '2024-02-01',
    endDate: '2024-04-01'
  };

  try {
    console.log('\n📝 Creating job with data:');
    console.log(JSON.stringify(testJob, null, 2));
    console.log('\n⏳ Sending request...');

    const response = await fetch('http://localhost:3000/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testJob),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Job created successfully!');
      console.log('📋 Job Details:');
      console.log(`   - ID: ${data.id}`);
      console.log(`   - Job Number: ${data.jobNumber}`);
      console.log(`   - Title: ${data.title}`);
      console.log(`   - Customer: ${data.customer.name}`);
      console.log(`   - Priority: ${data.priority}`);
      console.log(`   - Status: ${data.status}`);
      console.log(`   - PM Stage: ${data.pmStage}`);
      console.log(`   - Quoted Amount: $${data.quotedAmount}`);
    } else {
      console.log('❌ Job creation failed!');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Error: ${data.error || 'Unknown error'}`);
      if (data.details) {
        console.log(`   - Details: ${JSON.stringify(data.details, null, 2)}`);
      }
    }
  } catch (error) {
    console.log('❌ Request failed!');
    console.log(`   - Error: ${error.message}`);
  }
}

testRegularJobCreation();

