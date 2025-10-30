const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testJobCreation() {
  console.log('🧪 Testing Job Creation...\n');

  const testJob = {
    jobNumber: 'JOB-TEST-001',
    title: 'Test Job Creation',
    description: 'Testing the job creation functionality',
    customerName: 'Test Customer for Job',
    priority: 'HIGH',
    quotedAmount: 25000,
    startDate: '2024-01-15',
    endDate: '2024-03-15'
  };

  try {
    console.log('📝 Creating test job with data:');
    console.log(JSON.stringify(testJob, null, 2));
    console.log('\n⏳ Sending request...');

    const response = await fetch('http://localhost:3000/api/jobs/simple', {
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

testJobCreation();

