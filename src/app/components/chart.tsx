"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  IChartApi,
  ISeriesApi,
  Time,
  CrosshairMode,
  MouseEventParams,
} from "lightweight-charts";
import { RectangleDrawingTool } from "../plugins/rectangle";
import { TrendLineDrawingTool } from "../plugins/trendline";
import { FibonacciDrawingTool } from "../plugins/fibonacci";
import { MarketDataService, MarketDataUtils } from "../services/market-data";

interface ChartProps {
  className?: string;
  panelWidth: number;
  selectedTool?: string;
  isDrawingEnabled?: boolean;
  headerTimeframe?: string;
  footerTimeframe?: string;
  crosshairMode?: string;
  disableMouseHandling?: boolean;
}

export const Chart: React.FC<ChartProps> = ({
  className = "",
  panelWidth,
  selectedTool = "pointer",
  isDrawingEnabled = true,
  headerTimeframe = "1h",
  footerTimeframe = "1D",
  crosshairMode = "hidden",
  disableMouseHandling = false,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>(null);
  const rectangleToolRef = useRef<RectangleDrawingTool | null>(null);
  const trendlineToolRef = useRef<TrendLineDrawingTool | null>(null);
  const fibonacciToolRef = useRef<FibonacciDrawingTool | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Function to generate data based on timeframes
  const generateChartData = (
    headerTimeframe: string,
    footerTimeframe: string
  ) => {
    let dataPoints = 2000; // Much larger dataset for extensive scrolling
    let timeInterval = 24 * 60 * 60 * 1000; // Default to 1 day in milliseconds

    // Adjust data points and time interval based on header timeframe
    switch (headerTimeframe) {
      case "30s":
        dataPoints = 3000;
        timeInterval = 30 * 1000; // 30 seconds
        break;
      case "1m":
        dataPoints = 2500;
        timeInterval = 60 * 1000; // 1 minute
        break;
      case "5m":
        dataPoints = 2000;
        timeInterval = 5 * 60 * 1000; // 5 minutes
        break;
      case "15m":
        dataPoints = 1800;
        timeInterval = 15 * 60 * 1000; // 15 minutes
        break;
      case "1h":
        dataPoints = 1500;
        timeInterval = 60 * 60 * 1000; // 1 hour
        break;
      case "4h":
        dataPoints = 1200;
        timeInterval = 4 * 60 * 60 * 1000; // 4 hours
        break;
      case "1d":
        dataPoints = 1000;
        timeInterval = 24 * 60 * 60 * 1000; // 1 day
        break;
      case "1w":
        dataPoints = 800;
        timeInterval = 7 * 24 * 60 * 60 * 1000; // 1 week
        break;
      default:
        dataPoints = 2000;
        timeInterval = 24 * 60 * 60 * 1000; // 1 day
    }

    // Adjust data points based on footer timeframe - now allowing much larger ranges
    switch (footerTimeframe) {
      case "1D":
        dataPoints = Math.min(dataPoints, 1440); // 24 hours * 60 minutes
        break;
      case "5D":
        dataPoints = Math.min(dataPoints, 7200); // 5 days * 24 hours * 60 minutes
        break;
      case "1M":
        dataPoints = Math.min(dataPoints, 43200); // 30 days * 24 hours * 60 minutes
        break;
      case "3M":
        dataPoints = Math.min(dataPoints, 129600); // 90 days * 24 hours * 60 minutes
        break;
      case "6M":
        dataPoints = Math.min(dataPoints, 259200); // 180 days * 24 hours * 60 minutes
        break;
      case "YTD":
        const currentDate = new Date();
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
        const daysSinceStart = Math.floor(
          (currentDate.getTime() - startOfYear.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        dataPoints = Math.min(dataPoints, daysSinceStart * 1440); // Convert days to minutes
        break;
      case "1Y":
        dataPoints = Math.min(dataPoints, 525600); // 365 days * 24 hours * 60 minutes
        break;
      case "5Y":
        dataPoints = Math.min(dataPoints, 2628000); // 5 years * 365 days * 24 hours * 60 minutes
        break;
      case "ALL":
        dataPoints = Math.min(dataPoints, 10000); // Large dataset for extensive scrolling
        break;
    }

    const data = [];
    const now = new Date();

    // Align to proper time boundaries based on timeframe
    // eslint-disable-next-line prefer-const
    let alignedNow = new Date(now);

    // Align to proper boundaries
    if (headerTimeframe === "1h") {
      // Align to the top of the hour
      alignedNow.setMinutes(0, 0, 0);
    } else if (headerTimeframe === "15m") {
      // Align to 15-minute boundaries (0, 15, 30, 45)
      const minutes = alignedNow.getMinutes();
      const alignedMinutes = Math.floor(minutes / 15) * 15;
      alignedNow.setMinutes(alignedMinutes, 0, 0);
    } else if (headerTimeframe === "5m") {
      // Align to 5-minute boundaries
      const minutes = alignedNow.getMinutes();
      const alignedMinutes = Math.floor(minutes / 5) * 5;
      alignedNow.setMinutes(alignedMinutes, 0, 0);
    } else if (headerTimeframe === "1m") {
      // Align to minute boundaries
      alignedNow.setSeconds(0, 0);
    } else if (headerTimeframe === "30s") {
      // Align to 30-second boundaries
      const seconds = alignedNow.getSeconds();
      const alignedSeconds = Math.floor(seconds / 30) * 30;
      alignedNow.setSeconds(alignedSeconds, 0);
    }

    // Calculate the total time span we need to cover
    const totalTimeSpan = (dataPoints - 1) * timeInterval;
    const startTime = alignedNow.getTime() - totalTimeSpan;

    for (let i = 0; i < dataPoints; i++) {
      // Calculate timestamp ensuring proper spacing
      const timestamp = startTime + i * timeInterval;
      const date = new Date(timestamp);

      const basePrice = 100 + Math.sin(i * 0.1) * 20;
      const volatility = 5;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;

      // Use different time formats based on timeframe
      let timeValue: Time;
      if (headerTimeframe === "1d" || headerTimeframe === "1w") {
        // For daily and weekly data, use YYYY-MM-DD format
        timeValue = date.toISOString().split("T")[0] as Time;
      } else {
        // For intraday data, use Unix timestamp
        timeValue = Math.floor(timestamp / 1000) as Time;
      }

      data.push({
        time: timeValue,
        open: Math.max(0, open),
        high: Math.max(0, high),
        low: Math.max(0, low),
        close: Math.max(0, close),
      });
    }

    return data;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "#171b26" },
        textColor: "#dbdbdb",
      },
      grid: {
        vertLines: { color: "#FFFFFF18" },
        horzLines: { color: "#FFFFFF18" },
      },
      crosshair: {
        mode:
          crosshairMode === "hidden"
            ? CrosshairMode.Hidden
            : crosshairMode === "magnet"
            ? CrosshairMode.Magnet
            : CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false, // Allow scrolling to the left edge
        fixRightEdge: false, // Allow scrolling to the right edge
        rightOffset: 10,
        barSpacing: 10,
        borderVisible: false,
        minBarSpacing: 2, // Allow bars to get very close together for zooming
        maxBarSpacing: 50, // Limit maximum bar spacing
      },
      rightPriceScale: {
        autoScale: true,
        alignLabels: true,
        borderVisible: false,
        scaleMargins: {
          top: 0.2, // creates breathing room above
          bottom: 0.2, // creates breathing room below
        },
      },
      autoSize: false,
      handleScroll: {
        mouseWheel: !isDrawingEnabled || selectedTool === "pointer", // Enable mouse wheel scrolling only when not drawing
        pressedMouseMove: !isDrawingEnabled || selectedTool === "pointer", // Enable drag scrolling only when not drawing
        horzTouchDrag: !isDrawingEnabled || selectedTool === "pointer", // Enable touch horizontal scrolling only when not drawing
        vertTouchDrag: !isDrawingEnabled || selectedTool === "pointer", // Enable touch vertical scrolling only when not drawing
      },
    });

    chartRef.current = chart;

    const updateChartSize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const width = chartContainerRef.current.clientWidth;
        const height = chartContainerRef.current.clientHeight;
        setChartSize({ width, height });

        // Update the actual chart dimensions
        chartRef.current.applyOptions({
          width: width,
          height: height,
        });
      }
    };

    updateChartSize();
    window.addEventListener("resize", updateChartSize);

    // Add ResizeObserver to detect container size changes (important for fullscreen)
    const resizeObserver = new ResizeObserver(() => {
      updateChartSize();
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    candlestickSeriesRef.current = chart.addSeries(CandlestickSeries);
    const data = generateChartData(headerTimeframe, footerTimeframe);
    candlestickSeriesRef.current.setData(data);

    // Auto-scroll to the most recent data (like TradingView)
    setTimeout(() => {
      if (chartRef.current && data.length > 0) {
        const timeScale = chartRef.current.timeScale();
        timeScale.scrollToPosition(0, false); // Scroll to the rightmost position (most recent data)
      }
    }, 100);

    // Create a dummy toolbar container for the RectangleDrawingTool
    const dummyToolbar = document.createElement("div");
    dummyToolbar.style.display = "none"; // Hide it since we're not using the built-in toolbar

    rectangleToolRef.current = new RectangleDrawingTool(
      chart,
      candlestickSeriesRef.current,
      dummyToolbar,
      {
        fillColor: "rgba(41, 98, 255, 0.3)",
        previewFillColor: "rgba(41, 98, 255, 0.3)",
        borderColor: "rgba(41, 98, 255, 1)",
        borderWidth: 2,
        labelColor: "rgba(41, 98, 255, 1)",
        labelTextColor: "white",
        showLabels: false,
      },
      (isHovering: boolean) => {
        setIsHoveringHandle(isHovering);
      }
    );

    // Initialize the trendline drawing tool
    trendlineToolRef.current = new TrendLineDrawingTool(
      chart,
      candlestickSeriesRef.current,
      dummyToolbar,
      {
        lineColor: "rgba(255, 165, 0, 1)", // Orange color for trendlines
        previewLineColor: "rgba(255, 165, 0, 0.5)",
        lineWidth: 2,
        borderColor: "rgba(41, 98, 255, 1)",
        borderWidth: 1,
        labelColor: "rgba(255, 165, 0, 1)",
        labelTextColor: "white",
        showLabels: false,
      },
      (isHovering: boolean) => {
        setIsHoveringHandle(isHovering);
      }
    );

    // Initialize the Fibonacci drawing tool
    fibonacciToolRef.current = new FibonacciDrawingTool(
      chart,
      candlestickSeriesRef.current,
      dummyToolbar,
      {
        lineColor: "rgba(255, 0, 255, 1)", // Magenta color for Fibonacci
        previewLineColor: "rgba(255, 0, 255, 0.5)",
        lineWidth: 2,
        borderColor: "rgba(255, 0, 255, 1)",
        borderWidth: 1,
        labelColor: "rgba(255, 0, 255, 1)",
        labelTextColor: "white",
        showLabels: true,
      },
      (isHovering: boolean) => {
        setIsHoveringHandle(isHovering);
      }
    );

    return () => {
      window.removeEventListener("resize", updateChartSize);
      resizeObserver.disconnect();
      if (rectangleToolRef.current) {
        rectangleToolRef.current.remove();
        rectangleToolRef.current = null;
      }
      if (trendlineToolRef.current) {
        trendlineToolRef.current.remove();
        trendlineToolRef.current = null;
      }
      if (fibonacciToolRef.current) {
        fibonacciToolRef.current.remove();
        fibonacciToolRef.current = null;
      }
      chart.remove();
    };
  }, [headerTimeframe, footerTimeframe]);

  // Effect to update chart data when timeframes change
  useEffect(() => {
    if (chartRef.current && candlestickSeriesRef.current) {
      const data = generateChartData(headerTimeframe, footerTimeframe);
      candlestickSeriesRef.current.setData(data);
    }
  }, [headerTimeframe, footerTimeframe]);

  // Effect to handle tool changes
  useEffect(() => {
    if (
      !rectangleToolRef.current ||
      !trendlineToolRef.current ||
      !fibonacciToolRef.current
    )
      return;

    // Stop all tools first
    rectangleToolRef.current.stopDrawing();
    trendlineToolRef.current.stopDrawing();
    fibonacciToolRef.current.stopDrawing();

    // Start the selected tool
    if (selectedTool === "rectangle") {
      rectangleToolRef.current.startDrawing();
    } else if (selectedTool === "trendline") {
      trendlineToolRef.current.startDrawing();
    } else if (selectedTool === "fibonacci") {
      fibonacciToolRef.current.startDrawing();
    }
  }, [selectedTool]);

  // Effect to handle crosshair mode changes
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      crosshair: {
        mode:
          crosshairMode === "hidden"
            ? CrosshairMode.Hidden
            : crosshairMode === "magnet"
            ? CrosshairMode.Magnet
            : CrosshairMode.Normal,
      },
    });
  }, [crosshairMode]);

  // Effect to handle scroll settings when drawing state changes
  useEffect(() => {
    if (!chartRef.current) return;

    // Enable scrolling when not drawing or when pointer tool is selected
    const shouldEnableScrolling =
      !isDrawingEnabled ||
      selectedTool === "pointer" ||
      selectedTool === "rectangle" ||
      selectedTool === "trendline" ||
      selectedTool === "fibonacci";

    chartRef.current.applyOptions({
      handleScroll: {
        mouseWheel: shouldEnableScrolling,
        pressedMouseMove: shouldEnableScrolling,
        horzTouchDrag: shouldEnableScrolling,
        vertTouchDrag: shouldEnableScrolling,
      },
    });
  }, [isDrawingEnabled, selectedTool]);

  // Effect to handle keyboard events for delete functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();

        // Delete selected drawings immediately
        deleteSelectedDrawings();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Effect to handle trash tool selection
  useEffect(() => {
    if (selectedTool === "trash") {
      // Delete selected drawings immediately, or show confirmation for all
      const hasSelected = checkSelectedDrawings();

      if (hasSelected) {
        // Delete selected drawings
        deleteSelectedDrawings();
      } else {
        // Show confirmation dialog for deleting all drawings
        setShowDeleteConfirm(true);
      }
    }
  }, [selectedTool]);

  // Method to delete selected drawings
  const deleteSelectedDrawings = () => {
    let hasDeleted = false;

    if (rectangleToolRef.current) {
      const selectedRectangles =
        rectangleToolRef.current.getSelectedRectangles();
      selectedRectangles.forEach((rectangle) => {
        rectangleToolRef.current!.deleteRectangle(rectangle);
        hasDeleted = true;
      });
    }

    if (trendlineToolRef.current) {
      const selectedTrendLines =
        trendlineToolRef.current.getSelectedTrendLines();
      selectedTrendLines.forEach((trendLine) => {
        trendlineToolRef.current!.deleteTrendLine(trendLine);
        hasDeleted = true;
      });
    }

    if (fibonacciToolRef.current) {
      const selectedFibRetracements =
        fibonacciToolRef.current.getSelectedFibRetracements();
      selectedFibRetracements.forEach((fibRetracement) => {
        fibonacciToolRef.current!.deleteFibRetracement(fibRetracement);
        hasDeleted = true;
      });
    }
  };

  // Method to check if any drawings are selected
  const checkSelectedDrawings = (): boolean => {
    let hasSelected = false;

    if (rectangleToolRef.current) {
      const selectedRectangles =
        rectangleToolRef.current.getSelectedRectangles();
      if (selectedRectangles.length > 0) hasSelected = true;
    }

    if (trendlineToolRef.current) {
      const selectedTrendLines =
        trendlineToolRef.current.getSelectedTrendLines();
      if (selectedTrendLines.length > 0) hasSelected = true;
    }

    if (fibonacciToolRef.current) {
      const selectedFibRetracements =
        fibonacciToolRef.current.getSelectedFibRetracements();
      if (selectedFibRetracements.length > 0) hasSelected = true;
    }

    return hasSelected;
  };

  // Method to delete all drawings
  const deleteAllDrawings = () => {
    // Clear plugin-based drawings
    if (rectangleToolRef.current) {
      rectangleToolRef.current.deleteAllRectangles();
    }

    if (trendlineToolRef.current) {
      trendlineToolRef.current.deleteAllTrendLines();
    }

    if (fibonacciToolRef.current) {
      fibonacciToolRef.current.deleteAllFibRetracements();
    }
  };

  // Only handle mouse events for React-based drawing tools (not lightweight-charts plugins)
  const shouldHandleReactMouseEvents = () => {
    return (
      isDrawingEnabled &&
      selectedTool !== "pointer" &&
      selectedTool !== "rectangle" &&
      selectedTool !== "trendline" &&
      selectedTool !== "fibonacci"
    );
  };

  // Handle rectangle drawing with React-based system (disabled when using plugin)
  const shouldHandleRectangleDrawing = () => {
    return false; // Disable React-based rectangle drawing since we're using the plugin
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't handle mouse events if disabled or hovering over handles
    if (disableMouseHandling || isHoveringHandle) return;

    setIsMouseDown(true);

    // Handle panning when pointer tool is selected
    if (selectedTool === "pointer" && chartRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // For rectangle, trendline, and fibonacci tools, let the lightweight-charts plugin handle it
    if (
      selectedTool === "rectangle" ||
      selectedTool === "trendline" ||
      selectedTool === "fibonacci"
    ) {
      return;
    }

    // Handle drawing selection when using pointer tool
    if (selectedTool === "pointer") {
      // Check if clicking on any drawings and select them
      checkSelectedDrawings();
    }

    // Handle text tool
    if (isDrawingEnabled && selectedTool === "text") {
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setIsTextMode(true);
      setTextInput("");
      return;
    }

    // Fallback for other cases
    if (!shouldHandleReactMouseEvents() && !shouldHandleRectangleDrawing()) {
      console.log("not handling mouse events");
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Don't handle mouse events if disabled or hovering over handles
    if (disableMouseHandling || isHoveringHandle) return;

    // For rectangle and trendline tools, let the lightweight-charts plugin handle it
    if (selectedTool === "rectangle" || selectedTool === "trendline") {
      return;
    }

    // Handle panning
    if (isPanning && panStart && chartRef.current) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;

      // Pan the chart using lightweight-charts API
      const timeScale = chartRef.current.timeScale();
      const priceScale = chartRef.current.priceScale("right");

      // Pan horizontally (time scale) - improved approach for larger datasets
      const currentLogicalRange = timeScale.getVisibleLogicalRange();
      if (currentLogicalRange) {
        // Use logical range for smoother panning with better sensitivity
        const barSpacing = timeScale.options().barSpacing || 10;
        const logicalDelta = deltaX / (barSpacing * 0.5); // Increased sensitivity
        timeScale.setVisibleLogicalRange({
          from: currentLogicalRange.from - logicalDelta,
          to: currentLogicalRange.to - logicalDelta,
        });
      } else {
        // Fallback to time range if logical range not available
        const currentRange = timeScale.getVisibleRange();
        if (
          currentRange &&
          typeof currentRange.from === "number" &&
          typeof currentRange.to === "number"
        ) {
          const timeSpan = currentRange.to - currentRange.from;
          const timeDelta = (deltaX / 100) * timeSpan; // Increased sensitivity for better scrolling
          timeScale.setVisibleRange({
            from: (currentRange.from - timeDelta) as Time,
            to: (currentRange.to - timeDelta) as Time,
          });
        }
      }

      // Pan vertically (price scale) - improved sensitivity
      const currentPriceRange = priceScale.getVisibleRange();
      if (currentPriceRange) {
        const height = chartContainerRef.current?.clientHeight || 400;
        const priceDelta =
          (deltaY / (height * 0.5)) *
          (currentPriceRange.to - currentPriceRange.from); // Increased sensitivity
        priceScale.setVisibleRange({
          from: currentPriceRange.from + priceDelta,
          to: currentPriceRange.to + priceDelta,
        });
      }
      return;
    }

    // Fallback for other cases
    if (!shouldHandleReactMouseEvents() && !shouldHandleRectangleDrawing()) {
      return;
    }
  };

  const handleMouseUp = () => {
    // Don't handle mouse events if disabled or hovering over handles
    if (disableMouseHandling || isHoveringHandle) return;

    setIsMouseDown(false);

    // For rectangle tool, let the lightweight-charts plugin handle it
    if (selectedTool === "rectangle") {
      return;
    }

    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    // Fallback for other cases
    if (!shouldHandleReactMouseEvents() && !shouldHandleRectangleDrawing()) {
      return;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!chartRef.current) return;

    // Don't handle wheel events if disabled or hovering over handles
    if (disableMouseHandling || isHoveringHandle) {
      e.preventDefault();
      return;
    }

    // Allow zooming when not drawing or when pointer/rectangle tool is selected
    if (
      isDrawingEnabled &&
      selectedTool !== "pointer" &&
      selectedTool !== "rectangle"
    ) {
      return;
    }

    e.preventDefault();

    const timeScale = chartRef.current.timeScale();
    const currentLogicalRange = timeScale.getVisibleLogicalRange();

    if (currentLogicalRange) {
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9; // Zoom out on scroll down, zoom in on scroll up
      const range = currentLogicalRange.to - currentLogicalRange.from;
      const center = (currentLogicalRange.from + currentLogicalRange.to) / 2;
      const newRange = range * zoomFactor;

      timeScale.setVisibleLogicalRange({
        from: center - newRange / 2,
        to: center + newRange / 2,
      });
    }
  };

  return (
    <div
      className={`bg-primary min-w-0 focus:outline-none ${className}`}
      tabIndex={0}
    >
      <div
        ref={chartContainerRef}
        className={`w-full h-full relative ${
          isPanning
            ? "cursor-grabbing"
            : selectedTool === "pointer"
            ? "cursor-grab"
            : ""
        }`}
        style={{
          cursor: isPanning
            ? "grabbing"
            : isMouseDown && selectedTool === "pointer"
            ? "grab"
            : "default",
          pointerEvents: shouldHandleReactMouseEvents() ? "auto" : "auto",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width={chartSize.width}
          height={chartSize.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <rect
            x={0}
            y={0}
            width={chartSize.width}
            height={chartSize.height}
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-2xl border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">
              Delete All Drawings
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete all drawings? This action cannot
              be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  deleteAllDrawings();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
