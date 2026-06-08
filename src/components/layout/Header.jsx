import React from "react";
import { ShoppingCart, Heart, Search } from "lucide-react";
import logoImage from "../../assets/logo.png";
import { getUserDisplayName } from "../../utils";

const Header = ({
  user,
  userProfile,
  cart,
  wishlists,
  searchQuery,
  onSearchChange,
  onSignInClick,
  onProfileClick,
  onWishlistClick,
  onCartClick,
}) => {
  const canUseCart = Boolean(user);

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand">
          <img src={logoImage} alt="GIFTO Logo" className="brand-logo" />
          <div>
            <p className="brand-title">GIFTO</p>
            <p className="brand-subtitle">Make it special ✨</p>
          </div>
        </div>

        <div className="header-actions">
          <label className="search-box">
            <Search size={22} />
            <input
              type="text"
              aria-label="Search gifts"
              placeholder="Search gifts"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>
          {user ? (
            <div className="user-actions">
              <button
                type="button"
                className="profile-button small"
                onClick={onProfileClick}
              >
                {getUserDisplayName(userProfile)}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="secondary-button small"
              onClick={onSignInClick}
            >
              Sign In
            </button>
          )}
          {canUseCart && (
            <button
              type="button"
              className="wishlist-toggle"
              onClick={onWishlistClick}
              aria-label="Open wishlist"
            >
              <Heart size={24} />
              {wishlists.size > 0 && (
                <span className="wishlist-badge">{wishlists.size}</span>
              )}
            </button>
          )}
          {canUseCart && (
            <button
              type="button"
              className="cart-toggle"
              onClick={onCartClick}
            >
              <ShoppingCart size={24} />
              {cart.length > 0 && (
                <span className="cart-badge">{cart.length}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
