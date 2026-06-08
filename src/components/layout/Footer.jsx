import React from "react";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-column">
          <h4>Contact</h4>
          <p>
            📧 <a href="mailto:giftoo.storee@gmail.com">giftoo.storee@gmail.com</a>
          </p>
          <p>
            📱 <a href="tel:+201039661326">+201039661326</a>
          </p>
        </div>
        <div className="footer-column">
          <h4>Payment Methods</h4>
          <p>💵 COD</p>
        </div>
        <div className="footer-column">
          <h4>Social Media</h4>
          <p>
            <a href="https://www.facebook.com/profile.php?id=61590815960981" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              Facebook
            </a>
          </p>
          <p>
            <a href="https://instagram.com/giftoo.storee" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              Instagram
            </a>
          </p>
          <p>
            <a href="https://tiktok.com/@giftoo.storee" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              TikTok
            </a>
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 GIFTO. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
