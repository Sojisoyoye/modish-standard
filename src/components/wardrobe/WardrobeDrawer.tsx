"use client";

import { useWardrobe, WardrobeItem } from "@/lib/wardrobe";
import { formatNGN } from "@/lib/utils";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2347080227780";

function buildWhatsAppMessage(items: WardrobeItem[], intent: "quote" | "order") {
  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.name}${item.category ? ` (${item.category})` : ""} — Qty: ${item.quantity}${item.price ? ` @ ${formatNGN(item.price)}` : ""}`
  );
  const total = items
    .filter((i) => i.price)
    .reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

  const greeting =
    intent === "quote"
      ? "Hello Modish Standard! I'd like to request a *price quote* for the following items:"
      : "Hello Modish Standard! I'd like to *place an order* for the following items:";

  const totalLine =
    total > 0 ? `\n\n*Estimated Total: ${formatNGN(total)}*` : "";

  const closing =
    intent === "quote"
      ? "\n\nPlease confirm availability and pricing. Thank you!"
      : "\n\nPlease confirm availability and arrange delivery. Thank you!";

  return encodeURIComponent(
    `${greeting}\n\n${lines.join("\n")}${totalLine}${closing}`
  );
}

function generatePrintHTML(items: WardrobeItem[]): string {
  const date = new Date().toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows = items
    .map((item, i) => {
      const unitPrice = item.price ? formatNGN(item.price) : "On Request";
      const subtotal = item.price
        ? formatNGN(item.price * item.quantity)
        : "—";
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.name}</td>
          <td>${item.category || "—"}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${unitPrice}</td>
          <td style="text-align:right">${subtotal}</td>
        </tr>`;
    })
    .join("");

  const grandTotal = items
    .filter((i) => i.price)
    .reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

  const totalRow =
    grandTotal > 0
      ? `<tr class="total-row">
          <td colspan="5" style="text-align:right;font-weight:700">Grand Total</td>
          <td style="text-align:right;font-weight:700">${formatNGN(grandTotal)}</td>
         </tr>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Modish Standard — Product Quote</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #1B2D72; padding-bottom: 20px; }
    .brand-name { font-size: 22px; font-weight: 800; color: #1B2D72; }
    .brand-sub { font-size: 11px; color: #2D8B3C; margin-top: 2px; }
    .meta { text-align: right; font-size: 12px; color: #555; }
    .meta strong { display: block; font-size: 14px; color: #1B2D72; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #1B2D72; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
    th:nth-child(4) { text-align: center; }
    th:nth-child(5), th:nth-child(6) { text-align: right; }
    td { padding: 9px 12px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f8f9fa; }
    .total-row td { background: #EEF2FF; border-top: 2px solid #1B2D72; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #777; display: flex; justify-content: space-between; }
    .note { margin-top: 20px; background: #F0FAF2; border-left: 4px solid #2D8B3C; padding: 12px 16px; font-size: 12px; color: #1B4D2E; border-radius: 0 6px 6px 0; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-name">MODISH STANDARD</div>
      <div class="brand-sub">Premium Board Materials · Lagos, Nigeria</div>
    </div>
    <div class="meta">
      <strong>Product Quote</strong>
      Date: ${date}<br/>
      Tel: +2347080227780
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Category</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${totalRow}
    </tbody>
  </table>

  <div class="note">
    Prices marked "On Request" require confirmation. Please contact us via WhatsApp for final pricing and availability.
  </div>

  <div class="footer">
    <span>331, Agege Motor Road, Challenge Bus Stop, Mushin, Lagos</span>
    <span>+234 708 022 7780 · modishstandard.com</span>
  </div>
</body>
</html>`;
}

export default function WardrobeDrawer() {
  const { items, isOpen, closeWardrobe, removeItem, updateQuantity, clearWardrobe, totalItems } =
    useWardrobe();

  const grandTotal = items
    .filter((i) => i.price)
    .reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

  function handleWhatsApp(intent: "quote" | "order") {
    const msg = buildWhatsAppMessage(items, intent);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  }

  function handlePDF() {
    const html = generatePrintHTML(items);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeWardrobe}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-[#1B2D72]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-lg font-bold text-[#1B2D72]">My Order List</h2>
            {totalItems > 0 && (
              <span className="rounded-full bg-[#1B2D72] px-2 py-0.5 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={closeWardrobe}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-[#1B2D72]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="font-semibold text-[#1B2D72]">Your order list is empty</p>
              <p className="mt-1 text-sm text-gray-400">Add products to get a quote or place an order.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1B2D72] leading-snug">{item.name}</p>
                      {item.category && (
                        <p className="text-xs text-[#2D8B3C] font-medium mt-0.5">{item.category}</p>
                      )}
                      {item.price && (
                        <p className="text-sm font-bold text-gray-800 mt-1">{formatNGN(item.price)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 rounded-lg p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Quantity + subtotal */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-0 rounded-lg border border-gray-200 bg-white overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-lg leading-none"
                      >
                        −
                      </button>
                      <span className="px-3 py-1.5 text-sm font-bold text-[#1B2D72] min-w-[2.5rem] text-center border-x border-gray-200">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none"
                      >
                        +
                      </button>
                    </div>
                    {item.price && (
                      <p className="text-sm font-bold text-[#1B2D72]">
                        {formatNGN(item.price * item.quantity)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer actions */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            {/* Grand total */}
            {grandTotal > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-[#EEF2FF] px-4 py-3">
                <span className="text-sm font-semibold text-[#1B2D72]">Estimated Total</span>
                <span className="text-lg font-bold text-[#1B2D72]">{formatNGN(grandTotal)}</span>
              </div>
            )}

            {/* WhatsApp Quote */}
            <button
              onClick={() => handleWhatsApp("quote")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#128C54] px-4 py-3 text-sm font-bold text-white hover:bg-[#0e7040] transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Send as Quote via WhatsApp
            </button>

            {/* WhatsApp Order */}
            <button
              onClick={() => handleWhatsApp("order")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1B2D72] px-4 py-3 text-sm font-bold text-white hover:bg-[#101D50] transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Place Order via WhatsApp
            </button>

            {/* Save PDF */}
            <button
              onClick={handlePDF}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-[#1B2D72] px-4 py-3 text-sm font-bold text-[#1B2D72] hover:bg-[#EEF2FF] transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Save as PDF
            </button>

            {/* Clear */}
            <button
              onClick={clearWardrobe}
              className="w-full text-center text-xs text-gray-400 hover:text-red-500 transition-colors py-1"
            >
              Clear order list
            </button>
          </div>
        )}
      </div>
    </>
  );
}
