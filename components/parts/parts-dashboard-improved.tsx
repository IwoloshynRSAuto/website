'use client'

import { useState } from 'react'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PartsTableImproved } from './parts-table-improved'
import { PartBrandLookupPanel } from './part-brand-lookup-panel'

export function PartsDashboardImproved() {
  const [activeTab, setActiveTab] = useState('parts')

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="Parts Dashboard"
        subtitle="Manage parts and lookup parts by brand"
      />

      <DashboardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="parts">Parts Table</TabsTrigger>
            <TabsTrigger value="lookup">Part & Brand Lookup</TabsTrigger>
          </TabsList>

          <TabsContent value="parts" className="mt-0">
            <PartsTableImproved />
          </TabsContent>

          <TabsContent value="lookup" className="mt-0">
            <PartBrandLookupPanel />
          </TabsContent>
        </Tabs>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

