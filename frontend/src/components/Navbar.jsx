import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { useEffect } from "react";

function Navbar() {
  const { user, logout } = useAuth();
  const { friendsDot, inboxDot, clearFriendsDot, clearInboxDot } = useNotification() || {};
  const navigate = useNavigate();
  const location = useLocation();

  // Clear dots when user navigates to the corresponding page
  useEffect(() => {
    if (location.pathname === "/friends" && clearFriendsDot) clearFriendsDot();
    if (location.pathname === "/inbox" && clearInboxDot) clearInboxDot();
  }, [location.pathname, clearFriendsDot, clearInboxDot]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">ShelveSpace</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/" className="nav-link">Books</Link>
            <Link to="/friends" className="nav-link nav-link-indicator">
              Friends
              {friendsDot && <span className="nav-dot" />}
            </Link>
            <Link to="/inbox" className="nav-link nav-link-indicator">
              Inbox
              {inboxDot && <span className="nav-dot" />}
            </Link>
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