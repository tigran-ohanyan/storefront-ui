(function () {
  const PRODUCTS = window.PRODUCTS;
  const STORAGE = "nordic-cart";
  const FREE_SHIPPING_FROM = 80;
  const SHIPPING = 6.9;
  const PROMOS = { WELCOME10: 0.1, SPRING15: 0.15 };

  const state = {
    category: "All",
    maxPrice: 200,
    sort: "featured",
    query: "",
    cart: loadCart(),
    promo: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const money = (n) => "$" + n.toFixed(2);
  const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));

  // storage ------------------------------------------------------------
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch (_) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE, JSON.stringify(state.cart)); } catch (_) { /* ignore */ }
  }

  // catalog ------------------------------------------------------------
  function visibleProducts() {
    const q = state.query.trim().toLowerCase();
    let list = PRODUCTS.filter((p) =>
      (state.category === "All" || p.category === state.category) &&
      p.price <= state.maxPrice &&
      (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    );
    const sorters = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    if (sorters[state.sort]) list = [...list].sort(sorters[state.sort]);
    return list;
  }

  function renderCategories() {
    const cats = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
    $("#categories").innerHTML = cats.map((c) =>
      `<button class="chip" role="tab" data-cat="${c}" aria-selected="${c === state.category}">${c}</button>`
    ).join("");
  }

  function productCard(p) {
    return `
      <article class="product" data-id="${p.id}">
        <button class="product-img" style="background:${p.color}" data-view="${p.id}" aria-label="Quick view ${p.name}">
          ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}<span aria-hidden="true">${p.emoji}</span>
        </button>
        <div class="product-body">
          <span class="cat">${p.category}</span>
          <h3>${p.name}</h3>
          <div class="rating"><b>${stars(p.rating)}</b> ${p.rating} · ${p.reviews}</div>
          <div class="product-foot">
            <span class="price">${money(p.price)}</span>
            <button class="btn btn-small" data-add="${p.id}">Add</button>
          </div>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = visibleProducts();
    $("#grid").innerHTML = list.map(productCard).join("");
    $("#empty").hidden = list.length > 0;
    $("#result-count").textContent = `${list.length} ${list.length === 1 ? "product" : "products"}`;
  }

  // cart ---------------------------------------------------------------
  function cartLines() {
    return Object.entries(state.cart).map(([id, qty]) => ({ product: PRODUCTS.find((p) => p.id === Number(id)), qty }))
      .filter((l) => l.product);
  }
  function cartTotals() {
    const lines = cartLines();
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const discount = state.promo ? subtotal * PROMOS[state.promo] : 0;
    const afterDiscount = subtotal - discount;
    const shipping = lines.length === 0 || afterDiscount >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
    return { lines, subtotal, discount, shipping, total: afterDiscount + shipping };
  }

  function addToCart(id, qty = 1) {
    state.cart[id] = (state.cart[id] || 0) + qty;
    saveCart();
    renderCart();
    const btn = $("#cart-open");
    btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
    toast(`${PRODUCTS.find((p) => p.id === id).name} added to cart`);
  }
  function setQty(id, qty) {
    if (qty <= 0) delete state.cart[id]; else state.cart[id] = qty;
    saveCart();
    renderCart();
  }

  function renderCart() {
    const { lines, subtotal, discount, shipping, total } = cartTotals();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    $("#cart-count").hidden = count === 0;
    $("#cart-count").textContent = count;

    if (lines.length === 0) {
      $("#cart-items").innerHTML = `<p class="cart-empty">Your cart is empty.<br>Add something you'd like to live with.</p>`;
    } else {
      $("#cart-items").innerHTML = lines.map(({ product: p, qty }) => `
        <div class="cart-item">
          <div class="cart-thumb" style="background:${p.color}">${p.emoji}</div>
          <div>
            <h3>${p.name}</h3>
            <div class="qty" aria-label="Quantity">
              <button data-qty="${p.id}" data-delta="-1" aria-label="Decrease">−</button><span>${qty}</span><button data-qty="${p.id}" data-delta="1" aria-label="Increase">+</button>
            </div>
          </div>
          <div>
            <div class="line-price">${money(p.price * qty)}</div>
            <button class="remove" data-remove="${p.id}">Remove</button>
          </div>
        </div>`).join("");
    }
    $("#subtotal").textContent = money(subtotal);
    $("#discount-row").hidden = !discount;
    $("#discount").textContent = "−" + money(discount);
    $("#shipping").textContent = shipping ? money(shipping) : (lines.length ? "Free" : money(0));
    $("#total").textContent = money(total);
    $("#checkout-open").disabled = lines.length === 0;
  }

  // quick view ---------------------------------------------------------
  function openProduct(id) {
    const p = PRODUCTS.find((x) => x.id === id);
    let qty = 1;
    $("#modal-body").innerHTML = `
      <div class="modal-img" style="background:${p.color}">${p.emoji}</div>
      <div class="modal-info">
        <span class="cat muted small">${p.category}</span>
        <h2 id="modal-title">${p.name}</h2>
        <div class="rating"><b>${stars(p.rating)}</b> ${p.rating} (${p.reviews} reviews)</div>
        <p class="muted">${p.desc}</p>
        <p class="price">${money(p.price)}</p>
        <div class="modal-actions">
          <div class="qty"><button id="m-dec" aria-label="Decrease">−</button><span id="m-qty">1</span><button id="m-inc" aria-label="Increase">+</button></div>
          <button class="btn" id="m-add">Add to cart</button>
        </div>
      </div>`;
    $("#m-dec").onclick = () => { qty = Math.max(1, qty - 1); $("#m-qty").textContent = qty; };
    $("#m-inc").onclick = () => { qty += 1; $("#m-qty").textContent = qty; };
    $("#m-add").onclick = () => { addToCart(p.id, qty); closeAll(); openCart(); };
    show($("#product-modal"));
  }

  // checkout -----------------------------------------------------------
  function openCheckout() {
    const { lines, discount, shipping, total } = cartTotals();
    $("#order-summary").innerHTML = `
      <ul>${lines.map((l) => `<li><span>${l.qty} × ${l.product.name}</span><span>${money(l.product.price * l.qty)}</span></li>`).join("")}
      ${discount ? `<li><span>Promo ${state.promo}</span><span>−${money(discount)}</span></li>` : ""}
      <li><span>Shipping</span><span>${shipping ? money(shipping) : "Free"}</span></li></ul>
      <div class="sum"><span>Total</span><span>${money(total)}</span></div>`;
    hide($("#cart"));
    show($("#checkout-modal"));
  }

  function handleCheckout(e) {
    e.preventDefault();
    const form = e.target;
    let ok = true;
    form.querySelectorAll("input, select").forEach((f) => {
      const valid = f.checkValidity();
      f.classList.toggle("invalid", !valid);
      if (!valid) ok = false;
    });
    if (!ok) { toast("Please check the highlighted fields"); return; }
    const { total } = cartTotals();
    const orderNo = "NG-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const email = form.email.value;
    state.cart = {}; state.promo = null; saveCart(); renderCart();
    $("#checkout-body").innerHTML = `
      <div class="success">
        <div class="check">✓</div>
        <h2>Thank you!</h2>
        <p class="muted">Order <strong>${orderNo}</strong> for ${money(total)} is confirmed.<br>A receipt would go to ${email} in a real shop.</p>
        <button class="btn" data-close-checkout>Continue shopping</button>
      </div>`;
  }

  // helpers ------------------------------------------------------------
  function show(el) { el.hidden = false; document.body.style.overflow = "hidden"; }
  function hide(el) { el.hidden = true; if (document.querySelectorAll(".modal:not([hidden]), .drawer:not([hidden])").length === 0) document.body.style.overflow = ""; }
  function closeAll() { document.querySelectorAll(".modal, .drawer").forEach(hide); }
  function openCart() { show($("#cart")); }
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // events -------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-cat],[data-add],[data-view],[data-qty],[data-remove],[data-close],[data-close-cart],[data-close-checkout]");
    if (!t) return;
    if (t.dataset.cat) { state.category = t.dataset.cat; renderCategories(); renderGrid(); }
    else if (t.dataset.add) addToCart(Number(t.dataset.add));
    else if (t.dataset.view) openProduct(Number(t.dataset.view));
    else if (t.dataset.qty) setQty(t.dataset.qty, (state.cart[t.dataset.qty] || 0) + Number(t.dataset.delta));
    else if (t.dataset.remove) setQty(t.dataset.remove, 0);
    else if ("close" in t.dataset) hide($("#product-modal"));
    else if ("closeCart" in t.dataset) hide($("#cart"));
    else if ("closeCheckout" in t.dataset) hide($("#checkout-modal"));
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  $("#cart-open").addEventListener("click", openCart);
  $("#checkout-open").addEventListener("click", openCheckout);
  $("#checkout-form").addEventListener("submit", handleCheckout);
  $("#search-form").addEventListener("submit", (e) => e.preventDefault());
  $("#search").addEventListener("input", (e) => { state.query = e.target.value; renderGrid(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
  $("#price").addEventListener("input", (e) => {
    state.maxPrice = Number(e.target.value);
    $("#price-label").textContent = "$" + state.maxPrice;
    renderGrid();
  });
  $("#reset-filters").addEventListener("click", () => {
    Object.assign(state, { category: "All", maxPrice: 200, sort: "featured", query: "" });
    $("#price").value = 200; $("#price-label").textContent = "$200"; $("#sort").value = "featured"; $("#search").value = "";
    renderCategories(); renderGrid();
  });
  $("#promo-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = $("#promo").value.trim().toUpperCase();
    if (PROMOS[code]) { state.promo = code; $("#promo-note").textContent = `${code} applied: ${PROMOS[code] * 100}% off`; }
    else { state.promo = null; $("#promo-note").textContent = code ? "That code doesn't work. Try WELCOME10." : ""; }
    renderCart();
  });

  // init ---------------------------------------------------------------
  $("#year").textContent = new Date().getFullYear();
  renderCategories();
  renderGrid();
  renderCart();
})();
