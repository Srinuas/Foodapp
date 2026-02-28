/**************
 * LocalStorage Keys
 **************/
const LS_USER = "qb_user";
const LS_CART = "qb_cart";
const LS_ADDRS = "qb_addresses";
const LS_ADDR_SELECTED = "qb_addr_selected";
const LS_CCY = "qb_currency";
const LS_COUPON = "qb_coupon";
const LS_RATES = "qb_fx_rates"; // { ts, base: 'USD', rates: {...} }

/**************
 * Pricing Rules
 **************/
const GST_RATE = 0.05;             // 5% GST on subtotal
const DELIVERY_BASE_USD = 2.5;      // delivery fee if subtotal < threshold
const DELIVERY_FREE_THRESHOLD_USD = 25; // free delivery if subtotal >= this before coupon

// Coupon definitions
const COUPONS = {
  "OFF10": { type: "percent", value: 10 },       // 10% off on subtotal
  "FLAT5": { type: "flat", value: 5 },           // flat $5 off
  "FREESHIP": { type: "freeship" }               // waive delivery fee
};

/**************
 * Currency Handling (Live FX with fallback)
 * Base prices are in USD.
 **************/
let CURRENCY_RATES = { INR: 82, USD: 1, EUR: 0.92, GBP: 0.79 }; // fallback demo rates

function getCurrency(){ return localStorage.getItem(LS_CCY) || "INR"; }
function setCurrency(ccy){ localStorage.setItem(LS_CCY, ccy); }

function makeFormatter(ccy){
  const locale = ccy === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: ccy, maximumFractionDigits: 2 });
}

function rateFor(ccy){
  if (ccy === "USD") return 1;
  return CURRENCY_RATES[ccy] || 1;
}

function convertFromUSD(amountUSD, ccy){ return amountUSD * rateFor(ccy); }

let CURRENT_CCY = getCurrency();
let CURR_FMT = makeFormatter(CURRENT_CCY);

function fmt(amountUSD){ return CURR_FMT.format(convertFromUSD(amountUSD, CURRENT_CCY)); }

function onCurrencyChange(value){
  CURRENT_CCY = value;
  setCurrency(value);
  CURR_FMT = makeFormatter(value);
  renderAllPrices();
  const sel = document.getElementById('currencySelect');
  if (sel) sel.value = CURRENT_CCY;
}

async function loadFXRates(){
  try {
    // use cached rates if fresh (< 12 hours)
    const cached = JSON.parse(localStorage.getItem(LS_RATES) || "null");
    const now = Date.now();
    if (cached && (now - cached.ts) < 12 * 60 * 60 * 1000 && cached.base === "USD") {
      CURRENCY_RATES = { ...CURRENCY_RATES, ...pickNeededRates(cached.rates) };
      return;
    }

    // Free, no-key API (CORS-enabled)
    // Fallback to static on any failure.
    const resp = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!resp.ok) throw new Error("FX fetch failed");
    const data = await resp.json();
    if (!data || !data.rates) throw new Error("Bad FX payload");

    const needed = pickNeededRates(data.rates); // keep only INR, USD, EUR, GBP
    CURRENCY_RATES = { ...CURRENCY_RATES, ...needed };
    localStorage.setItem(LS_RATES, JSON.stringify({ ts: now, base: "USD", rates: needed }));
  } catch (e) {
    // keep fallback CURRENCY_RATES
    console.warn("Using fallback FX rates:", e?.message || e);
  }
}

function pickNeededRates(all){
  return {
    USD: 1,
    INR: all["INR"] || 82,
    EUR: all["EUR"] || 0.92,
    GBP: all["GBP"] || 0.79
  };
}

/**************
 * Food Catalog (prices in USD; images unchanged)
 **************/
