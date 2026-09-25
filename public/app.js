const state = {
  user: null,
  session: localStorage.getItem("lostify-session"),
  page: "browse",
  reports: [],
  mine: [],
  adminReports: [],
  authMode: "login",
  query: "",
  category: "all",
  claimId: null,
  photoUrl: "",
};
const categories = [
  "all",
  "Bags",
  "Keys",
  "Clothing",
  "Documents",
  "Electronics",
  "Other",
];
const app = document.querySelector("#app");
const esc = value =>
  String(value ?? "").replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char]
  );
const date = value =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
async function api(url, options = {}) {
  const response = await fetch((window.API_BASE || "") + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.session ? { Authorization: `Bearer ${state.session}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function button(text, action, cls = "primary") {
  return `<button class="${cls}" data-action="${action}">${text}</button>`;
}
function shell(content, current = "browse") {
  const admin = state.user?.role === "admin";
  return `<div class="app"><aside class="sidebar"><div class="brand"><span class="mark">L</span>lostify</div><div class="sidebar-label">User dashboard</div><nav class="nav"><button class="${current === "browse" ? "active" : ""}" data-page="browse">Browse board</button><button class="${current === "report" ? "active" : ""}" data-page="report">Report an item</button><button class="${current === "activity" ? "active" : ""}" data-page="activity">My reports</button>${admin ? `<button class="${current === "admin" ? "active" : ""}" data-page="admin">Admin dashboard</button>` : ""}</nav><div class="sidebar-bottom"><div><strong>${esc(state.user.name || state.user.email)}</strong><small>${admin ? "Administrator" : "Community member"}</small></div><button class="link-button" data-action="logout">Sign out</button></div></aside><main class="main"><div class="topbar"><span>User dashboard / <strong>${current === "admin" ? "Admin dashboard" : current === "report" ? "Report an item" : current === "activity" ? "My reports" : "Browse board"}</strong></span><span>● Signed in</span></div>${content}</main></div>`;
}
function authView(message = "") {
  return `<div class="auth-page"><section class="auth-card"><div class="brand"><span class="mark">L</span>lostify</div><p class="eyebrow">Community lost and found</p><h1>${state.authMode === "login" ? "Welcome back." : "Create your account."}</h1><p>${state.authMode === "login" ? "Sign in to browse reports, submit items, and request claims." : "Join the community board to report and recover items."}</p><div class="tabs"><button class="${state.authMode === "login" ? "active" : ""}" data-auth-mode="login">Sign in</button><button class="${state.authMode === "register" ? "active" : ""}" data-auth-mode="register">Register</button></div><form class="form" data-form="auth">${state.authMode === "register" ? '<label class="field"><span>Your name</span><input name="name" required></label>' : ""}<label class="field"><span>Email</span><input name="email" type="email" required></label><label class="field"><span>Password</span><input name="password" type="password" minlength="8" required></label>${message ? `<p class="error">${esc(message)}</p>` : ""}<button class="primary">${state.authMode === "login" ? "Sign in" : "Create account"}</button></form></section></div>`;
}
function browseView() {
  return `<section class="page"><div class="page-head"><div><p class="eyebrow">Community board</p><h1>Browse reports</h1><p>Find something familiar, or scan what has recently turned up nearby.</p></div>${button("+ New report", "page-report")}</div><div class="toolbar"><input data-search placeholder="Search item, place, or detail" value="${esc(state.query)}"><select data-category>${categories.map(x => `<option value="${x}" ${state.category === x ? "selected" : ""}>${x === "all" ? "All categories" : x}</option>`).join("")}</select><span>${state.reports.length} reports</span></div><div class="board-title"><strong>Recent reports</strong><span>Updated just now</span></div><div class="cards">${state.reports.length ? state.reports.map(reportCard).join("") : "<p>No approved reports yet.</p>"}</div></section>`;
}
function reportCard(item) {
  const claiming = state.claimId === item.id;
  const available =
    item.type === "found" &&
    item.status === "approved" &&
    !item.claimRequestStatus;
  return `<article class="card"><div class="card-image">${item.photoUrl ? `<img src="${esc(item.photoUrl)}" alt="">` : "No photo"}<span class="tag ${item.type === "found" ? "found" : ""}">${item.type === "found" ? "Found" : "Lost"}</span></div><div class="card-body"><div class="meta"><span>${esc(item.category)}</span><span>${date(item.dateOccurred)}</span></div><h3>${esc(item.title)}</h3><div class="details"><div><span>Big detail</span><p><b>Model:</b> ${esc(item.model)}<br><b>Color:</b> ${esc(item.color)}<br><b>Size:</b> ${esc(item.size)}</p></div><div class="private"><span>Small detail</span><p><em>Admin only</em></p></div></div>${available && !claiming ? button("Request this item", `claim-start:${item.id}`) : ""}${claiming ? `<div class="claim-box"><span class="private-label">Claim request</span><textarea data-claim-message placeholder="Explain details that help an admin verify this claim"></textarea><div class="actions">${button("Submit request", `claim-submit:${item.id}`)}<button class="link-button" data-action="claim-cancel">Cancel</button></div></div>` : ""}${item.claimRequestStatus === "pending" ? '<p class="claim-status">Claim request pending admin review.</p>' : ""}${item.claimRequestStatus === "rejected" ? '<p class="claim-status">Previous claim request was not approved.</p>' : ""}<div class="location">■ ${esc(item.location)}</div></div></article>`;
}
function reportView(message = "") {
  return `<section class="page"><div class="page-head"><div><p class="eyebrow">Community board</p><h1>Report an item</h1><p>Reports are reviewed before they appear publicly.</p></div></div><form class="report-form form" data-form="report"><div class="grid"><label class="field"><span>Type</span><select name="type"><option value="lost">I lost something</option><option value="found">I found something</option></select></label><label class="field"><span>Item name</span><input name="title" required placeholder="e.g. navy wool scarf"></label><label class="field"><span>Model</span><input name="model" required></label><label class="field"><span>Color</span><input name="color" required></label><label class="field"><span>Size</span><input name="size" required></label><label class="field"><span>Category</span><select name="category">${categories
    .slice(1)
    .map(x => `<option>${x}</option>`)
    .join(
      ""
    )}</select></label><label class="field"><span>Where</span><input name="location" required></label><label class="field"><span>When</span><input type="date" name="dateOccurred" required></label><label class="field wide"><span>Public description</span><textarea name="description" rows="4" required></textarea></label><label class="field wide"><span>Contact email</span><input name="contactEmail" type="email" required value="${esc(state.user.email)}"></label><label class="field wide"><span>Photo</span><input type="file" name="photo" accept="image/*"></label></div>${message ? `<p class="error">${esc(message)}</p>` : ""}<div class="form-actions"><button class="primary">Submit for review</button><small>Up to 5 reports per 24 hours.</small></div></form></section>`;
}
function activityView() {
  return `<section class="page"><div class="page-head"><div><p class="eyebrow">Private workspace</p><h1>My reports</h1><p>Track submitted reports and claim-request decisions.</p></div>${button("+ New report", "page-report")}</div><div class="activity">${state.mine.length ? state.mine.map(x => `<div class="activity-row"><div><strong>${esc(x.title)}</strong><small>${x.type === "lost" ? "Lost" : "Found"} · ${esc(x.location)} · ${date(x.createdAt)}</small></div><span class="status">${x.claimRequestStatus ? `Claim ${x.claimRequestStatus}` : x.status}</span></div>`).join("") : "<p>No reports yet.</p>"}</div></section>`;
}
function adminView() {
  return `<section class="admin-page"><div class="admin-head"><div><p class="eyebrow">Admin dashboard</p><h1>Review queue.</h1><p>Approve reports, review claim requests, and record private handoffs.</p></div><span>${esc(state.user.email)}</span></div><div class="stats"><div class="stat"><span>All reports</span><strong>${state.adminReports.length}</strong></div><div class="stat"><span>Needs review</span><strong>${state.adminReports.filter(x => x.status === "pending").length}</strong></div><div class="stat"><span>Claim requests</span><strong>${state.adminReports.filter(x => x.claimRequestStatus === "pending").length}</strong></div><div class="stat"><span>Reunited</span><strong>${state.adminReports.filter(x => x.status === "claimed").length}</strong></div></div><div class="queue"><div class="admin-row head"><span>Report</span><span>Big details</span><span>Private fields</span><span>Actions</span></div>${state.adminReports.map(adminRow).join("")}</div></section>`;
}
function adminRow(x) {
  return `<div class="admin-row"><div><b>${esc(x.title)}</b><small>${x.type === "lost" ? "Lost" : "Found"} · ${esc(x.location)} · ${date(x.createdAt)}</small></div><div><b>Model</b> ${esc(x.model)}<br><b>Color</b> ${esc(x.color)}<br><b>Size</b> ${esc(x.size)}</div><div class="admin-private"><input data-private-returned value="${esc(x.returnedTo || "")}" placeholder="Returned to"><textarea data-private-small rows="2" placeholder="Admin-only notes">${esc(x.smallDetails || "")}</textarea><button data-action="save-private:${x.id}">Save private fields</button></div><div class="admin-actions"><span class="status">${x.status}</span>${x.claimRequestStatus === "pending" ? `<div class="request"><strong>Claim request</strong><small>${esc(x.claimMessage)}</small><button data-action="claim-decision:${x.id}:approved">Approve claim</button><button class="muted" data-action="claim-decision:${x.id}:rejected">Reject claim</button></div>` : ""}${x.status === "pending" ? '<button data-action="status:' + x.id + ':approved">Publish report</button>' : ""}${x.status === "approved" && !x.claimRequestStatus ? "<small>Awaiting claim request</small>" : ""}${x.status !== "claimed" && x.status !== "rejected" ? '<button class="muted" data-action="status:' + x.id + ':rejected">Reject report</button>' : ""}</div></div>`;
}
async function load() {
  if (!state.user) return render();
  if (state.page === "admin")
    state.adminReports = await api("/api/admin/reports");
  else if (state.page === "activity")
    state.mine = await api("/api/reports/mine");
  else if (state.page === "browse")
    state.reports = await api(
      `/api/reports?q=${encodeURIComponent(state.query)}&category=${encodeURIComponent(state.category)}`
    );
  render();
}
function render() {
  if (!state.user) {
    app.innerHTML = authView();
    return;
  }
  app.innerHTML = shell(
    state.page === "browse"
      ? browseView()
      : state.page === "report"
        ? reportView()
        : state.page === "activity"
          ? activityView()
          : adminView(),
    state.page
  );
}
async function login(form) {
  const body = Object.fromEntries(new FormData(form));
  try {
    const data = await api(
      state.authMode === "login" ? "/api/auth/login" : "/api/auth/register",
      { method: "POST", body: JSON.stringify(body) }
    );
    state.user = data.user;
    state.session = data.session;
    localStorage.setItem("lostify-session", state.session);
    await load();
  } catch (error) {
    app.innerHTML = authView(error.message);
  }
}
async function submitReport(form) {
  const body = Object.fromEntries(new FormData(form));
  const file = form.photo.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024)
      return renderReportError("Photo must be under 5 MB.");
    body.photoUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
  try {
    await api("/api/reports", { method: "POST", body: JSON.stringify(body) });
    state.page = "activity";
    await load();
  } catch (error) {
    renderReportError(error.message);
  }
}
function renderReportError(message) {
  app.innerHTML = shell(reportView(message), "report");
}
app.addEventListener("click", async event => {
  const page = event.target.closest("[data-page]")?.dataset.page;
  if (page) {
    state.page = page;
    state.claimId = null;
    await load();
    return;
  }
  const authMode = event.target.closest("[data-auth-mode]")?.dataset.authMode;
  if (authMode) {
    state.authMode = authMode;
    render();
    return;
  }
  const form = event.target.closest("[data-form]");
  if (form) {
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
      return;
    event.preventDefault();
    if (form.dataset.form === "auth") return login(form);
    if (form.dataset.form === "report") return submitReport(form);
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  try {
    if (action === "logout") {
      await api("/api/auth/logout", { method: "POST" });
      state.user = null;
      state.session = null;
      localStorage.removeItem("lostify-session");
      render();
    } else if (action === "page-report") {
      state.page = "report";
      render();
    } else if (action.startsWith("claim-start:")) {
      state.claimId = Number(action.split(":")[1]);
      render();
    } else if (action === "claim-cancel") {
      state.claimId = null;
      render();
    } else if (action.startsWith("claim-submit:")) {
      const id = action.split(":")[1];
      const message = event.target
        .closest(".card")
        .querySelector("[data-claim-message]").value;
      await api(`/api/reports/${id}/claim`, {
        method: "POST",
        body: JSON.stringify({ claimMessage: message }),
      });
      state.claimId = null;
      await load();
    } else if (action.startsWith("status:")) {
      const [, id, status] = action.split(":");
      await api(`/api/admin/reports/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } else if (action.startsWith("claim-decision:")) {
      const [, id, decision] = action.split(":");
      await api(`/api/admin/reports/${id}/claim-decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await load();
    } else if (action.startsWith("save-private:")) {
      const id = action.split(":")[1];
      const row = event.target.closest(".admin-row");
      await api(`/api/admin/reports/${id}/private`, {
        method: "PATCH",
        body: JSON.stringify({
          returnedTo: row.querySelector("[data-private-returned]").value,
          smallDetails: row.querySelector("[data-private-small]").value,
        }),
      });
      await load();
    }
  } catch (error) {
    alert(error.message);
  }
});
app.addEventListener("change", async event => {
  if (event.target.matches("[data-category]")) {
    state.category = event.target.value;
    await load();
  }
});
app.addEventListener("input", event => {
  if (event.target.matches("[data-search]")) {
    state.query = event.target.value;
    clearTimeout(window.searchTimer);
    window.searchTimer = setTimeout(load, 300);
  }
});
(async () => {
  try {
    if (state.session) {
      const data = await api("/api/session");
      state.user = data.user;
    }
    await load();
  } catch (error) {
    app.innerHTML = authView(error.message);
  }
})();
