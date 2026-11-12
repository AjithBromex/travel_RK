import jsPDF from 'jspdf'
import type { Payment, Trip, Vehicle } from '@/types'
import { formatINR } from './utils'
import { ensureFontsLoaded } from './pdfFonts'
import { RK_LOGO_BASE64 } from './pdfLogo'

export interface InvoiceData {
  receiptNo: string
  bookNo: string
  date: string

  // Customer Details
  customerName: string
  customerMobile: string
  route: string
  journeyDate: string
  pax: string

  // Payment Details
  tripAmount: number
  advanceReceived: number
  balanceAmount: number
  paymentStage?: 'advance' | 'balance' | 'full' | 'payout'
  amountReceivedInWords: string

  // Trip Details
  routePlaces: string
  totalDistance: string
  fromKm: string
  toKm: string
  tripType: 'Group Tour' | 'Pilgrimage Trip' | 'Family Trip' | 'Corporate Trip' | 'Other'
  tripTypeOther?: string

  // Vehicle Details
  vehicleNo: string
  vehicleType: '9+1' | '12+1' | '17+1' | 'Other'
  vehicleTypeOther?: string
  vehicleDistance: string

  // Driver Details
  driverName: string
  driverMobile: string
  dutyStart: string
  dutyEnd: string

  // Remarks
  remarks: string
  paymentMode: string
}

/**
 * Converts any number to Indian Rupees in words.
 * Example: 25500 -> "Twenty Five Thousand Five Hundred Rupees Only"
 */
export function numberToWordsINR(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Zero Rupees Only'

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ]

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n]
    const ten = Math.floor(n / 10)
    const rest = n % 10
    return tens[ten] + (rest ? ' ' + ones[rest] : '')
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    let res = ''
    if (hundred > 0) {
      res += ones[hundred] + ' Hundred'
      if (rest > 0) res += ' '
    }
    if (rest > 0) {
      res += convertTwoDigits(rest)
    }
    return res
  }

  const rounded = Math.floor(Math.abs(amount))
  const crore = Math.floor(rounded / 10000000)
  const lakh = Math.floor((rounded % 10000000) / 100000)
  const thousand = Math.floor((rounded % 100000) / 1000)
  const remainder = rounded % 1000

  const parts: string[] = []
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore')
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' Lakh')
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' Thousand')
  if (remainder > 0) parts.push(convertThreeDigits(remainder))

  const words = parts.filter(Boolean).join(' ')
  return words ? `${words} Rupees Only` : 'Zero Rupees Only'
}

/**
 * Builds standard InvoiceData by cross-referencing Payment, Trip, and Vehicle.
 */
