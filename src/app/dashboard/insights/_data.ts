import {
  getVendorSpendYtd,
  getCustomerBillableHoursYtd,
  getCustomerPaidInvoicingYtd,
  getMonthlyBillableHoursYtd,
} from '@/lib/insights/metrics'

export async function fetchInsightsData() {
  const year = new Date().getFullYear()
  const [vendors, hoursByCustomer, paidByCustomer, monthlyHours] = await Promise.all([
    getVendorSpendYtd(),
    getCustomerBillableHoursYtd(),
    getCustomerPaidInvoicingYtd(),
    getMonthlyBillableHoursYtd(),
  ])
  return { year, vendors, hoursByCustomer, paidByCustomer, monthlyHours }
}
