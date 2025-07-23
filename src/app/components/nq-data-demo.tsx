"use client";

import React, { useState, useEffect } from "react";
import { MarketDataService, MarketDataUtils } from "../services/market-data";

interface NQDataDemoProps {
  className?: string;
}

export const NQDataDemo: React.FC<NQDataDemoProps> = ({ className = "" }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("1h");
  const [stats, setStats] = useState<any>(null);

  const timeframes = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "1d", label: "1 Day" },
  ];

  const fetchData = async (selectedTimeframe: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await MarketDataService.getNQDataByTimeframe(
        selectedTimeframe
      );

      if (response.error) {
        setError(response.error);
        setData([]);
        setStats(null);
      } else {
        setData(response.data);
        const calculatedStats = MarketDataUtils.calculateStats(response.data);
        setStats(calculatedStats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(timeframe);
  }, [timeframe]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  return (
    <div className={`p-6 bg-gray-900 text-white ${className}`}>
      <h2 className="text-2xl font-bold mb-4">NQ Futures Data Demo</h2>

      {/* Timeframe Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Timeframe:</label>
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => handleTimeframeChange(tf.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeframe === tf.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mb-4 p-4 bg-blue-900 rounded">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Loading NQ data...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-900 rounded">
          <div className="flex items-center">
            <span className="text-red-200">⚠️ Error: {error}</span>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Current Price</div>
            <div className="text-xl font-bold">
              ${stats.currentPrice?.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Change</div>
            <div
              className={`text-xl font-bold ${
                stats.change >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {stats.change >= 0 ? "+" : ""}
              {stats.change?.toFixed(2)} ({stats.changePercent?.toFixed(2)}%)
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">High</div>
            <div className="text-xl font-bold text-green-400">
              ${stats.high?.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Low</div>
            <div className="text-xl font-bold text-red-400">
              ${stats.low?.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">Time</th>
                <th className="text-right p-2">Open</th>
                <th className="text-right p-2">High</th>
                <th className="text-right p-2">Low</th>
                <th className="text-right p-2">Close</th>
                <th className="text-right p-2">Volume</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(-10).map((point, index) => (
                <tr key={index} className="border-b border-gray-800">
                  <td className="p-2 text-gray-400">
                    {new Date(point.time).toLocaleString()}
                  </td>
                  <td className="p-2 text-right">${point.open?.toFixed(2)}</td>
                  <td className="p-2 text-right text-green-400">
                    ${point.high?.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-red-400">
                    ${point.low?.toFixed(2)}
                  </td>
                  <td className="p-2 text-right">${point.close?.toFixed(2)}</td>
                  <td className="p-2 text-right text-gray-400">
                    {point.volume?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* API Info */}
      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Free NQ Data Sources</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>
            • <strong>Yahoo Finance:</strong> Real-time with 15-min delay for
            futures
          </li>
          <li>
            • <strong>Alpha Vantage:</strong> 500 free API calls per day
          </li>
          <li>
            • <strong>Polygon.io:</strong> 5 API calls per minute (free tier)
          </li>
          <li>
            • <strong>Finnhub:</strong> 60 API calls per minute (free tier)
          </li>
          <li>
            • <strong>IEX Cloud:</strong> 500,000 API calls per month (free
            tier)
          </li>
        </ul>
      </div>
    </div>
  );
};
