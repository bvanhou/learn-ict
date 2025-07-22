"use client";

import React, { useState, useEffect } from "react";
import moment from "moment";

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [currentTime, setCurrentTime] = useState(moment());

  const timeframes = [
    { value: "1D", label: "1D" },
    { value: "5D", label: "5D" },
    { value: "1M", label: "1M" },
    { value: "3M", label: "3M" },
    { value: "6M", label: "6M" },
    { value: "YTD", label: "YTD" },
    { value: "1Y", label: "1Y" },
    { value: "5Y", label: "5Y" },
    { value: "ALL", label: "ALL" },
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="w-full bg-primary border-b-4 border-primary py-1">
      <div className="flex items-center justify-between">
        {/* Left side - Timeframe Radio Button Group */}
        <div className="flex items-center rounded-lg p-1">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe.value}
              onClick={() => setSelectedTimeframe(timeframe.value)}
              className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
                selectedTimeframe === timeframe.value
                  ? "bg-white-600 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              }`}
            >
              {timeframe.label}
            </button>
          ))}
        </div>

        {/* Right side - Time display */}
        <div className="text-sm text-gray-300 mr-4">
          {currentTime.format("HH:mm:ss")} UTC
          {currentTime
            .format("Z")
            .replace(":00", "")
            .replace(/^(\+|-)(0)(\d)/, "$1$3")}
        </div>
      </div>
    </footer>
  );
};
