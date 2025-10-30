const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

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

// Main update function
async function updateQBAndLDriveStatus() {
  try {
    console.log('🚀 Starting QB and L Drive Status Update...\n');
    
    let quotesUpdated = 0;
    let quotesNotFound = 0;
    let projectsUpdated = 0;
    let projectsNotFound = 0;
    
    // Update Quotes
    console.log('📋 Updating Quotes...');
    const quotesFilePath = path.join(__dirname, '..', 'JobList(Quotes).csv');
    const quotesData = await readCSV(quotesFilePath);
    
    console.log(`   Found ${quotesData.length} quotes in CSV\n`);
    
    for (let i = 0; i < quotesData.length; i++) {
      const row = quotesData[i];
      const quoteNumber = row['Quote Num.']?.trim();
      const inLDrive = row['In L Drive']?.trim() === 'Yes';
      
      if (!quoteNumber) {
        continue;
      }

      try {
        // Find the job by job number
        const job = await prisma.job.findFirst({
          where: { jobNumber: quoteNumber }
        });

        if (job) {
          // Update the job
          await prisma.job.update({
            where: { id: job.id },
            data: {
              inLDrive: inLDrive,
              inQuickBooks: false // Quotes CSV doesn't have QB status
            }
          });
          
          quotesUpdated++;
          if (inLDrive) {
            console.log(`   ✅ Updated ${quoteNumber} - L Drive: Yes`);
          }
        } else {
          quotesNotFound++;
          console.log(`   ⚠️  Quote not found: ${quoteNumber}`);
        }

      } catch (error) {
        console.error(`   ❌ Error updating quote ${quoteNumber}:`, error.message);
      }
    }
    
    console.log(`\n   📊 Quotes: ${quotesUpdated} updated, ${quotesNotFound} not found\n`);
    
    // Update Projects
    console.log('🏗️  Updating Projects...');
    const projectsFilePath = path.join(__dirname, '..', 'JobList(Projects).csv');
    const projectsData = await readCSV(projectsFilePath);
    
    console.log(`   Found ${projectsData.length} projects in CSV\n`);
    
    for (let i = 0; i < projectsData.length; i++) {
      const row = projectsData[i];
      const projectNumber = row['Project Number']?.trim();
      const inQB = row['In QB']?.trim() === 'Yes';
      const inLDrive = row['In L Drive']?.trim() === 'Yes';
      
      if (!projectNumber) {
        continue;
      }

      try {
        // Find the job by job number
        const job = await prisma.job.findFirst({
          where: { jobNumber: projectNumber }
        });

        if (job) {
          // Update the job
          await prisma.job.update({
            where: { id: job.id },
            data: {
              inQuickBooks: inQB,
              inLDrive: inLDrive
            }
          });
          
          projectsUpdated++;
          const status = [];
          if (inQB) status.push('QB: Yes');
          if (inLDrive) status.push('L Drive: Yes');
          
          if (status.length > 0) {
            console.log(`   ✅ Updated ${projectNumber} - ${status.join(', ')}`);
          }
        } else {
          projectsNotFound++;
          console.log(`   ⚠️  Project not found: ${projectNumber}`);
        }

      } catch (error) {
        console.error(`   ❌ Error updating project ${projectNumber}:`, error.message);
      }
    }
    
    console.log(`\n   📊 Projects: ${projectsUpdated} updated, ${projectsNotFound} not found\n`);
    
    // Final summary
    console.log('='.repeat(60));
    console.log('🎉 UPDATE COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Quotes updated: ${quotesUpdated} (${quotesNotFound} not found)`);
    console.log(`   • Projects updated: ${projectsUpdated} (${projectsNotFound} not found)`);
    console.log(`   • Total jobs updated: ${quotesUpdated + projectsUpdated}`);
    console.log('\n✅ QuickBooks and L Drive status now reflects CSV data!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateQBAndLDriveStatus();

