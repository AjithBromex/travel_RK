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
 * Universal PDF exporter for RK Travel Hub.
 * Produces clean, professional reports with RK Travel Hub letterhead,
 * metadata, auto-styled data table, and optional summary blocks.
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

    // ── Header Accent Banner ──
    doc.setFillColor(15, 47, 120) // Deep Navy (#0F2F78)
    doc.rect(0, 0, pageWidth, 24, 'F')

    // ── Brand Text ──
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.text('RK TRAVEL HUB', 14, 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 215, 250)
    doc.text('Fleet & Travel Management System', 14, 18)

    // Generated Date/Time on Right
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
    doc.setFontSize(7.5)
    doc.text(`Generated: ${formattedDate} ${formattedTime}`, pageWidth - 14, 11, { align: 'right' })
    doc.text(`Total Records: ${data.length}`, pageWidth - 14, 18, { align: 'right' })

    // ── Document Title ──
    let currentY = 32
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 30, 55)
    doc.setFontSize(14)
    doc.text(title.toUpperCase(), 14, currentY)
    currentY += 5

    if (subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(subtitle, 14, currentY)
      currentY += 5
    }

    // ── Summary Cards (if provided) ──
    if (summary && summary.length > 0) {
      currentY += 2
      const cardWidth = Math.min(50, (pageWidth - 28 - (summary.length - 1) * 4) / summary.length)
      const cardHeight = 12

      summary.forEach((item, idx) => {
        const x = 14 + idx * (cardWidth + 4)
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD')

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100, 116, 139)
        doc.text(item.label.toUpperCase(), x + 3, currentY + 4)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(15, 23, 42)
        doc.text(item.value, x + 3, currentY + 9.5)
      })

      currentY += cardHeight + 5
    } else {
      currentY += 3
    }

    // ── Data Table ──
    autoTable(doc, {
      startY: currentY,
      head: [headers],
      body: data.map(row => row.map(val => (val === null || val === undefined ? '-' : String(val)))),
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 47, 120],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14, bottom: 15 },
      didDrawPage: data => {
        // Footer: Page numbers
        const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(148, 163, 184)
        doc.text(
          `Page ${data.pageNumber} of ${pageCount} — Confidential • RK Travel Hub Internal Report`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        )
      },
    })

    const finalFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`
    doc.save(finalFilename)
    return true
  } catch (err) {
    console.error('Error exporting PDF:', err)
    // Fallback: trigger print
    window.print()
    return false
  }
}
