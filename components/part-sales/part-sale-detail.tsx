'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  Download, 
  DollarSign, 
  TrendingUp, 
  Package,
  Building2,
  Calendar,
  History,
  Wrench,
} from 'lucide-react'
import { format } from 'date-fns'
import { MarginTracker } from './margin-tracker'
import { useToast } from '@/components/ui/use-toast'

interface PartSaleDetailProps {
  partSale: any & {
    totalCost: number
    totalCustomerPrice: number
    margin: number
    markup: number
  }
}

export function PartSaleDetail({ partSale }: PartSaleDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'DRAFT': 'outline',
      'SENT': 'secondary',
      'WON': 'default',
      'LOST': 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`/api/quotes/${partSale.id}/export`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to export PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PartSale-${partSale.quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: 'PDF exported successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export PDF',
        variant: 'destructive',
      })
    }
  }

  const handleConvertToJob = async () => {
    try {
      const response = await fetch(`/api/part-sales/${partSale.id}/convert`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to convert to job')
      }

      const data = await response.json()

      toast({
        title: 'Success',
        description: 'Part sale converted to job successfully',
      })

      router.push(`/dashboard/jobs/${data.id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to convert to job',
        variant: 'destructive',
      })
    }
  }

  const bom = partSale.linkedBOMs?.[0]

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title={`Part Sale: ${partSale.quoteNumber}`}
        subtitle={partSale.title}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/part-sales/${partSale.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {partSale.status === 'WON' && !partSale.job && (
            <Button onClick={handleConvertToJob}>
              <Wrench className="h-4 w-4 mr-2" />
              Convert to Job
            </Button>
          )}
        </div>
      </DashboardHeader>

      <DashboardContent>
        {/* Status and Key Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div>{getStatusBadge(partSale.status)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Value</div>
                  <div className="text-2xl font-bold">${partSale.totalCustomerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Cost</div>
                  <div className="text-2xl font-bold">${partSale.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Margin</div>
                  <div className="text-2xl font-bold text-green-600">{partSale.margin.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Markup: {partSale.markup.toFixed(1)}%</div>
                </div>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bom">BOM</TabsTrigger>
            <TabsTrigger value="margin">Margin Tracker</TabsTrigger>
            <TabsTrigger value="revisions">Revisions ({partSale.revisions?.length || 0})</TabsTrigger>
            <TabsTrigger value="files">Files ({partSale.fileRecords?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Customer</div>
                    <div className="font-medium">{partSale.customer?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Description</div>
                    <div className="text-sm">{partSale.description || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Valid Until</div>
                    <div className="text-sm">
                      {partSale.validUntil ? format(new Date(partSale.validUntil), 'PPP') : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Created</div>
                    <div className="text-sm">{format(new Date(partSale.createdAt), 'PPP')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Last Updated</div>
                    <div className="text-sm">{format(new Date(partSale.updatedAt), 'PPP')}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-semibold">${partSale.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-semibold">${partSale.totalCustomerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Profit:</span>
                    <span className="font-semibold text-green-600">
                      ${(partSale.totalCustomerPrice - partSale.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Margin:</span>
                    <span className="font-semibold text-green-600">{partSale.margin.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Markup:</span>
                    <span className="font-semibold text-green-600">{partSale.markup.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bom">
            {bom && bom.parts && bom.parts.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Bill of Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Part Number</th>
                          <th className="text-left py-2 px-3">Description</th>
                          <th className="text-right py-2 px-3">Qty</th>
                          <th className="text-right py-2 px-3">Unit Cost</th>
                          <th className="text-right py-2 px-3">Total Cost</th>
                          <th className="text-right py-2 px-3">Customer Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.parts.map((part: any) => (
                          <tr key={part.id} className="border-b">
                            <td className="py-2 px-3">{part.partNumber}</td>
                            <td className="py-2 px-3">{part.description || '—'}</td>
                            <td className="text-right py-2 px-3">{part.quantity}</td>
                            <td className="text-right py-2 px-3">
                              ${Number(part.purchasePrice).toFixed(2)}
                            </td>
                            <td className="text-right py-2 px-3">
                              ${(Number(part.purchasePrice) * part.quantity).toFixed(2)}
                            </td>
                            <td className="text-right py-2 px-3 font-semibold">
                              ${Number(part.customerPrice).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td colSpan={4} className="py-2 px-3 text-right">Total:</td>
                          <td className="text-right py-2 px-3">
                            ${partSale.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-right py-2 px-3">
                            ${partSale.totalCustomerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No BOM linked to this part sale
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="margin">
            <MarginTracker partSaleId={partSale.id} initialMargin={partSale.margin} initialMarkup={partSale.markup} />
          </TabsContent>

          <TabsContent value="revisions">
            {partSale.revisions && partSale.revisions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Revision History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {partSale.revisions.map((revision: any) => (
                      <div key={revision.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold">Revision {revision.revisionNumber}</div>
                            <div className="text-sm text-gray-500">
                              {revision.createdBy?.name || 'Unknown'} • {format(new Date(revision.createdAt), 'PPP p')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No revisions yet
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="files">
            {partSale.fileRecords && partSale.fileRecords.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {partSale.fileRecords.map((file: any) => (
                      <div key={file.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium">{file.fileName}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(file.createdAt), 'PPP')}
                            </div>
                          </div>
                        </div>
                        {file.fileUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No files attached
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

