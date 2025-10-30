import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import sqlite3 from 'sqlite3'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const fileName = file.name.toLowerCase()
    let importData: any = {}

    if (fileName.endsWith('.db')) {
      // Handle SQLite database file
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Write buffer to temporary file
      const fs = require('fs')
      const path = require('path')
      const tempPath = path.join(process.cwd(), 'temp-import.db')
      fs.writeFileSync(tempPath, buffer)

      try {
        // Read from SQLite database
        const db = new sqlite3.Database(tempPath, sqlite3.OPEN_READONLY)
        
        const query = (sql: string, params: any[] = []) => {
          return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
              if (err) reject(err)
              else resolve(rows)
            })
          })
        }

        // Import all tables
        try {
          const users = await query('SELECT * FROM users') as any[]
          if (users && users.length > 0) {
            // Remove password field if it exists and convert data types
            importData.users = users.map(({ password, ...user }) => ({
              ...user,
              isActive: user.isActive === 1 || user.isActive === true || user.isActive === '1', // Convert 0/1 to boolean
              createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
              updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
              wage: user.wage ? Number(user.wage) : null
            }))
          }
        } catch (e) {
          console.log('No users table found')
        }

        try {
          const customers = await query('SELECT * FROM customers') as any[]
          if (customers && customers.length > 0) {
            importData.customers = customers.map(customer => {
              // Remove fields that don't exist in current schema
              const { city, state, zipCode, country, ...validCustomer } = customer
              return {
                ...validCustomer,
                isActive: validCustomer.isActive === 1 || validCustomer.isActive === true || validCustomer.isActive === '1', // Convert 0/1 to boolean
                createdAt: validCustomer.createdAt ? new Date(validCustomer.createdAt) : new Date(),
                updatedAt: validCustomer.updatedAt ? new Date(validCustomer.updatedAt) : new Date()
              }
            })
          }
        } catch (e) {
          console.log('No customers table found')
        }

        try {
          const jobs = await query('SELECT * FROM jobs') as any[]
          if (jobs && jobs.length > 0) {
            importData.jobs = jobs.map(job => {
              // Remove fields that don't exist in current schema
              const { 
                quotedAmount, actualAmount, pmStage, stageProgress, associatedJobs, 
                customerContact, quoteNumber, invoiced, invoiceDate, notes, 
                invoicedPercentage, dueDate, ...validJob 
              } = job
              return {
                ...validJob,
                createdAt: validJob.createdAt ? new Date(validJob.createdAt) : new Date(),
                updatedAt: validJob.updatedAt ? new Date(validJob.updatedAt) : new Date(),
                startDate: validJob.startDate ? new Date(validJob.startDate) : null,
                endDate: validJob.endDate ? new Date(validJob.endDate) : null,
                convertedAt: validJob.convertedAt ? new Date(validJob.convertedAt) : null,
                inQuickBooks: validJob.inQuickBooks === 1 || validJob.inQuickBooks === true || validJob.inQuickBooks === '1',
                inLDrive: validJob.inLDrive === 1 || validJob.inLDrive === true || validJob.inLDrive === '1'
              }
            })
          }
        } catch (e) {
          console.log('No jobs table found')
        }

        try {
          const laborCodes = await query('SELECT * FROM laborCodes') as any[]
          if (laborCodes && laborCodes.length > 0) {
            importData.laborCodes = laborCodes
          }
        } catch (e) {
          console.log('No laborCodes table found')
        }

        try {
          const timeEntries = await query('SELECT * FROM timeEntries') as any[]
          if (timeEntries && timeEntries.length > 0) {
            importData.timeEntries = timeEntries.map(entry => ({
              ...entry,
              date: entry.date ? new Date(entry.date) : new Date(),
              createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
              updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
              hours: entry.hours ? Number(entry.hours) : 0
            }))
          }
        } catch (e) {
          console.log('No timeEntries table found')
        }

        try {
          const timesheetSubmissions = await query('SELECT * FROM timesheetSubmissions') as any[]
          if (timesheetSubmissions && timesheetSubmissions.length > 0) {
            importData.timesheetSubmissions = timesheetSubmissions.map(submission => ({
              ...submission,
              weekStartDate: submission.weekStartDate ? new Date(submission.weekStartDate) : new Date(),
              weekEndDate: submission.weekEndDate ? new Date(submission.weekEndDate) : new Date(),
              submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : new Date(),
              approvedAt: submission.approvedAt ? new Date(submission.approvedAt) : null,
              rejectedAt: submission.rejectedAt ? new Date(submission.rejectedAt) : null,
              createdAt: submission.createdAt ? new Date(submission.createdAt) : new Date(),
              updatedAt: submission.updatedAt ? new Date(submission.updatedAt) : new Date()
            }))
          }
        } catch (e) {
          console.log('No timesheetSubmissions table found')
        }

        try {
          const quotes = await query('SELECT * FROM quotes') as any[]
          if (quotes && quotes.length > 0) {
            importData.quotes = quotes.map(quote => {
              // Remove fields that don't exist in current schema
              const { jobId, depositAmount, milestonePayments, ...validQuote } = quote
              return {
                ...validQuote,
                createdAt: validQuote.createdAt ? new Date(validQuote.createdAt) : new Date(),
                updatedAt: validQuote.updatedAt ? new Date(validQuote.updatedAt) : new Date(),
                validUntil: validQuote.validUntil ? new Date(validQuote.validUntil) : null
              }
            })
          }
        } catch (e) {
          console.log('No quotes table found')
        }

        try {
          const jobLaborEstimates = await query('SELECT * FROM jobLaborEstimates') as any[]
          if (jobLaborEstimates && jobLaborEstimates.length > 0) {
            importData.jobLaborEstimates = jobLaborEstimates.map(estimate => ({
              ...estimate,
              createdAt: estimate.createdAt ? new Date(estimate.createdAt) : new Date(),
              updatedAt: estimate.updatedAt ? new Date(estimate.updatedAt) : new Date(),
              estimatedHours: estimate.estimatedHours ? Number(estimate.estimatedHours) : 0
            }))
          }
        } catch (e) {
          console.log('No jobLaborEstimates table found')
        }

        try {
          const engineeringChangeOrders = await query('SELECT * FROM engineeringChangeOrders') as any[]
          if (engineeringChangeOrders && engineeringChangeOrders.length > 0) {
            importData.engineeringChangeOrders = engineeringChangeOrders.map(eco => ({
              ...eco,
              submittedAt: eco.submittedAt ? new Date(eco.submittedAt) : new Date(),
              appliedAt: eco.appliedAt ? new Date(eco.appliedAt) : null,
              createdAt: eco.createdAt ? new Date(eco.createdAt) : new Date(),
              updatedAt: eco.updatedAt ? new Date(eco.updatedAt) : new Date(),
              oldHours: eco.oldHours ? Number(eco.oldHours) : 0,
              newHours: eco.newHours ? Number(eco.newHours) : 0,
              oldCost: eco.oldCost ? Number(eco.oldCost) : null,
              newCost: eco.newCost ? Number(eco.newCost) : null
            }))
          }
        } catch (e) {
          console.log('No engineeringChangeOrders table found')
        }

        try {
          const partsServices = await query('SELECT * FROM partsServices') as any[]
          if (partsServices && partsServices.length > 0) {
            importData.partsServices = partsServices.map(part => ({
              ...part,
              startDate: part.startDate ? new Date(part.startDate) : null,
              dueDate: part.dueDate ? new Date(part.dueDate) : null,
              dateInvoiced: part.dateInvoiced ? new Date(part.dateInvoiced) : null,
              createdAt: part.createdAt ? new Date(part.createdAt) : new Date(),
              updatedAt: part.updatedAt ? new Date(part.updatedAt) : new Date(),
              inQuickBooks: part.inQuickBooks === 1 || part.inQuickBooks === true || part.inQuickBooks === '1',
              inLDrive: part.inLDrive === 1 || part.inLDrive === true || part.inLDrive === '1'
            }))
          }
        } catch (e) {
          console.log('No partsServices table found')
        }

        db.close()
        
        // Clean up temporary file with retry logic
        try {
          fs.unlinkSync(tempPath)
        } catch (unlinkError) {
          console.log('Could not delete temp file immediately, will retry later')
          // Schedule cleanup for later
          setTimeout(() => {
            try {
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath)
              }
            } catch (e) {
              console.log('Failed to clean up temp file:', e.message)
            }
          }, 5000)
        }
        
      } catch (dbError) {
        // Clean up temporary file on error with retry
        setTimeout(() => {
          try {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath)
            }
          } catch (e) {
            console.log('Failed to clean up temp file on error:', e.message)
          }
        }, 1000)
        throw dbError
      }
    } else {
      // Handle JSON file
      const text = await file.text()
      importData = JSON.parse(text)
    }

    // Clear existing data first (in correct order to respect foreign keys)
    await prisma.timeEntry.deleteMany()
    await prisma.timesheetSubmission.deleteMany()
    await prisma.jobLaborEstimate.deleteMany()
    await prisma.engineeringChangeOrder.deleteMany()
    await prisma.quote.deleteMany()
    await prisma.job.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.laborCode.deleteMany()
    await prisma.user.deleteMany()

    let importedCount = 0

    // Import in order to respect foreign key constraints
    if (importData.users && importData.users.length > 0) {
      for (const user of importData.users) {
        await prisma.user.create({ data: user })
        importedCount++
      }
    }

    if (importData.laborCodes && importData.laborCodes.length > 0) {
      for (const laborCode of importData.laborCodes) {
        await prisma.laborCode.create({ data: laborCode })
        importedCount++
      }
    }

    if (importData.customers && importData.customers.length > 0) {
      for (const customer of importData.customers) {
        await prisma.customer.create({ data: customer })
        importedCount++
      }
    }

    if (importData.jobs && importData.jobs.length > 0) {
      for (const job of importData.jobs) {
        await prisma.job.create({ data: job })
        importedCount++
      }
    }

    if (importData.quotes && importData.quotes.length > 0) {
      for (const quote of importData.quotes) {
        await prisma.quote.create({ data: quote })
        importedCount++
      }
    }

    if (importData.jobLaborEstimates && importData.jobLaborEstimates.length > 0) {
      for (const estimate of importData.jobLaborEstimates) {
        await prisma.jobLaborEstimate.create({ data: estimate })
        importedCount++
      }
    }

    if (importData.engineeringChangeOrders && importData.engineeringChangeOrders.length > 0) {
      for (const eco of importData.engineeringChangeOrders) {
        await prisma.engineeringChangeOrder.create({ data: eco })
        importedCount++
      }
    }

    if (importData.partsServices && importData.partsServices.length > 0) {
      for (const partService of importData.partsServices) {
        await prisma.partsService.create({ data: partService })
        importedCount++
      }
    }

    if (importData.timeEntries && importData.timeEntries.length > 0) {
      for (const timeEntry of importData.timeEntries) {
        await prisma.timeEntry.create({ data: timeEntry })
        importedCount++
      }
    }

    if (importData.timesheetSubmissions && importData.timesheetSubmissions.length > 0) {
      for (const submission of importData.timesheetSubmissions) {
        await prisma.timesheetSubmission.create({ data: submission })
        importedCount++
      }
    }

    return NextResponse.json({ 
      message: 'Data imported successfully',
      imported: {
        total: importedCount,
        users: importData.users?.length || 0,
        customers: importData.customers?.length || 0,
        jobs: importData.jobs?.length || 0,
        quotes: importData.quotes?.length || 0,
        laborCodes: importData.laborCodes?.length || 0,
        timeEntries: importData.timeEntries?.length || 0,
        timesheetSubmissions: importData.timesheetSubmissions?.length || 0,
        jobLaborEstimates: importData.jobLaborEstimates?.length || 0,
        engineeringChangeOrders: importData.engineeringChangeOrders?.length || 0,
        partsServices: importData.partsServices?.length || 0
      }
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    )
  }
}
