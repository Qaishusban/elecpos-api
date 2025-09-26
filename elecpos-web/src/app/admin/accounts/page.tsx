'use client';
import React, { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabase-browser";

type Account = { id:number; code:string; name_ar:string; name_en:string; type:'asset'|'liability'|'equity'|'revenue'|'expense' };

export default function AdminAccounts(){
  const sb = supabaseBrowser(); // ✅
  const [items,setItems] = useState<Account[]>([]);
  const [form,setForm] = useState<Partial<Account>>({ type:'asset' });

  useEffect(()=>{ load(); },[]);
  async function load() {
    const { data, error } = await sb.from("accounts").select("*"); // ✅
    setItems((data as Account[])||[]);
  }

  async function save(){
    if(form.id){
      await sb.from("accounts").update({
        code: form.code, name_ar: form.name_ar, name_en: form.name_en, type: form.type
      }).eq("id", form.id);
    }else{
      await sb.from("accounts").insert({
        code: form.code, name_ar: form.name_ar, name_en: form.name_en, type: form.type
      });
    }
    setForm({ type:'asset' });
    await load();
  }

  async function remove(acc:Account){
    if(!confirm(`حذف ${acc.code} - ${acc.name_ar}؟`)) return;
    await sb.from("accounts").delete().eq("id", acc.id);
    await load();
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="card">
        <h1 className="section-title mb-4">إدارة الحسابات</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="input" placeholder="Code" value={form.code||""} onChange={e=>setForm({...form, code:e.target.value})}/>
          <input className="input" placeholder="الاسم العربي" value={form.name_ar||""} onChange={e=>setForm({...form, name_ar:e.target.value})}/>
          <input className="input" placeholder="English name" value={form.name_en||""} onChange={e=>setForm({...form, name_en:e.target.value})}/>
          <select className="input" value={form.type||"asset"} onChange={e=>setForm({...form, type:e.target.value as any})}>
            <option value="asset">أصول</option>
            <option value="liability">خصوم</option>
            <option value="equity">حقوق ملكية</option>
            <option value="revenue">إيرادات</option>
            <option value="expense">مصروفات</option>
          </select>
          <button className="btn" onClick={save}>{form.id ? "تعديل" : "إضافة"}</button>
        </div>
      </div>

      <div className="card overflow-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="th">Code</th><th className="th">الاسم</th><th className="th">Name</th><th className="th">النوع</th><th className="th text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map(a=>(
              <tr key={a.id}>
                <td className="td">{a.code}</td>
                <td className="td">{a.name_ar}</td>
                <td className="td">{a.name_en}</td>
                <td className="td">{a.type}</td>
                <td className="td">
                  <div className="flex gap-2 justify-center">
                    <button className="btn" onClick={()=>setForm(a)}>تعديل</button>
                    <button className="btn" onClick={()=>remove(a)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length===0 && <tr><td className="td text-center opacity-60" colSpan={5}>لا يوجد حسابات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
