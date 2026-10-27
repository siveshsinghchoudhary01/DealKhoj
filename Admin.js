
// 1. SUPABASE CONFIGURATION

const SUPABASE_URL = "https://qkldccdafsrlengtavdd.supabase.co";

const SUPABASE_ANON_KEY ="sb_publishable_nX2ZB5krVFUPXdQ9iUl2GQ_ZnzGEzbJ";

const supabase = window.supabase.createClient(
  SUPABASE_ANON_KEY
);


// 2. DOM ELEMENTS

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");

const productForm = document.getElementById("product-form");
const logoutBtn = document.getElementById("logout-btn");
const productsTbody = document.getElementById("products-tbody");


// 3. HELPER: SHOW LOGIN / DASHBOARD

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
}


// 4. AUTHENTICATION STATE

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    showDashboard();

    // Auth callback ke andar database operation ko
    // alag task mein chalate hain.
    setTimeout(() => {
      fetchProducts();
    }, 0);
  } else {
    showLogin();
    productsTbody.replaceChildren();
  }
});


// 5. ADMIN LOGIN

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginError.textContent = "";
  loginError.classList.add("hidden");

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginError.textContent = "Email aur password enter karein.";
    loginError.classList.remove("hidden");
    return;
  }

  const submitBtn = loginForm.querySelector(
    'button[type="submit"]'
  );

  if (submitBtn) submitBtn.disabled = true;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    loginForm.reset();
  } catch (error) {
    loginError.textContent = error.message || "Login failed.";
    loginError.classList.remove("hidden");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});


// 6. ADMIN LOGOUT

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;

  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    showLogin();
  } catch (error) {
    alert("Logout error: " + error.message);
  } finally {
    logoutBtn.disabled = false;
  }
});


// 7. ADD NEW PRODUCT

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = productForm.querySelector(
    'button[type="submit"]'
  );

  if (submitBtn) submitBtn.disabled = true;

  const priceValue = document
    .getElementById("prod-price")
    .value.trim();

  const originalPriceValue = document
    .getElementById("prod-orig-price")
    .value.trim();

  const productData = {
    name: document.getElementById("prod-name").value.trim(),

    description: document.getElementById("prod-desc").value.trim(),

    category: document.getElementById("prod-category").value.trim(),

    price: Number(priceValue),

    original_price: originalPriceValue
      ? Number(originalPriceValue)
      : null,

    image_url: document.getElementById("prod-img").value.trim(),

    affiliate_url: document.getElementById("prod-aff-url").value.trim(),

    badge:
      document.getElementById("prod-badge").value.trim() || null,

    is_published: document.getElementById("prod-published").checked,
  };

  // Basic validation

  if (
    !productData.name ||
    !productData.category ||
    !productData.image_url ||
    !productData.affiliate_url ||
    !Number.isFinite(productData.price) ||
    productData.price <= 0
  ) {
    alert("Please sabhi required fields aur valid price check karein.");

    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  if (
    productData.original_price !== null &&
    (
      !Number.isFinite(productData.original_price) ||
      productData.original_price <= 0
    )
  ) {
    alert("Original price valid enter karein.");

    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  // Allow only HTTP/HTTPS URLs

  try {
    const imageURL = new URL(productData.image_url);
    const affiliateURL = new URL(productData.affiliate_url);

    if (!["http:", "https:"].includes(imageURL.protocol)) {
      throw new Error("Invalid image URL");
    }

    if (!["http:", "https:"].includes(affiliateURL.protocol)) {
      throw new Error("Invalid affiliate URL");
    }
  } catch {
    alert("Image URL aur affiliate link valid HTTP/HTTPS URLs hone chahiye.");

    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  try {
    const { error } = await supabase
      .from("products")
      .insert([productData]);

    if (error) throw error;

    alert("Product successfully added!");

    productForm.reset();

    await fetchProducts();
  } catch (error) {
    console.error("Add product error:", error);

    alert("Product add nahi hua: " + error.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});


// 8. FETCH AND DISPLAY PRODUCTS

async function fetchProducts() {
  productsTbody.replaceChildren();

  const loadingRow = document.createElement("tr");
  const loadingCell = document.createElement("td");

  loadingCell.colSpan = 5;
  loadingCell.textContent = "Loading products...";
  loadingCell.className = "py-4 text-center";

  loadingRow.appendChild(loadingCell);
  productsTbody.appendChild(loadingRow);

  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, price, image_url, is_published, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    productsTbody.replaceChildren();

    if (!data || data.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 5;
      cell.textContent = "Abhi koi product nahi hai.";
      cell.className = "py-4 text-center text-gray-500";

      row.appendChild(cell);
      productsTbody.appendChild(row);

      return;
    }

    data.forEach((item) => {
      const tr = document.createElement("tr");

      tr.className = "border-b hover:bg-gray-50";

      // Product image

      const imageCell = document.createElement("td");
      imageCell.className = "py-3 px-2";

      const img = document.createElement("img");

      img.src = item.image_url || "";
      img.alt = item.name || "Product";
      img.loading = "lazy";
      img.className = "w-12 h-12 object-cover rounded";

      img.addEventListener("error", () => {
        img.style.display = "none";
      });

      imageCell.appendChild(img);

      // Product name

      const nameCell = document.createElement("td");

      nameCell.className =
        "py-3 px-2 font-medium text-gray-900";

      nameCell.textContent = item.name || "Unnamed product";

      // Product price

      const priceCell = document.createElement("td");

      priceCell.className = "py-3 px-2";

      const price = Number(item.price);

      priceCell.textContent = Number.isFinite(price)
        ? "₹" + price.toLocaleString("en-IN")
        : "Price unavailable";

      // Published / Draft status

      const statusCell = document.createElement("td");
      statusCell.className = "py-3 px-2";

      const statusBadge = document.createElement("span");

      statusBadge.className = item.is_published
        ? "text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-semibold"
        : "text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-semibold";

      statusBadge.textContent = item.is_published
        ? "Live"
        : "Draft";

      statusCell.appendChild(statusBadge);

      // Delete button

      const actionCell = document.createElement("td");

      actionCell.className = "py-3 px-2 text-right";

      const deleteBtn = document.createElement("button");

      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";

      deleteBtn.className =
        "bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-medium";

      deleteBtn.addEventListener("click", () => {
        deleteProduct(item.id, deleteBtn);
      });

      actionCell.appendChild(deleteBtn);

      // Add all cells to row

      tr.append(
        imageCell,
        nameCell,
        priceCell,
        statusCell,
        actionCell
      );

      productsTbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Fetch products error:", error);

    productsTbody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.textContent =
      "Products load nahi hue: " + error.message;

    cell.className = "py-4 text-center text-red-600";

    row.appendChild(cell);
    productsTbody.appendChild(row);
  }
}


// 9. DELETE PRODUCT

async function deleteProduct(id, button) {
  const confirmed = confirm(
    "Kya aap sach mein is product ko delete karna chahte hain?"
  );

  if (!confirmed) return;

  button.disabled = true;
  button.textContent = "Deleting...";

  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    alert("Product successfully deleted!");

    await fetchProducts();
  } catch (error) {
    console.error("Delete product error:", error);

    alert("Delete error: " + error.message);

    button.disabled = false;
    button.textContent = "Delete";
  }
}


// 10. MAKE FUNCTION AVAILABLE IF NEEDED

window.deleteProduct = deleteProduct;
