// ─── Currency Formatting ───
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatINRShort(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toLocaleString('en-IN')}`
}

// ─── Date Formatting ───
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function toISODate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0]
}

export function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = new Date(dateStr)
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

export function isUpcoming(dateStr: string, daysAhead = 7): boolean {
  const now = new Date(new Date().toDateString())
  const due = new Date(dateStr)
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= daysAhead
}

// ─── Trip Calculations ───
export function calcExtraKm(startKm: number, endKm: number, includedKm: number): number {
  const distance = Math.max(0, endKm - startKm)
  return Math.max(0, distance - includedKm)
}

export function calcExtraKmCharge(extraKm: number, rate: number): number {
  return extraKm * rate
}

export function calcTotalFare(baseFare: number, extraKmCharge: number): number {
  return baseFare + extraKmCharge
}

export function calcCustomerBalance(totalFare: number, customerPaid: number): number {
  return Math.max(0, totalFare - customerPaid)
}

export function calcDriverBalance(driverAgreedPay: number, driverPaid: number): number {
  return Math.max(0, driverAgreedPay - driverPaid)
}

export function calcTripProfit(totalFare: number, driverPay: number, expenses: number): number {
  return totalFare - driverPay - expenses
}

export function calculateTripFare(params: {
  startingKm: number
  endingKm: number
  includedKm: number
  extraKmRate: number
  baseFare: number
  advanceReceived: number
  customerPaid: number
  driverAgreedPay: number
  driverPaid: number
}) {
  const distanceTraveled = Math.max(0, params.endingKm - params.startingKm)
  const extraKm = Math.max(0, distanceTraveled - params.includedKm)
  const extraKmCharge = extraKm * params.extraKmRate
  const totalFare = params.baseFare + extraKmCharge
  const customerBalance = Math.max(0, totalFare - params.advanceReceived - params.customerPaid)
  const driverBalance = Math.max(0, params.driverAgreedPay - params.driverPaid)

  return {
    distanceTraveled,
    extraKm,
    extraKmCharge,
    totalFare,
    customerBalance,
    driverBalance,
  }
}

// ─── ID Generation ───
export function generateTripNumber(): string {
  const now = new Date()
  const yr = now.getFullYear().toString().slice(-2)
  const mo = (now.getMonth() + 1).toString().padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `TRP-${yr}${mo}-${rand}`
}

export function generatePaymentId(): string {
  const now = new Date()
  const yr = now.getFullYear().toString().slice(-2)
  const mo = (now.getMonth() + 1).toString().padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `PAY-${yr}${mo}-${rand}`
}

// ─── Vehicle ───
export function normalizeRegNumber(reg: string): string {
  return reg.replace(/[\s\-]/g, '').toUpperCase()
}

export function isDocumentExpiringSoon(expiryDate: string, daysThreshold = 30): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= daysThreshold
}

export const isDateExpiringSoon = isDocumentExpiringSoon

export function isDocumentExpired(expiryDate: string): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

// ─── CSV Export ───
export function escapeCsvField(field: string | number): string {
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csv = [
    headers.map(escapeCsvField).join(','),
    ...data.map(row => headers.map(h => escapeCsvField((row[h] as string | number) ?? '')).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export const exportToCSV = downloadCsv
