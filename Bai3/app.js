const API_URL = "https://api.escuelajs.co/api/v1/products?offset=0&limit=200";
const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='176' height='128' viewBox='0 0 176 128'><rect width='176' height='128' fill='%23f3f4f6'/><rect x='32' y='28' width='112' height='72' rx='10' fill='%23e5e7eb'/><path d='M56 86l18-20 16 18 12-14 22 26H56z' fill='%2394a3b8'/><circle cx='76' cy='54' r='8' fill='%23cbd5f5'/></svg>";

const state = {
  products: [],
  searchTerm: "",
  sortBy: "",
  sortDir: "asc",
  currentPage: 1,
  pageSize: 10,
};

const tableBody = document.getElementById("tableBody");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search");
const pageSizeSelect = document.getElementById("pageSize");
const paginationEl = document.getElementById("pagination");
const resultInfo = document.getElementById("resultInfo");
const totalCountEl = document.getElementById("totalCount");

function setStatus(message) {
  statusEl.textContent = message;
}

function fetchProducts() {
  setStatus("Đang tải dữ liệu...");
  return fetch(API_URL)
    .then((res) => {
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      return res.json();
    })
    .then((data) => {
      state.products = Array.isArray(data) ? data : [];
      if (!state.products.length) {
        setStatus("API trả về 0 sản phẩm.");
      } else {
        setStatus("");
      }
      render();
    })
    .catch((err) => {
      console.error(err);
      setStatus("Có lỗi khi tải dữ liệu. Vui lòng thử lại.");
    });
}

function getFiltered() {
  const term = state.searchTerm.trim().toLowerCase();
  let items = state.products;
  if (term) {
    items = items.filter((p) => String(p.title || "").toLowerCase().includes(term));
  }

  if (state.sortBy) {
    const dir = state.sortDir === "asc" ? 1 : -1;
    items = [...items].sort((a, b) => {
      if (state.sortBy === "price") {
        return (Number(a.price) - Number(b.price)) * dir;
      }
      const at = String(a.title || "").toLowerCase();
      const bt = String(b.title || "").toLowerCase();
      if (at < bt) return -1 * dir;
      if (at > bt) return 1 * dir;
      return 0;
    });
  }

  return items;
}

function paginate(items) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  const start = (state.currentPage - 1) * state.pageSize;
  const pageItems = items.slice(start, start + state.pageSize);
  return { pageItems, total, totalPages };
}

function normalizeImageUrl(url) {
  if (!url) return "";
  const trimmed = String(url).trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice(7)}`;
  }
  return trimmed;
}

function renderTable(items) {
  tableBody.innerHTML = "";
  if (!items.length) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-center text-muted py-4">Không có kết quả</td></tr>';
    return;
  }

  const rows = items
    .map((p) => {
      const img = normalizeImageUrl(
        Array.isArray(p.images) && p.images.length ? p.images[0] : ""
      );
      const catImg = normalizeImageUrl(p.category?.image || "");
      return `
        <tr>
          <td>${p.id ?? ""}</td>
          <td>
            ${
              img || catImg
                ? `<img class="product-img" src="${img || catImg}" data-fallback="${catImg}" alt="${p.title ?? "product"}" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" />`
                : `<div class="image-fallback">No image</div>`
            }
          </td>
          <td class="title-cell">
            ${p.title ?? ""}
            <div class="desc-pop">${p.description ?? ""}</div>
          </td>
          <td>$${p.price ?? ""}</td>
          <td>${p.category?.name ?? ""}</td>
        </tr>
      `;
    })
    .join("");

  tableBody.innerHTML = rows;

  tableBody.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      const fallback = img.getAttribute("data-fallback");
      if (fallback && img.src !== fallback) {
        img.src = fallback;
      } else {
        img.src = PLACEHOLDER_IMG;
      }
    });
  });
}

function renderPagination(totalPages) {
  paginationEl.innerHTML = "";

  const createPageItem = (label, page, disabled = false, active = false) => {
    const li = document.createElement("li");
    li.className = `page-item${disabled ? " disabled" : ""}${active ? " active" : ""}`;
    const btn = document.createElement("button");
    btn.className = "page-link";
    btn.textContent = label;
    btn.disabled = disabled;
    btn.addEventListener("click", () => {
      state.currentPage = page;
      render();
    });
    li.appendChild(btn);
    return li;
  };

  paginationEl.appendChild(
    createPageItem("Prev", Math.max(1, state.currentPage - 1), state.currentPage === 1)
  );

  const maxPagesToShow = 7;
  let start = Math.max(1, state.currentPage - 3);
  let end = Math.min(totalPages, start + maxPagesToShow - 1);
  if (end - start + 1 < maxPagesToShow) {
    start = Math.max(1, end - maxPagesToShow + 1);
  }

  for (let i = start; i <= end; i += 1) {
    paginationEl.appendChild(createPageItem(String(i), i, false, i === state.currentPage));
  }

  paginationEl.appendChild(
    createPageItem(
      "Next",
      Math.min(totalPages, state.currentPage + 1),
      state.currentPage === totalPages
    )
  );
}

function renderSortButtons() {
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    const key = btn.getAttribute("data-sort");
    const isActive = state.sortBy === key;
    btn.classList.toggle("active", isActive);
    const arrow = isActive ? (state.sortDir === "asc" ? "▲" : "▼") : "";
    btn.textContent = `Sort ${arrow}`.trim();
  });
}

function render() {
  const filtered = getFiltered();
  const { pageItems, total, totalPages } = paginate(filtered);
  renderTable(pageItems);
  renderPagination(totalPages);
  renderSortButtons();

  const start = total === 0 ? 0 : (state.currentPage - 1) * state.pageSize + 1;
  const end = Math.min(state.currentPage * state.pageSize, total);
  resultInfo.textContent = `Hiển thị ${start}-${end} trên ${total} sản phẩm`;
  if (totalCountEl) {
    totalCountEl.textContent = String(state.products.length);
  }
}

searchInput.addEventListener("input", (e) => {
  state.searchTerm = e.target.value;
  state.currentPage = 1;
  render();
});

pageSizeSelect.addEventListener("change", (e) => {
  state.pageSize = Number(e.target.value);
  state.currentPage = 1;
  render();
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".sort-btn");
  if (!btn) return;
  const key = btn.getAttribute("data-sort");
  if (state.sortBy === key) {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  } else {
    state.sortBy = key;
    state.sortDir = "asc";
  }
  render();
});

fetchProducts();
