import { prisma } from '@/lib/prisma'
import { LaborCodesTable } from '@/components/admin/labor-codes-table'
import { CreateLaborCodeDialog } from '@/components/admin/create-labor-code-dialog'

export default async function LaborCodesPage() {
  const laborCodes = await prisma.laborCode.findMany({
    orderBy: [
      { category: 'asc' },
      { code: 'asc' }
    ]
  })

  // Convert Decimal fields to numbers for client compatibility
  const laborCodesResponse = laborCodes.map(code => ({
    ...code,
    hourlyRate: Number(code.hourlyRate)
  }))

  // Get unique categories for filtering
  const categories = Array.from(new Set(laborCodes.map(code => code.category))).sort()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Labor Codes</h1>
          <p className="text-gray-600">Manage labor codes for time tracking and billing</p>
        </div>
        <CreateLaborCodeDialog />
      </div>

      <LaborCodesTable 
        laborCodes={laborCodesResponse} 
        categories={categories}
      />
    </div>
  )
}





