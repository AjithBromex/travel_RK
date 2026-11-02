import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { RK_LOGO_BASE64 } from './pdfLogo'
import { ensureFontsLoaded } from './pdfFonts'

export interface PDFExportOptions {
  title: string
  subtitle?: string
  filename: string
  headers: string[]
  data: (string | number)[][]
  summary?: { label: string; value: string }[]
  orientation?: 'portrait' | 'landscape'
}

/**
 * Modern Executive PDF exporter for RK Travel Hub.
 * Produces crisp, beautiful reports matching the executive financial statement design:
 * - True Unicode font rendering (Segoe UI) with native Indian Rupee (₹) symbol support
 * - Deep navy header banner (#031E44) with 3D metallic chrome RK logo, vertical divider, brand metadata & total records
 * - Bottom stepped accent tab in bright royal & sky blue
 * - Centered bold title (18pt) & subtitle (9.5pt) with royal blue pill divider
 * - 4-Column executive KPI summary cards with vibrant blue icon badges, bold 13.5pt values & clean labels
 * - Crisp bordered table with royal blue header, bold indicator column, bold amount column & clean typography
 * - Clean footer with confidentiality note, divider lines & page numbering
 * - Decorative corner geometric accents
 */
export async function exportToPDF({
  title,
  subtitle,
  filename,
  headers,
  data,
  summary,
  orientation = 'portrait',
}: PDFExportOptions) {
  try {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    })

    // Load Segoe UI (Regular and Bold) with full Indian Rupee symbol support
    const fontName = await ensureFontsLoaded(doc)

    // Helper to sanitize text if using fallback font without unicode ₹ support
    const sanitize = (text: string | number): string => {
      const str = String(text ?? '')
      if (fontName === 'helvetica') {
        return str.replace(/₹/g, 'Rs. ')
      }
      return str
    }

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // ─────────────────────────────────────────────────────────────
    // 1. TOP NAVY EXECUTIVE HEADER BANNER
    // ─────────────────────────────────────────────────────────────
    const bannerHeight = 24
    doc.setFillColor(3, 30, 68) // Deep Executive Navy (#031E44)
    doc.rect(0, 0, pageWidth, bannerHeight, 'F')

    // Bottom-right decorative stepped tab in bright blue / cyan (#38BDF8)
    const tabStartX = pageWidth - (orientation === 'landscape' ? 95 : 68)
    doc.setFillColor(56, 189, 248) // Sky blue (#38BDF8)
    doc.triangle(
      tabStartX - 6, bannerHeight,
      tabStartX, bannerHeight - 3.8,
      tabStartX, bannerHeight,
      'F'
    )
    doc.rect(tabStartX, bannerHeight - 3.8, pageWidth - tabStartX, 3.8, 'F')

    // RK Monogram Logo (3D Metallic Chrome Emblem)
    const logoX = 12
    const logoY = 4.2
    try {
      doc.addImage(RK_LOGO_BASE64, 'PNG', logoX, logoY, 15, 15)
    } catch {
      // Fallback vector drawing if image fails
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(logoX, logoY + 1, 2.6, 13, 0.7, 0.7, 'F')
    }

    // Vertical Divider Line between brand logo and brand name
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.35)
    doc.line(logoX + 17, 5, logoX + 17, bannerHeight - 5)

    // Brand Name & Subtext
    doc.setFont(fontName, 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(15)
    doc.text('RK TRAVEL HUB', logoX + 20.5, 11)

    doc.setFont(fontName, 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(190, 210, 245)
    doc.text('Fleet & Travel Management System', logoX + 20.5, 16.5)

    // Right-aligned Metadata (Date, Time, Total Records) with icons
    const now = new Date()
    const formattedDate = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const formattedTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

    // Metadata Block (Calendar Date & Total Records) aligned in a unified column
    const genText = `Generated: ${formattedDate} ${formattedTime}`
    const recText = `Total Records: ${data.length}`

    doc.setFont(fontName, 'normal')
    doc.setFontSize(8)
    const genTextWidth = doc.getTextWidth(genText)

    doc.setFont(fontName, 'bold')
    doc.setFontSize(8)
    const recTextWidth = doc.getTextWidth(recText)

    const maxTextWidth = Math.max(genTextWidth, recTextWidth)
    const iconWidth = 3.6
    const iconGap = 2.4
    const totalBlockWidth = iconWidth + iconGap + maxTextWidth
    const blockStartX = pageWidth - 14 - totalBlockWidth
    const textStartX = blockStartX + iconWidth + iconGap

    // Row 1: Calendar Vector Icon + Generated Date
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.3)
    doc.roundedRect(blockStartX, 7.8, iconWidth, iconWidth, 0.5, 0.5, 'S')
    doc.setFillColor(255, 255, 255)
    doc.rect(blockStartX, 7.8, iconWidth, 1.1, 'F') // Top calendar header bar
    doc.rect(blockStartX + 0.8, 7.1, 0.5, 1.1, 'F') // Left ring
    doc.rect(blockStartX + 2.3, 7.1, 0.5, 1.1, 'F') // Right ring

    doc.setFont(fontName, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(230, 240, 255)
    doc.text(genText, textStartX, 10.8)

    // Row 2: Database Stack Vector Icon + Total Records
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(blockStartX, 14.2, iconWidth, 0.9, 0.3, 0.3, 'F')
    doc.roundedRect(blockStartX, 15.6, iconWidth, 0.9, 0.3, 0.3, 'F')
    doc.roundedRect(blockStartX, 17.0, iconWidth, 0.9, 0.3, 0.3, 'F')

    doc.setFont(fontName, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text(recText, textStartX, 17.6)

    // ─────────────────────────────────────────────────────────────
    // 2. REPORT TITLE & SUBTITLE (CENTERED WITH BLUE ACCENT DIVIDER)
    // ─────────────────────────────────────────────────────────────
    let currentY = bannerHeight + 9.5

    doc.setFont(fontName, 'bold')
    doc.setTextColor(3, 30, 68) // Deep Navy (#031E44)
    doc.setFontSize(18) // Prominent 18pt title matching reference
    doc.text(title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' })
    currentY += 6

    if (subtitle) {
      doc.setFont(fontName, 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(71, 85, 105) // Slate 600 (#475569)
      doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' })
      currentY += 5
    }

    // Small royal blue pill divider underline
    doc.setFillColor(13, 98, 254) // #0D62FE
    doc.roundedRect(pageWidth / 2 - 14, currentY, 28, 1.4, 0.7, 0.7, 'F')
    currentY += 7.5

    // ─────────────────────────────────────────────────────────────
    // 3. EXECUTIVE KPI SUMMARY CARDS
    // ─────────────────────────────────────────────────────────────
    if (summary && summary.length > 0) {
      const marginX = 12
      const gap = 3.5
      const availableWidth = pageWidth - marginX * 2
      const cardWidth = (availableWidth - (summary.length - 1) * gap) / summary.length
      const cardHeight = 18 // Taller 18mm card for comfortable breathing room

      summary.forEach((item, idx) => {
        const x = marginX + idx * (cardWidth + gap)

        // Card Container with soft ice-blue fill & crisp soft-blue border
        doc.setFillColor(242, 248, 255) // #F2F8FF
        doc.setDrawColor(186, 218, 255) // #BADBFF
        doc.setLineWidth(0.35)
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 3, 3, 'FD')

        // Left Icon Badge Box
        const iconBoxSize = 11
        const iconBoxX = x + 3.2
        const iconBoxY = currentY + 3.5
        doc.setFillColor(13, 98, 254) // Vibrant Blue
        doc.roundedRect(iconBoxX, iconBoxY, iconBoxSize, iconBoxSize, 2.2, 2.2, 'F')

        // Icon Graphic inside badge
        doc.setFillColor(255, 255, 255)
        if (idx === 0) {
          // Bar chart graphic (3 solid vertical bars)
          doc.rect(iconBoxX + 2.2, iconBoxY + 6.2, 1.6, 3.2, 'F')
          doc.rect(iconBoxX + 4.6, iconBoxY + 4.2, 1.6, 5.2, 'F')
          doc.rect(iconBoxX + 7.0, iconBoxY + 2.2, 1.6, 7.2, 'F')
        } else if (idx === 1) {
          // Database / Stacked layers graphic (3 horizontal slabs)
          doc.roundedRect(iconBoxX + 2.2, iconBoxY + 2.4, 6.6, 1.8, 0.5, 0.5, 'F')
          doc.roundedRect(iconBoxX + 2.2, iconBoxY + 4.8, 6.6, 1.8, 0.5, 0.5, 'F')
          doc.roundedRect(iconBoxX + 2.2, iconBoxY + 7.2, 6.6, 1.8, 0.5, 0.5, 'F')
        } else if (idx === 2) {
          // Trend upward chart graphic
          doc.setDrawColor(255, 255, 255)
          doc.setLineWidth(0.8)
          doc.line(iconBoxX + 2.4, iconBoxY + 8.2, iconBoxX + 5.0, iconBoxY + 5.4)
          doc.line(iconBoxX + 5.0, iconBoxY + 5.4, iconBoxX + 6.5, iconBoxY + 6.8)
          doc.line(iconBoxX + 6.5, iconBoxY + 6.8, iconBoxX + 8.8, iconBoxY + 3.2)
          doc.triangle(iconBoxX + 7.0, iconBoxY + 2.8, iconBoxX + 9.2, iconBoxY + 2.8, iconBoxX + 9.2, iconBoxY + 5.0, 'F')
        } else {
          // Percentage / Badge graphic
          doc.setFont(fontName, 'bold')
          doc.setFontSize(9)
          doc.setTextColor(255, 255, 255)
          doc.text('%', iconBoxX + 3.2, iconBoxY + 8.2)
        }

        const textLeft = iconBoxX + iconBoxSize + 3.2
        const maxTextWidth = cardWidth - (iconBoxSize + 6)

        // Label Text
        doc.setFont(fontName, 'bold')
        doc.setFontSize(7.2)
        doc.setTextColor(15, 23, 42) // Slate 900
        doc.text(sanitize(item.label).toUpperCase(), textLeft, currentY + 6.2, { maxWidth: maxTextWidth })

        // Value Text (Bold, prominent 13.5pt size)
        doc.setFont(fontName, 'bold')
        doc.setFontSize(13.5)
        doc.setTextColor(3, 30, 68) // Deep navy (#031E44)
        doc.text(sanitize(item.value), textLeft, currentY + 13.5, { maxWidth: maxTextWidth })
      })

      currentY += cardHeight + 7
    } else {
      currentY += 2
    }

    // ─────────────────────────────────────────────────────────────
    // 4. DATA TABLE (MATCHING CLEAN EXECUTIVE FINANCIAL REPORT)
    // ─────────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: currentY,
      head: [headers.map(sanitize)],
      body: data.map(row => row.map(val => (val === null || val === undefined ? '-' : sanitize(val)))),
      theme: 'grid',
      styles: {
        fontSize: orientation === 'landscape' ? 9 : 9.8,
        cellPadding: orientation === 'landscape' ? 3.2 : 3.8,
        textColor: [10, 25, 47],
        lineColor: [186, 218, 255], // Soft blue grid lines (#BADBFF)
        lineWidth: 0.3,
        valign: 'middle',
        font: fontName,
      },
      headStyles: {
        fillColor: [3, 30, 68], // Deep Executive Navy (#031E44)
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: orientation === 'landscape' ? 9.5 : 10.2,
        halign: 'left',
        cellPadding: 4.2,
      },
      alternateRowStyles: {
        fillColor: [248, 251, 255], // Very soft ice-blue tint
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body') {
          const colIndex = hookData.column.index
          const cellRaw = String(hookData.cell.raw ?? '').trim()
          const headerName = String(headers[colIndex] ?? '').toLowerCase()

          // 1. Primary Identifier column (Metric, Receipt #, Reg Number, Payment ID)
          if (colIndex === 0) {
            hookData.cell.styles.fontStyle = 'bold'
            hookData.cell.styles.textColor = [10, 25, 47] // Deep Charcoal (#0A192F)
          }
          // 2. Currency or Financial Values (Fare, Balance, Amount, Revenue, Inflow, Payout, or ₹)
          else if (
            cellRaw.startsWith('₹') ||
            cellRaw.startsWith('Rs.') ||
            headerName.includes('amount') ||
            headerName.includes('fare') ||
            headerName.includes('balance') ||
            headerName.includes('ratio') ||
            headerName.includes('revenue') ||
            headerName.includes('payout') ||
            headerName.includes('price') ||
            headerName.includes('inflow')
          ) {
            hookData.cell.styles.fontStyle = 'bold'
            hookData.cell.styles.textColor = [3, 30, 68] // Deep Navy (#031E44)
          }
          // 3. Status column (Active, Completed, Confirmed, Paid, Service Due, etc.)
          else if (headerName.includes('status')) {
            hookData.cell.styles.fontStyle = 'bold'
            const upper = cellRaw.toUpperCase()
            if (upper.includes('ACTIVE') || upper.includes('COMPLETED') || upper.includes('CONFIRMED') || upper.includes('PAID')) {
              hookData.cell.styles.textColor = [16, 120, 60] // Deep emerald green
            } else if (upper.includes('DUE') || upper.includes('PENDING') || upper.includes('OVERDUE')) {
              hookData.cell.styles.textColor = [180, 83, 9] // Rich amber / burnt orange
            } else {
              hookData.cell.styles.textColor = [30, 41, 59]
            }
          }
          // 4. All other descriptive columns (Date, Route, Vehicle, Driver, Period Note, Notes)
          // Strong bold slate charcoal (#1E293B) for maximum strength and contrast
          else {
            hookData.cell.styles.fontStyle = 'bold'
            hookData.cell.styles.textColor = [30, 41, 59]
          }
        }
      },
      margin: { left: 12, right: 12, bottom: 16 },
      didDrawPage: tableData => {
        // Bottom right corner navy triangle with bright blue diagonal stripe
        doc.setFillColor(3, 30, 68) // Deep navy (#031E44)
        doc.triangle(pageWidth - 44, pageHeight, pageWidth, pageHeight - 16, pageWidth, pageHeight, 'F')
        doc.setFillColor(26, 115, 232) // Bright royal blue stripe (#1A73E8)
        doc.triangle(pageWidth - 30, pageHeight, pageWidth, pageHeight - 11, pageWidth, pageHeight, 'F')

        // Page number and confidentiality notice with left and right divider lines
        const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
        const footerText = `Page ${tableData.pageNumber} of ${pageCount} — Confidential • RK Travel Hub Internal Report`

        doc.setFont(fontName, 'italic')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105) // Slate 600 (#475569)
        const textWidth = doc.getTextWidth(footerText)
        const textX = pageWidth / 2
        const lineY = pageHeight - 6.8

        // Left accent line
        doc.setDrawColor(186, 218, 255)
        doc.setLineWidth(0.35)
        doc.line(16, lineY, textX - textWidth / 2 - 4, lineY)

        // Center text
        doc.text(footerText, textX, pageHeight - 5.8, { align: 'center' })

        // Right accent line
        doc.line(textX + textWidth / 2 + 4, lineY, pageWidth - 48, lineY)
      },
    })

    const finalFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`
    doc.save(finalFilename)
    return true
  } catch (err) {
    console.error('Error exporting PDF:', err)
    window.print()
    return false
  }
}



