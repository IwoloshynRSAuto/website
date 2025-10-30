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

function cleanProjectData(data) {
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
    quoteNum: data['Quote Num']?.trim() || '',
    invoiced: data['Invoiced']?.trim() || '',
    invoiceDate: data['Invoice Date']?.trim() || null,
    notes: data['Notes']?.trim() || ''
  };
}

// Function to parse date string
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null;
  
  try {
    // Handle various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    return null;
  }
}

// Function to map quote status to job status
function mapQuoteStatus(quoteStatus) {
  const statusMap = {
    'PO Received': 'ACTIVE',
    'Not Accepted': 'CANCELLED',
    'Accepted': 'ACTIVE',
    'Draft': 'DRAFT',
    'Sent': 'ACTIVE',
    'Expired': 'CANCELLED'
  };
  return statusMap[quoteStatus] || 'DRAFT';
}

// Function to map project status to job status
function mapProjectStatus(projectStatus) {
  const statusMap = {
    'Billed': 'COMPLETED',
    'Closed': 'COMPLETED',
    'Active': 'ACTIVE',
    'On Hold': 'ON_HOLD',
    'Cancelled': 'CANCELLED'
  };
  return statusMap[projectStatus] || 'ACTIVE';
}

// Function to find or create customer
async function findOrCreateCustomer(customerName, customerContact) {
  if (!customerName || customerName.trim() === '') {
    return null;
  }

  try {
    // Try to find existing customer
    let customer = await prisma.customer.findFirst({
      where: { name: customerName }
    });

    if (!customer) {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: customerContact || null,
          email: null,
          address: null,
          isActive: true
        }
      });
      console.log(`   ✅ Created customer: ${customerName}`);
    }

    return customer;
  } catch (error) {
    console.error(`   ❌ Error with customer ${customerName}:`, error.message);
    return null;
  }
}

// Function to get admin user for createdBy field
async function getAdminUser() {
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!adminUser) {
    throw new Error('No admin user found. Please create an admin user first.');
  }
  
  return adminUser;
}

// Function to create job from quote data
async function createJobFromQuote(data, adminUser) {
  try {
    // Find or create customer
    const customer = await findOrCreateCustomer(data.customerName, data.customerContact);
    if (!customer) {
      console.log(`   ⚠️  Skipping quote - no customer: ${data.quoteNumber}`);
      return null;
    }

    // Check if job already exists
    const existingJob = await prisma.job.findFirst({
      where: { jobNumber: data.quoteNumber }
    });

    if (existingJob) {
      console.log(`   ℹ️  Job already exists: ${data.quoteNumber}`);
      return existingJob;
    }

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobNumber: data.quoteNumber,
        title: data.description || `Quote ${data.quoteNumber}`,
        description: data.description || null,
        status: mapQuoteStatus(data.quoteStatus),
        priority: 'MEDIUM',
        startDate: parseDate(data.startDate),
        endDate: parseDate(data.dueDate),
        estimatedHours: null,
        actualHours: null,
        assignedToId: null, // Keep unassigned
        createdById: adminUser.id,
        customerId: customer.id,
        workCode: null,
        estimatedCost: null,
        dueTodayPercent: null
      },
      include: {
        customer: true
      }
    });

    console.log(`   ✅ Created job from quote: ${data.quoteNumber} - ${job.title}`);
    return job;

  } catch (error) {
    console.error(`   ❌ Error creating job from quote ${data.quoteNumber}:`, error.message);
    return null;
  }
}

// Function to create job from project data
async function createJobFromProject(data, adminUser) {
  try {
    // Find or create customer
    const customer = await findOrCreateCustomer(data.customerName, data.customerContact);
    if (!customer) {
      console.log(`   ⚠️  Skipping project - no customer: ${data.projectNumber}`);
      return null;
    }

    // Check if job already exists
    const existingJob = await prisma.job.findFirst({
      where: { jobNumber: data.projectNumber }
    });

    if (existingJob) {
      console.log(`   ℹ️  Job already exists: ${data.projectNumber}`);
      return existingJob;
    }

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobNumber: data.projectNumber,
        title: data.description || `Project ${data.projectNumber}`,
        description: data.description || null,
        status: mapProjectStatus(data.jobStatus),
        priority: 'MEDIUM',
        startDate: parseDate(data.startDate),
        endDate: parseDate(data.dueDate),
        estimatedHours: null,
        actualHours: null,
        assignedToId: null, // Keep unassigned
        createdById: adminUser.id,
        customerId: customer.id,
        workCode: data.associatedJobs || null,
        estimatedCost: null,
        dueTodayPercent: null
      },
      include: {
        customer: true
      }
    });

    console.log(`   ✅ Created job from project: ${data.projectNumber} - ${job.title}`);
    return job;

  } catch (error) {
    console.error(`   ❌ Error creating job from project ${data.projectNumber}:`, error.message);
    return null;
  }
}

