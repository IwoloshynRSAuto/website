const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Function to clean and validate data
function cleanJobData(data) {
  return {
    projectNumber: data['Project Number']?.trim() || '',
    associatedJobs: data['Associated Jobs']?.trim() || '',
    createdBy: data['Created By']?.trim() || 'Unknown',
    customerName: data['Customer']?.trim() || 'Unknown',
    customerContact: data['Cust. Contact']?.trim() || '',
    description: data['Description']?.trim() || '',
    startDate: data['Start Date']?.trim() || null,
    dueDate: data['Due Date']?.trim() || null,
    jobStatus: data['Job Status']?.trim() || 'ACTIVE',
    inQB: data['In QB']?.trim() === 'Yes',
    inLDrive: data['In L Drive']?.trim() === 'Yes',
    quoteNum: data['Quote Num']?.trim() || null,
    invoiced: data['Invoiced']?.trim() === '1',
    invoiceDate: data['Invoice Date']?.trim() || null,
    notes: data['Notes']?.trim() || ''
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

// Function to map job status to our system
function mapJobStatus(status) {
  if (!status) return 'ACTIVE';
  
  switch (status?.toLowerCase()) {
    case 'billed':
    case 'completed':
      return 'COMPLETED';
    case 'closed':
      return 'CANCELLED';
    case 'on hold':
      return 'ON_HOLD';
    case 'active':
      return 'ACTIVE';
    default:
      return 'ACTIVE';
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

// Function to create job from CSV data
async function createJobFromCSV(data) {
  try {
    // Skip if no project number
    if (!data.projectNumber || data.projectNumber.trim() === '') {
      return null;
    }

    // Find or create customer
    const customer = await findOrCreateCustomer(data.customerName, data.customerContact);
    if (!customer) {
      console.log(`Skipping record - no customer: ${data.projectNumber}`);
      return null;
    }

    // Find or create user
    const createdByUser = await findOrCreateUser(data.createdBy);

    // Check if job already exists
    const existingJob = await prisma.job.findFirst({
      where: { jobNumber: data.projectNumber }
    });

    if (existingJob) {
      console.log(`Job already exists: ${data.projectNumber}`);
      return existingJob;
    }

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobNumber: data.projectNumber,
        title: data.description || `Job ${data.projectNumber}`,
        description: data.description || null,
        status: mapJobStatus(data.jobStatus),
        startDate: parseDate(data.startDate),
        endDate: parseDate(data.dueDate),
        customerId: customer.id,
        createdById: createdByUser?.id || null,
        estimatedCost: null,
        estimatedHours: null
      },
      include: {
        customer: true,
        createdBy: true
      }
    });

    console.log(`Created job: ${data.projectNumber} for ${customer.name}`);
    return job;

  } catch (error) {
    console.error(`Error creating job ${data.projectNumber}:`, error.message);
    return null;
  }
}

// Main import function
async function importJobsFromCSV() {
  const csvFilePath = path.join(__dirname, '..', 'JobList(Projects).csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('JobList(Projects) CSV file not found at:', csvFilePath);
    return;
  }

  console.log('Starting Jobs import...');
  console.log('Reading file:', csvFilePath);

  let totalRecords = 0;
  let jobsCreated = 0;
  let jobsSkipped = 0;
  let errors = 0;

  const results = {
    jobs: [],
    errors: []
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', async (row) => {
        totalRecords++;
        
        try {
          const cleanRow = cleanJobData(row);
          
          const job = await createJobFromCSV(cleanRow);
          if (job) {
            jobsCreated++;
            results.jobs.push(job);
          } else {
            jobsSkipped++;
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
        console.log(`Jobs created: ${jobsCreated}`);
        console.log(`Jobs skipped: ${jobsSkipped}`);
        console.log(`Errors: ${errors}`);
        
        if (results.errors.length > 0) {
          console.log('\n=== Errors ===');
          results.errors.forEach((error, index) => {
            console.log(`${index + 1}. Record ${error.record}: ${error.error}`);
          });
        }

        // Get final counts
        const finalJobCount = await prisma.job.count();
        const finalCustomerCount = await prisma.customer.count();
        const finalUserCount = await prisma.user.count();
        
        console.log(`\nFinal database counts:`);
        console.log(`Total jobs: ${finalJobCount}`);
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
    console.log('Jobs Import Tool');
    console.log('================');
    
    const results = await importJobsFromCSV();
    
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

module.exports = { importJobsFromCSV, cleanJobData };
