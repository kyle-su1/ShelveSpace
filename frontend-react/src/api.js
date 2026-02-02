const API_BASE = "http://localhost:3000";
const TOKEN_KEY = "booklist_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function signup(email, username, password) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  return res.json();
}

export async function getBooks() {
  const res = await apiFetch("/books");
  if (!res.ok) throw new Error("Failed to fetch books");
  return res.json();
}

export async function addBook(title, author, cover) {
  const res = await apiFetch("/books", {
    method: "POST",
    body: JSON.stringify({ title, author, cover }),
  });
  return res.json();
}

export async function updateBookStatus(id, status) {
  const res = await apiFetch(`/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function deleteBook(id) {
  const res = await apiFetch(`/books/${id}`, { method: "DELETE" });
  return res.json();
}

export async function searchBooks(query) {
  const res = await fetch(`${API_BASE}/books/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}