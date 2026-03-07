const API_BASE = "http://localhost:3000";

const form = document.getElementById("book-form");
const bookList = document.getElementById("book-list");
console.log("reached")
document.addEventListener("DOMContentLoaded", () => {
  loadBooks();
});

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


//search book functions
async function searchGoogleBooks(query) {
  const res = await fetch(
    `http://localhost:3000/books/search?q=${encodeURIComponent(query)}`
  );
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

  const res = await fetch("http://localhost:3000/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Add failed");
  return data; // newly inserted row
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
    const res = await fetch(`${API_BASE}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  try {
    const res = await fetch(`${API_BASE}/books`);
    const books = await res.json();
    renderBooks(books);
  } catch (err) {
    console.error(err);
    alert("Could not load books. Is the backend running?");
  }
}


function renderBooks(books) {
  bookList.innerHTML = "";

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "book-card";

    const img = document.createElement("img");
    img.className = "book-cover";

    const placeholder = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/1280px-Placeholder_view_vector.svg.png";
    img.src = book.cover || placeholder;

    img.onerror = () => {
      img.src = placeholder;
    };

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

    const isFinished = book.status === "finished";
    finishBtn.textContent = isFinished ? "Mark To-Read" : "Mark Finished";

    finishBtn.addEventListener("click", async () => {
      const newStatus = isFinished ? "to-read" : "finished";

      await fetch(`http://localhost:3000/books/${book.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      await fetchAndRenderBooks(); // refresh UI
    });


    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteBook(book.id));

    actions.appendChild(delBtn);

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(author);
    card.appendChild(actions);

    bookList.appendChild(card);
  });
}

async function fetchAndRenderBooks() {
  const res = await fetch("http://localhost:3000/books");
  const books = await res.json();
  renderBooks(books);
}


async function deleteBook(id) {
  if (!confirm("Delete this book?")) return;

  try {
    const res = await fetch(`${API_BASE}/books/${id}`, { method: "DELETE" });
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
      await fetch("http://localhost:3000/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

