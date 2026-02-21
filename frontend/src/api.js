const API_BASE = "http://localhost:3000";
const TOKEN_KEY = "booklist_token";
const REFRESH_KEY = "booklist_refresh_token";

// Auth API
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (token) => localStorage.setItem(REFRESH_KEY, token);

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


// Books API
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

// Friends API
export async function getFriends() {
  const res = await apiFetch("/friends");
  if (!res.ok) throw new Error("Failed to fetch friends");
  return res.json();
}

export async function getFriendRequests() {
  const res = await apiFetch("/friends/requests");
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

export async function getSentRequests() {
  const res = await apiFetch("/friends/sent");
  if (!res.ok) throw new Error("Failed to fetch sent requests");
  return res.json();
}

export async function searchUsers(query) {
  const res = await apiFetch(`/friends/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function sendFriendRequest(friendId) {
  const res = await apiFetch("/friends/request", {
    method: "POST",
    body: JSON.stringify({ friendId }),
  });
  return res.json();
}

export async function acceptFriendRequest(requestId) {
  const res = await apiFetch(`/friends/${requestId}/accept`, {
    method: "PATCH",
  });
  return res.json();
}

export async function rejectFriendRequest(requestId) {
  const res = await apiFetch(`/friends/${requestId}/reject`, {
    method: "PATCH",
  });
  return res.json();
}

export async function removeFriend(friendId) {
  const res = await apiFetch(`/friends/${friendId}`, {
    method: "DELETE",
  });
  return res.json();
}

// Recommendations API
export async function getInbox() {
  const res = await apiFetch("/recommendations/inbox");
  if (!res.ok) throw new Error("Failed to fetch inbox");
  return res.json();
}

export async function getSentRecommendations() {
  const res = await apiFetch("/recommendations/sent");
  if (!res.ok) throw new Error("Failed to fetch sent recommendations");
  return res.json();
}

export async function sendRecommendation(receiverId, title, author, cover, message) {
  const res = await apiFetch("/recommendations", {
    method: "POST",
    body: JSON.stringify({ receiverId, title, author, cover, message }),
  });
  return res.json();
}

export async function acceptRecommendation(recId) {
  const res = await apiFetch(`/recommendations/${recId}/accept`, {
    method: "PATCH",
  });
  return res.json();
}

export async function dismissRecommendation(recId) {
  const res = await apiFetch(`/recommendations/${recId}/dismiss`, {
    method: "PATCH",
  });
  return res.json();
}