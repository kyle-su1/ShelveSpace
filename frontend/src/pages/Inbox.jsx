import { useState, useEffect } from "react";
import {
  getInbox,
  getSentRecommendations,
  acceptRecommendation,
  dismissRecommendation,
} from "../api";

function Inbox() {
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [tab, setTab] = useState("inbox"); // "inbox" or "sent"
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [inboxData, sentData] = await Promise.all([
        getInbox(),
        getSentRecommendations(),
      ]);
      setInbox(inboxData);
      setSent(sentData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAccept = async (recId) => {
    setMessage("");
    try {
      const data = await acceptRecommendation(recId);
      if (data.alreadyExists) {
        setMessage("Book already in your list!");
      } else {
        setMessage("Book added to your list!");
      }
      loadData();
    } catch (err) {
      setMessage("Failed to accept recommendation");
    }
  };

  const handleDismiss = async (recId) => {
    setMessage("");
    try {
      await dismissRecommendation(recId);
      setMessage("Recommendation dismissed");
      loadData();
    } catch (err) {
      setMessage("Failed to dismiss recommendation");
    }
  };

  const placeholder =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/1280px-Placeholder_view_vector.svg.png";

  return (
    <div className="inbox-page">
      <h1>Recommendations</h1>

      <div className="tabs">
        <button
          className={tab === "inbox" ? "active" : ""}
          onClick={() => setTab("inbox")}
        >
          Inbox ({inbox.length})
        </button>
        <button
          className={tab === "sent" ? "active" : ""}
          onClick={() => setTab("sent")}
        >
          Sent ({sent.length})
        </button>
      </div>

      {message && <p className="message">{message}</p>}

      {tab === "inbox" && (
        <div className="recommendations-list">
          {inbox.length === 0 ? (
            <p className="empty-message">No recommendations yet!</p>
          ) : (
            inbox.map((rec) => (
              <div key={rec.id} className="rec-card">
                <img
                  src={rec.cover || placeholder}
                  alt={rec.title}
                  onError={(e) => (e.target.src = placeholder)}
                />
                <div className="rec-info">
                  <strong>{rec.title}</strong>
                  <p className="rec-author">{rec.author}</p>
                  <p className="rec-from">From: {rec.sender_username}</p>
                  {rec.message && <p className="rec-message">"{rec.message}"</p>}
                </div>
                <div className="rec-actions">
                  <button className="accept-btn" onClick={() => handleAccept(rec.id)}>
                    Add to List
                  </button>
                  <button className="dismiss-btn" onClick={() => handleDismiss(rec.id)}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "sent" && (
        <div className="recommendations-list">
          {sent.length === 0 ? (
            <p className="empty-message">You haven't sent any recommendations yet.</p>
          ) : (
            sent.map((rec) => (
              <div key={rec.id} className="rec-card">
                <img
                  src={rec.cover || placeholder}
                  alt={rec.title}
                  onError={(e) => (e.target.src = placeholder)}
                />
                <div className="rec-info">
                  <strong>{rec.title}</strong>
                  <p className="rec-author">{rec.author}</p>
                  <p className="rec-to">To: {rec.receiver_username}</p>
                  {rec.message && <p className="rec-message">"{rec.message}"</p>}
                  <span className={`rec-status ${rec.status}`}>{rec.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Inbox;