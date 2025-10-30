const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPIEndpoints() {
  const baseUrl = 'http://localhost:3000/api';
  
  console.log('🌐 TESTING API ENDPOINTS\n');
  console.log('=' .repeat(50));

  const tests = [
    {
      name: 'GET /api/customers',
      url: `${baseUrl}/customers`,
      method: 'GET'
    },
    {
      name: 'GET /api/vendors',
      url: `${baseUrl}/vendors`,
      method: 'GET'
    },
    {
      name: 'GET /api/jobs',
      url: `${baseUrl}/jobs`,
      method: 'GET'
    },
    {
      name: 'GET /api/quotes',
      url: `${baseUrl}/quotes`,
      method: 'GET'
    },
    {
      name: 'POST /api/customers (Create Test Customer)',
      url: `${baseUrl}/customers`,
      method: 'POST',
      body: {
        name: 'API Test Customer',
        email: 'apitest@example.com',
        phone: '555-9999',
        address: '123 API Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      }
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`);
      
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(test.url, options);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ ${test.name}: SUCCESS`);
        if (Array.isArray(data)) {
          console.log(`   - Returned ${data.length} items`);
        } else if (data.id) {
          console.log(`   - Created item with ID: ${data.id}`);
        }
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   - Status: ${response.status}`);
        console.log(`   - Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   - ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🎯 API Endpoint Testing Complete!');
  console.log('\n💡 To test the full web interface:');
  console.log('   1. Open http://localhost:3000 in your browser');
  console.log('   2. Navigate to different sections (Dashboard, Projects, Quotes, CRM)');
  console.log('   3. Try creating new customers, jobs, and quotes');
  console.log('   4. Test the PM workflow stages display');
}

// Only run if server is available
testAPIEndpoints().catch(console.error);
