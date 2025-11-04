const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const prisma = new PrismaClient()

async function importPartsFromExcel() {
  try {
    const excelPath = path.join(process.cwd(), 'storage', 'Parts Database.xlsm')
    
    if (!fs.existsSync(excelPath)) {
      console.error(`Excel file not found at: ${excelPath}`)
      process.exit(1)
    }

    console.log('Reading Excel file...')
    const workbook = XLSX.readFile(excelPath)
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Read as array of arrays first to find header row
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null, header: 1 })
    
    // Find header row (should be row 5, index 4)
    let headerRowIndex = -1
    const headerRow = ['QTY', 'MFG', 'CAT NO', 'DESCRIPTION']
    
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i]
      if (row && row[0] === 'QTY' && row[1] === 'MFG' && row[2] === 'CAT NO') {
        headerRowIndex = i
        break
      }
    }
    
    if (headerRowIndex === -1) {
      console.error('Could not find header row in Excel file')
      return
    }
    
    console.log(`Found header row at index ${headerRowIndex}`)
    
    // Get headers
    const headers = rawData[headerRowIndex]
    console.log('Headers:', headers)
    
    // Convert to objects starting from row after headers
    // Skip sub-header rows that have values like "HRS", "COST CODE", etc.
    const rows = []
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || (row[0] === null && row[1] === null && row[2] === null)) continue // Skip empty rows
      
      // Skip sub-header rows (they have values like "HRS", "COST CODE" in QTY/MFG columns)
      const qtyVal = row[0]
      const mfgVal = row[1]
      const qty = qtyVal !== null && qtyVal !== undefined ? String(qtyVal).trim().toUpperCase() : ''
      const mfg = mfgVal !== null && mfgVal !== undefined ? String(mfgVal).trim().toUpperCase() : ''
      
      if (qty === 'HRS' || qty === 'QTY' || mfg === 'COST CODE' || mfg === 'MFG') {
        continue // Skip sub-header rows
      }
      
      // Skip rows that look like section dividers (all "END" or similar)
      if (qty === 'END' || mfg === 'END' || qty === '.') {
        continue
      }
      
      // Must have manufacturer and either CAT NO or RSA PART # to be valid
      if (!mfg || (!row[2] && !row[13])) {
        continue // Skip rows without required data
      }
      
      const rowObj = {}
      headers.forEach((header, idx) => {
        const value = row[idx]
        // Convert to appropriate types
        if (header === 'COST' && value !== null) {
          rowObj[header] = typeof value === 'number' ? value : parseFloat(value)
        } else {
          rowObj[header] = value !== null && value !== undefined ? String(value).trim() : null
        }
        // Handle empty strings
        if (rowObj[header] === '') {
          rowObj[header] = null
        }
      })
      rows.push(rowObj)
    }
    
    console.log(`Found ${rows.length} data rows in Excel file`)
    
    if (rows.length === 0) {
      console.log('No data found in Excel file')
      return
    }
    
    console.log('Sample row:', rows[0])

    // Process and import each row
    let imported = 0
    let skipped = 0
    let errors = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      try {
        // Map Excel columns to our database fields
        // Headers: QTY, MFG, CAT NO, DESCRIPTION, Comment, LIST, MULT, COST, EXT COST, SELL, EXT SELL, MAR, DATE, RSA PART #, Vendor
        // Use RSA PART # if available, otherwise use CAT NO
        let partNumber = (row['RSA PART #'] && String(row['RSA PART #']).trim() && String(row['RSA PART #']).trim() !== 'END') 
          ? row['RSA PART #'] 
          : (row['CAT NO'] || null)
        const manufacturer = row['MFG'] || null
        const description = row['DESCRIPTION'] || row['Comment'] || null
        const primarySource = row['Vendor'] || null
        let purchasePrice = row['COST']
        
        // Clean and validate part number
        if (partNumber) {
          partNumber = String(partNumber).trim()
          if (partNumber === '' || partNumber === '.' || partNumber === '-') {
            partNumber = null
          }
        }
        
        // Clean and validate price
        if (purchasePrice !== null && purchasePrice !== undefined) {
          purchasePrice = typeof purchasePrice === 'number' ? purchasePrice : parseFloat(purchasePrice)
          if (isNaN(purchasePrice)) {
            purchasePrice = null
          }
        } else {
          purchasePrice = null
        }
        
        // No secondary sources column in this Excel file
        let secondarySources = null

        // Skip if required fields are missing
        if (!partNumber || !manufacturer) {
          console.log(`Skipping row ${i + 1}: Missing part number or manufacturer`)
          skipped++
          continue
        }

        // Check if part already exists
        const existing = await prisma.part.findUnique({
          where: { partNumber: String(partNumber) }
        })

        if (existing) {
          console.log(`Part ${partNumber} already exists, skipping...`)
          skipped++
          continue
        }

        // Convert purchase price to number
        let price = null
        if (purchasePrice !== null && purchasePrice !== undefined) {
          price = parseFloat(purchasePrice)
          if (isNaN(price)) price = null
        }

        // Create the part
        await prisma.part.create({
          data: {
            partNumber: String(partNumber),
            manufacturer: String(manufacturer),
            description: description ? String(description) : null,
            primarySource: primarySource ? String(primarySource) : null,
            secondarySources: secondarySources && secondarySources.length > 0 ? JSON.stringify(secondarySources) : null,
            purchasePrice: price,
          }
        })

        console.log(`✓ Imported: ${partNumber} - ${manufacturer}`)
        imported++
      } catch (error) {
        console.error(`Error importing row ${i + 1}:`, error.message)
        console.error('Row data:', row)
        errors++
      }
    }

    console.log('\n=== Import Summary ===')
    console.log(`Total rows: ${rows.length}`)
    console.log(`Imported: ${imported}`)
    console.log(`Skipped: ${skipped}`)
    console.log(`Errors: ${errors}`)

  } catch (error) {
    console.error('Error importing parts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

importPartsFromExcel()
  .then(() => {
    console.log('\nImport completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })

