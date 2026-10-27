 // Supabase Client Config - Apne script.js se match karte hue credentials
const SUPABASE_URL = "https://qkldccdafsrlengtavdd.supabase.co";
// Neeche apni Supabase 'anon' public key daalein jo aapke script.js mein use hui hai
const SUPABASE_ANON_KEY = "sb_publishable_nX2ZB5krVFUPXdQ9iUl2GQ_ZnzGEzbJ";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const productForm = document.getElementById("product-form");
const logoutBtn = document.getElementById("logout-btn");
const productsTbody = document.getElementById("products-tbody");

// Check Authentication State
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    fetchProducts();
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
  }
});

// Admin Login Handler
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");

  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value,
  });

  if (error) {
    loginError.textContent = error.message;
    loginError.classList.remove("hidden");
  }
});

// Admin Logout Handler
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

// Add New Product Handler
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const productData = {
    name: document.getElementById("prod-name").value.trim(),
    description: document.getElementById("prod-desc").value.trim(),
    category: document.getElementById("prod-category").value.trim(),
    price: parseFloat(document.getElementById("prod-price").value),
    original_price: parseFloat(document.getElementById("prod-orig-price").value) || null,
    image_url: document.getElementById("prod-img").value.trim(),
    affiliate_url: document.getElementById("prod-aff-url").value.trim(),
    badge: document.getElementById("prod-badge").value.trim() || null,
    is_published: document.getElementById("prod-published").checked,
  };

  const { error } = await supabase.from("products").insert([productData]);

  if (error) {
    alert("Error adding product: " + error.message);
  } else {
    alert("Product added successfully!");
    productForm.reset();
    fetchProducts();
  }
});

// Fetch & Display Existing Products
async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch error:", error.message);
    return;
  }

  productsTbody.innerHTML = "";

  data.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "border-b hover:bg-gray-50";
    tr.innerHTML = 
      <td class="py-3 px-2">
        <img src="${item.image_url}" alt="${item.name}" class="w-12 h-12 object-cover rounded">
      </td>
      <td class="py-3 px-2 font-medium text-gray-900">${item.name}</td>
      <td class="py-3 px-2">₹${item.price}</td>
      <td class="py-3 px-2">
        <span class="${item.is_published ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'} px-2 py-1 rounded text-xs font-semibold">
          ${item.is_published ? 'Live' : 'Draft'}
        </span>
      </td>
      <td class="py-3 px-2 text-right">
        <button onclick="deleteProduct(${item.id})" class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-medium">Delete</button>
      </td>
    ;
    productsTbody.appendChild(tr);
  });
}
[27-10-2026 11:58] Shivaay choudhary: // Delete Product Handler
window.deleteProduct = async function(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    alert("Delete error: " + error.message);
  } else {
    alert("Product deleted!");
    fetchProducts();
  }
};
