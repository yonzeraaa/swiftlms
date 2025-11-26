import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function generateCertificatePDF(elementId: string, fileName: string): Promise<void> {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Certificate element not found')
    }

    // Configure html2canvas options for best quality
    const canvas = await html2canvas(element, {
      scale: 2, // Good balance between quality and performance
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#001a33', // Navy background
      logging: false,
      width: 1100,
      height: 850,
      windowWidth: 1100,
      windowHeight: 850,
    })

    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png', 1.0)
    
    // Create PDF with landscape orientation (better for certificates)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    })

    // Calculate dimensions to fit the PDF
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    // Add image to PDF with proper scaling
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    
    // Set document properties
    pdf.setProperties({
      title: 'Certificado de Conclusão',
      subject: 'Certificado SwiftEDU',
      author: 'SwiftEDU',
      keywords: 'certificado, conclusão, curso',
      creator: 'SwiftEDU Platform'
    })

    // Save the PDF
    pdf.save(fileName)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

// Alternative function to generate PDF from React component
export async function generateCertificatePDFFromComponent(
  component: HTMLElement,
  certificateNumber: string
): Promise<void> {
  try {
    const canvas = await html2canvas(component, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#001a33',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png', 1.0)
    const pdf = new jsPDF('landscape', 'mm', 'a4')
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    
    pdf.save(`certificado-${certificateNumber}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}