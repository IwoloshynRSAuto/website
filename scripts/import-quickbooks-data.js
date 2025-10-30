const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Function to clean and validate data
function cleanData(data) {
  return {
    name: data.Name?.trim() || 'Unknown',
    email: data.Email?.trim() || null,
    phone: data.Phone?.trim() || null,
    address: data.Address?.trim() || null,
    city: data.City?.trim() || null,
    state: data['State/Province']?.trim() || null,
    zipCode: data['Zip Code']?.trim() || null,
    country: data.Country?.trim() || 'United States',
    isCustomer: data.Customer === '1',
    isVendor: data.Vendor === '1',
    status: data.Status === '1' ? 'ACTIVE' : 'INACTIVE',
    category: data['Third-party type']?.trim() || null
  };
}

// Function to check if customer/vendor already exists
async function checkExisting(name, email) {
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      OR: [
        { name: name },
        ...(email ? [{ email: email }] : [])
      ]
    }
  });

  const existingVendor = await prisma.vendor.findFirst({
    where: {
      OR: [
        { name: name },
        ...(email ? [{ email: email }] : [])
      ]
    }
  });

  return { existingCustomer, existingVendor };
}

// Function to create or update customer
async function createOrUpdateCustomer(data) {
  const { existingCustomer } = await checkExisting(data.name, data.email);
  
  if (existingCustomer) {
    console.log(`Customer already exists: ${data.name}`);
    return existingCustomer;
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        isActive: data.status === 'ACTIVE'
      }
    });
    console.log(`Created customer: ${data.name}`);
    return customer;
  } catch (error) {
    console.error(`Error creating customer ${data.name}:`, error.message);
    return null;
  }
}

// Function to create or update vendor
async function createOrUpdateVendor(data) {
  const { existingVendor } = await checkExisting(data.name, data.email);
  
  if (existingVendor) {
    console.log(`Vendor already exists: ${data.name}`);
    return existingVendor;
  }

  try {
    const vendor = await prisma.vendor.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        category: data.category,
        isActive: data.status === 'ACTIVE'
      }
    });
    console.log(`Created vendor: ${data.name}`);
    return vendor;
  } catch (error) {
    console.error(`Error creating vendor ${data.name}:`, error.message);
    return null;
  }
}

// Main import function
async function importQuickBooksData() {
  const csvFilePath = path.join(process.env.USERPROFILE, 'Downloads', 'export_societe_1.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('QuickBooks export file not found at:', csvFilePath);
    return;
  }

  console.log('Starting QuickBooks data import...');
  console.log('Reading file:', csvFilePath);

  let totalRecords = 0;
  let customersCreated = 0;
  let vendorsCreated = 0;
  let customersSkipped = 0;
  let vendorsSkipped = 0;
  let errors = 0;

  const results = {
    customers: [],
    vendors: [],
    errors: []
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        totalRecords++;
        
        try {
          const cleanRow = cleanData(row);
          
          // Skip if no name or if both customer and vendor are false
          if (!cleanRow.name || cleanRow.name === 'Unknown') {
            console.log(`Skipping record ${totalRecords}: No valid name`);
            return;
          }

          // Process customers
          if (cleanRow.isCustomer) {
            const customer = await createOrUpdateCustomer(cleanRow);
            if (customer) {
              customersCreated++;
              results.customers.push(customer);
            } else {
              customersSkipped++;
            }
          }

          // Process vendors
          if (cleanRow.isVendor) {
            const vendor = await createOrUpdateVendor(cleanRow);
            if (vendor) {
              vendorsCreated++;
              results.vendors.push(vendor);
            } else {
              vendorsSkipped++;
            }
          }

          // Log progress every 50 records
          if (totalRecords % 50 === 0) {
            console.log(`Processed ${totalRecords} records...`);
          }

        } catch (error) {
          errors++;
          console.error(`Error processing record ${totalRecords}:`, error.message);
          results.errors.push({ record: totalRecords, error: error.message, data: row });
        }
      })
      .on('end', async () => {
        console.log('\n=== Import Summary ===');
        console.log(`Total records processed: ${totalRecords}`);
        console.log(`Customers created: ${customersCreated}`);
        console.log(`Vendors created: ${vendorsCreated}`);
        console.log(`Customers skipped (already exist): ${customersSkipped}`);
        console.log(`Vendors skipped (already exist): ${vendorsSkipped}`);
        console.log(`Errors: ${errors}`);
        
        if (results.errors.length > 0) {
          console.log('\n=== Errors ===');
          results.errors.forEach((error, index) => {
            console.log(`${index + 1}. Record ${error.record}: ${error.error}`);
          });
        }

        // Get final counts
        const finalCustomerCount = await prisma.customer.count();
        const finalVendorCount = await prisma.vendor.count();
        
        console.log(`\nFinal database counts:`);
        console.log(`Total customers: ${finalCustomerCount}`);
        console.log(`Total vendors: ${finalVendorCount}`);
        
        resolve(results);
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Run the import
async function main() {
  try {
    console.log('QuickBooks Data Import Tool');
    console.log('==========================');
    
    const results = await importQuickBooksData();
    
    console.log('\nImport completed successfully!');
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
if (require.main === module) {
  main();
}

module.exports = { importQuickBooksData, cleanData };