const foodData = [
  { id:1, name:"Classic Burger", category:"burger",
    description:"Juicy beef patty with lettuce, tomato, and special sauce",
    price:12.99,
    image:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id:2, name:"Margherita Pizza", category:"pizza",
    description:"Fresh mozzarella, tomatoes, and basil on crispy crust",
    price:18.99,
    image:"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id:3, name:"Sushi Roll", category:"sushi",
    description:"Fresh salmon, avocado, and cucumber roll",
    price:16.99,
    image:"https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id:4, name:"Pad Thai", category:"thai",
    description:"Stir-fried rice noodles with shrimp and peanuts",
    price:14.99,
    image:"https://images.unsplash.com/photo-1551024709-8f23befc6f87?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id:5, name:"Buddha Bowl", category:"healthy",
    description:"Healthy quinoa bowl with fresh vegetables",
    price:13.99,
    image:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id:6, name:"Chocolate Cake", category:"dessert",
    description:"Rich chocolate layer cake with ganache",
    price:8.99,
    image:"https://images.unsplash.com/photo-1565299585323-38d6b0865b47?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id:7, name:"Cheeseburger", category:"burger",
    description:"Classic burger with melted cheddar cheese",
    price:14.99,
    image:"https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  { id:8, name:"Pepperoni Pizza", category:"pizza",
    description:"Classic pepperoni with mozzarella cheese",
    price:19.99,
    image:"https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" }
];

/**************
 * Restaurants (static demo)
 **************/
const restaurantsData = [
  {
    id: "r1",
    name: "Roma Trattoria",
    cuisine: "italian",
    rating: 4.6,
    eta: "30-40 min",
    image: "https://images.unsplash.com/photo-1604908554027-994a8fe9d0e8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=60"
  },
  {
    id: "r2",
    name: "Burger Hub",
    cuisine: "american",
    rating: 4.3,
    eta: "20-30 min",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=60"
  },
  {
    id: "r3",
    name: "Sushi Zen",
    cuisine: "asian",
    rating: 4.7,
    eta: "35-45 min",
    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=60"
  },
  {
    id: "r4",
    name: "Green Bowl",
    cuisine: "healthy",
    rating: 4.4,
    eta: "25-35 min",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=60"
  },
  {
    id: "r5",
    name: "Sweet Treats",
    cuisine: "dessert",
    rating: 4.5,
    eta: "15-25 min",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=60"
  }
];

/**************
 * Utils
 **************/
const $ = (sel) => document.querySelector(sel);
const notify = (msg) => {
  const n = document.createElement('div');
  n.className = 'notification';
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
};

/**************
 * Storage Helpers
 **************/
function getUser(){ try { return JSON.parse(localStorage.getItem(LS_USER)); } catch { return null; } }
function setUser(u){ localStorage.setItem(LS_USER, JSON.stringify(u)); }
function clearUser(){ localStorage.removeItem(LS_USER); }

function getCart(){ try { return JSON.parse(localStorage.getItem(LS_CART)) || []; } catch { return []; } }
function setCart(c){ localStorage.setItem(LS_CART, JSON.stringify(c)); }

function getAddresses(){ try { return JSON.parse(localStorage.getItem(LS_ADDRS)) || []; } catch { return []; } }
function setAddresses(a){ localStorage.setItem(LS_ADDRS, JSON.stringify(a)); }

function getSelectedAddrId(){ return localStorage.getItem(LS_ADDR_SELECTED); }
function setSelectedAddrId(id){ localStorage.setItem(LS_ADDR_SELECTED, id); }

function getCoupon(){ return localStorage.getItem(LS_COUPON) || ""; }
function setCoupon(c){ if (c) localStorage.setItem(LS_COUPON, c); else localStorage.removeItem(LS_COUPON); }

/**************
 * Auth UI
 **************/
function updateAuthUI(){
  const user = getUser();
  const greet = $("#greetUser");
  const loginL = $("#loginLink");
  const logoutL = $("#logoutLink");
  if (user){
    if (greet) greet.textContent = `Hi, ${user.name}`;
    if (loginL) loginL.style.display = 'none';
    if (logoutL) logoutL.style.display = 'inline';
  } else {
    if (greet) greet.textContent = '';
    if (loginL) loginL.style.display = 'inline';
    if (logoutL) logoutL.style.display = 'none';
  }
  const sel = document.getElementById('currencySelect');
  if (sel) sel.value = CURRENT_CCY;
}
function logout(){
  clearUser();
  notify("Logged out.");
  window.location.href = "index.html";
}

