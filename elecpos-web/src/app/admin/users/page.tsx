'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from "../../../lib/supabase";


type Role = { id:number; code:string; name_ar:string; name_en:string };


export default function UsersAdmin(){
const [roles,setRoles] = useState<Role[]>([]);
const [email,setEmail] = useState('');
const [password,setPassword] = useState('');
const [roleId,setRoleId] = useState<number|undefined>();
const [name,setName] = useState('');
const [msg,setMsg] = useState('');
const sb = supabaseBrowser(); // ✅ هذا أهم سطر

useEffect(()=>{ (async()=>{
const { data } = await sb.from('roles').select('*').order('id');
setRoles(data||[]);
})(); },[]);


async function createUser(){
setMsg('');
// 1) إنشاء مستخدم auth
const { data:authRes, error:authErr } = await sb.auth.signUp({ email, password });
if(authErr) return setMsg(authErr.message);
const user = authRes.user;
if(!user) return setMsg('Auth error');
// 2) إدخاله في profiles وتحديد الدور
const { error:profErr } = await sb.from('profiles').insert({ user_id: user.id, full_name: name, email, role_id: roleId });
if(profErr) return setMsg(profErr.message);
setMsg('User created ✅');
}


return (
<div className="card max-w-2xl">
<h1 className="text-2xl font-bold mb-4">Users</h1>
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
<input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
<input className="input" placeholder="Temp Password" value={password} onChange={e=>setPassword(e.target.value)} />
<select className="input" value={roleId} onChange={e=>setRoleId(Number(e.target.value))}>
<option value="">Role…</option>
{roles.map(r=> <option key={r.id} value={r.id}>{r.code}</option>)}
</select>
</div>
<div className="mt-4 flex gap-2">
<button className="btn" onClick={createUser}>Create</button>
{msg && <span className="text-sm">{msg}</span>}
</div>
</div>
);
}