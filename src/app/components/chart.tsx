"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  IChartApi,
  ISeriesApi,
  Time,
  CrosshairMode,
} from "lightweight-charts";
import { RectangleDrawingTool } from "../plugins/rectangle";
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

interface DrawingPoint {
  x: number;
  y: number;
  time?: string;
  price?: number;
}

interface DrawingElement {
  id: string;
  type: string;
  points: DrawingPoint[];
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
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
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingElement | null>(
    null
  );
  const [mousePosition, setMousePosition] = useState<DrawingPoint | null>(null);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

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

    return () => {
      window.removeEventListener("resize", updateChartSize);
      resizeObserver.disconnect();
      if (rectangleToolRef.current) {
        rectangleToolRef.current.remove();
        rectangleToolRef.current = null;
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
    if (!rectangleToolRef.current) return;

    if (selectedTool === "rectangle") {
      rectangleToolRef.current.startDrawing();
    } else {
      rectangleToolRef.current.stopDrawing();
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
      selectedTool === "rectangle";

    chartRef.current.applyOptions({
      handleScroll: {
        mouseWheel: shouldEnableScrolling,
        pressedMouseMove: shouldEnableScrolling,
        horzTouchDrag: shouldEnableScrolling,
        vertTouchDrag: shouldEnableScrolling,
      },
    });
  }, [isDrawingEnabled, selectedTool]);

  // Only handle mouse events for React-based drawing tools (not lightweight-charts plugins)
  const shouldHandleReactMouseEvents = () => {
    return (
      isDrawingEnabled &&
      selectedTool !== "pointer" &&
      selectedTool !== "rectangle"
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

    // For rectangle tool, let the lightweight-charts plugin handle it
    if (selectedTool === "rectangle") {
      return;
    }

    // Handle drawing tools - start drawing immediately on any click
    if (isDrawingEnabled && selectedTool !== "pointer") {
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (selectedTool === "text") {
        setIsTextMode(true);
        setTextInput("");
        return;
      }

      if (selectedTool === "emoji") {
        const emoji = "📈";
        const newDrawing: DrawingElement = {
          id: Date.now().toString(),
          type: "emoji",
          points: [{ x, y }],
          text: emoji,
          color: "#ffd700",
          fontSize: 24,
        };
        setDrawingElements((prev) => [...prev, newDrawing]);
        return;
      }

      // Handle other drawing tools (line, trend-line, etc.)
      const newDrawing: DrawingElement = {
        id: Date.now().toString(),
        type: selectedTool,
        points: [{ x, y }],
        color: "#2962ff",
      };

      setCurrentDrawing(newDrawing);
      setIsDrawing(true);
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

    // For rectangle tool, let the lightweight-charts plugin handle it
    if (selectedTool === "rectangle") {
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

    // Handle drawing tools
    if (
      isDrawingEnabled &&
      selectedTool !== "pointer" &&
      isDrawing &&
      currentDrawing
    ) {
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });

      if (
        currentDrawing.type === "rectangle" &&
        currentDrawing.points.length === 1
      ) {
        // For rectangle, we only need two points (start and end)
        setCurrentDrawing({
          ...currentDrawing,
          points: [currentDrawing.points[0], { x, y }],
        });
      } else {
        setCurrentDrawing({
          ...currentDrawing,
          points: [...currentDrawing.points, { x, y }],
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

    // Handle drawing tools completion
    if (
      isDrawingEnabled &&
      selectedTool !== "pointer" &&
      isDrawing &&
      currentDrawing
    ) {
      setDrawingElements((prev) => [...prev, currentDrawing]);
      setCurrentDrawing(null);
      setIsDrawing(false);
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

  const renderDrawingElement = (element: DrawingElement) => {
    switch (element.type) {
      case "line":
        if (element.points.length >= 2) {
          const pointsString = element.points
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          return (
            <polyline
              points={pointsString}
              stroke={element.color || "#2962ff"}
              strokeWidth="2"
              fill="none"
            />
          );
        }
        break;
      case "rectangle":
        if (element.points.length >= 2) {
          const [start, end] = element.points;
          const x = Math.min(start.x, end.x);
          const y = Math.min(start.y, end.y);
          const width = Math.abs(end.x - start.x);
          const height = Math.abs(end.y - start.y);
          return (
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              stroke={element.color || "#2962ff"}
              strokeWidth="2"
              fill="none"
            />
          );
        }
        break;
      case "text":
      case "emoji":
        if (element.points.length >= 1 && element.text) {
          return (
            <text
              x={element.points[0].x}
              y={element.points[0].y}
              fontSize={
                element.fontSize || (element.type === "emoji" ? 24 : 14)
              }
              fill={element.color || "#ffffff"}
              dominantBaseline="middle"
              textAnchor={element.type === "emoji" ? "middle" : undefined}
            >
              {element.text}
            </text>
          );
        }
        break;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-primary min-w-0 ${className}`} tabIndex={0}>
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
          {drawingElements.map((element) => (
            <g key={element.id}>{renderDrawingElement(element)}</g>
          ))}
          {currentDrawing && <g>{renderDrawingElement(currentDrawing)}</g>}
        </svg>
      </div>
    </div>
  );
};
