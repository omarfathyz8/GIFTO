import React, { useState, useEffect } from "react";
import { Zap } from "lucide-react";

const CountdownBanner = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetDate = new Date("2026-08-15T23:59:59").getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
        setIsExpired(false);
      } else {
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`countdown-banner ${isExpired ? "countdown-expired" : ""}`}>
      <div className="countdown-content">
        <div className="countdown-label">
          <Zap size={18} className="zap-icon" />
          <span className="offer-text">10-25% OFF</span>
        </div>
        <div className="countdown-timer">
          <span className="timer-text">Ends in:</span>
          <div className="time-units">
            {timeLeft.days > 0 && (
              <div className="time-unit">
                <span className="time-value">{String(timeLeft.days).padStart(2, "0")}</span>
                <span className="time-label">d</span>
              </div>
            )}
            <div className="time-unit">
              <span className="time-value">{String(timeLeft.hours).padStart(2, "0")}</span>
              <span className="time-label">h</span>
            </div>
            <div className="time-unit">
              <span className="time-value">{String(timeLeft.minutes).padStart(2, "0")}</span>
              <span className="time-label">m</span>
            </div>
            <div className="time-unit">
              <span className="time-value">{String(timeLeft.seconds).padStart(2, "0")}</span>
              <span className="time-label">s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownBanner;
