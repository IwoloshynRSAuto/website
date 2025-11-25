import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateListingCode } from '@/lib/ebay/code-generator'
import { analyzeImagesStub, generateTitleFromImagesStub } from '@/lib/ebay/ai-stub'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400 }
      )
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 images allowed' },
        { status: 400 }
      )
    }

    // Validate file types and sizes
    for (const file of files) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.` },
          { status: 400 }
        )
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File too large: ${file.name}. Maximum size is 10MB.` },
          { status: 400 }
        )
      }
    }

    // Generate unique listing code
    const code = await generateListingCode()

    // Create listing in database first
    const listing = await prisma.ebayListing.create({
      data: {
        code,
        title: null, // Will be set after AI generation
        listingStatus: 'draft',
        userId: session.user.id
      }
    })

    const listingId = listing.id
    const listingsBaseDir = join(process.cwd(), 'storage', 'listings')
    const listingFolderPath = join(listingsBaseDir, listingId, 'images')

    // Create folder structure
    if (!existsSync(listingFolderPath)) {
      await mkdir(listingFolderPath, { recursive: true })
    }

    // Save images and create database records
    const savedImages = []
    const imagePaths: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop() || 'jpg'
      const newFilename = `image-${i + 1}.${ext}`
      const destinationPath = join(listingFolderPath, newFilename)

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(destinationPath, buffer)

      imagePaths.push(destinationPath)

      // Save image record to database
      const imageUrl = `/api/ebay/listings/${listingId}/images/${newFilename}`
      const imageRecord = await prisma.ebayListingImage.create({
        data: {
          listingId,
          filename: newFilename,
          url: imageUrl,
          order: i
        }
      })
      savedImages.push(imageRecord)
    }

    // Update listing with folder path
    await prisma.ebayListing.update({
      where: { id: listingId },
      data: {
        imageFolderPath: `/listings/${listingId}/images/`
      }
    })

    // Generate title and AI analysis using stubs
    let generatedTitle = 'Product Listing'
    try {
      // Generate title
      const titleResult = await generateTitleFromImagesStub(imagePaths, listingId)
      generatedTitle = titleResult.title

      // Run full AI analysis stub
      const aiAnalysis = await analyzeImagesStub(imagePaths, listingId)

      // Save AI analysis to database
      await prisma.ebayAIAnalysis.create({
        data: {
          listingId,
          autoTitle: aiAnalysis.autoTitle,
          autoDescription: aiAnalysis.autoDescription,
          autoCategory: aiAnalysis.autoCategory,
          detectedBrand: aiAnalysis.detectedBrand,
          detectedModel: aiAnalysis.detectedModel,
          itemSpecifics: JSON.stringify(aiAnalysis.itemSpecifics),
          suggestedCategory: aiAnalysis.autoCategory,
          confidenceScore: aiAnalysis.confidenceScore || 0.75
        }
      })

      // Update listing with generated title and pricing
      await prisma.ebayListing.update({
        where: { id: listingId },
        data: {
          title: generatedTitle,
          suggestedPrice: aiAnalysis.suggestedPrice,
          suggestedAuctionPrice: aiAnalysis.suggestedAuctionPrice,
          suggestedShipping: aiAnalysis.suggestedShipping
        }
      })
    } catch (aiError) {
      console.error('[Listings] AI analysis failed:', aiError)
      // Continue without AI data - user can add it manually
    }

    return NextResponse.json({
      success: true,
      data: {
        id: listingId,
        code,
        title: generatedTitle,
        imageFolderPath: `/listings/${listingId}/images/`,
        imageCount: savedImages.length
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Listings] Error creating listing:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create listing'
      },
      { status: 500 }
    )
  }
}

