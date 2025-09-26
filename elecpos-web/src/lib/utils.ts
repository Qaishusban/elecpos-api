import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function fmt(n: number) {
if (n === null || n === undefined || Number.isNaN(n)) return "0";
const isNeg = n < 0;
const abs = Math.abs(n);
const s = Math.round(abs).toLocaleString();
return isNeg ? `(${s})` : s; // سالب بين قوسين
}


export function asDateISO(d?: Date | string) {
const dd = d ? new Date(d) : new Date();
dd.setHours(0,0,0,0);
return dd.toISOString().slice(0,10);
}