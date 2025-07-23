"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  Send,
  Clock,
  TrendingUp,
  Bell,
  RotateCcw,
  Undo,
  Redo,
  Grid3X3,
  HelpCircle,
  Settings,
  Camera,
  BarChart3,
  ChevronDown,
  User,
} from "lucide-react";

interface HeaderProps {
  className?: string;
  selectedTimeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  className = "",
  selectedTimeframe = "1h",
  onTimeframeChange,
}) => {
  const timeframes = [
    { value: "30s", label: "30s" },
    { value: "1m", label: "1m" },
    { value: "5m", label: "5m" },
    { value: "15m", label: "15m" },
    { value: "1h", label: "1h" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "D" },
    { value: "1w", label: "W" },
  ];

  return (
    <header className="w-full bg-primary border-b-4 border-primary px-3 py-1">
      <div className="flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <div className="w-7 h-7 rounded-full bg-blue-600 mr-2 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="relative w-32">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="NQ1!"
              className="w-full h-8 rounded pl-10 pr-3 text-sm text-white placeholder-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="h-6 w-0.25 bg-white mx-2" />

          {/* Timeframe Radio Button Group */}
          <div className="flex items-center ml-4  rounded-lg p-1">
            {timeframes.map((timeframe) => (
              <button
                key={timeframe.value}
                onClick={() => onTimeframeChange?.(timeframe.value)}
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
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {/* Round button Submit */}
          <button className="h-7 bg-white transition-colors text-black rounded-full px-4 text-sm">
            Submit
          </button>
        </div>
      </div>
    </header>
  );
};
