/**
 * PDF generation for quotes using PDFKit
 */

import { getStorage } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

interface QuotePDFOptions {
  quote: any
  userId: string
}

/**
 * Generate a PDF for a quote and save it to storage
 * Returns the FileRecord ID
 */
export async function generateQuotePDF(options: QuotePDFOptions): Promise<string> {
  const { quote, userId } = options

  // Get full quote data with BOM and customer
  const fullQuote = await prisma.quote.findUnique({
    where: { id: quote.id },
    include: {
      customer: true,
      linkedBOMs: {
        include: {
          parts: {
            include: {
              originalPart: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!fullQuote) {
    throw new Error('Quote not found')
  }

  // Dynamically import PDFKit to avoid build errors when not installed
  let PDFDocument
  try {
    PDFDocument = (await import('pdfkit')).default
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
      throw new Error(
        'PDF generation requires pdfkit package. Please install it: npm install pdfkit'
      )
    }
    throw error
  }

  // Create PDF document
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(chunk))

  // Wait for PDF to finish
  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    doc.on('error', reject)
  })

  // Add content to PDF
  addQuoteContent(doc, fullQuote)

  // Finalize PDF
  doc.end()

  // Wait for PDF to be generated
  const pdfBuffer = await pdfPromise

  // Save to storage
  const storage = await getStorage()
  const timestamp = Date.now()
  const sanitizedQuoteNumber = fullQuote.quoteNumber.replace(/[^a-zA-Z0-9]/g, '-')
  const storagePath = `quotes/${sanitizedQuoteNumber}-export-${timestamp}.pdf`

  await storage.upload(storagePath, pdfBuffer, 'application/pdf')

  // Get public URL if available
  const publicUrl = storage.getPublicUrl(storagePath)

  // Create FileRecord
  const fileRecord = await prisma.fileRecord.create({
    data: {
      storagePath,
      fileUrl: publicUrl,
      fileName: `Quote-${fullQuote.quoteNumber}.pdf`,
      fileType: 'application/pdf',
      fileSize: pdfBuffer.length,
      createdById: userId,
      linkedQuoteId: fullQuote.id,
      metadata: {
        generatedAt: new Date().toISOString(),
        quoteNumber: fullQuote.quoteNumber,
        exportedBy: userId,
      },
    },
  })

  return fileRecord.id
}

/**
 * Add quote content to PDF document
 */
function addQuoteContent(doc: PDFDocument, quote: any) {
  // Header
  doc.fontSize(24).text('QUOTE', { align: 'center' })
  doc.moveDown()

  // Quote Number and Date
  doc.fontSize(14)
  doc.text(`Quote Number: ${quote.quoteNumber}`, { align: 'left' })
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, { align: 'left' })
  if (quote.validUntil) {
    doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, { align: 'left' })
  }
  doc.moveDown()

  // Customer Information
  if (quote.customer) {
    doc.fontSize(12).text('Customer Information:', { underline: true })
    doc.fontSize(10)
    doc.text(`Name: ${quote.customer.name}`)
    if (quote.customer.email) {
      doc.text(`Email: ${quote.customer.email}`)
    }
    if (quote.customer.phone) {
      doc.text(`Phone: ${quote.customer.phone}`)
    }
    doc.moveDown()
  }

  // Quote Details
  doc.fontSize(12).text('Quote Details:', { underline: true })
  doc.fontSize(10)
  doc.text(`Title: ${quote.title}`)
  if (quote.description) {
    doc.text(`Description: ${quote.description}`)
  }
  doc.text(`Status: ${quote.status}`)
  if (quote.paymentTerms) {
    doc.text(`Payment Terms: ${quote.paymentTerms}`)
  }
  doc.moveDown()

  // BOM Parts Table
  const bom = quote.linkedBOMs?.[0]
  if (bom && bom.parts && bom.parts.length > 0) {
    doc.fontSize(12).text('Bill of Materials:', { underline: true })
    doc.moveDown(0.5)

    // Table header
    const tableTop = doc.y
    const itemWidth = 200
    const qtyWidth = 60
    const priceWidth = 80
    const totalWidth = 80

    doc.fontSize(10)
    doc.font('Helvetica-Bold')
    doc.text('Item', 50, tableTop)
    doc.text('Qty', 50 + itemWidth, tableTop)
    doc.text('Unit Price', 50 + itemWidth + qtyWidth, tableTop)
    doc.text('Total', 50 + itemWidth + qtyWidth + priceWidth, tableTop)
    doc.font('Helvetica')

    let y = tableTop + 20
    let subtotal = 0

    bom.parts.forEach((part: any) => {
      const partNumber = part.partNumber || 'N/A'
      const description = part.description || ''
      const quantity = part.quantity || 0
      const customerPrice = Number(part.customerPrice) || 0
      const total = quantity * customerPrice
      subtotal += total

      // Wrap text if needed
      doc.fontSize(9)
      doc.text(partNumber, 50, y, { width: itemWidth - 10 })
      if (description) {
        doc.text(description, 50, y + 10, { width: itemWidth - 10, continued: false })
      }
      doc.text(quantity.toString(), 50 + itemWidth, y)
      doc.text(`$${customerPrice.toFixed(2)}`, 50 + itemWidth + qtyWidth, y)
      doc.text(`$${total.toFixed(2)}`, 50 + itemWidth + qtyWidth + priceWidth, y)

      y += 30
      if (y > 700) {
        // New page if needed
        doc.addPage()
        y = 50
      }
    })

    // Total
    doc.moveDown()
    doc.fontSize(12).font('Helvetica-Bold')
    doc.text(`Total: $${subtotal.toFixed(2)}`, { align: 'right' })
  }

  // Footer
  doc.fontSize(8)
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    50,
    doc.page.height - 50,
    { align: 'center' }
  )
}

