const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Function to clean and validate data
function cleanQuoteData(data) {
  return {
    quoteNumber: data['Quote Num.']?.trim() || '',
    createdBy: data['Created By']?.trim() || 'Unknown',
    customerName: data['Customer']?.trim() || 'Unknown',
    customerContact: data['Cust. Contact']?.trim() || '',
    description: data['Description']?.trim() || '',
    startDate: data['Start Date']?.trim() || null,
    dueDate: data['Due Date']?.trim() || null,
    maturityDate: data['Maturity Date']?.trim() || null,
    quoteStatus: data['Quote Status']?.trim() || 'DRAFT',
    inLDrive: data['In L Drive']?.trim() === 'Yes',
    latestRev: data['Latest Rev']?.trim() || null
  };
}

// Function to parse date string
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr === '?') return null;
  
  try {
    // Handle various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    console.warn(`Invalid date format: ${dateStr}`);
    return null;
  }
}

// Function to map quote status to our system
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

// Function to find or create customer
async function findOrCreateCustomer(customerName, customerContact) {
  if (!customerName || customerName === 'Unknown') return null;

  // Try to find existing customer
  let customer = await prisma.customer.findFirst({
    where: {
      name: {
        contains: customerName
      }
    }
  });

  // If not found, create new customer
  if (!customer) {
    try {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: customerContact || null,
          isActive: true
        }
      });
      console.log(`Created new customer: ${customerName}`);
    } catch (error) {
      console.error(`Error creating customer ${customerName}:`, error.message);
      return null;
    }
  }

  return customer;
}

// Function to find or create user
async function findOrCreateUser(createdBy) {
  if (!createdBy || createdBy === 'Unknown') return null;

  // Try to find existing user
  let user = await prisma.user.findFirst({
    where: {
      name: {
        contains: createdBy
      }
    }
  });

  // If not found, create new user
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          email: `${createdBy.toLowerCase().replace(/\s+/g, '.')}@automationfirm.com`,
          name: createdBy,
          password: 'hashed_password',
          role: 'USER',
          isActive: true
        }
      });
      console.log(`Created new user: ${createdBy}`);
    } catch (error) {
      console.error(`Error creating user ${createdBy}:`, error.message);
      return null;
    }
  }

  return user;
}

// Function to create quote from CSV data
async function createQuoteFromCSV(data) {
  try {
    // Skip if no quote number
    if (!data.quoteNumber || data.quoteNumber.trim() === '') {
      return null;
    }

    // Find or create customer
    const customer = await findOrCreateCustomer(data.customerName, data.customerContact);
    if (!customer) {
      console.log(`Skipping record - no customer: ${data.quoteNumber}`);
      return null;
    }

    // Find or create user
    const createdByUser = await findOrCreateUser(data.createdBy);

    // Check if quote already exists
    const existingQuote = await prisma.quote.findFirst({
      where: { quoteNumber: data.quoteNumber }
    });

    if (existingQuote) {
      console.log(`Quote already exists: ${data.quoteNumber}`);
      return existingQuote;
    }

    // Create the quote
    const quote = await prisma.quote.create({
      data: {
        quoteNumber: data.quoteNumber,
        title: data.description || `Quote ${data.quoteNumber}`,
        description: data.description || null,
        customerId: customer.id,
        amount: 0, // Will be updated later if needed
        validUntil: parseDate(data.maturityDate),
        status: mapQuoteStatus(data.quoteStatus),
        paymentTerms: 'Net 30',
        estimatedHours: 0,
        hourlyRate: 0,
        laborCost: 0,
        materialCost: 0,
        overheadCost: 0,
        profitMargin: 0,
        customerContactName: data.customerContact || null
      },
      include: {
        customer: true
      }
    });

    console.log(`Created quote: ${data.quoteNumber} for ${customer.name}`);
    return quote;

  } catch (error) {
    console.error(`Error creating quote ${data.quoteNumber}:`, error.message);
    return null;
  }
}

// Main import function
async function importQuotesFromCSV() {
  const csvFilePath = path.join(__dirname, '..', 'JobList(Quotes).csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('JobList(Quotes) CSV file not found at:', csvFilePath);
    return;
  }

  console.log('Starting Quotes import...');
  console.log('Reading file:', csvFilePath);

  let totalRecords = 0;
  let quotesCreated = 0;
  let quotesSkipped = 0;
  let errors = 0;

  const results = {
    quotes: [],
    errors: []
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        totalRecords++;
        
        try {
          const cleanRow = cleanQuoteData(row);
          
          const quote = await createQuoteFromCSV(cleanRow);
          if (quote) {
            quotesCreated++;
            results.quotes.push(quote);
          } else {
            quotesSkipped++;
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
        console.log(`Quotes created: ${quotesCreated}`);
        console.log(`Quotes skipped: ${quotesSkipped}`);
        console.log(`Errors: ${errors}`);
        
        if (results.errors.length > 0) {
          console.log('\n=== Errors ===');
          results.errors.forEach((error, index) => {
            console.log(`${index + 1}. Record ${error.record}: ${error.error}`);
          });
        }

        // Get final counts
        const finalQuoteCount = await prisma.quote.count();
        const finalCustomerCount = await prisma.customer.count();
        const finalUserCount = await prisma.user.count();
        
        console.log(`\nFinal database counts:`);
        console.log(`Total quotes: ${finalQuoteCount}`);
        console.log(`Total customers: ${finalCustomerCount}`);
        console.log(`Total users: ${finalUserCount}`);
        
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
    console.log('Quotes Import Tool');
    console.log('==================');
    
    const results = await importQuotesFromCSV();
    
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

module.exports = { importQuotesFromCSV, cleanQuoteData };
