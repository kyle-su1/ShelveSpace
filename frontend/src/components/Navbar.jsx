import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount, clearNotifications } = useNotification() || {};
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleBellClick = () => {
    if (clearNotifications) clearNotifications();
    navigate("/inbox");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">BookList</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/" className="nav-link">Books</Link>
            <Link to="/friends" className="nav-link">Friends</Link>
            <Link to="/inbox" className="nav-link">Inbox</Link>
            <button
              className="notification-bell"
              onClick={handleBellClick}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            <span className="nav-user">Hi, {user.username}</span>
            <button onClick={handleLogout} className="nav-btn">Log Out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Log In</Link>
            <Link to="/signup" className="nav-link">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;