import { useState, useEffect } from "react";
import { getFriends, sendRecommendation } from "../api";

function SendRecommendation({ book, onClose, onSent }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const data = await getFriends();
        setFriends(data);
      } catch (err) {
        setError("Failed to load friends");
      }
    };
    loadFriends();
  }, []);

  const handleSend = async () => {
    if (!selectedFriend) {
      setError("Please select a friend");
      return;
    }

    setSending(true);
    setError("");

    try {
      const data = await sendRecommendation(
        Number(selectedFriend),
        book.title,
        book.author,
        book.cover,
        message
      );

      if (data.error) {
        setError(data.error);
        setSending(false);
        return;
      }

      onSent();
      onClose();
    } catch (err) {
      setError("Failed to send recommendation");
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Send Recommendation</h2>

        <div className="modal-book">
          <strong>{book.title}</strong>
          <p>{book.author}</p>
        </div>

        <label>
          Send to:
          <select
            value={selectedFriend}
            onChange={(e) => setSelectedFriend(e.target.value)}
          >
            <option value="">Select a friend</option>
            {friends.map((friend) => (
              <option key={friend.id} value={friend.id}>
                {friend.username}
              </option>
            ))}
          </select>
        </label>

        {friends.length === 0 && (
          <p className="empty-message">Add some friends first!</p>
        )}

        <label>
          Message (optional):
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Why do you recommend this book?"
            rows={3}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending || friends.length === 0}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SendRecommendation;