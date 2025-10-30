const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Function to clean quote data
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

// Function to clean project data
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
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A' || dateStr === '?') return null;
  
  try {
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
    'Not Accepted': 'QUOTE',
    'Accepted': 'ACTIVE',
    'Draft': 'QUOTE',
    'Sent': 'QUOTE',
    'Expired': 'QUOTE'
  };
  return statusMap[quoteStatus] || 'QUOTE';
}

// Function to map project status to job status
function mapProjectStatus(projectStatus) {
  const statusMap = {
    'Billed': 'COMPLETED',
    'Closed': 'COMPLETED',
    'Active': 'ACTIVE',
    'On Hold': 'ACTIVE',
    'Cancelled': 'ACTIVE'
  };
  return statusMap[projectStatus] || 'ACTIVE';
}

// Function to determine job type
function getJobType(status, quoteNum) {
  // If it has a quote number and is not completed, it might be a quote
  if (quoteNum && quoteNum.startsWith('Q')) {
    return 'QUOTE';
  }
  // Otherwise it's a regular job
  return 'JOB';
}

// Function to find or create customer
async function findOrCreateCustomer(customerName, customerContact) {
  if (!customerName || customerName.trim() === '') {
    return null;
  }

  try {
    let customer = await prisma.customer.findFirst({
      where: { name: customerName }
    });

    if (!customer) {
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

// Function to get admin user
async function getAdminUser() {
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!adminUser) {
    throw new Error('No admin user found. Please create an admin user first.');
  }
  
  return adminUser;
}

// Function to read CSV file into array
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      resolve([]);
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Main import function
async function importJobsAndQuotes() {
  try {
    console.log('🚀 Starting Jobs and Quotes Import...\n');
    
    // Get admin user
    const adminUser = await getAdminUser();
    console.log(`👤 Using admin user: ${adminUser.name} (${adminUser.email})\n`);
    
    let quotesCreated = 0;
    let quotesSkipped = 0;
    let projectsCreated = 0;
    let projectsSkipped = 0;
    
    // Import Quotes
    console.log('📋 Importing Quotes...');
    const quotesFilePath = path.join(__dirname, '..', 'JobList(Quotes).csv');
    const quotesData = await readCSV(quotesFilePath);
    
    console.log(`   Found ${quotesData.length} quotes in CSV\n`);
    
    for (let i = 0; i < quotesData.length; i++) {
      const row = quotesData[i];
      const cleanRow = cleanQuoteData(row);
      
      // Skip if no quote number
      if (!cleanRow.quoteNumber || cleanRow.quoteNumber.trim() === '') {
        quotesSkipped++;
        continue;
      }

      try {
        // Find or create customer
        const customer = await findOrCreateCustomer(cleanRow.customerName, cleanRow.customerContact);
        if (!customer) {
          console.log(`   ⚠️  Skipping quote - no customer: ${cleanRow.quoteNumber}`);
          quotesSkipped++;
          continue;
        }

        // Check if job already exists
        const existingJob = await prisma.job.findFirst({
          where: { jobNumber: cleanRow.quoteNumber }
        });

        if (existingJob) {
          console.log(`   ℹ️  Job already exists: ${cleanRow.quoteNumber}`);
          quotesSkipped++;
          continue;
        }

        // Create the job
        const job = await prisma.job.create({
          data: {
            jobNumber: cleanRow.quoteNumber,
            title: cleanRow.description || `Quote ${cleanRow.quoteNumber}`,
            description: cleanRow.description || null,
            type: 'QUOTE',
            status: mapQuoteStatus(cleanRow.quoteStatus),
            priority: 'MEDIUM',
            startDate: parseDate(cleanRow.startDate),
            endDate: parseDate(cleanRow.dueDate),
            estimatedHours: null,
            actualHours: null,
            assignedToId: null,
            createdById: adminUser.id,
            customerId: customer.id,
            workCode: null,
            estimatedCost: null,
            dueTodayPercent: null,
            inQuickBooks: false, // Quotes don't have QB status in CSV
            inLDrive: cleanRow.inLDrive
          }
        });

        quotesCreated++;
        console.log(`   ✅ [${i + 1}/${quotesData.length}] Created quote: ${cleanRow.quoteNumber} - ${job.title}`);

      } catch (error) {
        console.error(`   ❌ Error creating quote ${cleanRow.quoteNumber}:`, error.message);
        quotesSkipped++;
      }
    }
    
    console.log(`\n   📊 Quotes: ${quotesCreated} created, ${quotesSkipped} skipped\n`);
    
    // Import Projects
    console.log('🏗️  Importing Projects...');
    const projectsFilePath = path.join(__dirname, '..', 'JobList(Projects).csv');
    const projectsData = await readCSV(projectsFilePath);
    
    console.log(`   Found ${projectsData.length} projects in CSV\n`);
    
    for (let i = 0; i < projectsData.length; i++) {
      const row = projectsData[i];
      const cleanRow = cleanProjectData(row);
      
      // Skip if no project number
      if (!cleanRow.projectNumber || cleanRow.projectNumber.trim() === '') {
        projectsSkipped++;
        continue;
      }

      try {
        // Find or create customer
        const customer = await findOrCreateCustomer(cleanRow.customerName, cleanRow.customerContact);
        if (!customer) {
          console.log(`   ⚠️  Skipping project - no customer: ${cleanRow.projectNumber}`);
          projectsSkipped++;
          continue;
        }

        // Check if job already exists
        const existingJob = await prisma.job.findFirst({
          where: { jobNumber: cleanRow.projectNumber }
        });

        if (existingJob) {
          console.log(`   ℹ️  Job already exists: ${cleanRow.projectNumber}`);
          projectsSkipped++;
          continue;
        }

        // Determine job type based on quote number
        const jobType = getJobType(cleanRow.jobStatus, cleanRow.quoteNum);

        // Combine notes and metadata into description
        const descriptionParts = [cleanRow.description || `Project ${cleanRow.projectNumber}`];
        if (cleanRow.notes) descriptionParts.push(`Notes: ${cleanRow.notes}`);
        if (cleanRow.quoteNum) descriptionParts.push(`Quote: ${cleanRow.quoteNum}`);
        
        // Create the job
        const job = await prisma.job.create({
          data: {
            jobNumber: cleanRow.projectNumber,
            title: cleanRow.description || `Project ${cleanRow.projectNumber}`,
            description: descriptionParts.join(' | '),
            type: 'JOB', // Projects are always jobs
            status: mapProjectStatus(cleanRow.jobStatus),
            priority: 'MEDIUM',
            startDate: parseDate(cleanRow.startDate),
            endDate: parseDate(cleanRow.dueDate),
            estimatedHours: null,
            actualHours: null,
            assignedToId: null,
            createdById: adminUser.id,
            customerId: customer.id,
            workCode: cleanRow.associatedJobs || null,
            estimatedCost: null,
            dueTodayPercent: null,
            inQuickBooks: cleanRow.inQB,
            inLDrive: cleanRow.inLDrive
          }
        });

        projectsCreated++;
        console.log(`   ✅ [${i + 1}/${projectsData.length}] Created project: ${cleanRow.projectNumber} - ${job.title}`);

      } catch (error) {
        console.error(`   ❌ Error creating project ${cleanRow.projectNumber}:`, error.message);
        projectsSkipped++;
      }
    }
    
    console.log(`\n   📊 Projects: ${projectsCreated} created, ${projectsSkipped} skipped\n`);
    
    // Final summary
    const totalJobs = quotesCreated + projectsCreated;
    const totalCustomers = await prisma.customer.count();
    
    console.log('='.repeat(60));
    console.log('🎉 IMPORT COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Quotes imported: ${quotesCreated} (${quotesSkipped} skipped)`);
    console.log(`   • Projects imported: ${projectsCreated} (${projectsSkipped} skipped)`);
    console.log(`   • Total jobs created: ${totalJobs}`);
    console.log(`   • Total customers in database: ${totalCustomers}`);
    console.log(`   • All jobs are unassigned`);
    console.log(`   • Users and labor codes were NOT modified`);
    console.log('\n🚀 Your jobs and quotes are now available in the portal!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importJobsAndQuotes();

