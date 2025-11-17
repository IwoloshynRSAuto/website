import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EquipmentService } from '@/lib/equipment/service'
import { createCalibrationSchema } from '@/lib/equipment/schemas'
import { getStorage } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const formData = await request.formData()
    
    const body: any = {
      equipmentId: resolvedParams.id,
      calibrationDate: formData.get('calibrationDate') as string,
      nextCalibrationDate: formData.get('nextCalibrationDate') as string || null,
      calibratedBy: formData.get('calibratedBy') as string || null,
      certificateNumber: formData.get('certificateNumber') as string || null,
      notes: formData.get('notes') as string || null,
    }

    const validatedData = createCalibrationSchema.parse(body)
    const certificateFile = formData.get('certificate') as File | null

    let certificateFileId: string | undefined

    // Upload certificate file if provided
    if (certificateFile && certificateFile.size > 0) {
      const timestamp = Date.now()
      const sanitizedName = `calibration_${timestamp}`
      const fileExtension = certificateFile.name.split('.').pop()
      const storagePath = `equipment/calibrations/${sanitizedName}.${fileExtension}`

      const storage = await getStorage()
      const buffer = Buffer.from(await certificateFile.arrayBuffer())
      await storage.upload(storagePath, buffer, {
        contentType: certificateFile.type,
      })

      const fileRecord = await prisma.fileRecord.create({
        data: {
          storagePath,
          fileName: certificateFile.name,
          fileType: certificateFile.type,
          fileSize: certificateFile.size,
          createdById: session.user.id,
          metadata: {
            equipmentId: resolvedParams.id,
            type: 'calibration_certificate',
          },
        },
      })

      certificateFileId = fileRecord.id
    }

    const calibration = await EquipmentService.createCalibration(validatedData, certificateFileId)

    return NextResponse.json({
      success: true,
      data: calibration,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating calibration:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create calibration' },
      { status: 500 }
    )
  }
}


