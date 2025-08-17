import { useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ProformaPDFProps {
  invoice: any;
  patient: any;
  createdBy: any;
  autoDownload?: boolean;
  onClose: () => void;
}

export function ProformaPDF({ invoice, patient, createdBy, autoDownload = false, onClose }: ProformaPDFProps) {
  const pdfRef = useRef<HTMLDivElement>(null);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "USD": return "$";
      case "EUR": return "€";
      case "TRY": return "₺";
      case "GBP": return "£";
      default: return "$";
    }
  };

  const currencySymbol = getCurrencySymbol(invoice.currency || "USD");

  const generatePDF = async () => {
    if (!pdfRef.current) return;

    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`proforma-${invoice.invoiceNumber}.pdf`);
      onClose();
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  useEffect(() => {
    if (autoDownload) {
      generatePDF();
    }
  }, [autoDownload]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Proforma Invoice Preview</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={generatePDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div ref={pdfRef} className="bg-white p-8 border">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center">
              <img src="/logo.png" alt="You Clinic Logo" className="w-16 h-16 object-contain mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">You Clinic</h1>
                <p className="text-gray-600">Specialized care management</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">PROFORMA INVOICE</h2>
              <p className="text-gray-600">Invoice #: {invoice.invoiceNumber}</p>
              <p className="text-gray-600">Date: {new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {/* Billing Information */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-3">BILLED BY:</h3>
              <div className="text-gray-700">
                <p className="font-semibold">You Clinic</p>
                <p>Phone: {invoice.salespersonPhone}</p>
                <p>Folkart Time Bornova Sitesi, Kazımdirik, 284. Sk. no:2 D:613, 35100 Bornova/İzmir</p>
                <p>Email: info@youstemcell.com</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-3">BILLED TO:</h3>
              <div className="text-gray-700">
                <p className="font-semibold">{patient?.firstName} {patient?.lastName}</p>
                <p>Phone: {patient?.phone}</p>
                <p>Email: {patient?.email || "N/A"}</p>
                <p>Country: {patient?.country || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left font-bold">Item</th>
                  <th className="border border-gray-300 px-4 py-3 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-3">{item.description}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right">{currencySymbol}{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mb-8">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="text-right font-bold pr-4 py-2">Total:</td>
                  <td className="text-right font-bold w-32">{currencySymbol}{invoice.total.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="text-right font-bold pr-4 py-2">Deposit:</td>
                  <td className="text-right font-bold w-32">{currencySymbol}{invoice.deposit.toLocaleString()}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="text-right font-bold pr-4 py-2">Remaining:</td>
                  <td className="text-right font-bold w-32">{currencySymbol}{invoice.remaining.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-sm text-gray-600 mt-2">Payment will be done cash</p>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 text-center text-gray-600">
            <div className="flex justify-center space-x-6">
              <span>🌐 youclinic.org</span>
              <span>📷 @youclinictr</span>
              <span>📍 Izmir, Turkey</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded">
              <h4 className="font-bold mb-2">Notes:</h4>
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
