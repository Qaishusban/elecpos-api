"use client";

export type Column = {
  key: string;
  ar: string;
  en: string;
  align?: "left" | "center" | "right";
};

type Props = {
  data: any[];
  columns?: Column[];
  lang: "ar" | "en";
};

export default function ReportTable({ data, columns, lang }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        {lang === "ar" ? "لا بيانات" : "No data"}
      </div>
    );
  }

  // 👈 نحدد النوع صراحةً، ونحوّل الفرع الافتراضي إلى Column[]
  const cols: Column[] =
    columns ??
    (Object.keys(data[0]).map((k) => ({ key: k, ar: k, en: k })) as Column[]);

  const alignClass = (a?: Column["align"]) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className="overflow-auto surface">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                className={`p-2 ${alignClass(c.align)}`}
              >
                {lang === "ar" ? c.ar : c.en}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-t">
              {cols.map((c) => (
                <td key={c.key} className={`p-2 ${alignClass(c.align)}`}>
                  {formatCell(r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v: any) {
  if (typeof v === "number")
    return v.toLocaleString(undefined, { maximumFractionDigits: 3 });
  if (v == null) return "-";
  return String(v);
}
