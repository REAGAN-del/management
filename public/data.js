const KEY = "ltc-data-v1";

function seed() {
  return {
    seq: 100,
    programs: [
      { id: 1, name: "Web Development", fee: 150000 },
      { id: 2, name: "Graphic Design", fee: 80000 },
      { id: 3, name: "Networking Basics", fee: 100000 },
    ],
    trainees: [
      { id: 1, name: "Nkemelu Ngwa Brenda", phone: "677 12 34 56" },
      { id: 2, name: "Tabe Ebot Collins", phone: "699 45 67 89" },
      { id: 3, name: "Fomba Aurelie", phone: "650 22 11 90" },
      { id: 4, name: "Mbah Kingsley", phone: "671 33 44 55" },
      { id: 5, name: "Ngu Fonyuy Clarisse", phone: "682 77 88 99" },
      { id: 6, name: "Essomba Patrick", phone: "690 10 20 30" },
    ],
    enrollments: [
      { id: 1, tid: 1, pid: 1 }, { id: 2, tid: 2, pid: 1 }, { id: 3, tid: 3, pid: 2 },
      { id: 4, tid: 4, pid: 2 }, { id: 5, tid: 5, pid: 3 }, { id: 6, tid: 6, pid: 1 },
    ],
    sessions: [
      { id: 1, pid: 1, date: "2026-11-16", title: "HTML and CSS basics" },
      { id: 2, pid: 2, date: "2026-11-17", title: "Colour theory" },
    ],
    attendance: { "1:1": "P", "1:2": "A", "1:6": "P", "2:3": "P", "2:4": "P" },
    payments: [
      { id: 1, eid: 1, amount: 150000, date: "2026-11-16", method: "Cash" },
      { id: 2, eid: 2, amount: 50000, date: "2026-11-16", method: "Mobile money" },
      { id: 3, eid: 3, amount: 40000, date: "2026-11-17", method: "Cash" },
      { id: 4, eid: 5, amount: 100000, date: "2026-11-19", method: "Cash" },
      { id: 5, eid: 6, amount: 30000, date: "2026-11-18", method: "Mobile money" },
    ],
  };
}

function loadDB() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {}
  return seed();
}

function saveDB(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  toast("Saved ✓");
}

const nextId = db => ++db.seq;
const byId = (arr, id) => arr.find(x => x.id == id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const xaf = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " XAF";
const today = () => new Date().toISOString().slice(0, 10);
const paidOf = (db, eid) => db.payments.filter(p => p.eid == eid).reduce((a, p) => a + p.amount, 0);
const feeOf = (db, eid) => byId(db.programs, byId(db.enrollments, eid).pid).fee;
const balOf = (db, eid) => feeOf(db, eid) - paidOf(db, eid);

const INP = "app-input w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const BTN = "app-button rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2";
const BTN_G = "app-button app-button-green rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2";
const BTN_S = "app-button-secondary rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-medium px-3 py-1.5";

function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.className = "fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 text-white text-sm font-semibold px-5 py-2 shadow-lg z-50";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
