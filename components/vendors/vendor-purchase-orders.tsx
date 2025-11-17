'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { Package, Calendar } from 'lucide-react'

interface PurchaseOrder {
  id: string
  poNumber: string
  status: string
  orderDate: string
  expectedDate: string | null
  receivedDate: string | null
  totalAmount: number
  jobNumber: string | null
  jobTitle: string | null
  itemCount: number
}

interface VendorPurchaseOrdersProps {
  vendorId: string
  initialOrders: PurchaseOrder[]
}

export function VendorPurchaseOrders({ vendorId, initialOrders }: VendorPurchaseOrdersProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'DRAFT': 'outline',
      'SENT': 'secondary',
      'RECEIVED': 'default',
      'PARTIALLY_RECEIVED': 'secondary',
      'COMPLETED': 'default',
      'CANCELLED': 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Orders</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Date</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-center">Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                initialOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.poNumber}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {format(new Date(order.orderDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {order.expectedDate ? (
                        format(new Date(order.expectedDate), 'MMM d, yyyy')
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.receivedDate ? (
                        format(new Date(order.receivedDate), 'MMM d, yyyy')
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${order.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {order.jobNumber ? (
                        <Link
                          href={`/dashboard/jobs/${order.jobNumber}`}
                          className="text-blue-600 hover:underline"
                        >
                          {order.jobNumber}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="h-4 w-4 text-gray-400" />
                        {order.itemCount}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