export function buildInvoiceData(
  payment: Payment,
  trip?: Trip | null,
  vehicle?: Vehicle | null
): InvoiceData {
  // Format Receipt Number (e.g. 0001)
  let rawReceiptNo = '0001'
  if (trip?.receiptNumber) {
    const match = trip.receiptNumber.match(/\d+/)
    rawReceiptNo = match ? match[0].padStart(4, '0') : trip.receiptNumber.replace(/^#/, '')
  } else if (payment.id) {
    const digits = payment.id.replace(/\D/g, '')
    rawReceiptNo = digits ? digits.slice(-4).padStart(4, '0') : '0001'
  }

  // Format Date (DD / MM / YYYY)
  const pDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date()
  const formattedDate = `${String(pDate.getDate()).padStart(2, '0')} / ${String(
    pDate.getMonth() + 1
  ).padStart(2, '0')} / ${pDate.getFullYear()}`

  const journeyDateFormatted = trip?.tripDate
    ? (() => {
        const jd = new Date(trip.tripDate)
        return `${String(jd.getDate()).padStart(2, '0')} / ${String(
          jd.getMonth() + 1
        ).padStart(2, '0')} / ${jd.getFullYear()}`
      })()
    : formattedDate

  const totalFare = Number(trip?.totalFare) || Number(payment.amount) || 0
  const isAdvancePayment = payment.paymentStage === 'advance' || (Boolean(payment.notes) && /advance/i.test(payment.notes!))
  const isBalancePayment = payment.paymentStage === 'balance' || (Boolean(payment.notes) && /balance/i.test(payment.notes!))

  let advance = 0
  let balance = 0

  if (isAdvancePayment) {
    advance = Number(payment.amount)
    balance = trip?.customerBalance !== undefined ? Number(trip.customerBalance) : Math.max(0, totalFare - advance)
  } else if (isBalancePayment) {
    advance = Number(trip?.advanceReceived) || Math.max(0, totalFare - Number(payment.amount))
    balance = trip?.customerBalance !== undefined ? Number(trip.customerBalance) : 0
  } else {
    advance = Number(trip?.advanceReceived) || (payment.type === 'customer_received' ? Number(payment.amount) : 0)
    balance = trip?.customerBalance !== undefined ? Number(trip.customerBalance) : Math.max(0, totalFare - advance)
  }

  const distanceVal =
    trip && trip.endingKm > trip.startingKm
      ? String(trip.endingKm - trip.startingKm)
      : trip?.includedKm
      ? String(trip.includedKm)
      : '-'

  // Determine vehicle seating capacity type
  const vTypeStr = (vehicle?.type || vehicle?.name || '').toLowerCase()
  let detectedType: '9+1' | '12+1' | '17+1' | 'Other' = '12+1'
  if (vTypeStr.includes('9')) detectedType = '9+1'
  else if (vTypeStr.includes('17') || vTypeStr.includes('tempo')) detectedType = '17+1'
  else if (vTypeStr.includes('12') || vTypeStr.includes('traveller')) detectedType = '12+1'
  else detectedType = 'Other'

  return {
    receiptNo: rawReceiptNo,
    bookNo: trip?.tripNumber || `BK-${rawReceiptNo}`,
    date: formattedDate,
    customerName: trip?.customerName || 'Direct Customer',
    customerMobile: trip?.customerPhone || '-',
    route: trip ? `${trip.from} to ${trip.to}` : 'Local / Outstation Service',
    journeyDate: journeyDateFormatted,
    pax: '-',
    tripAmount: totalFare,
    advanceReceived: advance,
    balanceAmount: balance,
    paymentStage: isAdvancePayment ? 'advance' : isBalancePayment ? 'balance' : payment.type === 'driver_payment' ? 'payout' : 'full',
    amountReceivedInWords: numberToWordsINR(payment.amount),
    routePlaces: trip ? `${trip.from} - ${trip.to}` : 'Tour Package Route',
    totalDistance: distanceVal,
    fromKm: trip?.startingKm ? String(trip.startingKm) : '-',
    toKm: trip?.endingKm ? String(trip.endingKm) : '-',
    tripType: 'Group Tour',
    vehicleNo: vehicle?.registrationNumber || trip?.vehicleName || '-',
    vehicleType: detectedType,
    vehicleDistance: distanceVal,
    driverName: trip?.driverName || '-',
    driverMobile: trip?.driverPhone || '-',
    dutyStart: trip?.tripDate || '-',
    dutyEnd: '-',
    remarks: payment.notes
      ? `Payment Mode: ${payment.paymentMode.toUpperCase()} • ${payment.notes}`
      : `Payment Mode: ${payment.paymentMode.toUpperCase()} • Received with thanks.`,
    paymentMode: payment.paymentMode.toUpperCase(),
  }
}

/**
 * Generates and triggers download of a pixel-perfect A4 PDF Cash Receipt / Invoice
 * strictly matching the RK Travel Hub voucher design.
 */
export async function downloadInvoicePDF(
  data: InvoiceData,
  filename?: string
): Promise<boolean> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Load Segoe UI with Unicode & Rupee symbol support
    const fontName = await ensureFontsLoaded(doc)

    const sanitize = (text: string | number): string => {
      const str = String(text ?? '')
      if (fontName === 'helvetica') {
        return str.replace(/₹/g, 'Rs. ')
      }
      return str
    }

    const pageWidth = 210
    const pageHeight = doc.internal.pageSize.getHeight() || 297

    // Outer card container dimensions matching website preview modal
    const outerX = 10
    const outerY = 10
    const outerW = 190
    const outerH = pageHeight - outerY * 2 // 277mm

    // Color definitions exactly matching InvoiceModal.tsx
    const colorNavy: [number, number, number] = [13, 35, 58] // #0D233A
    const colorCardHeader: [number, number, number] = [221, 231, 242] // #DDE7F2
    const colorBlueIcon: [number, number, number] = [29, 78, 216] // #1D4ED8
    const colorBorder: [number, number, number] = [203, 213, 225] // #CBD5E1 (slate-300)
    const colorOuterBorder: [number, number, number] = [226, 232, 240] // #E2E8F0 (slate-200)
    const colorLightDivider: [number, number, number] = [241, 245, 249] // #F1F5F9 (slate-100)
    const colorLabel: [number, number, number] = [100, 116, 139] // #64748B (slate-500)
    const colorValue: [number, number, number] = [15, 23, 42] // #0F172A (slate-900)
    const colorEmerald: [number, number, number] = [5, 150, 105] // #059669 (emerald-600)
    const colorRose: [number, number, number] = [225, 29, 72] // #E11D48 (rose-600)
    const colorSky: [number, number, number] = [56, 189, 248] // #38BDF8 (sky-400)
    const colorSubBox: [number, number, number] = [248, 250, 252] // #F8FAFC (slate-50)

    // Outer Card Frame
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...colorOuterBorder)
    doc.setLineWidth(0.4)
    doc.roundedRect(outerX, outerY, outerW, outerH, 3.5, 3.5, 'FD')

    // ─────────────────────────────────────────────────────────────
    // 1. HEADER (Logo & Brand on Left, Tour Categories Pill on Right)
    // ─────────────────────────────────────────────────────────────
    const headerY = outerY + 4

    // Left: Official 3D Metallic Emblem
    try {
      doc.addImage(RK_LOGO_BASE64, 'PNG', outerX + 6, headerY + 1.5, 16, 16)
    } catch {
      doc.setFillColor(...colorNavy)
      doc.roundedRect(outerX + 6, headerY + 1.5, 16, 16, 2, 2, 'F')
    }

    // Left: Brand Typography
    const brandX = outerX + 25
    doc.setFont(fontName, 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...colorNavy)
    doc.text('RK TRAVEL HUB', brandX, headerY + 6.5)

    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text("TRAVELLER'S HUB", brandX, headerY + 11.5)

    doc.setFont(fontName, 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(148, 163, 184)
    doc.text('COMFORT   •   SAFETY   •   RELIABILITY', brandX, headerY + 16)

    // Right: Tour Categories Navy Pill Container
    const pillW = 60
    const pillH = 24
    const pillX = outerX + outerW - pillW - 6
    const pillY = headerY
    doc.setFillColor(...colorNavy)
    doc.roundedRect(pillX, pillY, pillW, pillH, 3, 3, 'F')

    const tourItems = [
      { name: 'Group Tours', type: 'car' },
      { name: 'Pilgrimage Trips', type: 'pin' },
      { name: 'Family Trips', type: 'user' },
      { name: 'Corporate Trips', type: 'card' },
    ]

    tourItems.forEach((t, idx) => {
      const ty = pillY + 5.0 + idx * 4.8
      doc.setFont(fontName, 'bold')
      doc.setFontSize(7)
      doc.setTextColor(226, 232, 240)
      doc.text(t.name, pillX + 6, ty)

      // Vector Icon in sky-400
      doc.setFillColor(...colorSky)
      doc.setDrawColor(...colorSky)
      const ix = pillX + pillW - 7
      if (t.type === 'car') {
        doc.roundedRect(ix - 2.2, ty - 2.5, 3.2, 1.8, 0.4, 0.4, 'F')
      } else if (t.type === 'pin') {
        doc.circle(ix - 0.6, ty - 1.8, 1.0, 'F')
      } else if (t.type === 'user') {
        doc.circle(ix - 0.6, ty - 2.4, 0.7, 'F')
        doc.roundedRect(ix - 1.6, ty - 1.5, 2.0, 1.2, 0.4, 0.4, 'F')
      } else if (t.type === 'card') {
        doc.setLineWidth(0.3)
        doc.roundedRect(ix - 2.2, ty - 2.5, 3.2, 2.0, 0.3, 0.3, 'S')
      }
    })

    // Header bottom border
    doc.setDrawColor(...colorLightDivider)
    doc.setLineWidth(0.35)
    doc.line(outerX, headerY + 25, outerX + outerW, headerY + 25)

    // ─────────────────────────────────────────────────────────────
    // 2. INVOICE TITLE & META CARD
    // ─────────────────────────────────────────────────────────────
    const secTitleY = headerY + 29

    // Left Title
    doc.setFont(fontName, 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...colorNavy)
    doc.text('INVOICE', outerX + 6, secTitleY + 6.5)

    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorLabel)
    doc.text('CASH RECEIPT / PAYMENT VOUCHER', outerX + 6, secTitleY + 12)

    // Right Meta Card (Receipt No., Book No., Date)
    const metaW = 76
    const metaH = 20
    const metaX = outerX + outerW - metaW - 6
    const metaY = secTitleY
    doc.setFillColor(...colorSubBox)
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.roundedRect(metaX, metaY, metaW, metaH, 2.5, 2.5, 'FD')

    // Receipt No. Row
    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(51, 65, 85)
    doc.text('Receipt No. :', metaX + 4, metaY + 5.5)

    // Receipt Badge (Light Blue Capsule)
    doc.setFillColor(219, 234, 254) // #DBEAFE
    doc.roundedRect(metaX + metaW - 22, metaY + 2.0, 18, 4.8, 1.2, 1.2, 'F')
    doc.setFont(fontName, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...colorNavy)
    doc.text(String(data.receiptNo), metaX + metaW - 13, metaY + 5.4, { align: 'center' })

    // Book No. Row
    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(51, 65, 85)
    doc.text('Book No. :', metaX + 4, metaY + 11.5)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(String(data.bookNo || 'BK-001'), metaX + metaW - 4, metaY + 11.5, { align: 'right' })

    // Date Row
    doc.setFont(fontName, 'bold')
    doc.setTextColor(51, 65, 85)
    doc.text('Date :', metaX + 4, metaY + 17)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(String(data.date), metaX + metaW - 4, metaY + 17, { align: 'right' })

    // ─────────────────────────────────────────────────────────────
    // HELPER: Section Card Header with Matching Vector Blue Icon
    // ─────────────────────────────────────────────────────────────
    const drawCardHeader = (
      x: number,
      y: number,
      w: number,
      title: string,
      iconType: 'user' | 'card' | 'pin' | 'car' | 'file'
    ) => {
      doc.setFillColor(...colorCardHeader) // #DDE7F2
      doc.roundedRect(x, y, w, 7.5, 2.5, 2.5, 'F')
      doc.rect(x, y + 4, w, 3.5, 'F') // flat bottom corners

      // Crisp vector icon in blue-700
      doc.setFillColor(...colorBlueIcon)
      doc.setDrawColor(...colorBlueIcon)
      const ix = x + 4
      const iy = y + 2.2
      if (iconType === 'user') {
        doc.circle(ix + 1.5, iy + 1.1, 0.9, 'F')
        doc.roundedRect(ix + 0.3, iy + 2.3, 2.4, 1.4, 0.6, 0.6, 'F')
      } else if (iconType === 'card') {
        doc.setLineWidth(0.3)
        doc.roundedRect(ix, iy + 0.6, 3.4, 2.6, 0.3, 0.3, 'S')
        doc.line(ix, iy + 1.4, ix + 3.4, iy + 1.4)
      } else if (iconType === 'pin') {
        doc.circle(ix + 1.5, iy + 1.2, 1.1, 'F')
        doc.triangle(ix + 0.6, iy + 1.5, ix + 2.4, iy + 1.5, ix + 1.5, iy + 3.4, 'F')
        doc.setFillColor(...colorCardHeader)
        doc.circle(ix + 1.5, iy + 1.2, 0.45, 'F')
      } else if (iconType === 'car') {
        doc.setLineWidth(0.3)
        doc.roundedRect(ix, iy + 1.2, 3.4, 1.8, 0.4, 0.4, 'F')
        doc.roundedRect(ix + 0.6, iy + 0.4, 2.2, 1.2, 0.2, 0.2, 'F')
      } else if (iconType === 'file') {
        doc.setLineWidth(0.3)
        doc.roundedRect(ix + 0.3, iy + 0.4, 2.6, 3.2, 0.3, 0.3, 'S')
        doc.line(ix + 0.8, iy + 1.4, ix + 2.4, iy + 1.4)
        doc.line(ix + 0.8, iy + 2.2, ix + 2.4, iy + 2.2)
      }

      doc.setFont(fontName, 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...colorNavy)
      doc.text(title.toUpperCase(), x + 9, y + 5.1)
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SECTION 1: CUSTOMER DETAILS & PAYMENT DETAILS (Two Cards)
    // ─────────────────────────────────────────────────────────────
    const sec1Y = secTitleY + 24
    const cardW = 86
    const cardH = 49
    const c1X = outerX + 6
    const c2X = outerX + outerW - cardW - 6

    // ── LEFT CARD: CUSTOMER DETAILS ──
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(c1X, sec1Y, cardW, cardH, 2.5, 2.5, 'FD')
    drawCardHeader(c1X, sec1Y, cardW, 'CUSTOMER DETAILS', 'user')

    const custFields = [
      { label: 'Customer Name :', val: String(data.customerName || '') },
      { label: 'Mobile Number :', val: String(data.customerMobile || '') },
      { label: 'Trip / Route :', val: String(data.route || '') },
      { label: 'Journey Date :', val: String(data.journeyDate || '') },
      { label: 'No. of Pax :', val: String(data.pax || '-') },
    ]

    let rowY = sec1Y + 13.5
    custFields.forEach(f => {
      doc.setFont(fontName, 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...colorLabel)
      doc.text(f.label, c1X + 4, rowY)

      doc.setFont(fontName, 'bold')
      doc.setTextColor(...colorValue)
      doc.text(f.val, c1X + cardW - 4, rowY, { align: 'right' })

      // Subtle border-b divider
      doc.setDrawColor(...colorLightDivider)
      doc.setLineWidth(0.2)
      doc.line(c1X + 4, rowY + 1.8, c1X + cardW - 4, rowY + 1.8)

      rowY += 6.8
    })

    // ── RIGHT CARD: PAYMENT DETAILS ──
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(c2X, sec1Y, cardW, cardH, 2.5, 2.5, 'FD')
    drawCardHeader(c2X, sec1Y, cardW, 'PAYMENT DETAILS', 'card')

    const payFields = [
      { label: 'Trip Amount :', val: sanitize(formatINR(data.tripAmount)), color: colorValue },
      { label: 'Advance Received :', val: sanitize(formatINR(data.advanceReceived)), color: colorEmerald },
      { label: 'Balance Amount :', val: sanitize(formatINR(data.balanceAmount)), color: colorRose },
    ]

    rowY = sec1Y + 13.5
    payFields.forEach(f => {
      doc.setFont(fontName, 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...colorLabel)
      doc.text(f.label, c2X + 4, rowY)

      doc.setFont(fontName, 'bold')
      doc.setTextColor(...f.color)
      doc.text(f.val, c2X + cardW - 4, rowY, { align: 'right' })

      doc.setDrawColor(...colorLightDivider)
      doc.setLineWidth(0.2)
      doc.line(c2X + 4, rowY + 1.8, c2X + cardW - 4, rowY + 1.8)

      rowY += 6.8
    })

    // Sub-box: Amount Received (in Words) with quotes
    const subBoxY = sec1Y + 33
    const subBoxH = 13.5
    doc.setFillColor(...colorSubBox)
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.2)
    doc.roundedRect(c2X + 3, subBoxY, cardW - 6, subBoxH, 1.8, 1.8, 'FD')

    doc.setFont(fontName, 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...colorLabel)
    doc.text('AMOUNT RECEIVED (IN WORDS)', c2X + 5, subBoxY + 4)

    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorNavy)
    const quoteWords = `“${data.amountReceivedInWords || 'Zero Rupees Only'}”`
    const splitWords = doc.splitTextToSize(quoteWords, cardW - 12)
    doc.text(splitWords, c2X + 5, subBoxY + 8.5)

    // ─────────────────────────────────────────────────────────────
    // 4. SECTION 2: TRIP DETAILS (Full width card)
    // ─────────────────────────────────────────────────────────────
    const sec2Y = sec1Y + 52
    const fullW = outerW - 12
    const sec2H = 26

    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(c1X, sec2Y, fullW, sec2H, 2.5, 2.5, 'FD')
    drawCardHeader(c1X, sec2Y, fullW, 'TRIP DETAILS', 'pin')

    // Route / Places & Total Distance
    const tripRow1Y = sec2Y + 13.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorLabel)
    doc.text('Route / Places :', c1X + 4, tripRow1Y)

    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(String(data.routePlaces || ''), c1X + 27, tripRow1Y)

    // Total distance on right side of Row 1
    doc.setFont(fontName, 'normal')
    doc.setTextColor(...colorLabel)
    doc.text('Total Distance :', c1X + 105, tripRow1Y)

    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(`${data.totalDistance} km`, c1X + 128, tripRow1Y)

    doc.setFont(fontName, 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(148, 163, 184)
    doc.text(`(From: ${data.fromKm} • To: ${data.toKm})`, c1X + 143, tripRow1Y)

    // Subtle divider line
    doc.setDrawColor(...colorLightDivider)
    doc.setLineWidth(0.2)
    doc.line(c1X + 4, tripRow1Y + 2, c1X + fullW - 4, tripRow1Y + 2)

    // Trip Type Radio Options
    const tripRow2Y = sec2Y + 20.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorLabel)
    doc.text('Trip Type :', c1X + 4, tripRow2Y)

    const tripTypes = ['Group Tour', 'Pilgrimage Trip', 'Family Trip', 'Corporate Trip', 'Other']
    let cbX = c1X + 26
    tripTypes.forEach(t => {
      const isChecked = data.tripType === t
      doc.setDrawColor(isChecked ? 37 : 148, isChecked ? 99 : 163, isChecked ? 235 : 184)
      doc.setLineWidth(0.3)
      doc.setFillColor(255, 255, 255)
      doc.circle(cbX + 1.2, tripRow2Y - 0.8, 1.4, 'FD')
      if (isChecked) {
        doc.setFillColor(37, 99, 235) // Blue-600 radio center
        doc.circle(cbX + 1.2, tripRow2Y - 0.8, 0.7, 'F')
      }
      doc.setFont(fontName, isChecked ? 'bold' : 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(isChecked ? colorValue[0] : colorLabel[0], isChecked ? colorValue[1] : colorLabel[1], isChecked ? colorValue[2] : colorLabel[2])
      doc.text(t, cbX + 3.8, tripRow2Y - 0.3)
      cbX += doc.getTextWidth(t) + 7
    })

    // ─────────────────────────────────────────────────────────────
    // 5. SECTION 3: VEHICLE DETAILS & DRIVER DETAILS (Two Cards)
    // ─────────────────────────────────────────────────────────────
    const sec3Y = sec2Y + 29
    const sec3H = 31

    // ── LEFT: VEHICLE DETAILS ──
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(c1X, sec3Y, cardW, sec3H, 2.5, 2.5, 'FD')
    drawCardHeader(c1X, sec3Y, cardW, 'VEHICLE DETAILS', 'car')

    // Vehicle No.
    let vehRowY = sec3Y + 13.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorLabel)
    doc.text('Vehicle No. :', c1X + 4, vehRowY)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(String(data.vehicleNo || ''), c1X + cardW - 4, vehRowY, { align: 'right' })
    doc.setDrawColor(...colorLightDivider)
    doc.line(c1X + 4, vehRowY + 1.8, c1X + cardW - 4, vehRowY + 1.8)

    // Vehicle Type (Pill Badges matching website preview)
    vehRowY += 6.5
    doc.setFont(fontName, 'normal')
    doc.setTextColor(...colorLabel)
    doc.text('Vehicle Type :', c1X + 4, vehRowY)

    const vTypes = ['9+1', '12+1', '17+1', 'Other']
    let vCbX = c1X + 27
    vTypes.forEach(vt => {
      const isSel = data.vehicleType === vt
      const pillWidth = doc.getTextWidth(vt) + 3.5
      if (isSel) {
        doc.setFillColor(219, 234, 254) // bg-blue-100
        doc.roundedRect(vCbX - 0.5, vehRowY - 2.8, pillWidth, 4.0, 1.0, 1.0, 'F')
        doc.setFont(fontName, 'bold')
        doc.setFontSize(6.8)
        doc.setTextColor(30, 64, 175) // text-blue-800
      } else {
        doc.setFont(fontName, 'normal')
        doc.setFontSize(6.8)
        doc.setTextColor(...colorLabel)
      }
      doc.text(vt, vCbX + 1.2, vehRowY - 0.2)
      vCbX += pillWidth + 3.5
    })
    doc.setDrawColor(...colorLightDivider)
    doc.line(c1X + 4, vehRowY + 1.8, c1X + cardW - 4, vehRowY + 1.8)

    // Total Distance
    vehRowY += 6.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorLabel)
    doc.text('Total Distance :', c1X + 4, vehRowY)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(`${data.vehicleDistance} km`, c1X + cardW - 4, vehRowY, { align: 'right' })

    // ── RIGHT: DRIVER DETAILS ──
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(c2X, sec3Y, cardW, sec3H, 2.5, 2.5, 'FD')
    drawCardHeader(c2X, sec3Y, cardW, 'DRIVER DETAILS', 'user')

    let drvY = sec3Y + 13.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorLabel)
    doc.text('Driver Name :', c2X + 4, drvY)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(String(data.driverName || ''), c2X + cardW - 4, drvY, { align: 'right' })
    doc.setDrawColor(...colorLightDivider)
    doc.line(c2X + 4, drvY + 1.8, c2X + cardW - 4, drvY + 1.8)

    drvY += 6.5
    doc.setFont(fontName, 'normal')
    doc.setTextColor(...colorLabel)
    doc.text('Mobile Number :', c2X + 4, drvY)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(String(data.driverMobile || ''), c2X + cardW - 4, drvY, { align: 'right' })
    doc.setDrawColor(...colorLightDivider)
    doc.line(c2X + 4, drvY + 1.8, c2X + cardW - 4, drvY + 1.8)

    drvY += 6.5
    doc.setFont(fontName, 'normal')
    doc.setTextColor(...colorLabel)
    doc.text('Duty Start :', c2X + 4, drvY)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(String(data.dutyStart || ''), c2X + 23, drvY)

    doc.setFont(fontName, 'normal')
    doc.setTextColor(...colorLabel)
    doc.text('Duty End :', c2X + 48, drvY)
    doc.setFont(fontName, 'bold')
    doc.setTextColor(...colorValue)
    doc.text(String(data.dutyEnd || '-'), c2X + cardW - 4, drvY, { align: 'right' })

    // ─────────────────────────────────────────────────────────────
    // 6. SECTION 4: REMARKS / TRIP DETAILS (Full width card)
    // ─────────────────────────────────────────────────────────────
    const sec4Y = sec3Y + 34
    const sec4H = 26

    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(c1X, sec4Y, fullW, sec4H, 2.5, 2.5, 'FD')
    drawCardHeader(c1X, sec4Y, fullW, 'REMARKS / TRIP DETAILS', 'file')

    const remarkText = data.remarks || 'Payment recorded with thanks.'
    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 41, 59)
    doc.text(remarkText, c1X + 5, sec4Y + 13.5)

    doc.setDrawColor(...colorLightDivider)
    doc.setLineWidth(0.25)
    doc.line(c1X + 5, sec4Y + 15.5, c1X + fullW - 5, sec4Y + 15.5)
    doc.line(c1X + 5, sec4Y + 20.5, c1X + fullW - 5, sec4Y + 20.5)

    // ─────────────────────────────────────────────────────────────
    // 7. SECTION 5: SIGNATURES & TERMS & CONDITIONS
    // ─────────────────────────────────────────────────────────────
    const sec5Y = sec4Y + 29
    const termsH = 38

    // Left Signatures
    const sigLineW = 34
    const sigY = sec5Y + 26

    // Received By line
    doc.setDrawColor(...colorValue)
    doc.setLineWidth(0.35)
    doc.line(c1X + 4, sigY, c1X + 4 + sigLineW, sigY)
    doc.setFont(fontName, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...colorValue)
    doc.text('Received By', c1X + 4 + sigLineW / 2, sigY + 5, { align: 'center' })

    // Authorised Signatory line
    const authSigX = c1X + cardW - sigLineW - 4
    doc.line(authSigX, sigY, authSigX + sigLineW, sigY)
    doc.text('Authorised Signatory', authSigX + sigLineW / 2, sigY + 5, { align: 'center' })

    // Right Terms & Conditions Card
    doc.setFillColor(...colorSubBox)
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.2)
    doc.roundedRect(c2X, sec5Y, cardW, termsH, 2.5, 2.5, 'FD')

    // AlertCircle Vector Icon (Blue circle with white exclamation)
    doc.setFillColor(37, 99, 235) // blue-600
    doc.circle(c2X + 5.5, sec5Y + 4.6, 1.8, 'F')
    doc.setFont(fontName, 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(255, 255, 255)
    doc.text('!', c2X + 5.5, sec5Y + 5.2, { align: 'center' })

    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorNavy)
    doc.text('Terms & Conditions', c2X + 9.5, sec5Y + 5.2)

    const terms = [
      'Passenger must carry a valid ID proof if required.',
      'RK Travel Hub is not responsible for loss of personal belongings.',
      'Trip timings may vary due to traffic or weather conditions.',
      'Any damages caused to the vehicle will be charged to the customer.',
      'Payment once made is non-refundable.',
    ]

    let termY = sec5Y + 10.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(5.8)
    doc.setTextColor(71, 85, 105)

    terms.forEach(t => {
      doc.setFillColor(71, 85, 105)
      doc.circle(c2X + 5.5, termY - 0.7, 0.45, 'F')
      doc.text(t, c2X + 8, termY)
      termY += 4.8
    })

    // ─────────────────────────────────────────────────────────────
    // 8. SECTION 6: BOTTOM NAVY FOOTER BANNER
    // ─────────────────────────────────────────────────────────────
    const footerH = 18
    const footerY = outerY + outerH - footerH

    // Rounded bottom container matching outer card
    doc.setFillColor(...colorNavy)
    doc.roundedRect(outerX, footerY, outerW, footerH, 3.5, 3.5, 'F')
    doc.rect(outerX, footerY, outerW, 4, 'F') // flat top corners

    // Left Vector Phone Handset Icon (Sky Blue #38BDF8)
    const phoneX = outerX + 7
    const phoneY = footerY + 4.5
    doc.setDrawColor(...colorSky)
    doc.setFillColor(...colorSky)
    doc.setLineWidth(0.3)
    doc.roundedRect(phoneX, phoneY, 3.2, 6.2, 0.7, 0.7, 'S')
    doc.line(phoneX + 1.0, phoneY + 0.9, phoneX + 2.2, phoneY + 0.9)
    doc.circle(phoneX + 1.6, phoneY + 5.2, 0.35, 'F')
    doc.roundedRect(phoneX + 0.5, phoneY + 1.4, 2.2, 3.2, 0.2, 0.2, 'S')

    // Phone Contacts
    doc.setTextColor(226, 232, 240)
    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.text('98 09 20 70 80   •   89 43 20 70 80', outerX + 13, footerY + 7.5)
    doc.text('98 95 20 70 85   •   85 89 87 26 89', outerX + 13, footerY + 13)

    // Right Vector Map Pin Icon (Sky Blue #38BDF8)
    const pinX = outerX + outerW - 38
    const pinY = footerY + 4.8
    doc.setFillColor(...colorSky)
    doc.setDrawColor(...colorSky)
    doc.circle(pinX, pinY + 1.5, 1.5, 'F')
    doc.triangle(pinX - 1.3, pinY + 1.8, pinX + 1.3, pinY + 1.8, pinX, pinY + 4.2, 'F')
    doc.setFillColor(...colorNavy)
    doc.circle(pinX, pinY + 1.5, 0.6, 'F')

    // Right Location & Brand Name
    doc.setTextColor(255, 255, 255)
    doc.setFont(fontName, 'bold')
    doc.setFontSize(8.5)
    doc.text('RK TRAVEL HUB', pinX + 3.8, footerY + 7.2)

    doc.setFont(fontName, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(203, 213, 225)
    doc.text("Traveller's Hub", pinX + 3.8, footerY + 12.5)

    // Save PDF
    const saveName = filename || `RK_Travel_Hub_Invoice_${data.receiptNo}.pdf`
    doc.save(saveName)
    return true
  } catch (err) {
    console.error('Error generating Invoice PDF:', err)
    return false
  }
}
