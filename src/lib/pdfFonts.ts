/**
 * Dynamic Font Loader for jsPDF
 * Loads Segoe UI (Regular & Bold) with full Unicode and Indian Rupee (₹) symbol support.
 */

let cachedReg: string | null = null
let cachedBold: string | null = null

export async function ensureFontsLoaded(doc: any): Promise<string> {
  try {
    if (typeof window === 'undefined') return 'helvetica'

    if (!cachedReg) {
      cachedReg = await fetchFontAsBase64('/fonts/segoeui.ttf')
    }
    if (!cachedBold) {
      cachedBold = await fetchFontAsBase64('/fonts/segoeuib.ttf')
    }

    if (cachedReg && cachedBold) {
      doc.addFileToVFS('SegoeUI-Regular.ttf', cachedReg)
      doc.addFont('SegoeUI-Regular.ttf', 'SegoeUI', 'normal')

      doc.addFileToVFS('SegoeUI-Bold.ttf', cachedBold)
      doc.addFont('SegoeUI-Bold.ttf', 'SegoeUI', 'bold')

      return 'SegoeUI'
    }
  } catch (err) {
    console.warn('Custom font load failed, using fallback:', err)
  }
  return 'helvetica'
}

async function fetchFontAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP error ${res.status} fetching font: ${url}`)
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  return btoa(binary)
}
