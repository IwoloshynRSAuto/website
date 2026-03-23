import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TASK_CODES } from '@/lib/task-codes'

// POST /api/task-codes/import
// Import task codes from static file to database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let created = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const taskCode of TASK_CODES) {
      try {
        const result = await prisma.taskCode.upsert({
          where: { code: taskCode.code },
          update: {
            description: taskCode.description,
            category: taskCode.category,
            isActive: true,
          },
          create: {
            code: taskCode.code,
            description: taskCode.description,
            category: taskCode.category,
            isActive: true,
          },
        })
        
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++
        } else {
          updated++
        }
      } catch (error: any) {
        if (error.code === 'P2002') {
          skipped++
        } else {
          errors.push(`${taskCode.code}: ${error.message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        updated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/task-codes/import] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to import task codes',
    }, { status: 500 })
  }
}

