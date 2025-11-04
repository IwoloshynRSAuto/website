import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const updateQuoteSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional(),
  isActive: z.boolean().optional(),
  amount: z.number().optional(),
  lastFollowUp: z.string().optional().nullable(),
  quoteFile: z.string().optional().nullable(),
  bomId: z.string().optional(), // Link BOM to quote
  // Add other quote fields as needed
})

// GET single quote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        linkedBOMs: {
          include: {
            parts: {
              include: {
                originalPart: {
                  select: {
                    id: true,
                    partNumber: true,
                    manufacturer: true,
                    description: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Error fetching quote:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}

// PATCH update quote
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const validated = updateQuoteSchema.partial().parse(body)

    const updateData: any = {}
    if (validated.title) updateData.title = validated.title
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.status) updateData.status = validated.status
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive
    if (validated.amount !== undefined) updateData.amount = validated.amount
    if (validated.lastFollowUp !== undefined) {
      updateData.lastFollowUp = validated.lastFollowUp ? new Date(validated.lastFollowUp) : null
    }
    
    // Handle BOM linking
    if (validated.bomId !== undefined) {
      // Connect the BOM to the quote via the relation
      updateData.linkedBOMs = {
        connect: { id: validated.bomId },
      }
    }
    
    // Handle quote file deletion - remove physical file from storage
    if (validated.quoteFile !== undefined) {
      if (validated.quoteFile === '' || validated.quoteFile === null) {
        // Get current quote to find the existing file
        const currentQuote = await prisma.quote.findUnique({
          where: { id },
          select: { quoteFile: true }
        })
        
        // Delete the physical file if it exists
        if (currentQuote?.quoteFile) {
          try {
            const storageDir = join(process.cwd(), 'storage', 'quotes')
            const filePath = join(storageDir, currentQuote.quoteFile)
            
            // Security: Verify the path is within storage/quotes directory
            if (filePath.startsWith(storageDir) && existsSync(filePath)) {
              await unlink(filePath)
              console.log('Deleted quote file:', filePath)
            }
          } catch (fileError) {
            // Log error but don't fail the request if file deletion fails
            console.error('Error deleting quote file from storage:', fileError)
          }
        }
        
        updateData.quoteFile = null
      } else {
        updateData.quoteFile = validated.quoteFile
      }
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating quote:', error)
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    )
  }
}

// DELETE quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    // Get quote to check for file before deletion
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: { quoteFile: true }
    })

    // Delete the quote file if it exists
    if (quote?.quoteFile) {
      try {
        const storageDir = join(process.cwd(), 'storage', 'quotes')
        const filePath = join(storageDir, quote.quoteFile)
        
        if (filePath.startsWith(storageDir) && existsSync(filePath)) {
          await unlink(filePath)
          console.log('Deleted quote file:', filePath)
        }
      } catch (fileError) {
        console.error('Error deleting quote file from storage:', fileError)
      }
    }

    // Delete the quote
    await prisma.quote.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Quote deleted successfully' })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    )
  }
}