// Main import function
async function importQuotesAndProjects() {
  try {
    console.log('🚀 Starting Quotes and Projects Import...\n');
    
    // Get admin user
    const adminUser = await getAdminUser();
    console.log(`👤 Using admin user: ${adminUser.name} (${adminUser.email})\n`);
    
    let totalQuotes = 0;
    let quotesCreated = 0;
    let totalProjects = 0;
    let projectsCreated = 0;
    let customersCreated = 0;
    
    // Import Quotes
    console.log('📋 Importing Quotes...');
    const quotesFilePath = path.join(__dirname, '..', 'JobList(Quotes).csv');
    
    if (fs.existsSync(quotesFilePath)) {
      await new Promise((resolve, reject) => {
        fs.createReadStream(quotesFilePath)
          .pipe(csv())
          .on('data', async (row) => {
            totalQuotes++;
            
            try {
              const cleanRow = cleanData(row);
              
              // Skip if no quote number
              if (!cleanRow.quoteNumber || cleanRow.quoteNumber.trim() === '') {
                return;
              }

              const job = await createJobFromQuote(cleanRow, adminUser);
              if (job) {
                quotesCreated++;
              }

              // Log progress every 50 records
              if (totalQuotes % 50 === 0) {
                console.log(`   📊 Processed ${totalQuotes} quotes...`);
              }

            } catch (error) {
              console.error(`   ❌ Error processing quote ${totalQuotes}:`, error.message);
            }
          })
          .on('end', () => {
            console.log(`   ✅ Quotes import completed: ${quotesCreated}/${totalQuotes} created\n`);
            resolve();
          })
          .on('error', reject);
      });
    } else {
      console.log('   ⚠️  Quotes CSV file not found\n');
    }
    
    // Import Projects
    console.log('🏗️  Importing Projects...');
    const projectsFilePath = path.join(__dirname, '..', 'JobList(Projects).csv');
    
    if (fs.existsSync(projectsFilePath)) {
      await new Promise((resolve, reject) => {
        fs.createReadStream(projectsFilePath)
          .pipe(csv())
          .on('data', async (row) => {
            totalProjects++;
            
            try {
              const cleanRow = cleanProjectData(row);
              
              // Skip if no project number
              if (!cleanRow.projectNumber || cleanRow.projectNumber.trim() === '') {
                return;
              }

              const job = await createJobFromProject(cleanRow, adminUser);
              if (job) {
                projectsCreated++;
              }

              // Log progress every 50 records
              if (totalProjects % 50 === 0) {
                console.log(`   📊 Processed ${totalProjects} projects...`);
              }

            } catch (error) {
              console.error(`   ❌ Error processing project ${totalProjects}:`, error.message);
            }
          })
          .on('end', () => {
            console.log(`   ✅ Projects import completed: ${projectsCreated}/${totalProjects} created\n`);
            resolve();
          })
          .on('error', reject);
      });
    } else {
      console.log('   ⚠️  Projects CSV file not found\n');
    }
    
    // Final summary
    const totalJobs = quotesCreated + projectsCreated;
    const totalCustomers = await prisma.customer.count();
    
    console.log('🎉 IMPORT COMPLETED!');
    console.log('='.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   • Quotes imported: ${quotesCreated}/${totalQuotes}`);
    console.log(`   • Projects imported: ${projectsCreated}/${totalProjects}`);
    console.log(`   • Total jobs created: ${totalJobs}`);
    console.log(`   • Total customers: ${totalCustomers}`);
    console.log(`   • All jobs are unassigned (no user links)`);
    console.log(`   • Admin user preserved: ${adminUser.name}`);
    console.log(`   • Labor codes preserved`);
    console.log('\n🚀 Your jobs are now available in the portal!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importQuotesAndProjects();