/**************
 * Product List (Index/Menu)
 **************/
let cart = getCart();
let currentFilter = 'all';
let searchTerm = '';

function displayFoodItems(){
  const container = $("#foodItems");
  if (!container) return;
  let filtered = [...foodData];
  if (currentFilter !== 'all') filtered = filtered.filter(i => i.category === currentFilter);
  if (searchTerm){
    const s = searchTerm.toLowerCase();
    filtered = filtered.filter(i => i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
  }
  if (!filtered.length){
    container.innerHTML = '<p style="text-align:center;grid-column:1/-1;">No items found</p>';
    return;
  }
  container.innerHTML = filtered.map(item => `
    <div class="food-card">
      <div class="food-image" style="background-image:url('${item.image}')"></div>
      <div class="food-info">
        <h3>${item.name}</h3>
        <div class="food-category">${item.category[0].toUpperCase() + item.category.slice(1)}</div>
        <p>${item.description}</p>
        <div class="price">${fmt(item.price)}</div>
        <button class="order-btn" onclick="addToCart(${item.id})" ${isInCart(item.id) ? 'disabled' : ''}>
          ${isInCart(item.id) ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `).join('');
}
function isInCart(id){ return cart.some(i => i.id === id); }
function filterItems(cat){
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(cat) || (cat==='all' && btn.textContent==='All')){
      btn.classList.add('active');
    }
  });
  displayFoodItems();
}
function searchFood(){ const inp = $("#searchInput"); searchTerm = inp ? inp.value : ''; displayFoodItems(); }

/**************
 * Restaurants Page
 **************/
let restFilter = 'all';
function displayRestaurants(){
  const grid = $("#restaurantsGrid");
  if (!grid) return;
  let items = [...restaurantsData];
  if (restFilter !== 'all') items = items.filter(r => r.cuisine === restFilter);
  grid.innerHTML = items.map(r => `
    <div class="food-card">
      <div class="food-image" style="background-image:url('${r.image}')"></div>
      <div class="food-info">
        <h3>${r.name}</h3>
        <div class="food-category">${r.cuisine[0].toUpperCase() + r.cuisine.slice(1)} • ⭐ ${r.rating} • ${r.eta}</div>
        <p class="muted">Explore the menu and add items from our main Menu page.</p>
        <a class="order-btn" href="menu.html">View Menu</a>
      </div>
    </div>
  `).join('');
}
function filterRestaurants(cat){
  restFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(cat) || (cat==='all' && btn.textContent==='All')){
      btn.classList.add('active');
    }
  });
  displayRestaurants();
}

/**************
 * Cart & Totals (GST/Delivery/Coupon)
 **************/
function addToCart(id){
  const item = foodData.find(f => f.id === id);
  if (!item) return;
  cart.push({ ...item, quantity: 1 });
  setCart(cart);
  updateCartCount();
  updateCartDisplay();
  displayFoodItems();
  notify(`${item.name} added to cart!`);
}
function updateQuantity(id, qty){
  if (qty < 1){ return removeFromCart(id); }
  const it = cart.find(i=>i.id===id);
  if (it){ it.quantity = qty; setCart(cart); }
  updateCartCount(); updateCartDisplay(); displayFoodItems();
}
function removeFromCart(id){
  cart = cart.filter(i=>i.id!==id);
  setCart(cart);
  updateCartCount(); updateCartDisplay(); displayFoodItems();
  notify('Item removed from cart');
}
function cartSubtotalUSD(){ return cart.reduce((s,i)=> s + i.price*i.quantity, 0); }

function computeTotalsUSD(){
  const subtotal = cartSubtotalUSD();

  // delivery before coupon: free if subtotal >= threshold
  let delivery = subtotal >= DELIVERY_FREE_THRESHOLD_USD ? 0 : DELIVERY_BASE_USD;

  // tax on subtotal
  const tax = subtotal * GST_RATE;

  // coupon
  let code = (getCoupon() || "").toUpperCase().trim();
  let discount = 0;
  if (code && COUPONS[code]){
    const c = COUPONS[code];
    if (c.type === "percent"){
      discount = subtotal * (c.value/100);
    } else if (c.type === "flat"){
      discount = Math.min(c.value, subtotal);
    } else if (c.type === "freeship"){
      delivery = 0;
    }
  }

  const total = Math.max(0, subtotal + tax + delivery - discount);
  return { subtotal, tax, delivery, discount, total, code };
}

