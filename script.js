"use strict";

/*
 * DealKhoj — standalone frontend prototype
 * Demo data only: prices are illustrative and retailer links are homepages,
 * not product-specific affiliate links. No API or commission tracking is active.
 */
const STORES = {
  Amazon: "https://www.amazon.in/",
  Flipkart: "https://www.flipkart.com/",
  Meesho: "https://www.meesho.com/",
  Myntra: "https://www.myntra.com/"
};

const PRODUCTS = [
  {id:1,name:"Everyday Essential Sneakers",category:"Footwear",price:899,originalPrice:1499,image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",alt:"Red athletic sneaker displayed against a bright background",badge:"Popular pick",description:"A sporty sneaker concept for everyday styling and casual outings.",stores:["Amazon","Flipkart","Myntra"]},
  {id:2,name:"Minimal Everyday Backpack",category:"Fashion",price:799,originalPrice:1199,image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80",alt:"Backpack photographed for an everyday carry collection",badge:"Editor's pick",description:"A versatile backpack style for commuting, study and daily use.",stores:["Amazon","Flipkart","Meesho"]},
  {id:3,name:"Wireless Headphones",category:"Electronics",price:1299,originalPrice:1999,image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",alt:"Over-ear headphones photographed on a light background",badge:"Tech find",description:"A headphone design concept for music, travel and everyday listening.",stores:["Amazon","Flipkart"]},
  {id:4,name:"Classic Everyday Watch",category:"Fashion",price:999,originalPrice:1599,image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80",alt:"Minimal wristwatch photographed on a light surface",badge:"Style pick",description:"A minimal watch concept to complement casual and formal outfits.",stores:["Amazon","Flipkart","Myntra"]},
  {id:5,name:"Modern Table Lamp",category:"Home",price:649,originalPrice:999,image:"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80",alt:"Decorative table lamp in a home interior",badge:"Home edit",description:"A decorative lighting idea for a desk, bedside table or reading corner.",stores:["Amazon","Flipkart","Meesho"]},
  {id:6,name:"Daily Wear Sunglasses",category:"Fashion",price:499,originalPrice:799,image:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=80",alt:"Sunglasses photographed in a fashion product setting",badge:"Style pick",description:"A timeless sunglasses style for casual outfits and outdoor looks.",stores:["Amazon","Myntra"]},
  {id:7,name:"Compact Bluetooth Speaker",category:"Electronics",price:1099,originalPrice:1699,image:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=80",alt:"Portable speaker photographed on a neutral background",badge:"Tech find",description:"A portable speaker concept for listening at home or on the go.",stores:["Amazon","Flipkart"]},
  {id:8,name:"Comfort Casual Shoes",category:"Footwear",price:749,originalPrice:1199,image:"https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=700&q=80",alt:"Casual shoes displayed in a product photograph",badge:"Everyday pick",description:"A casual footwear style concept for everyday outfits.",stores:["Amazon","Flipkart","Myntra"]},
  {id:9,name:"Ceramic Home Vase",category:"Home",price:399,originalPrice:599,image:"https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=700&q=80",alt:"Decorative ceramic vase in a home setting",badge:"Home edit",description:"A decorative vase concept for shelves, tables and living spaces.",stores:["Amazon","Meesho"]},
  {id:10,name:"Everyday Smart Watch",category:"Electronics",price:1499,originalPrice:2299,image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80",alt:"Wristwatch used as a placeholder for a wearable category example",badge:"Tech pick",description:"An illustrative wearable category card. Actual specifications are not supplied.",stores:["Amazon","Flipkart"]},
  {id:11,name:"Casual Tote Bag",category:"Fashion",price:349,originalPrice:549,image:"https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=700&q=80",alt:"Everyday bag photographed for a lifestyle collection",badge:"Style pick",description:"An everyday bag concept for shopping, errands and casual use.",stores:["Amazon","Meesho","Myntra"]},
  {id:12,name:"Minimal Home Decor",category:"Home",price:599,originalPrice:899,image:"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=700&q=80",alt:"Minimal home interior and decorative furnishings",badge:"Home edit",description:"A home styling inspiration card for a clean, minimal space.",stores:["Amazon","Flipkart","Meesho"]}
];

const state = {search:"",category:"all",store:"all",sort:"featured",favoritesOnly:false,favorites:loadFavorites(),showAll:false};
const $ = (selector) => document.querySelector(selector);
const productGrid=$("#productGrid"), emptyState=$("#emptyState"), sortSelect=$("#sortSelect"), searchInput=$("#searchInput"), filterStatus=$("#filterStatus"), filterStatusText=$("#filterStatusText"), productsHeading=$("#productsHeading"), loadMoreButton=$("#loadMore"), productDialog=$("#productDialog"), dialogContent=$("#dialogContent"), toastElement=$("#toast");
let toastTimeout;

function loadFavorites(){try{const value=JSON.parse(localStorage.getItem("dealkhoj-favorites")||"[]");return Array.isArray(value)?value.filter(Number.isInteger):[]}catch{return[]}}
function saveFavorites(){try{localStorage.setItem("dealkhoj-favorites",JSON.stringify(state.favorites))}catch{showToast("Your browser could not save favourites for the next visit.")}}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}
function formatPrice(value){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value)}
function getDemoDiscount(product){if(!product.originalPrice||product.originalPrice<=product.price)return 0;return Math.round(((product.originalPrice-product.price)/product.originalPrice)*100)}
function showToast(message){toastElement.textContent=message;toastElement.classList.add("show");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toastElement.classList.remove("show"),3500)}

function getFilteredProducts(){
  let products=PRODUCTS.filter(product=>{
    const searchText=state.search.toLowerCase();
    const matchesSearch=[product.name,product.category,product.description,...product.stores].some(value=>value.toLowerCase().includes(searchText));
    const matchesCategory=state.category==="all"||product.category===state.category;
    const matchesStore=state.store==="all"||product.stores.includes(state.store);
    const matchesFavorites=!state.favoritesOnly||state.favorites.includes(product.id);
    return matchesSearch&&matchesCategory&&matchesStore&&matchesFavorites;
  });
  if(state.sort==="price-low")products.sort((a,b)=>a.price-b.price);
  else if(state.sort==="price-high")products.sort((a,b)=>b.price-a.price);
  else if(state.sort==="name")products.sort((a,b)=>a.name.localeCompare(b.name));
  return products;
}

function productCardHTML(product){
  const isSaved=state.favorites.includes(product.id),discount=getDemoDiscount(product);
  return `<article class="product-card">
    <div class="product-image-wrap" data-details="${product.id}" tabindex="0" role="button" aria-label="View ${escapeHTML(product.name)} details">
      <span class="product-badge">${escapeHTML(product.badge)}</span>
      <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.alt)}" loading="lazy" decoding="async" data-fallback-image="true">
      <button class="wishlist-button ${isSaved?"is-saved":""}" type="button" data-favorite="${product.id}" aria-label="${isSaved?"Remove from":"Add to"} favourites" aria-pressed="${isSaved}">${isSaved?"♥":"♡"}</button>
    </div>
    <div class="product-content"><div class="product-category">${escapeHTML(product.category)}</div>
      <h3 class="product-name" data-details="${product.id}" tabindex="0">${escapeHTML(product.name)}</h3>
      <div class="product-prices"><span class="current-price">${formatPrice(product.price)}</span><span class="original-price">${formatPrice(product.originalPrice)}</span><span class="discount-label">${discount}% off*</span></div>
      <p class="product-store">Available demo stores: ${escapeHTML(product.stores.join(", "))}</p>
      <div class="product-actions"><button type="button" class="buy-button" data-buy="${product.id}">Compare stores ↗</button><button type="button" class="details-button" data-details="${product.id}" aria-label="More about ${escapeHTML(product.name)}">↗</button></div>
    </div></article>`;
}

function renderProducts(){
  const products=getFilteredProducts(),visibleProducts=state.showAll?products:products.slice(0,8);
  productGrid.innerHTML=visibleProducts.map(productCardHTML).join("");
  emptyState.hidden=products.length!==0;productGrid.hidden=products.length===0;
  loadMoreButton.hidden=products.length<=8||state.showAll;
  filterStatus.hidden=!state.search&&state.category==="all"&&state.store==="all"&&!state.favoritesOnly;
  const activeFilters=[];
  if(state.search)activeFilters.push(`Search: "${state.search}"`);
  if(state.category!=="all")activeFilters.push(state.category);
  if(state.store!=="all")activeFilters.push(state.store);
  if(state.favoritesOnly)activeFilters.push("Favourites");
  filterStatusText.textContent=`${products.length} demo product${products.length===1?"":"s"} · ${activeFilters.join(" · ")}`;
  productsHeading.textContent=state.favoritesOnly?"Your favourites.":state.category!=="all"?`${state.category} finds.`:state.store!=="all"?`${state.store} finds.`:state.search?"Search results.":"Trending finds.";
  $("#wishCount").textContent=String(state.favorites.length);
  $("#wishlistToggle").setAttribute("aria-pressed",String(state.favoritesOnly));
  document.querySelectorAll(".store-chip").forEach(button=>{const selected=button.dataset.store===state.store;button.classList.toggle("active",selected);button.setAttribute("aria-pressed",String(selected))});
  document.querySelectorAll(".category-card").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.category===state.category)));
}

function setStore(store){state.store=store;state.showAll=false;renderProducts()}
function clearFilters(){state.search="";state.category="all";state.store="all";state.favoritesOnly=false;state.showAll=false;searchInput.value="";sortSelect.value="featured";state.sort="featured";renderProducts()}
function toggleFavorite(id){if(state.favorites.includes(id)){state.favorites=state.favorites.filter(favoriteId=>favoriteId!==id);showToast("Removed from favourites.")}else{state.favorites.push(id);showToast("Added to favourites.")}saveFavorites();renderProducts()}

function openProductDetails(id){
  const product=PRODUCTS.find(item=>item.id===id);if(!product)return;
  const discount=getDemoDiscount(product);
  dialogContent.innerHTML=`<div class="dialog-layout">
    <img class="dialog-image" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.alt)}" data-fallback-image="true">
    <div class="dialog-copy"><div class="product-category">${escapeHTML(product.category)} · DEMO</div>
      <h2 id="dialogTitle">${escapeHTML(product.name)}</h2>
      <div class="product-prices"><span class="current-price">${formatPrice(product.price)}</span><span class="original-price">${formatPrice(product.originalPrice)}</span><span class="discount-label">${discount}% off*</span></div>
      <p>${escapeHTML(product.description)}</p>
      <p class="dialog-warning">Illustrative demo price only. This is not a verified live offer. Retailer homepage links below are not affiliate links.</p>
      <h3>Choose a retailer</h3><div class="dialog-stores">${product.stores.map(store=>`<a class="dialog-store-link" href="${STORES[store]}" target="_blank" rel="noopener noreferrer"><span>Open ${escapeHTML(store)}</span><span>↗</span></a>`).join("")}</div>
    </div></div>`;
  productDialog.showModal();
}
function openRetailerForProduct(id){if(!PRODUCTS.some(item=>item.id===id))return;openProductDetails(id);showToast("Demo mode: choose a retailer in the details window. No affiliate tracking is active.")}

function handleProductGridClick(event){
  const favoriteButton=event.target.closest("[data-favorite]");
  if(favoriteButton){event.stopPropagation();toggleFavorite(Number(favoriteButton.dataset.favorite));return}
  const buyButton=event.target.closest("[data-buy]");
  if(buyButton){openRetailerForProduct(Number(buyButton.dataset.buy));return}
  const detailTarget=event.target.closest("[data-details]");
  if(detailTarget)openProductDetails(Number(detailTarget.dataset.details));
}
function handleProductGridKeyboard(event){if(event.key!=="Enter"&&event.key!==" ")return;if(!event.target.matches("[data-details]"))return;event.preventDefault();openProductDetails(Number(event.target.dataset.details))}

$("#searchForm").addEventListener("submit",event=>{event.preventDefault();state.search=searchInput.value.trim();state.showAll=false;renderProducts();$("#deals").scrollIntoView({behavior:"smooth"})});
searchInput.addEventListener("input",()=>{state.search=searchInput.value.trim();state.showAll=false;renderProducts()});
sortSelect.addEventListener("change",()=>{state.sort=sortSelect.value;renderProducts()});
document.querySelectorAll(".store-chip").forEach(button=>button.addEventListener("click",()=>{setStore(button.dataset.store);$("#deals").scrollIntoView({behavior:"smooth"})}));
document.querySelectorAll(".category-card").forEach(button=>button.addEventListener("click",()=>{state.category=state.category===button.dataset.category?"all":button.dataset.category;state.showAll=false;renderProducts();$("#deals").scrollIntoView({behavior:"smooth"})}));
$("#wishlistToggle").addEventListener("click",()=>{state.favoritesOnly=!state.favoritesOnly;state.showAll=false;renderProducts();$("#deals").scrollIntoView({behavior:"smooth"});if(state.favoritesOnly)showToast("Showing your saved favourites.")});
$("#clearFilters").addEventListener("click",clearFilters);$("#resetSearch").addEventListener("click",clearFilters);
loadMoreButton.addEventListener("click",()=>{state.showAll=true;renderProducts()});
productGrid.addEventListener("click",handleProductGridClick);productGrid.addEventListener("keydown",handleProductGridKeyboard);
$("#dialogClose").addEventListener("click",()=>productDialog.close());
productDialog.addEventListener("click",event=>{if(event.target===productDialog)productDialog.close()});
$("#menuToggle").addEventListener("click",()=>{const nav=$("#mobileNav"),isExpanded=$("#menuToggle").getAttribute("aria-expanded")==="true";$("#menuToggle").setAttribute("aria-expanded",String(!isExpanded));nav.hidden=isExpanded});
$("#mobileNav").querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{$("#mobileNav").hidden=true;$("#menuToggle").setAttribute("aria-expanded","false")}));
document.addEventListener("error",event=>{const image=event.target;if(!(image instanceof HTMLImageElement)||image.dataset.fallbackImage!=="true"||image.dataset.fallbackTried==="true")return;image.dataset.fallbackTried="true";image.src="https://placehold.co/600x660/F0F2E9/31382A?text=DealKhoj"},true);
$("#currentYear").textContent=String(new Date().getFullYear());
renderProducts();
