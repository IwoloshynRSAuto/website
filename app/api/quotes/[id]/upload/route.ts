import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    console.log('=== UPLOAD API START ===')
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    console.log('Quote ID from params:', id)

    // Check if quote exists
    const quote = await prisma.quote.findUnique({
      where: { id },
    })

    if (!quote) {
      console.error('Quote not found for ID:', id)
      return NextResponse.json({ error: `Quote not found with ID: ${id}` }, { status: 404 })
    }

    console.log('Quote found:', quote.quoteNumber)

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    console.log('File from formData:', file ? {
      name: file.name,
      size: file.size,
      type: file.type
    } : 'null')

    if (!file) {
      console.error('No file provided in formData')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (allow PDF and Word documents)
    // Also check file extension as some browsers don't send correct MIME types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ]
    const allowedExtensions = ['.pdf', '.doc', '.docx']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    // Check both MIME type and file extension
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)
    
    if (!isValidType) {
      console.warn('Invalid file type:', { name: file.name, type: file.type, extension: fileExtension })
      return NextResponse.json(
        { error: `Invalid file type. Only PDF and Word documents are allowed. Received: ${file.type || fileExtension}` },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Create storage directory if it doesn't exist
    const storageDir = join(process.cwd(), 'storage', 'quotes')
    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true })
    }

    // Generate unique filename: quote-{quoteNumber}-{timestamp}.{ext}
    const timestamp = Date.now()
    // Extract extension (remove leading dot if present)
    const fileExt = fileExtension.startsWith('.') ? fileExtension.substring(1) : (fileExtension || 'pdf')
    const sanitizedQuoteNumber = quote.quoteNumber.replace(/[^a-zA-Z0-9]/g, '-')
    const filename = `quote-${sanitizedQuoteNumber}-${timestamp}.${fileExt}`
    const filePath = join(storageDir, filename)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Update quote with just the filename (file serving route will extract it from path)
    // Store only filename to keep database clean
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        quoteFile: filename,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      filePath: filename,
    })
  } catch (error: any) {
    console.error('Error uploading quote file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    )
  }
}