function updateCartCount(){
  const count = cart.reduce((t,i)=>t+i.quantity,0);
  const el = $("#cartCount");
  if (el) el.textContent = count;
}

function updateCartDisplay(){
  const cartContainer = $("#cartItems");
  if (!cartContainer) return;
  if (!cart.length){
    cartContainer.innerHTML = '<p>Your cart is empty</p>';
  } else {
    cartContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${fmt(item.price)}</p>
        </div>
        <div class="cart-item-controls">
          <button onclick="updateQuantity(${item.id}, ${item.quantity-1})">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${item.id}, ${item.quantity+1})">+</button>
          <button onclick="removeFromCart(${item.id})">🗑️</button>
        </div>
      </div>
    `).join('');
  }
  updateTotalsUI();
}

function updateTotalsUI(){
  const { subtotal, tax, delivery, discount, total, code } = computeTotalsUSD();
  const s = $("#t_subtotal"); if (s) s.textContent = fmt(subtotal);
  const t = $("#t_tax");      if (t) t.textContent = fmt(tax);
  const d = $("#t_delivery"); if (d) d.textContent = fmt(delivery);
  const di= $("#t_discount"); if (di) di.textContent = (discount>0?'- ':'') + fmt(discount);
  const gt= $("#t_total");    if (gt) gt.textContent = fmt(total);

  // coupon UI
  const ci = $("#couponInput");
  const applyBtn = $("#applyCouponBtn");
  const rmBtn = $("#removeCouponBtn");
  if (ci){
    ci.value = code || "";
    if (code){
      if (applyBtn) applyBtn.textContent = "Applied";
      if (rmBtn) rmBtn.style.display = "inline";
    } else {
      if (applyBtn) applyBtn.textContent = "Apply";
      if (rmBtn) rmBtn.style.display = "none";
    }
  }
}

function applyCoupon(){
  const input = $("#couponInput");
  if (!input) return;
  const val = input.value.trim().toUpperCase();
  if (!val){ setCoupon(""); updateTotalsUI(); return; }
  if (!COUPONS[val]){ notify("Invalid coupon"); return; }
  setCoupon(val);
  notify(`Coupon ${val} applied`);
  updateTotalsUI();
}
function removeCoupon(){
  setCoupon("");
  notify("Coupon removed");
  updateTotalsUI();
}

function renderAllPrices(){
  // Re-render everything that shows prices
  displayFoodItems();
  updateCartDisplay();
  updateTotalsUI();
}

/**************
 * Cart Toggle
 **************/
function toggleCart(){ const sb = $("#cartSidebar"); if (sb) sb.classList.toggle('open'); }

/**************
 * Checkout (requires login + address)
 **************/
function checkout(){
  if (!cart.length){ return notify("Your cart is empty!"); }
  const user = getUser();
  const addrId = getSelectedAddrId();
  const hint = $("#checkoutHints");

  if (!user){
    if (hint) hint.innerHTML = 'Please <a href="login.html">login</a> to continue.';
    notify("Please login to continue.");
    window.location.href = "login.html";
    return;
  }
  if (!addrId){
    if (hint) hint.innerHTML = 'Please <a href="address.html">select an address</a> to continue.';
    notify("Please select a delivery address.");
    window.location.href = "address.html";
    return;
  }

  const totalUSD = computeTotalsUSD().total;
  notify(`Order placed! Total: ${fmt(totalUSD)}`);
  cart = []; setCart(cart);
  updateCartCount(); updateCartDisplay(); displayFoodItems();
  toggleCart();
}

/**************
 * Address Page
 **************/
function renderSavedAddresses(){
  const wrap = $("#addrList");
  if (!wrap) return;
  const addrs = getAddresses();
  if (!addrs.length){
    wrap.innerHTML = '<p class="muted">No saved addresses yet. Add one below.</p>';
    return;
  }
  const selectedId = getSelectedAddrId();
  wrap.innerHTML = addrs.map(a => `
    <label class="addr-row">
      <input type="radio" name="addrSel" value="${a.id}" ${a.id===selectedId?'checked':''}/>
      <div>
        <strong>${a.label}</strong> — ${a.fullName} (${a.phone})<br/>
        ${a.line1}${a.line2?`, ${a.line2}`:''}, ${a.city}, ${a.state} - ${a.pincode}
        ${a.lat && a.lon ? `<br/><span class="muted">Location: ${a.lat.toFixed(5)}, ${a.lon.toFixed(5)}</span>` : ''}
      </div>
    </label>
  `).join('');
}
function useSelectedAddress(){
  const sel = document.querySelector('input[name="addrSel"]:checked');
  if (!sel){ return notify("Please select an address."); }
  setSelectedAddrId(sel.value);
  notify("Address selected.");
  window.location.href = "index.html";
}
function handleAddrForm(){
  const form = $("#addrForm");
  if (!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const addr = {
      id: String(Date.now()),
      label: $("#label").value,
      fullName: $("#fullName").value.trim(),
      phone: $("#phone").value.trim(),
      line1: $("#line1").value.trim(),
      line2: $("#line2").value.trim(),
      city: $("#city").value.trim(),
      state: $("#state").value.trim(),
      pincode: $("#pincode").value.trim(),
      lat: form.dataset.lat ? parseFloat(form.dataset.lat) : null,
      lon: form.dataset.lon ? parseFloat(form.dataset.lon) : null
    };
    if (!addr.fullName || !addr.phone || !addr.line1 || !addr.city || !addr.state || !addr.pincode){
      return notify("Please fill all required fields.");
    }
    const addrs = getAddresses();
    addrs.push(addr);
    setAddresses(addrs);
    setSelectedAddrId(addr.id);
    notify("Address saved.");
    renderSavedAddresses();
    form.reset();
    const gh = document.getElementById('geoHint'); if (gh) gh.textContent = "";
    delete form.dataset.lat; delete form.dataset.lon;
  });
}
function useGeo(){
  const hint = $("#geoHint");
  if (!navigator.geolocation){
    if (hint) hint.textContent = "Geolocation not supported on this browser.";
    return;
  }
  if (hint) hint.textContent = "Fetching location…";
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude, longitude} = pos.coords;
    const form = $("#addrForm");
    form.dataset.lat = latitude;
    form.dataset.lon = longitude;
    if (hint) hint.textContent = `Location attached: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (saved with address)`;
  }, err=>{
    if (hint) hint.textContent = "Unable to get location: " + err.message;
  }, {enableHighAccuracy:true, timeout:10000});
}

/**************
 * Login Page
 **************/
function handleLoginForm(){
  const form = $("#loginForm");
  if (!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const user = {
      name: $("#name").value.trim(),
      email: $("#email").value.trim(),
      phone: $("#phone") ? $("#phone").value.trim() : ""
    };
    if (!user.name || !user.email){
      return notify("Please enter name and email.");
    }
    setUser(user);
    notify(`Welcome, ${user.name}!`);
    window.location.href = "index.html";
  });
}

/**************
 * Init
 **************/
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadFXRates(); // get live FX first (fallback to static on failure)
  updateAuthUI();

  // Currency dropdown value
  const sel = document.getElementById('currencySelect');
  if (sel){ sel.value = CURRENT_CCY; }

  // Index/Menu items
  if (document.getElementById('foodItems')){
    displayFoodItems();
    updateCartCount();
    updateCartDisplay();
  }

  // Restaurants page
  if (document.getElementById('restaurantsGrid')){
    displayRestaurants();
    updateCartCount();
    updateCartDisplay();
  }

  // Address page
  if (document.getElementById('addrList')){
    renderSavedAddresses();
    handleAddrForm();
  }

  // Login page
  if (document.getElementById('loginForm')){
    handleLoginForm();
  }

  // If coupon already applied, reflect UI
  updateTotalsUI();
});
