'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

interface ECO {
  id: string
  ecoNumber: string
  oldHours: number
  newHours: number
  oldCost?: number
  newCost?: number
  reasonForChange?: string
  status: string
  revision: string
  submittedAt: string
  appliedAt?: string
  submittedBy: {
    name: string
    email: string
  }
}

interface ECOHistoryProps {
  jobId: string
  jobNumber: string
}

export function ECOHistory({ jobId, jobNumber }: ECOHistoryProps) {
  const { toast } = useToast()
  const [ecos, setEcos] = useState<ECO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchECOs()
  }, [jobId])

  const fetchECOs = async () => {
    try {
      const response = await fetch(`/api/eco?jobId=${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setEcos(data)
      }
    } catch (error) {
      console.error('Error fetching ECOs:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyECO = async (ecoId: string) => {
    try {
      const response = await fetch('/api/eco/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ecoId })
      })

      if (response.ok) {
        toast({ title: 'ECO applied successfully' })
        fetchECOs()
      } else {
        const error = await response.json()
        toast({ title: 'Failed to apply ECO', description: error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to apply ECO', variant: 'destructive' })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-amber-100 text-amber-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ECO History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading ECO history...</div>
        </CardContent>
      </Card>
    )
  }

  if (ecos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ECO History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No ECOs submitted for this job</p>
            <p className="text-sm text-gray-500 mt-1">
              ECOs are created when quote hours are modified after job conversion
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          ECO History ({ecos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">ECO Number</TableHead>
                <TableHead className="w-20">Revision</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-32">Hours Change</TableHead>
                <TableHead className="w-32">Cost Change</TableHead>
                <TableHead className="w-40">Submitted By</TableHead>
                <TableHead className="w-32">Date</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ecos.map((eco) => (
                <TableRow key={eco.id}>
                  <TableCell className="font-medium text-sm">
                    {eco.ecoNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {eco.revision}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(eco.status)}
                      <Badge className={`text-xs ${getStatusColor(eco.status)}`}>
                        {eco.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      <div>{eco.oldHours} → {eco.newHours}</div>
                      <div className={`text-xs ${eco.newHours > eco.oldHours ? 'text-red-600' : 'text-green-600'}`}>
                        {eco.newHours > eco.oldHours ? '+' : ''}{eco.newHours - eco.oldHours}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {eco.oldCost && eco.newCost ? (
                      <div>
                        <div>${eco.oldCost.toLocaleString()} → ${eco.newCost.toLocaleString()}</div>
                        <div className={`text-xs ${eco.newCost > eco.oldCost ? 'text-red-600' : 'text-green-600'}`}>
                          {eco.newCost > eco.oldCost ? '+' : ''}${(eco.newCost - eco.oldCost).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      <div className="font-medium">{eco.submittedBy.name}</div>
                      <div className="text-xs text-gray-500">{eco.submittedBy.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      <div>{format(new Date(eco.submittedAt), 'MMM dd, yyyy')}</div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(eco.submittedAt), 'h:mm a')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {eco.status === 'PENDING' && (
                      <Button
                        size="sm"
                        onClick={() => applyECO(eco.id)}
                        className="text-xs"
                      >
                        Apply
                      </Button>
                    )}
                    {eco.status === 'APPLIED' && eco.appliedAt && (
                      <div className="text-xs text-green-600">
                        Applied {format(new Date(eco.appliedAt), 'MMM dd')}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
