'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id: number;
  name_ar: string;
  name_en: string | null;
  sale_price: number;
  tax_rate: number;
  sku?: string | null;
  image_url?: string | null;
  qty?: number; // من الـview
};

type CartItem = {
  product_id: number;
  name: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  image_url?: string | null;
};

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [lastSale, setLastSale] = useState<{ id: number; total: number } | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);

  useEffect(() => { loadProducts(); loadLastIdFromDB(); }, []);
  async function loadProducts() {
    const res = await fetch("/api/products");
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Load failed"); return; }
    setProducts(j.data || []);
  }

  async function loadLastIdFromDB() {
    const res = await fetch("/api/sales/last");
    const j = await res.json();
    if (res.ok && j.data) {
      setLastSale({ id: j.data.id, total: j.data.grand_total ?? 0 });
      localStorage.setItem("elecpos:lastSaleId", String(j.data.id));
    }
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter(p =>
      (p.sku || "").toLowerCase().includes(t) ||
      p.name_ar.toLowerCase().includes(t) ||
      (p.name_en || "").toLowerCase().includes(t)
    );
  }, [q, products]);

  function addToCart(p: Product) {
    setCart(prev => {
      const ix = prev.findIndex(x => x.product_id === p.id);
      if (ix >= 0) {
        const a = [...prev];
        a[ix] = { ...a[ix], qty: a[ix].qty + 1 };
        return a;
      }
      return [...prev, {
        product_id: p.id,
        name: p.name_ar,
        qty: 1,
        unit_price: p.sale_price,
        tax_rate: p.tax_rate ?? 0,
        image_url: p.image_url ?? null
      }];
    });
  }
  function inc(i: number) { setCart(prev => prev.map((r, idx) => idx === i ? { ...r, qty: r.qty + 1 } : r)); }
  function dec(i: number) { setCart(prev => prev.map((r, idx) => idx === i ? { ...r, qty: Math.max(1, r.qty - 1) } : r)); }
  function remove(i: number) { setCart(prev => prev.filter((_, idx) => idx !== i)); }
  function clearCart() { setCart([]); setCustomer(""); setEditingSaleId(null); }

  const subTotal = cart.reduce((s, r) => s + r.qty * r.unit_price, 0);
  const vatTotal = cart.reduce((s, r) => s + r.qty * r.unit_price * (r.tax_rate ?? 0), 0);
  const grand = subTotal + vatTotal;

  async function checkoutNew() {
    if (cart.length === 0) { alert("السلة فارغة"); return; }
    const payload = {
      customer_name: customer || null,
      items: cart.map(c => ({ product_id: c.product_id, qty: c.qty, unit_price: c.unit_price, tax_rate: c.tax_rate }))
    };
    const res = await fetch("/api/sales/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Checkout failed"); return; }

    setLastSale({ id: j.sale.id, total: j.sale.grand_total });
    localStorage.setItem("elecpos:lastSaleId", String(j.sale.id));

    printReceipt(j.sale.id, customer, cart, subTotal, vatTotal, grand);
    clearCart();
    loadProducts();
    loadLastIdFromDB();
  }

  async function saveEdit() {
    if (!editingSaleId) return;
    if (cart.length === 0) { alert("السلة فارغة"); return; }
    const payload = {
      customer_name: customer || null,
      items: cart.map(c => ({ product_id: c.product_id, qty: c.qty, unit_price: c.unit_price, tax_rate: c.tax_rate }))
    };
    const res = await fetch(`/api/sales/${editingSaleId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Update failed"); return; }

    setLastSale({ id: editingSaleId, total: j.grand_total });
    localStorage.setItem("elecpos:lastSaleId", String(editingSaleId));

    printReceipt(editingSaleId, customer, cart, subTotal, vatTotal, grand);
    clearCart();
    loadProducts();
    loadLastIdFromDB();
  }

  async function openLastSale() {
    const res = await fetch("/api/sales/last");
    const j = await res.json();
    if (!res.ok || !j.data) { alert(j.error || "لا يوجد فاتورة"); return; }
    const id = j.data.id;

    const res2 = await fetch(`/api/sales/${id}`);
    const d = await res2.json();
    if (!res2.ok) { alert(d.error || "Fetch sale failed"); return; }

    const items = (d.items || []).map((r: any) => ({
      product_id: r.product_id,
      name: r.products?.name_ar || "Item",
      qty: Number(r.qty || 0),
      unit_price: Number(r.unit_price || 0),
      tax_rate: Number(r.tax_rate || 0),
      image_url: r.products?.image_url ?? null,
    }));
    setCart(items);
    setCustomer(d.sale?.customer_name || "");
    setEditingSaleId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteLastSale() {
    if (!confirm("حذف آخر فاتورة؟")) return;
    const res = await fetch("/api/sales/last", { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) { alert(j.error || "Delete failed"); return; }
    // نظّف الحالة
    if (lastSale?.id === j.deleted_id) {
      setLastSale(null);
      localStorage.removeItem("elecpos:lastSaleId");
    }
    alert("تم حذف آخر فاتورة");
  }

  function printReceipt(
    saleId: number,
    customerName: string,
    items: CartItem[],
    sub: number, vat: number, total: number
  ) {
    const now = new Date().toLocaleString();
    const rowsHtml = items.map(c => `
      <tr>
        <td style="display:flex; gap:6px; align-items:center">
          <img src="${c.image_url || "/favicon.ico"}" style="width:28px;height:28px;border-radius:6px;object-fit:cover;border:1px solid #ddd" />
          <div>${c.name}</div>
        </td>
        <td class="t">${c.qty}</td>
        <td class="t">${c.unit_price.toFixed(3)}</td>
        <td class="r">${(c.qty*c.unit_price).toFixed(3)}</td>
      </tr>
    `).join("");

    const html = `
      <html>
        <head>
          <title>Receipt #${saleId}</title>
          <style>
            @page { size: 80mm auto; margin: 6mm; }
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Noto Naskh Arabic', sans-serif; }
            .rcpt { width: 72mm; margin: 0 auto; }
            .t { text-align:center; } .r{ text-align:right; }
            .b { font-weight:600; }
            .muted { color:#666; font-size:11px }
            .row { display:flex; justify-content:space-between; }
            table { width:100%; border-collapse: collapse; font-size:12px; }
            th, td { padding:4px 0; }
            thead tr { border-bottom: 1px dashed #999; }
            tfoot tr { border-top: 1px dashed #999; }
            .hdr { margin-top:8px; }
          </style>
        </head>
        <body>
          <div class="rcpt">
            <div class="t b">ElecPOS</div>
            <div class="t muted">Sales Receipt</div>
            <div class="row hdr">
              <div>#${saleId}</div>
              <div>${now}</div>
            </div>
            <div class="row" style="margin-top:4px">
              <div>العميل: <span class="b">${customerName || "-"}</span></div>
            </div>
            <table style="margin-top:10px">
              <thead>
                <tr>
                  <th style="text-align:left">الصنف</th>
                  <th class="t">الكمية</th>
                  <th class="t">السعر</th>
                  <th class="r">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr><td colspan="3">Subtotal</td><td class="r">${sub.toFixed(3)}</td></tr>
                <tr><td colspan="3">VAT</td><td class="r">${vat.toFixed(3)}</td></tr>
                <tr><td colspan="3" class="b">Total</td><td class="r b">${total.toFixed(3)}</td></tr>
              </tfoot>
            </table>
            <div class="t" style="margin-top:10px">شكراً لزيارتكم</div>
          </div>
        </body>
      </html>
    `;

    const w = window.open("", "PRINT", "height=600,width=420");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* المنتجات */}
      <div className="lg:col-span-2">
        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="h-title">نقطة البيع</h1>
            <div className="flex gap-2">
              <input className="input w-72" placeholder="بحث / Search…" value={q} onChange={(e)=>setQ(e.target.value)} />
              <button className="btn" onClick={openLastSale}>فتح آخر فاتورة</button>
              <button className="btn" onClick={deleteLastSale}>حذف آخر فاتورة</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <button key={p.id} className="surface text-left" onClick={() => addToCart(p)}>
                <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 border">
                  <img src={p.image_url ?? "/favicon.ico"} alt={p.name_ar} className="w-full h-full object-cover" />
                </div>
                <div className="mt-2 font-medium">{p.name_ar}</div>
                <div className="text-xs text-slate-500">{p.name_en}</div>
                <div className="mt-1 text-sm">
                  <span className="font-semibold">{Number(p.sale_price).toFixed(3)}</span> JOD
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="col-span-full text-center text-slate-500">لا نتائج</div>}
          </div>
        </div>
      </div>

      {/* السلة */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="h-subtitle">{editingSaleId ? `تعديل الفاتورة #${editingSaleId}` : "السلة"}</h2>
          {editingSaleId && <button className="btn" onClick={()=>{ setEditingSaleId(null); clearCart(); }}>إلغاء التعديل</button>}
        </div>

        <input className="input w-full" placeholder="اسم الزبون (اختياري)" value={customer} onChange={(e)=>setCustomer(e.target.value)} />

        <div className="space-y-2">
          {cart.map((c, i) => (
            <div key={i} className="surface flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img src={c.image_url ?? "/favicon.ico"} className="w-10 h-10 rounded-lg object-cover border" />
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">{(c.tax_rate*100).toFixed(0)}% VAT</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn" onClick={() => dec(i)}>-</button>
                <div className="w-8 text-center">{c.qty}</div>
                <button className="btn" onClick={() => inc(i)}>+</button>
              </div>
              <div className="text-right w-24">{(c.qty*c.unit_price).toFixed(3)}</div>
              <button className="btn" onClick={() => remove(i)}>x</button>
            </div>
          ))}
          {cart.length === 0 && <div className="surface text-center text-slate-500">السلة فارغة</div>}
        </div>

        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{subTotal.toFixed(3)}</span></div>
          <div className="flex justify-between"><span>VAT</span><span>{vatTotal.toFixed(3)}</span></div>
          <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{grand.toFixed(3)}</span></div>
        </div>

        {editingSaleId ? (
          <button className="btn w-full" onClick={saveEdit}>حفظ التعديلات وطباعة</button>
        ) : (
          <button className="btn w-full" onClick={checkoutNew}>Checkout & Print</button>
        )}
      </div>
    </div>
  );
}
