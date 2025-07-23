"use client";

import React from "react";
import { NQDataDemo } from "../components/nq-data-demo";

export default function NQDemoPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            NQ Futures Data Demo
          </h1>
          <p className="text-gray-300 text-lg">
            This demo shows how to fetch real NQ (Nasdaq-100 futures) data from
            free APIs. The data is fetched from Yahoo Finance API with fallback
            to mock data if the API fails.
          </p>
        </div>

        <NQDataDemo />

        <div className="mt-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-4">How to Use</h2>
          <div className="text-gray-300 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                1. Yahoo Finance API (Free)
              </h3>
              <p className="text-sm">
                The demo uses Yahoo Finance API which provides real NQ futures
                data with a 15-minute delay. No API key required, but has rate
                limits.
              </p>
              <code className="block mt-2 p-2 bg-gray-700 rounded text-xs">
                https://query1.finance.yahoo.com/v8/finance/chart/NQ=F?interval=1h&range=1d
              </code>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                2. Alternative Free APIs
              </h3>
              <ul className="text-sm space-y-1 ml-4">
                <li>
                  • <strong>Alpha Vantage:</strong> 500 free calls/day, requires
                  API key
                </li>
                <li>
                  • <strong>Polygon.io:</strong> 5 calls/minute, requires API
                  key
                </li>
                <li>
                  • <strong>Finnhub:</strong> 60 calls/minute, requires API key
                </li>
                <li>
                  • <strong>IEX Cloud:</strong> 500K calls/month, requires API
                  key
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                3. Implementation
              </h3>
              <p className="text-sm">
                The MarketDataService handles API calls, error handling, and
                data formatting. It automatically falls back to mock data if the
                API fails.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
