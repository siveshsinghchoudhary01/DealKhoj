// Supabase Configuration
const SUPABASE_URL = "https://qkldccdafsrlengtavdd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nX2ZB5krVFUPXdQ9iUl2GQ_ZnzGEzbJ"; // Yahan apni Supabase anon key paste karein

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const productsContainer = document.getElementById("products-container") || document.getElementById("product-grid");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");

let allProducts = [];

// Fetch Products from Supabase
async function loadProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database fetch error:", error.message);
      return;
    }

    allProducts = data || [];
    renderProducts(allProducts);
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

// Render Products Card
function renderProducts(products) {
  if (!productsContainer) return;

  if (products.length === 0) {
    productsContainer.innerHTML = 
      <div class="col-span-full text-center py-12 text-gray-500">
        <p class="text-lg">Koi products nahi mile.</p>
      </div>
    ;
    return;
  }

  productsContainer.innerHTML = products.map((item) => {
    const discount = item.original_price && item.original_price > item.price
      ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
      : null;

    return 
      <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition duration-300 border border-gray-100 overflow-hidden flex flex-col justify-between">
        <div class="relative">
          <img src="${item.image_url}" alt="${item.name}" class="w-full h-48 object-cover">
          ${item.badge ? <span class="absolute top-2 left-2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded">${item.badge}</span> : ''}
          ${discount ? <span class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">${discount}% OFF</span> : ''}
        </div>
        
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <span class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">${item.category || 'Deal'}</span>
            <h3 class="font-bold text-gray-900 text-base mt-1 line-clamp-2">${item.name}</h3>
            ${item.description ? <p class="text-gray-500 text-xs mt-1 line-clamp-2">${item.description}</p> : ''}
          </div>

          <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <span class="text-lg font-extrabold text-gray-900">₹${item.price}</span>
              ${item.original_price ? <span class="text-xs text-gray-400 line-through ml-1">₹${item.original_price}</span> : ''}
            </div>
            <a href="${item.affiliate_url}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition duration-200">
              Buy Now
            </a>
          </div>
        </div>
      </div>
    ;
  }).join("");
}

// Search Filter
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter((product) =>
      product.name.toLowerCase().includes(term) ||
      (product.category && product.category.toLowerCase().includes(term))
    );
    renderProducts(filtered);
  });
}

// Category Filter
if (categoryFilter) {
  categoryFilter.addEventListener("change", (e) => {
    const selected = e.target.value;
    if (!selected || selected === "all") {
      renderProducts(allProducts);
    } else {
      const filtered = allProducts.filter((p) => p.category === selected);
      renderProducts(filtered);
    }
  });
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", loadProducts);
