const API_BASE = "http://localhost:3000";
const TOKEN_KEY = "booklist_token";

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Only set JSON content-type when we actually send a JSON body
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

const form = document.getElementById("book-form");
const bookList = document.getElementById("book-list");
console.log("reached")

//search book button
const manualBtn = document.getElementById("manual-mode");
const searchBtn = document.getElementById("search-mode");
const manualForm = document.getElementById("book-form");
const searchForm = document.getElementById("search-form");

manualBtn.onclick = () => {
  manualForm.hidden = false;
  searchForm.hidden = true;
  manualBtn.classList.add("active");
  searchBtn.classList.remove("active");
};

searchBtn.onclick = () => {
  manualForm.hidden = true;
  searchForm.hidden = false;
  searchBtn.classList.add("active");
  manualBtn.classList.remove("active");
};

document.getElementById("search-btn").onclick = async () => {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;

  try {
    const results = await searchGoogleBooks(q);
    renderSearchResults(results);
  } catch (err) {
    console.error("Search error:", err);
    alert("Search failed: " + err.message);
  }
};


//search book functions (public route, no auth needed)
async function searchGoogleBooks(query) {
  const res = await fetch(`${API_BASE}/books/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Search failed");
  return data;
}


async function addBookFromResult(book) {
  const payload = {
    title: book.title,
    author: (book.authors && book.authors.length > 0) ? book.authors.join(", ") : "Unknown",
    cover: book.cover,
  };

  const res = await apiFetch("/books", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Add failed");
  return data;
}



//form
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const titleInput = document.getElementById("title");
  const authorInput = document.getElementById("author");
  const coverInput = document.getElementById("cover");

  const title = titleInput.value.trim();
  const author = authorInput.value.trim();
  const cover = coverInput.value.trim();
  if (!title || !author) return;

  try {
    const res = await apiFetch("/books", {
      method: "POST",
      body: JSON.stringify({ title, author, cover })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to add book");
      return;
    }

    titleInput.value = "";
    authorInput.value = "";
    coverInput.value = "";

    await loadBooks();
  } catch (err) {
    console.error(err);
    alert("Could not reach backend. Is it running on port 3000?");
  }
});

async function loadBooks() {
  const res = await apiFetch("/books");
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Failed to load books");
  }

  renderBooks(data);
}


function renderBooks(books) {
  bookList.innerHTML = "";

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "book-card";

    const coverWrapper = document.createElement("div");
    coverWrapper.className = "cover-wrapper";

    const img = document.createElement("img");
    img.className = "book-cover";

    const placeholder = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/1280px-Placeholder_view_vector.svg.png";
    img.src = book.cover || placeholder;

    img.onerror = () => {
      img.src = placeholder;
    };

    coverWrapper.appendChild(img);

    if (book.status === "finished"){
      const checkmark = document.createElement("img");
      checkmark.className = "checkmark";
      checkmark.src = "https://upload.wikimedia.org/wikipedia/commons/a/a9/Bradelidu3.png";
      checkmark.alt = "Finished";
      coverWrapper.appendChild(checkmark);
    }

    const title = document.createElement("div");
    title.className = "book-title";
    title.textContent = book.title;

    const author = document.createElement("div");
    author.className = "book-author";
    author.textContent = book.author;

    const actions = document.createElement("div");
    actions.className = "book-actions";

    const finishBtn = document.createElement("button");
    finishBtn.className = "finish-btn";

    const setFinishBtnLabel = (status) => {
      finishBtn.textContent = status === "finished" ? "Mark To-Read" : "Mark Finished";
    };

    setFinishBtnLabel(book.status);

    finishBtn.addEventListener("click", async () => {
      const currentStatus = book.status;
      const newStatus = currentStatus === "finished" ? "to-read" : "finished";

      try {
        const res = await apiFetch(`/books/${book.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to update status");

        // update locally + update label immediately
        book.status = newStatus;
        setFinishBtnLabel(book.status);

        //refresh full list
        await loadBooks();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    });


    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteBook(book.id));

    actions.appendChild(delBtn);
    actions.appendChild(finishBtn);

    card.appendChild(coverWrapper);
    card.appendChild(title);
    card.appendChild(author);
    card.appendChild(actions);

    bookList.appendChild(card);
  });
}

async function fetchAndRenderBooks() {
  const res = await apiFetch("/books");
  const books = await res.json();
  renderBooks(books);
}


async function deleteBook(id) {
  if (!confirm("Delete this book?")) return;

  try {
    const res = await apiFetch(`/books/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to delete");
      return;
    }

    await loadBooks();
  } catch (err) {
    console.error(err);
    alert("Could not reach backend to delete.");
  }
}


//render search results using renderBooks
function renderSearchResults(results) {
  const container = document.getElementById("search-results");
  if (!container) {
    console.error("Search results container not found");
    return;
  }
  container.innerHTML = "";
  
  if (!results || results.length === 0) {
    container.innerHTML = "<p>No results found.</p>";
    return;
  }
  
  results.forEach((b) => {
    const div = document.createElement("div");
    div.className = "search-card";

    const cover =
      b.cover || "https://via.placeholder.com/128x192?text=No+Cover";

    div.innerHTML = `
      <img src="${cover}" />
      <div>
        <strong>${b.title}</strong>
        <p>${b.authors && b.authors.length ? b.authors.join(", ") : "Unknown"}</p>
        <button>Add</button>
      </div>
    `;

    div.querySelector("button").onclick = async () => {
      await apiFetch("/books", {
        method: "POST",
        body: JSON.stringify({
          title: b.title,
          author: (b.authors && b.authors.length) ? b.authors.join(", ") : "Unknown",
          cover: b.cover,
        }),
      });

      fetchAndRenderBooks();
      //clear search
      document.getElementById("search-input").value = "";
      document.getElementById("search-results").innerHTML = ""; 
    };

    container.appendChild(div);
  });
}

//auth forms and UI gating

const authSection = document.getElementById("auth-section");
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const authMessage = document.getElementById("auth-message");

const addBookSection = document.getElementById("add-book");
const bookshelfSection = document.getElementById("bookshelf");

function setAuthMessage(msg, isError = false) {
  authMessage.textContent = msg;
  authMessage.style.color = isError ? "#b00020" : "#0a7a2f";
}

function setLoggedInUI(isLoggedIn) {
  addBookSection.hidden = !isLoggedIn;
  bookshelfSection.hidden = !isLoggedIn;

  signupForm.hidden = isLoggedIn;
  loginForm.hidden = isLoggedIn;
  logoutBtn.hidden = !isLoggedIn;

  if (!isLoggedIn) {
    bookList.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setLoggedInUI(!!getToken());

  if (getToken()) {
    try {
      await loadBooks();
    } catch (e) {
      // token might be invalid/expired
      clearToken();
      setLoggedInUI(false);
      setAuthMessage("Session expired. Please log in again.", true);
    }
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthMessage("");

  const email = document.getElementById("signup-email").value.trim();
  const username = document.getElementById("signup-username").value.trim();
  const password = document.getElementById("signup-password").value;

  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return setAuthMessage(data.error || "Signup failed", true);

  setToken(data.token);
  setLoggedInUI(true);
  setAuthMessage(`Signed in as ${data.user.username}`);
  await loadBooks();
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthMessage("");

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return setAuthMessage(data.error || "Login failed", true);

  setToken(data.token);
  setLoggedInUI(true);
  setAuthMessage(`Signed in as ${data.user.username}`);
  await loadBooks();
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  setLoggedInUI(false);
  setAuthMessage("Logged out.");
});

