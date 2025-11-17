'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { VendorsList } from './vendors-list'
import { VendorInsightsPanel } from '@/components/parts/vendor-insights-panel'
import { Building2, BarChart3 } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  category: string | null
  isActive: boolean
  purchaseOrderCount: number
  partPriceCount: number
}

interface VendorsDashboardProps {
  initialVendors: Vendor[]
}

export function VendorsDashboard({ initialVendors }: VendorsDashboardProps) {
  const [activeTab, setActiveTab] = useState('list')

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="Vendors"
        subtitle="Manage vendor relationships, track spend, and analyze performance"
      />

      <DashboardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">
              <Building2 className="h-4 w-4 mr-2" />
              Vendor List
            </TabsTrigger>
            <TabsTrigger value="insights">
              <BarChart3 className="h-4 w-4 mr-2" />
              Vendor Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <VendorsList initialVendors={initialVendors} />
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <VendorInsightsPanel />
          </TabsContent>
        </Tabs>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

