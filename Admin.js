// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = "https://qikdcdufevlongtawdd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nX2ZB5krVFUPXdQ9iUl2GQ_ZnzGEzbJ";

// Initialize Supabase Client safely
const supabaseClient = window.supabase.createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim());

// 2. DOM ELEMENTS
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginBtn = document.getElementById("login-btn");

const logoutBtn = document.getElementById("logout-btn");
const productForm = document.getElementById("product-form");
const productsTbody = document.getElementById("products-tbody");
const refreshBtn = document.getElementById("refresh-btn");

// Form Fields
const productIdInput = document.getElementById("product-id");
const titleInput = document.getElementById("product-title");
const priceInput = document.getElementById("product-price");
const originalPriceInput = document.getElementById("product-original-price");
const categoryInput = document.getElementById("product-category");
const storeInput = document.getElementById("product-store");
const imageInput = document.getElementById("product-image");
const linkInput = document.getElementById("product-link");
const formTitle = document.getElementById("form-title");
const saveBtn = document.getElementById("save-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

// 3. CHECK AUTH SESSION ON LOAD
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (session) {
            showDashboard();
        } else {
            showLogin();
        }
    } catch (err) {
        console.error("Session check error:", err.message);
        showLogin();
    }
}

function showLogin() {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
}

function showDashboard() {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    fetchProducts();
}

// 4. LOGIN HANDLER
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginError.classList.add("hidden");
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (data.session) {
                showDashboard();
            }
        } catch (err) {
            console.error("Login Error:", err);
            loginError.textContent = err.message || "Invalid email or password. Please try again.";
            loginError.classList.remove("hidden");
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = <i class="fas fa-lock"></i> Sign In;
        }
    });
}

// 5. LOGOUT HANDLER
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        showLogin();
    });
}

// 6. FETCH ALL PRODUCTS
async function fetchProducts() {
    productsTbody.innerHTML = <tr><td colspan="4" class="text-center py-6 text-gray-500">Loading deals...</td></tr>;

    try {
        const { data: products, error } = await supabaseClient
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;if (!products || products.length === 0) {
            productsTbody.innerHTML = <tr><td colspan="4" class="text-center py-6 text-gray-500">No deals found. Add your first deal!</td></tr>;
            return;
        }

        productsTbody.innerHTML = "";
        products.forEach((product) => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-gray-50 transition";
            tr.innerHTML = 
                <td class="py-3 px-4 flex items-center gap-3">
                    <img src="${product.image || 'https://via.placeholder.com/40'}" alt="img" class="w-10 h-10 object-cover rounded border">
                    <div>
                        <div class="font-medium text-gray-800 line-clamp-1">${product.title || 'Untitled'}</div>
                        <div class="text-xs text-gray-400">${product.store || ''}</div>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="font-bold text-emerald-600">₹${product.price || 0}</span>
                    ${product.original_price ? <span class="text-xs text-gray-400 line-through ml-1">₹${product.original_price}</span> : ''}
                </td>
                <td class="py-3 px-4">
                    <span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">${product.category || 'General'}</span>
                </td>
                <td class="py-3 px-4 text-right space-x-2">
                    <button onclick='editProduct(${JSON.stringify(product).replace(/'/g, "&apos;")})' class="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteProduct('${product.id}')" class="text-red-600 hover:text-red-800 text-xs font-semibold">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            ;
            productsTbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error fetching products:", err);
        productsTbody.innerHTML = <tr><td colspan="4" class="text-center py-6 text-red-500">Error loading deals: ${err.message}</td></tr>;
    }
}

// 7. ADD OR UPDATE PRODUCT
if (productForm) {
    productForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        const id = productIdInput.value;
        const productData = {
            title: titleInput.value.trim(),
            price: parseFloat(priceInput.value) || 0,
            original_price: originalPriceInput.value ? parseFloat(originalPriceInput.value) : null,
            category: categoryInput.value.trim() || "General",
            store: storeInput.value.trim() || "Online",
            image: imageInput.value.trim(),
            link: linkInput.value.trim()
        };

        try {
            if (id) {
                // Update existing product
                const { error } = await supabaseClient
                    .from("products")
                    .update(productData)
                    .eq("id", id);
                if (error) throw error;
            } else {
                // Insert new product
                const { error } = await supabaseClient
                    .from("products")
                    .insert([productData]);
                if (error) throw error;
            }

            resetForm();
            fetchProducts();
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to save deal: " + err.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Product";
        }
    });
}// 8. EDIT & DELETE HELPERS
window.editProduct = function (product) {
    productIdInput.value = product.id;
    titleInput.value = product.title || "";
    priceInput.value = product.price || "";
    originalPriceInput.value = product.original_price || "";
    categoryInput.value = product.category || "";
    storeInput.value = product.store || "";
    imageInput.value = product.image || "";
    linkInput.value = product.link || "";

    formTitle.textContent = "Edit Deal";
    saveBtn.textContent = "Update Product";
    cancelEditBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteProduct = async function (id) {
    if (!confirm("Are you sure you want to delete this deal?")) return;

    try {
        const { error } = await supabaseClient
            .from("products")
            .delete()
            .eq("id", id);

        if (error) throw error;
        fetchProducts();
    } catch (err) {
        console.error("Delete error:", err);
        alert("Failed to delete: " + err.message);
    }
};

function resetForm() {
    productForm.reset();
    productIdInput.value = "";
    formTitle.textContent = "Add New Deal";
    saveBtn.textContent = "Save Product";
    cancelEditBtn.classList.add("hidden");
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", resetForm);
}

if (refreshBtn) {
    refreshBtn.addEventListener("click", fetchProducts);
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", checkSession);
