import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
 * - Deep navy header banner (#031E44) with vector RK logo, vertical divider, brand metadata & total records
 * - Bottom wave accents in royal and sky blue
 * - Centered bold title & subtitle with royal blue pill divider
 * - 4-Column executive KPI summary cards with vibrant blue icon badges and bold metrics
 * - Crisp bordered table with royal blue header & clean typography
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

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // ─────────────────────────────────────────────────────────────
    // 1. TOP NAVY EXECUTIVE HEADER BANNER
    // ─────────────────────────────────────────────────────────────
    const bannerHeight = 26
    doc.setFillColor(3, 30, 68) // Deep Executive Navy (#031E44)
    doc.rect(0, 0, pageWidth, bannerHeight, 'F')

    // Bottom-right decorative wave / geometric accents in royal & sky blue
    doc.setFillColor(13, 98, 254) // #0D62FE
    doc.triangle(
      pageWidth - 48, bannerHeight,
      pageWidth, bannerHeight - 11,
      pageWidth, bannerHeight,
      'F'
    )
    doc.setFillColor(59, 130, 246) // #3B82F6
    doc.triangle(
      pageWidth - 32, bannerHeight,
      pageWidth, bannerHeight - 7,
      pageWidth, bannerHeight,
      'F'
    )
    doc.setFillColor(96, 165, 250) // #60A5FA
    doc.triangle(
      pageWidth - 16, bannerHeight,
      pageWidth, bannerHeight - 3.5,
      pageWidth, bannerHeight,
      'F'
    )

    // RK Monogram Logo (Custom Vector Drawing matching RK Travel Hub branding)
    const logoX = 14
    const logoY = 6.5
    doc.setFillColor(255, 255, 255)
    // Left stem of R
    doc.roundedRect(logoX, logoY, 2.6, 13, 0.7, 0.7, 'F')
    // Top bar of R
    doc.roundedRect(logoX + 2.6, logoY, 6.8, 2.3, 0.7, 0.7, 'F')
    // Outer loop of R
    doc.roundedRect(logoX + 6.8, logoY + 1.2, 2.6, 4.2, 0.7, 0.7, 'F')
    // Middle bar of R
    doc.roundedRect(logoX + 2.6, logoY + 5.2, 6.8, 2.3, 0.7, 0.7, 'F')
    // Diagonal leg of R / K
    doc.roundedRect(logoX + 3.8, logoY + 7.4, 2.6, 5.6, 0.7, 0.7, 'F')
    // Right K diagonal upper arm
    doc.roundedRect(logoX + 7.5, logoY + 2.5, 2.4, 4.5, 0.7, 0.7, 'F')
    // Right K diagonal lower leg
    doc.roundedRect(logoX + 8.2, logoY + 7.2, 2.5, 5.8, 0.7, 0.7, 'F')

    // Vertical Divider Line between brand logo and brand name
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.35)
    doc.line(logoX + 13.5, logoY + 1, logoX + 13.5, logoY + 13)

    // Brand Name & Subtext
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14.5)
    doc.text('RK TRAVEL HUB', logoX + 16.5, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(190, 210, 245)
    doc.text('Fleet & Travel Management System', logoX + 16.5, 18)

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

    const metaRightX = pageWidth - 14

    // Calendar icon badge on top right
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(metaRightX - 63, 8.5, 3.6, 3.6, 0.6, 0.6, 'F')
    doc.setFillColor(3, 30, 68)
    doc.rect(metaRightX - 63, 8.5, 3.6, 1.1, 'F') // Top calendar header

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(215, 230, 255)
    doc.text(`Generated: ${formattedDate} ${formattedTime}`, metaRightX, 11.5, { align: 'right' })

    // Database / Records icon on top right
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(metaRightX - 35, 15, 3.4, 1.1, 0.3, 0.3, 'F')
    doc.roundedRect(metaRightX - 35, 16.5, 3.4, 1.1, 0.3, 0.3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`Total Records: ${data.length}`, metaRightX, 18, { align: 'right' })

    // ─────────────────────────────────────────────────────────────
    // 2. REPORT TITLE & SUBTITLE (CENTERED WITH BLUE ACCENT DIVIDER)
    // ─────────────────────────────────────────────────────────────
    let currentY = bannerHeight + 9

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42) // Slate 900
    doc.setFontSize(15)
    doc.text(title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' })
    currentY += 5.5

    if (subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139) // Slate 500
      doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' })
      currentY += 4.5
    }

    // Small blue pill accent under title
    doc.setFillColor(13, 98, 254) // #0D62FE
    doc.roundedRect(pageWidth / 2 - 14, currentY, 28, 1.2, 0.6, 0.6, 'F')
    currentY += 6

    // ─────────────────────────────────────────────────────────────
    // 3. EXECUTIVE KPI SUMMARY CARDS
    // ─────────────────────────────────────────────────────────────
    if (summary && summary.length > 0) {
      const marginX = 12
      const gap = 3.5
      const availableWidth = pageWidth - marginX * 2
      const cardWidth = (availableWidth - (summary.length - 1) * gap) / summary.length
      const cardHeight = 16

      summary.forEach((item, idx) => {
        const x = marginX + idx * (cardWidth + gap)

        // Card Container with soft blue tint & crisp border
        doc.setFillColor(242, 248, 255) // #F2F8FF
        doc.setDrawColor(186, 218, 255) // #BADBFF
        doc.setLineWidth(0.3)
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 2.5, 2.5, 'FD')

        // Left Icon Badge Box
        const iconBoxSize = 10
        const iconBoxX = x + 3
        const iconBoxY = currentY + 3
        doc.setFillColor(13, 98, 254) // Vibrant Blue
        doc.roundedRect(iconBoxX, iconBoxY, iconBoxSize, iconBoxSize, 1.8, 1.8, 'F')

        // Icon Graphic inside badge
        doc.setFillColor(255, 255, 255)
        if (idx === 0) {
          // Bar chart graphic
          doc.rect(iconBoxX + 2.2, iconBoxY + 5.8, 1.4, 2.5, 'F')
          doc.rect(iconBoxX + 4.3, iconBoxY + 3.8, 1.4, 4.5, 'F')
          doc.rect(iconBoxX + 6.4, iconBoxY + 2.2, 1.4, 6.1, 'F')
        } else if (idx === 1) {
          // Database / Stacked layers graphic
          doc.roundedRect(iconBoxX + 2.2, iconBoxY + 2.4, 5.6, 1.6, 0.4, 0.4, 'F')
          doc.roundedRect(iconBoxX + 2.2, iconBoxY + 4.6, 5.6, 1.6, 0.4, 0.4, 'F')
          doc.roundedRect(iconBoxX + 2.2, iconBoxY + 6.8, 5.6, 1.6, 0.4, 0.4, 'F')
        } else if (idx === 2) {
          // Trend upward chart graphic
          doc.rect(iconBoxX + 2.2, iconBoxY + 6.2, 1.6, 1.6, 'F')
          doc.rect(iconBoxX + 4.2, iconBoxY + 4.4, 1.6, 3.4, 'F')
          doc.rect(iconBoxX + 6.2, iconBoxY + 2.4, 1.6, 5.4, 'F')
          // Diagonal arrow point
          doc.triangle(iconBoxX + 6, iconBoxY + 2.2, iconBoxX + 8, iconBoxY + 2.2, iconBoxX + 8, iconBoxY + 4.2, 'F')
        } else {
          // Percentage / Badge graphic
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(255, 255, 255)
          doc.text('%', iconBoxX + 3, iconBoxY + 7.2)
        }

        const textLeft = iconBoxX + iconBoxSize + 3.2
        const maxTextWidth = cardWidth - (iconBoxSize + 8)

        // Label Text
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.8)
        doc.setTextColor(15, 23, 42)
        doc.text(item.label.toUpperCase(), textLeft, currentY + 5.5, { maxWidth: maxTextWidth })

        // Value Text
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(10, 25, 47)
        doc.text(item.value, textLeft, currentY + 11.8, { maxWidth: maxTextWidth })
      })

      currentY += cardHeight + 6
    } else {
      currentY += 2
    }

    // ─────────────────────────────────────────────────────────────
    // 4. DATA TABLE (MATCHING CLEAN EXECUTIVE FINANCIAL REPORT)
    // ─────────────────────────────────────────────────────────────
    autoTable(doc, {
      startY: currentY,
      head: [headers],
      body: data.map(row => row.map(val => (val === null || val === undefined ? '-' : String(val)))),
      theme: 'grid',
      styles: {
        fontSize: orientation === 'landscape' ? 7.8 : 8.2,
        cellPadding: orientation === 'landscape' ? 2.5 : 2.8,
        textColor: [15, 23, 42],
        lineColor: [186, 218, 255], // Soft blue grid lines (#BADBFF)
        lineWidth: 0.25,
        valign: 'middle',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [3, 30, 68], // Deep Executive Navy (#031E44)
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: orientation === 'landscape' ? 8.2 : 8.8,
        halign: 'left',
        cellPadding: 3.2,
      },
      alternateRowStyles: {
        fillColor: [248, 251, 255], // Very soft ice-blue tint
      },
      margin: { left: 12, right: 12, bottom: 16 },
      didDrawPage: tableData => {
        // Bottom right corner navy triangle with bright blue diagonal stripe
        doc.setFillColor(3, 30, 68) // Deep navy (#031E44)
        doc.triangle(pageWidth - 42, pageHeight, pageWidth, pageHeight - 14, pageWidth, pageHeight, 'F')
        doc.setFillColor(26, 115, 232) // Bright royal blue stripe (#1A73E8)
        doc.triangle(pageWidth - 28, pageHeight, pageWidth, pageHeight - 9, pageWidth, pageHeight, 'F')

        // Page number and confidentiality notice with left and right divider lines
        const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
        const footerText = `Page ${tableData.pageNumber} of ${pageCount} — Confidential • RK Travel Hub Internal Report`

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
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
        doc.line(textX + textWidth / 2 + 4, lineY, pageWidth - 46, lineY)
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


