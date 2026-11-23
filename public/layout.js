const NAV = [
  ["index.html", "📊", "Dashboard"],
  ["trainee.html", "👤", "Trainees"],
  ["program.html", "📚", "Programs"],
  ["sessions.html", "📅", "Sessions"],
  ["payments.html", "💰", "Payments"],
];

function mount(active, title, subtitle, html) {
  document.body.className = "bg-slate-100 text-slate-800 min-h-screen";
  document.body.innerHTML = `
  <div class="flex min-h-screen">
    <aside class="app-sidebar hidden md:flex w-60 flex-col bg-slate-900 text-slate-300">
      <div class="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div class="app-brand-mark h-10 w-10 rounded-lg grid place-items-center font-extrabold">LTC</div>
        <div class="leading-tight"><p class="font-semibold text-white">Lead Training</p><p class="text-xs text-slate-400">Center</p></div>
      </div>
      <nav class="flex-1 p-3 space-y-1 text-sm">
        ${NAV.map(n => `<a href="${n[0]}" class="app-nav-link flex items-center gap-2 rounded-lg px-3 py-2 ${n[0] === active ? "is-active font-medium" : ""}" ${n[0] === active ? 'aria-current="page"' : ""}>${n[1]} ${n[2]}</a>`).join("")}
      </nav>
      <div class="p-4 flex items-center justify-between text-xs">
        <span class="text-slate-500">MVP v1.0</span>
        <form method="post" action="/api/logout" class="app-signout-form">
          <button type="submit" class="app-signout-button">Sign out</button>
        </form>
      </div>
    </aside>
    <div class="flex-1 min-w-0">
      <nav class="app-mobile-nav md:hidden" aria-label="Main navigation">
        <div class="app-mobile-bar">
          <a href="index.html" class="app-mobile-brand">
            <span class="app-mobile-brand-mark" aria-hidden="true">LTC</span>
            <span>Lead Training Center</span>
          </a>
          <button id="mobile-menu-toggle" class="app-mobile-menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-navigation-menu">
            <span class="app-menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>
            <span>Menu</span>
          </button>
        </div>
        <div id="mobile-navigation-menu" class="app-mobile-menu" hidden>
          ${NAV.map(n => `<a href="${n[0]}" class="app-mobile-link ${n[0] === active ? "is-active" : ""}" ${n[0] === active ? 'aria-current="page"' : ""}><span aria-hidden="true">${n[1]}</span>${n[2]}</a>`).join("")}
          <form method="post" action="/api/logout" class="app-signout-form">
            <button type="submit" class="app-mobile-link app-mobile-signout"><span aria-hidden="true">↪</span>Sign out</button>
          </form>
        </div>
      </nav>
      <header class="app-header bg-white border-b border-slate-200 px-4 md:px-8 py-4">
        <h1 class="text-xl font-bold">${title}</h1>
        <p class="text-sm text-slate-500">${subtitle}</p>
      </header>
      <main class="app-main p-4 md:p-8 space-y-6">${html}</main>
    </div>
  </div>`;
  const menuToggle = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("mobile-navigation-menu");
  const setMenuOpen = open => {
    menu.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  };
  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
}

function card(title, inner, extra = "") {
  return `<section class="app-card rounded-xl bg-white shadow-sm border border-slate-200">
    <div class="app-card-heading flex items-center justify-between p-5 border-b border-slate-100"><h2 class="font-semibold">${title}</h2>${extra}</div>${inner}</section>`;
}

function tableHTML(heads, bodyId, rows) {
  return `<div class="overflow-x-auto"><table class="app-table w-full text-sm">
    <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>${heads.map(h => `<th class="text-left px-5 py-3">${h}</th>`).join("")}</tr></thead>
    <tbody id="${bodyId}" class="divide-y divide-slate-100">${rows}</tbody></table></div>`;
}

const empty = (cols, msg) => `<tr><td colspan="${cols}" class="px-5 py-8 text-center text-slate-400">${msg}</td></tr>`;
