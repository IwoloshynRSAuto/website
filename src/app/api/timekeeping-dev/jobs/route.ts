import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = String(searchParams.get('q') || '').trim()

    const jobs = await prisma.job.findMany({
      where: {
        status: { not: 'COMPLETED' },
        ...(q
          ? {
              OR: [
                { jobNumber: { contains: q, mode: 'insensitive' } },
                { title: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { id: true, jobNumber: true, title: true },
      orderBy: { jobNumber: 'asc' },
      take: 200,
    })

    return NextResponse.json({
      success: true,
      data: jobs,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch jobs' }, { status: 500 })
  }
}

