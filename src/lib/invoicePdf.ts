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
  const advance =
    payment.type === 'customer_received'
      ? Number(payment.amount)
      : Number(trip?.advanceReceived) || 0
  const balance =
    trip?.customerBalance !== undefined
      ? Number(trip.customerBalance)
      : Math.max(0, totalFare - advance)

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
    const margin = 12
    const contentWidth = pageWidth - margin * 2 // 186mm

    // Color definitions matching the original template
    const colorNavy: [number, number, number] = [13, 35, 58] // #0D233A
    const colorHeaderFill: [number, number, number] = [218, 228, 239] // #DAE4EF
    const colorSubBoxFill: [number, number, number] = [238, 243, 248] // #EEF3F8
    const colorBorder: [number, number, number] = [175, 192, 210] // #AFC0D2
    const colorLine: [number, number, number] = [200, 210, 222]
    const colorDarkText: [number, number, number] = [15, 23, 42]
    const colorMutedText: [number, number, number] = [71, 85, 105]

    // ─────────────────────────────────────────────────────────────
    // 1. TOP HEADER (Logo on left, Dark banner with tours on right)
    // ─────────────────────────────────────────────────────────────

    // Top-Right Navy Banner (Curved pill on top right corner)
    doc.setFillColor(...colorNavy)
    const bannerX = 145
    const bannerY = 0
    const bannerW = 65
    const bannerH = 34
    doc.roundedRect(bannerX, bannerY, bannerW, bannerH, 0, 0, 'F')
    doc.roundedRect(bannerX - 10, bannerY, 20, bannerH, 8, 8, 'F')

    // Tour Types text in right banner with vector bullets
    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    const tours = ['Group Tours', 'Pilgrimage Trips', 'Family Trips', 'Corporate Trips']
    tours.forEach((tour, idx) => {
      const ty = 8.5 + idx * 7
      doc.setFillColor(56, 189, 248) // Sky blue bullet
      doc.circle(150, ty - 0.8, 0.75, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text(tour, 153, ty)
    })

    // Left Logo & Brand Identity
    try {
      doc.addImage(RK_LOGO_BASE64, 'PNG', margin, 6.5, 18, 18)
    } catch {
      doc.setFillColor(...colorNavy)
      doc.roundedRect(margin, 6.5, 18, 18, 2, 2, 'F')
    }

    const brandX = margin + 22
    doc.setFont(fontName, 'bold')
    doc.setFontSize(17)
    doc.setTextColor(...colorNavy)
    doc.text('RK TRAVEL HUB', brandX, 13.5)

    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(70, 80, 95)
    doc.text("TRAVELLER'S HUB", brandX, 18.5)

    doc.setFont(fontName, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text('COMFORT   |   SAFETY   |   RELIABILITY', brandX, 23)

    // ─────────────────────────────────────────────────────────────
    // 2. INVOICE TITLE & RECEIPT INFO BOX
    // ─────────────────────────────────────────────────────────────
    const titleY = 44

    // Left Title
    doc.setFont(fontName, 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...colorNavy)
    doc.text('INVOICE', margin, titleY)

    doc.setFont(fontName, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('CASH RECEIPT / PAYMENT VOUCHER', margin, titleY + 5)

    // Right Info Box
    const infoBoxX = 118
    const infoBoxY = 35
    const infoBoxW = 80
    const infoBoxH = 20

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.roundedRect(infoBoxX, infoBoxY, infoBoxW, infoBoxH, 2, 2, 'S')

    // Labels & Values inside info box
    doc.setFont(fontName, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...colorDarkText)

    // Receipt No. row
    doc.text('Receipt No.', infoBoxX + 3, infoBoxY + 5.5)
    doc.text(':', infoBoxX + 22, infoBoxY + 5.5)

    // Receipt Badge (light blue capsule)
    doc.setFillColor(210, 230, 252) // #D2E6FC
    doc.roundedRect(infoBoxX + 25, infoBoxY + 1.8, 22, 5.2, 1.5, 1.5, 'F')
    doc.setFont(fontName, 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...colorNavy)
    doc.text(String(data.receiptNo), infoBoxX + 36, infoBoxY + 5.5, { align: 'center' })

    // Book No. row
    doc.setFont(fontName, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...colorDarkText)
    doc.text('Book No.', infoBoxX + 3, infoBoxY + 11.5)
    doc.text(':', infoBoxX + 22, infoBoxY + 11.5)
    doc.setFont(fontName, 'normal')
    doc.text(String(data.bookNo || '_________________'), infoBoxX + 25, infoBoxY + 11.5)

    // Date row
    doc.setFont(fontName, 'bold')
    doc.text('Date', infoBoxX + 3, infoBoxY + 17)
    doc.text(':', infoBoxX + 22, infoBoxY + 17)
    doc.setFont(fontName, 'normal')
    doc.text(String(data.date), infoBoxX + 25, infoBoxY + 17)

    // ─────────────────────────────────────────────────────────────
    // 3. SECTION 1: CUSTOMER DETAILS & PAYMENT DETAILS (Two Cards)
    // ─────────────────────────────────────────────────────────────
    const sec1Y = 58
    const cardW = 90
    const cardH = 43
    const rightCardX = margin + cardW + 6 // 108

    // Helper to draw section header inside a card
    const drawCardHeader = (x: number, y: number, w: number, title: string) => {
      doc.setFillColor(...colorHeaderFill)
      doc.roundedRect(x, y, w, 7, 2, 2, 'F')
      // Fill bottom corners flat
      doc.rect(x, y + 3, w, 4, 'F')
      doc.setFont(fontName, 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...colorNavy)
      doc.text(title.toUpperCase(), x + 4, y + 5)
    }

    // ── LEFT CARD: CUSTOMER DETAILS ──
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, sec1Y, cardW, cardH, 2, 2, 'FD')
    drawCardHeader(margin, sec1Y, cardW, 'CUSTOMER DETAILS')

    const custFields = [
      { label: 'Customer Name', val: String(data.customerName || '') },
      { label: 'Mobile Number', val: String(data.customerMobile || '') },
      { label: 'Trip / Route', val: String(data.route || '') },
      { label: 'Journey Date', val: String(data.journeyDate || '') },
      { label: 'No. of Pax', val: String(data.pax || '-') },
    ]

    let rowY = sec1Y + 12
    custFields.forEach(f => {
      doc.setFont(fontName, 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...colorDarkText)
      doc.text(f.label, margin + 4, rowY)
      doc.text(':', margin + 28, rowY)

      doc.setFont(fontName, 'bold')
      doc.text(f.val, margin + 31, rowY)

      // Dotted underline
      doc.setDrawColor(...colorLine)
      doc.setLineWidth(0.15)
      doc.line(margin + 31, rowY + 1, margin + cardW - 3, rowY + 1)

      rowY += 6.2
    })

    // ── RIGHT CARD: PAYMENT DETAILS ──
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(rightCardX, sec1Y, cardW, cardH, 2, 2, 'FD')
    drawCardHeader(rightCardX, sec1Y, cardW, 'PAYMENT DETAILS')

    const payFields = [
      { label: 'Trip Amount', val: sanitize(formatINR(data.tripAmount)) },
      { label: 'Advance Received', val: sanitize(formatINR(data.advanceReceived)) },
      { label: 'Balance Amount', val: sanitize(formatINR(data.balanceAmount)) },
    ]

    rowY = sec1Y + 12
    payFields.forEach(f => {
      doc.setFont(fontName, 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...colorDarkText)
      doc.text(f.label, rightCardX + 4, rowY)
      doc.text(':', rightCardX + 32, rowY)

      doc.setFont(fontName, 'bold')
      doc.text(f.val, rightCardX + 35, rowY)

      doc.setDrawColor(...colorLine)
      doc.setLineWidth(0.15)
      doc.line(rightCardX + 35, rowY + 1, rightCardX + cardW - 3, rowY + 1)

      rowY += 6.2
    })

    // Sub-box: Amount Received (in Words)
    const subBoxY = sec1Y + 28
    const subBoxH = 12
    doc.setFillColor(...colorSubBoxFill)
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.2)
    doc.roundedRect(rightCardX + 3, subBoxY, cardW - 6, subBoxH, 1.5, 1.5, 'FD')

    doc.setFont(fontName, 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...colorMutedText)
    doc.text('Amount Received (in Words)', rightCardX + 5, subBoxY + 3.8)

    doc.setFont(fontName, 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...colorDarkText)
    const splitWords = doc.splitTextToSize(data.amountReceivedInWords || 'Zero Rupees Only', cardW - 12)
    doc.text(splitWords, rightCardX + 5, subBoxY + 7.5)

    // ─────────────────────────────────────────────────────────────
    // 4. SECTION 2: TRIP DETAILS (Full width card)
    // ─────────────────────────────────────────────────────────────
    const sec2Y = 104
    const sec2H = 22

    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, sec2Y, contentWidth, sec2H, 2, 2, 'FD')
    drawCardHeader(margin, sec2Y, contentWidth, 'TRIP DETAILS')

    // Route / Places row
    const tripRow1Y = sec2Y + 11.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorDarkText)
    doc.text('Route / Places', margin + 4, tripRow1Y)
    doc.text(':', margin + 26, tripRow1Y)
    doc.setFont(fontName, 'bold')
    doc.text(String(data.routePlaces || ''), margin + 29, tripRow1Y)
    doc.setDrawColor(...colorLine)
    doc.setLineWidth(0.15)
    doc.line(margin + 29, tripRow1Y + 1, margin + contentWidth - 4, tripRow1Y + 1)

    // Total Distance & Trip Type row
    const tripRow2Y = sec2Y + 17.5
    doc.setFont(fontName, 'normal')
    doc.text('Total Distance', margin + 4, tripRow2Y)
    doc.text(':', margin + 26, tripRow2Y)

    doc.setFont(fontName, 'bold')
    doc.text(`${data.totalDistance} km`, margin + 29, tripRow2Y)
    doc.setFont(fontName, 'normal')
    doc.text(`(From : ${data.fromKm}   To : ${data.toKm})`, margin + 50, tripRow2Y)

    // Trip Type Checkboxes with vector checkmarks
    const tripTypes = ['Group Tour', 'Pilgrimage Trip', 'Family Trip', 'Corporate Trip', 'Other']
    let cbX = 110
    doc.setFont(fontName, 'normal')
    doc.text('Trip Type :', 95, tripRow2Y)

    tripTypes.forEach(t => {
      const isChecked = data.tripType === t
      doc.setDrawColor(...colorNavy)
      doc.setLineWidth(0.25)
      doc.setFillColor(isChecked ? 218 : 255, isChecked ? 228 : 255, isChecked ? 239 : 255)
      doc.rect(cbX, tripRow2Y - 2.5, 2.8, 2.8, isChecked ? 'FD' : 'S')
      if (isChecked) {
        doc.setDrawColor(...colorNavy)
        doc.setLineWidth(0.4)
        doc.line(cbX + 0.6, tripRow2Y - 1.1, cbX + 1.1, tripRow2Y - 0.4)
        doc.line(cbX + 1.1, tripRow2Y - 0.4, cbX + 2.3, tripRow2Y - 2.1)
      }
      doc.setFont(fontName, isChecked ? 'bold' : 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...colorDarkText)
      doc.text(t, cbX + 3.8, tripRow2Y - 0.6)
      cbX += doc.getTextWidth(t) + 6
    })

    // ─────────────────────────────────────────────────────────────
    // 5. SECTION 3: VEHICLE DETAILS & DRIVER DETAILS (Two Cards)
    // ─────────────────────────────────────────────────────────────
    const sec3Y = 129
    const sec3H = 26

    // ── VEHICLE DETAILS ──
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, sec3Y, cardW, sec3H, 2, 2, 'FD')
    drawCardHeader(margin, sec3Y, cardW, 'VEHICLE DETAILS')

    // Vehicle No.
    let vehRowY = sec3Y + 11
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorDarkText)
    doc.text('Vehicle No.', margin + 4, vehRowY)
    doc.text(':', margin + 26, vehRowY)
    doc.setFont(fontName, 'bold')
    doc.text(String(data.vehicleNo || ''), margin + 29, vehRowY)
    doc.line(margin + 29, vehRowY + 1, margin + cardW - 3, vehRowY + 1)

    // Vehicle Type Checkboxes (9+1, 12+1, 17+1, Other)
    vehRowY += 5.5
    doc.setFont(fontName, 'normal')
    doc.text('Vehicle Type', margin + 4, vehRowY)
    doc.text(':', margin + 26, vehRowY)

    const vTypes = ['9+1', '12+1', '17+1', 'Other']
    let vCbX = margin + 29
    vTypes.forEach(vt => {
      const isSel = data.vehicleType === vt
      doc.setDrawColor(...colorNavy)
      doc.setLineWidth(0.25)
      doc.setFillColor(isSel ? 218 : 255, isSel ? 228 : 255, isSel ? 239 : 255)
      doc.rect(vCbX, vehRowY - 2.5, 2.8, 2.8, isSel ? 'FD' : 'S')
      if (isSel) {
        doc.setDrawColor(...colorNavy)
        doc.setLineWidth(0.4)
        doc.line(vCbX + 0.6, vehRowY - 1.1, vCbX + 1.1, vehRowY - 0.4)
        doc.line(vCbX + 1.1, vehRowY - 0.4, vCbX + 2.3, vehRowY - 2.1)
      }
      doc.setFont(fontName, isSel ? 'bold' : 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...colorDarkText)
      doc.text(vt, vCbX + 3.8, vehRowY - 0.6)
      vCbX += doc.getTextWidth(vt) + 6
    })

    // Total Distance
    vehRowY += 5.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.text('Total Distance', margin + 4, vehRowY)
    doc.text(':', margin + 26, vehRowY)
    doc.setFont(fontName, 'bold')
    doc.text(`${data.vehicleDistance} km`, margin + 29, vehRowY)
    doc.line(margin + 29, vehRowY + 1, margin + cardW - 3, vehRowY + 1)

    // ── DRIVER DETAILS ──
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(rightCardX, sec3Y, cardW, sec3H, 2, 2, 'FD')
    drawCardHeader(rightCardX, sec3Y, cardW, 'DRIVER DETAILS')

    const driverRows = [
      { label: 'Driver Name', val: String(data.driverName || '') },
      { label: 'Mobile Number', val: String(data.driverMobile || '') },
      { label: 'Duty Start', val: String(data.dutyStart || '') },
    ]

    let drvY = sec3Y + 11
    driverRows.forEach(dr => {
      doc.setFont(fontName, 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...colorDarkText)
      doc.text(dr.label, rightCardX + 4, drvY)
      doc.text(':', rightCardX + 28, drvY)
      doc.setFont(fontName, 'bold')
      doc.text(dr.val, rightCardX + 31, drvY)
      doc.line(rightCardX + 31, drvY + 1, rightCardX + cardW - 3, drvY + 1)
      drvY += 5.2
    })

    // Duty End on same row
    doc.setFont(fontName, 'normal')
    doc.text('Duty End :', rightCardX + 50, sec3Y + 21.4)
    doc.setFont(fontName, 'bold')
    doc.text(String(data.dutyEnd || '-'), rightCardX + 66, sec3Y + 21.4)

    // ─────────────────────────────────────────────────────────────
    // 6. SECTION 4: REMARKS / TRIP DETAILS (Full width lines)
    // ─────────────────────────────────────────────────────────────
    const sec4Y = 158
    const sec4H = 28

    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, sec4Y, contentWidth, sec4H, 2, 2, 'FD')
    drawCardHeader(margin, sec4Y, contentWidth, 'REMARKS / TRIP DETAILS')

    // 4 ruled lines
    const lineStartX = margin + 5
    const lineEndX = margin + contentWidth - 5
    let remarkLineY = sec4Y + 12

    // Print remarks on first line if available
    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorDarkText)
    if (data.remarks) {
      doc.text(data.remarks, lineStartX, remarkLineY - 0.8)
    }

    for (let i = 0; i < 4; i++) {
      doc.setDrawColor(...colorLine)
      doc.setLineWidth(0.15)
      doc.line(lineStartX, remarkLineY, lineEndX, remarkLineY)
      remarkLineY += 4.2
    }

    // ─────────────────────────────────────────────────────────────
    // 7. SECTION 5: SIGNATURES & TERMS & CONDITIONS
    // ─────────────────────────────────────────────────────────────
    const sec5Y = 190

    // Left Signatures
    const sigLineW = 38
    const sigY = sec5Y + 20

    // Received By line
    doc.setDrawColor(...colorDarkText)
    doc.setLineWidth(0.3)
    doc.line(margin + 5, sigY, margin + 5 + sigLineW, sigY)
    doc.setFont(fontName, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...colorDarkText)
    doc.text('Received By', margin + 5 + sigLineW / 2, sigY + 4, { align: 'center' })

    // Authorised Signatory line
    const authSigX = margin + sigLineW + 14
    doc.line(authSigX, sigY, authSigX + sigLineW, sigY)
    doc.text('Authorised Signatory', authSigX + sigLineW / 2, sigY + 4, { align: 'center' })

    // Right Terms & Conditions Card
    const termsX = 110
    const termsW = 88
    const termsH = 28

    doc.setFillColor(...colorSubBoxFill)
    doc.setDrawColor(...colorBorder)
    doc.setLineWidth(0.2)
    doc.roundedRect(termsX, sec5Y, termsW, termsH, 2, 2, 'FD')

    // Vector Info Badge (Blue Circle with crisp white 'i')
    doc.setFillColor(13, 98, 254) // #0D62FE
    doc.circle(termsX + 5.5, sec5Y + 4.2, 1.8, 'F')
    doc.setFont(fontName, 'bold')
    doc.setFontSize(6)
    doc.setTextColor(255, 255, 255)
    doc.text('i', termsX + 5.5, sec5Y + 4.8, { align: 'center' })

    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...colorNavy)
    doc.text('Terms & Conditions', termsX + 9, sec5Y + 5)

    const terms = [
      'Passenger must carry a valid ID proof if required.',
      'RK Travel Hub is not responsible for loss of personal belongings.',
      'Trip timings may vary due to traffic, weather or unavoidable conditions.',
      'Any damages caused to the vehicle will be charged to the customer.',
      'Payment once made is non-refundable.',
    ]

    let termY = sec5Y + 9.5
    doc.setFont(fontName, 'normal')
    doc.setFontSize(5.8)
    doc.setTextColor(...colorMutedText)

    terms.forEach(t => {
      doc.setFillColor(...colorMutedText)
      doc.circle(termsX + 5.5, termY - 0.7, 0.45, 'F')
      doc.text(t, termsX + 7.5, termY)
      termY += 3.7
    })

    // ─────────────────────────────────────────────────────────────
    // 8. SECTION 6: BOTTOM FOOTER BANNER (Navy ribbon with vector icons)
    // ─────────────────────────────────────────────────────────────
    const footerY = 224
    const footerH = 20

    // Solid dark navy footer polygon
    doc.setFillColor(...colorNavy)
    doc.rect(0, footerY, pageWidth, footerH, 'F')

    // Left Vector Phone Handset Icon (Sky Blue #38BDF8)
    const phoneX = margin + 3
    const phoneY = footerY + 5.5
    doc.setDrawColor(56, 189, 248)
    doc.setFillColor(56, 189, 248)
    doc.setLineWidth(0.3)
    doc.roundedRect(phoneX, phoneY, 3.2, 6.2, 0.7, 0.7, 'S')
    doc.line(phoneX + 1.0, phoneY + 0.9, phoneX + 2.2, phoneY + 0.9) // speaker
    doc.circle(phoneX + 1.6, phoneY + 5.2, 0.35, 'F') // button
    doc.roundedRect(phoneX + 0.5, phoneY + 1.4, 2.2, 3.2, 0.2, 0.2, 'S') // screen

    // Phone Contacts
    doc.setTextColor(255, 255, 255)
    doc.setFont(fontName, 'bold')
    doc.setFontSize(7.5)
    doc.text('98 09 20 70 80   |   89 43 20 70 80', margin + 8.5, footerY + 8)
    doc.text('98 95 20 70 85   |   85 89 87 26 89', margin + 8.5, footerY + 14)

    // Right Vector Map Pin Icon (Sky Blue #38BDF8)
    const pinX = pageWidth - margin - 35
    const pinY = footerY + 5.8
    doc.setFillColor(56, 189, 248)
    doc.setDrawColor(56, 189, 248)
    doc.circle(pinX, pinY + 1.5, 1.5, 'F')
    doc.triangle(pinX - 1.3, pinY + 1.8, pinX + 1.3, pinY + 1.8, pinX, pinY + 4.2, 'F')
    doc.setFillColor(...colorNavy)
    doc.circle(pinX, pinY + 1.5, 0.6, 'F')

    // Right Location & Brand Name
    doc.setTextColor(255, 255, 255)
    doc.setFont(fontName, 'bold')
    doc.setFontSize(9)
    doc.text('RK TRAVEL HUB', pinX + 3.5, footerY + 8.2)

    doc.setFont(fontName, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(200, 220, 245)
    doc.text("Traveller's Hub", pinX + 3.5, footerY + 13.8)

    // Save PDF
    const saveName = filename || `RK_Travel_Hub_Invoice_${data.receiptNo}.pdf`
    doc.save(saveName)
    return true
  } catch (err) {
    console.error('Error generating Invoice PDF:', err)
    return false
  }
}
