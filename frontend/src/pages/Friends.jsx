import { useState, useEffect } from "react";
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "../api";

function Friends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setMessage("");

    try {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      setMessage("Search failed");
    }
  };

  const handleSendRequest = async (userId) => {
    setMessage("");
    try {
      const data = await sendFriendRequest(userId);
      if (data.error) {
        setMessage(data.error);
        return;
      }
      setMessage("Friend request sent!");
      setSearchResults([]);
      setSearchQuery("");
    } catch (err) {
      setMessage("Failed to send request");
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      loadData();
    } catch (err) {
      setMessage("Failed to accept request");
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      loadData();
    } catch (err) {
      setMessage("Failed to reject request");
    }
  };

  const handleRemove = async (friendId) => {
    if (!confirm("Remove this friend?")) return;
    try {
      await removeFriend(friendId);
      loadData();
    } catch (err) {
      setMessage("Failed to remove friend");
    }
  };

  return (
    <div className="friends-page">
      <h1>Friends</h1>

      {/* Search Users */}
      <section className="friends-section">
        <h2>Find Friends</h2>
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch}>Search</button>
        </div>

        {message && <p className="message">{message}</p>}

        <div className="search-results">
          {searchResults.map((user) => (
            <div key={user.id} className="user-card">
              <div>
                <strong>{user.username}</strong>
                <p>{user.email}</p>
              </div>
              <button onClick={() => handleSendRequest(user.id)}>
                Add Friend
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Friend Requests */}
      {requests.length > 0 && (
        <section className="friends-section">
          <h2>Friend Requests</h2>
          <div className="requests-list">
            {requests.map((req) => (
              <div key={req.id} className="user-card">
                <div>
                  <strong>{req.username}</strong>
                  <p>{req.email}</p>
                </div>
                <div className="request-actions">
                  <button className="accept-btn" onClick={() => handleAccept(req.id)}>
                    Accept
                  </button>
                  <button className="reject-btn" onClick={() => handleReject(req.id)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends List */}
      <section className="friends-section">
        <h2>My Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="empty-message">No friends yet. Search and add some!</p>
        ) : (
          <div className="friends-list">
            {friends.map((friend) => (
              <div key={friend.id} className="user-card">
                <div>
                  <strong>{friend.username}</strong>
                  <p>{friend.email}</p>
                </div>
                <button className="remove-btn" onClick={() => handleRemove(friend.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Friends;