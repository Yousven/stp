/**
 * Arve trükivaade.
 *
 * Iseseisev HTML ilma väliste failideta, et see avaneks ka telefonis
 * brauseris ja et sealt saaks "Prindi → Salvesta PDF-ina". Eraldi
 * PDF-teeki ei kasutata: see tähendaks serverisse peiteta brauserit
 * (sadu megabaite) ainult ühe lehe joonistamiseks.
 *
 * Kõik väärtused tulevad arve hetktõmmisest, mitte praegustest
 * seadistustest — juba esitatud arve peab jääma muutumatuks.
 */

export interface InvoicePartySnapshot {
  name: string;
  registryCode?: string | null;
  vatNumber?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  iban?: string | null;
}

export interface InvoiceHtmlData {
  number: string;
  issueDate: string;
  dueDate: string;
  periodFrom: string;
  periodTo: string;
  status: string;
  seller: InvoicePartySnapshot;
  client: InvoicePartySnapshot;
  lines: { description: string; hours: number; rate: number; amount: number }[];
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  note?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function eur(n: number): string {
  return `${n.toFixed(2)} €`;
}

function party(p: InvoicePartySnapshot): string {
  const rows = [
    p.address,
    p.registryCode ? `Reg nr ${p.registryCode}` : null,
    p.vatNumber ? `KMKR ${p.vatNumber}` : null,
    p.email,
    p.phone,
  ].filter((v): v is string => Boolean(v));

  return `<div class="party-name">${escapeHtml(p.name)}</div>${rows
    .map((r) => `<div>${escapeHtml(r)}</div>`)
    .join("")}`;
}

export function renderInvoiceHtml(data: InvoiceHtmlData): string {
  const lines = data.lines
    .map(
      (line) => `<tr>
      <td>${escapeHtml(line.description)}</td>
      <td class="num">${line.hours.toFixed(2)}</td>
      <td class="num">${eur(line.rate)}</td>
      <td class="num">${eur(line.amount)}</td>
    </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="et">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arve ${escapeHtml(data.number)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, system-ui, "Segoe UI", sans-serif; color: #1a1a1a;
         background: #fff; margin: 0; padding: 24px; font-size: 14px; line-height: 1.5; }
  .sheet { max-width: 760px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap;
           border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .meta { text-align: right; }
  .meta div { white-space: nowrap; }
  .parties { display: flex; gap: 32px; flex-wrap: wrap; margin: 24px 0; }
  .parties > div { flex: 1 1 220px; }
  .label { text-transform: uppercase; font-size: 11px; letter-spacing: .08em; color: #666;
           margin-bottom: 6px; }
  .party-name { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
       color: #666; border-bottom: 1px solid #ccc; padding: 8px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #eee; }
  .num { text-align: right; white-space: nowrap; }
  tfoot td { border: none; padding: 4px 6px; }
  tfoot .total td { font-weight: 700; font-size: 16px; border-top: 2px solid #1a1a1a;
                    padding-top: 10px; }
  .note { margin-top: 24px; padding: 12px; background: #f6f6f6; border-radius: 6px; }
  .void { color: #b00; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div>
      <h1>Arve ${escapeHtml(data.number)}</h1>
      ${data.status === "void" ? '<div class="void">Tühistatud</div>' : ""}
    </div>
    <div class="meta">
      <div><strong>Kuupäev:</strong> ${escapeHtml(data.issueDate)}</div>
      <div><strong>Maksetähtaeg:</strong> ${escapeHtml(data.dueDate)}</div>
      <div><strong>Periood:</strong> ${escapeHtml(data.periodFrom)} – ${escapeHtml(data.periodTo)}</div>
    </div>
  </header>

  <div class="parties">
    <div>
      <div class="label">Müüja</div>
      ${party(data.seller)}
      ${data.seller.iban ? `<div>IBAN ${escapeHtml(data.seller.iban)}</div>` : ""}
    </div>
    <div>
      <div class="label">Ostja</div>
      ${party(data.client)}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Kirjeldus</th><th class="num">Tunnid</th><th class="num">Hind</th><th class="num">Summa</th></tr>
    </thead>
    <tbody>${lines}</tbody>
    <tfoot>
      <tr><td colspan="3" class="num">Summa ilma käibemaksuta</td><td class="num">${eur(data.subtotal)}</td></tr>
      <tr><td colspan="3" class="num">Käibemaks ${data.vatRate.toFixed(0)}%</td><td class="num">${eur(data.vatAmount)}</td></tr>
      <tr class="total"><td colspan="3" class="num">Tasumisele kuulub</td><td class="num">${eur(data.total)}</td></tr>
    </tfoot>
  </table>

  ${data.note ? `<div class="note">${escapeHtml(data.note)}</div>` : ""}
</div>
</body>
</html>`;
}
