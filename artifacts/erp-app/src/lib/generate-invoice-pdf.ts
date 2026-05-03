import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Invoice, OrderDetail } from "@workspace/api-client-react";

function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatCurrencyPdf(amount: number | null | undefined): string {
  if (amount == null) return "0.00 ج.م";
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(amount);
}

function formatDatePdf(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateString));
  } catch {
    return escapeHtml(dateString);
  }
}

function getInvoiceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "مسودة",
    issued: "مصدرة",
    paid: "مدفوعة",
    cancelled: "ملغاة",
  };
  return map[status] ?? escapeHtml(status);
}

function getOrderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    delivered: "مُسلَّم",
    cancelled: "ملغى",
  };
  return map[status] ?? escapeHtml(status);
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "#6b7280",
    issued: "#2563eb",
    paid: "#16a34a",
    cancelled: "#dc2626",
  };
  return map[status] ?? "#6b7280";
}

function buildInvoiceHTML(invoice: Invoice, order: OrderDetail): string {
  const items = order.items ?? [];
  const subtotal = items.reduce((sum, item) => {
    const price = typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : item.unitPrice;
    return sum + item.quantity * price;
  }, 0);
  const total = typeof invoice.total === "string" ? parseFloat(invoice.total) : invoice.total;

  const safeInvoiceNumber = escapeHtml(invoice.invoiceNumber);
  const safeCustomerName = escapeHtml(invoice.customerName) || "—";
  const safeNotes = escapeHtml(invoice.notes);
  const safeOrderId = Number(invoice.orderId);
  const statusLabel = getInvoiceStatusLabel(invoice.status);
  const statusColor = getStatusColor(invoice.status);
  const issuedAtFormatted = formatDatePdf(invoice.issuedAt);
  const orderStatusLabel = getOrderStatusLabel(order.status);

  const itemRows = items.length > 0
    ? items.map((item) => {
        const price = typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : item.unitPrice;
        const lineTotal = item.quantity * price;
        const safeItemName = escapeHtml(item.itemName) || `صنف #${Number(item.itemId)}`;
        const safeQty = Number(item.quantity);
        return `
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: right;">${safeItemName}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: center;">${safeQty}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: center;">${formatCurrencyPdf(price)}</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 600;">${formatCurrencyPdf(lineTotal)}</td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8;">لا توجد بنود مفصلة لهذه الفاتورة</td></tr>`;

  return `
    <div style="
      font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
      direction: rtl;
      width: 794px;
      min-height: 1123px;
      background: #ffffff;
      padding: 60px;
      box-sizing: border-box;
      color: #1e293b;
    ">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 3px solid #3b82f6;">
        <div>
          <div style="font-size: 32px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px;">نظام ERP الداخلي</div>
          <div style="font-size: 14px; color: #64748b; margin-top: 6px;">نظام إدارة الموارد المؤسسية</div>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 28px; font-weight: 700; color: #1e293b;">فاتورة</div>
          <div style="font-size: 18px; color: #3b82f6; font-weight: 600; margin-top: 4px;">${safeInvoiceNumber}</div>
          <div style="margin-top: 8px; padding: 4px 12px; border-radius: 9999px; background: ${statusColor}20; color: ${statusColor}; font-size: 13px; font-weight: 600; display: inline-block; border: 1px solid ${statusColor}40;">
            ${statusLabel}
          </div>
        </div>
      </div>

      <!-- Invoice Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px; gap: 24px;">
        <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px;">
          <div style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">بيانات العميل</div>
          <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${safeCustomerName}</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">طلب رقم: #${safeOrderId}</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px;">
          <div style="font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">تفاصيل الفاتورة</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 13px; color: #64748b;">رقم الفاتورة:</span>
            <span style="font-size: 13px; font-weight: 600; color: #1e293b;">${safeInvoiceNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 13px; color: #64748b;">تاريخ الإصدار:</span>
            <span style="font-size: 13px; font-weight: 600; color: #1e293b;">${issuedAtFormatted}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 13px; color: #64748b;">حالة الطلب:</span>
            <span style="font-size: 13px; font-weight: 600; color: #1e293b;">${orderStatusLabel}</span>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div style="margin-bottom: 32px;">
        <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">بنود الفاتورة</div>
        <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background: #1e40af; color: white;">
              <th style="padding: 12px 14px; text-align: right; font-size: 13px; font-weight: 600;">الصنف</th>
              <th style="padding: 12px 14px; text-align: center; font-size: 13px; font-weight: 600;">الكمية</th>
              <th style="padding: 12px 14px; text-align: center; font-size: 13px; font-weight: 600;">سعر الوحدة</th>
              <th style="padding: 12px 14px; text-align: center; font-size: 13px; font-weight: 600;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div style="display: flex; justify-content: flex-start; margin-bottom: 40px;">
        <div style="min-width: 280px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          ${items.length > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 13px; color: #64748b;">المجموع الجزئي:</span>
            <span style="font-size: 13px; font-weight: 600;">${formatCurrencyPdf(subtotal)}</span>
          </div>` : ""}
          <div style="display: flex; justify-content: space-between; padding: 16px; background: #1e40af;">
            <span style="font-size: 16px; font-weight: 700; color: white;">الإجمالي الكلي:</span>
            <span style="font-size: 18px; font-weight: 800; color: white;">${formatCurrencyPdf(total)}</span>
          </div>
        </div>
      </div>

      ${safeNotes ? `
      <!-- Notes -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 32px;">
        <div style="font-size: 13px; font-weight: 600; color: #92400e; margin-bottom: 6px;">ملاحظات:</div>
        <div style="font-size: 13px; color: #78350f;">${safeNotes}</div>
      </div>` : ""}

      <!-- Footer -->
      <div style="border-top: 2px solid #e2e8f0; padding-top: 24px; text-align: center;">
        <div style="font-size: 13px; color: #94a3b8;">شكراً لتعاملكم معنا — نظام ERP الداخلي</div>
        <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">هذه الفاتورة صادرة إلكترونياً ولا تحتاج إلى توقيع</div>
      </div>
    </div>
  `;
}

export async function generateInvoicePdf(invoice: Invoice, order: OrderDetail): Promise<void> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.zIndex = "-1";
  container.innerHTML = buildInvoiceHTML(invoice, order);
  document.body.appendChild(container);

  try {
    const innerEl = container.firstElementChild as HTMLElement;

    const canvas = await html2canvas(innerEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 794,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      let yOffset = 0;
      let remaining = imgHeight;
      let pageNum = 0;

      while (remaining > 0) {
        if (pageNum > 0) pdf.addPage();

        const sliceHeight = Math.min(remaining, pageHeight);
        const srcY = (yOffset / imgHeight) * canvas.height;
        const srcHeight = (sliceHeight / imgHeight) * canvas.height;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);
        }
        const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(sliceData, "JPEG", 0, 0, imgWidth, sliceHeight);

        yOffset += sliceHeight;
        remaining -= sliceHeight;
        pageNum++;
      }
    }

    pdf.save(`فاتورة-${invoice.invoiceNumber}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
