import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaEnvelope, FaPhone } from "react-icons/fa";
import { FaWhatsapp } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";
import { ArrowLeftRight } from "lucide-react";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-column">
          <h4>Contact us</h4>
          <p className="footer-contact-row">
            <FaEnvelope className="footer-contact-icon" aria-hidden="true" />
            <a href="mailto:giftoo.storee@gmail.com">giftoo.storee@gmail.com</a>
          </p>
          <p className="footer-contact-row">
            <FaPhone className="footer-contact-icon" aria-hidden="true" />
            <a href="tel:+201039661326">+201039661326</a>
          </p>
          <p className="footer-contact-row">
            <FaWhatsapp className="footer-contact-icon" aria-hidden="true" />
            <a href="https://wa.me/201039661326" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              WhatsApp
            </a>
          </p>
        </div>
        <div className="footer-column">
          <h4>Payment Methods</h4>
          <p>💵 COD</p>
          <p className="footer-contact-row">
            <ArrowLeftRight className="footer-contact-icon" aria-hidden="true" />
            InstaPay
          </p>
          <p className="footer-payment-note">
            DMs/WhatsApp only (not available at website)
          </p>
        </div>
        <div className="footer-column">
          <h4>Follow us</h4>
          <div className="social-links">
            <a href="https://www.facebook.com/profile.php?id=61590815960981" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebookF aria-hidden="true" />
            </a>
            <a href="https://instagram.com/giftoo.storee" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram aria-hidden="true" />
            </a>
            <a href="https://tiktok.com/@giftoo.storee" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <FaTiktok aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 GIFTO. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
