import { PDFDocument } from 'pdf-lib';

export const exportCanvasToPDF = async (canvasDataUrl: string, width: number, height: number, filename: string) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);
    const imageBytes = await fetch(canvasDataUrl).then(res => res.arrayBuffer());
    
    let pdfImage;
    if (canvasDataUrl.startsWith('data:image/png')) {
      pdfImage = await pdfDoc.embedPng(imageBytes);
    } else {
      pdfImage = await pdfDoc.embedJpg(imageBytes);
    }
    
    page.drawImage(pdfImage, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });
    
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
  }
};
