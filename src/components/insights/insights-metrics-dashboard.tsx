'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'

export type VendorSpendRow = { vendorId: string; vendorName: string; orderCount: number; totalSpend: number }
export type CustomerHoursRow = { customerId: string; customerName: string; totalHours: number }
export type CustomerPaidRow = { customerId: string; customerName: string; paidTotal: number }
export type MonthlyHoursPoint = { monthIndex: number; label: string; hours: number }

type Props = {
  view: 'metrics' | 'tables'
  year: number
  vendors: VendorSpendRow[]
  hoursByCustomer: CustomerHoursRow[]
  paidByCustomer: CustomerPaidRow[]
  monthlyHours: MonthlyHoursPoint[]
}

function trunc(s: string, max: number) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function InsightsMetricsDashboard({
  view,
  year,
  vendors,
  hoursByCustomer,
  paidByCustomer,
  monthlyHours,
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const formatMoney = (n: number) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  const kpis = useMemo(() => {
    const totalSpend = vendors.reduce((s, v) => s + v.totalSpend, 0)
    const poCount = vendors.reduce((s, v) => s + v.orderCount, 0)
    const billableHours = hoursByCustomer.reduce((s, c) => s + c.totalHours, 0)
    const paidTotal = paidByCustomer.reduce((s, c) => s + c.paidTotal, 0)
    const activeCustomers = hoursByCustomer.filter((c) => c.totalHours > 0).length
    const activeVendors = vendors.filter((v) => v.totalSpend > 0).length
    return { totalSpend, poCount, billableHours, paidTotal, activeCustomers, activeVendors }
  }, [vendors, hoursByCustomer, paidByCustomer])

  const vendorChartData = useMemo(
    () =>
      vendors.slice(0, 12).map((v) => ({
        name: trunc(v.vendorName, 22),
        spend: Math.round(v.totalSpend),
        orders: v.orderCount,
      })),
    [vendors]
  )

  const hoursChartData = useMemo(
    () =>
      hoursByCustomer.slice(0, 12).map((c) => ({
        name: trunc(c.customerName, 22),
        hours: Math.round(c.totalHours * 10) / 10,
      })),
    [hoursByCustomer]
  )

  const paidChartData = useMemo(
    () =>
      paidByCustomer.slice(0, 12).map((c) => ({
        name: trunc(c.customerName, 22),
        paid: Math.round(c.paidTotal),
      })),
    [paidByCustomer]
  )

  if (view === 'metrics' && !mounted) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
          aria-hidden
        />
        <span className="text-sm">Loading charts…</span>
      </div>
    )
  }

  const metricsSection = (
    <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                PO spend (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(kpis.totalSpend)}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpis.activeVendors} vendors · {kpis.poCount} POs</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Billable hours (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{kpis.billableHours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpis.activeCustomers} customers with hours</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Paid milestones (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(kpis.paidTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">Rough booked revenue signal</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Avg hours / customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {kpis.activeCustomers > 0 ? (kpis.billableHours / kpis.activeCustomers).toFixed(1) : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Among customers with time this year</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Billable hours by month ({year})</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {monthlyHours.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monthly data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyHours} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={56} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | string) => [`${Number(v).toFixed(1)} h`, 'Hours']} />
                  <Line type="monotone" dataKey="hours" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="Hours" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Top vendors by spend</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {vendorChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vendor spend yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={vendorChartData} margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)} />
                    <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number | string) => formatMoney(Number(v))} />
                    <Bar dataKey="spend" fill="#2563eb" radius={[0, 4, 4, 0]} name="Spend" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">Top customers by billable hours</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {hoursChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No customer hours yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={hoursChartData} margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number | string) => [`${Number(v).toFixed(1)} h`, 'Hours']} />
                    <Bar dataKey="hours" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Paid milestones — top customers</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {paidChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid milestones this year.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paidChartData} margin={{ left: 8, right: 16, top: 8, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={56} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)} />
                  <Tooltip formatter={(v: number | string) => formatMoney(Number(v))} />
                  <Bar dataKey="paid" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Paid" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
    </div>
  )

  const tablesSection = (
    <div className="space-y-6">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Vendor spend ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            {vendors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchase orders found for this year.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">POs</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.slice(0, 25).map((v) => (
                    <TableRow key={v.vendorId}>
                      <TableCell className="font-medium">{v.vendorName}</TableCell>
                      <TableCell className="text-right">{v.orderCount}</TableCell>
                      <TableCell className="text-right">{formatMoney(v.totalSpend)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Billable hours by customer ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            {hoursByCustomer.length === 0 ? (
              <p className="text-sm text-muted-foreground">No billable time entries this year.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursByCustomer.slice(0, 25).map((c) => (
                    <TableRow key={c.customerId}>
                      <TableCell className="font-medium">
                        <Link href="/dashboard/customers" className="hover:underline">
                          {c.customerName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{c.totalHours.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base">Paid billing milestones by customer ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            {paidByCustomer.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No milestones marked PAID with updates this year (or milestones are not tracked yet).
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Paid total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidByCustomer.slice(0, 25).map((c) => (
                    <TableRow key={c.customerId}>
                      <TableCell className="font-medium">{c.customerName}</TableCell>
                      <TableCell className="text-right">{formatMoney(c.paidTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </div>
  )

  return view === 'metrics' ? metricsSection : tablesSection
}
