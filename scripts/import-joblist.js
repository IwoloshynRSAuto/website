const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Function to clean and validate data
function cleanData(data) {
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
  if (!dateStr || dateStr.trim() === '') return null;
  
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
  switch (status?.toLowerCase()) {
    case 'po received':
      return 'ACCEPTED';
    case 'not accepted':
      return 'REJECTED';
    case 'accepted':
      return 'ACCEPTED';
    case 'sent':
      return 'SENT';
    case 'draft':
      return 'DRAFT';
    default:
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
          contactName: customerContact || null,
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

// Function to create or update quote/job
async function createQuoteFromJobList(data) {
  try {
    // Find or create customer
    const customer = await findOrCreateCustomer(data.customerName, data.customerContact);
    if (!customer) {
      console.log(`Skipping record - no customer: ${data.quoteNumber}`);
      return null;
    }

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
        title: data.description || 'Imported Quote',
        description: data.description || null,
        customerId: customer.id,
        amount: 0, // Will be updated later if needed
        validUntil: parseDate(data.maturityDate),
        status: mapQuoteStatus(data.quoteStatus),
        customerContactName: data.customerContact || null,
        customerContactEmail: null,
        customerContactPhone: null,
        estimatedHours: null,
        hourlyRate: null,
        laborCost: null,
        materialCost: null,
        overheadCost: null,
        profitMargin: null
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
async function importJobList() {
  const csvFilePath = path.join(process.env.USERPROFILE, 'Downloads', 'JobList(Quotes).csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('JobList CSV file not found at:', csvFilePath);
    return;
  }

  console.log('Starting JobList import...');
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
          const cleanRow = cleanData(row);
          
          // Skip if no quote number
          if (!cleanRow.quoteNumber || cleanRow.quoteNumber.trim() === '') {
            console.log(`Skipping record ${totalRecords}: No quote number`);
            return;
          }

          const quote = await createQuoteFromJobList(cleanRow);
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
        
        console.log(`\nFinal database counts:`);
        console.log(`Total quotes: ${finalQuoteCount}`);
        console.log(`Total customers: ${finalCustomerCount}`);
        
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
    console.log('JobList Import Tool');
    console.log('==================');
    
    const results = await importJobList();
    
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

module.exports = { importJobList, cleanData };
