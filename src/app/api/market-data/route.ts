import { NextRequest, NextResponse } from "next/server";

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const interval = searchParams.get("interval");
    const range = searchParams.get("range");

    if (!symbol || !interval || !range) {
      return NextResponse.json(
        { error: "Missing required parameters: symbol, interval, range" },
        { status: 400 }
      );
    }

    const url = `${YAHOO_FINANCE_BASE}/${symbol}?interval=${interval}&range=${range}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.chart?.error) {
      throw new Error(`Yahoo Finance error: ${data.chart.error.description}`);
    }

    // Transform the data to match our expected format
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const marketData = timestamps.map((time: number, index: number) => ({
      time: time, // Keep as seconds (Yahoo returns seconds, lightweight-charts expects seconds)
      open: quote.open[index] || 0,
      high: quote.high[index] || 0,
      low: quote.low[index] || 0,
      close: quote.close[index] || 0,
      volume: quote.volume[index] || 0,
    }));

    return NextResponse.json({
      data: marketData,
      symbol,
      interval,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        data: [],
        symbol: searchParams.get("symbol") || "",
        interval: searchParams.get("interval") || "",
      },
      { status: 500 }
    );
  }
}
