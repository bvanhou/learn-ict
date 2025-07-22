"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, IChartApi } from "lightweight-charts";

interface ChartProps {
  className?: string;
  panelWidth: number;
  selectedTool?: string;
  isDrawingEnabled?: boolean;
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
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingElement | null>(
    null
  );
  const [mousePosition, setMousePosition] = useState<DrawingPoint | null>(null);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");

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
      rightPriceScale: {
        borderColor: "#FFFFFF18",
      },
      timeScale: {
        borderColor: "#FFFFFF18",
      },
      // Make the chart responsive
      autoSize: false,
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries);

    // Generate more realistic random data
    const data = Array.from({ length: 100 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (100 - index));

      const basePrice = 100 + Math.sin(index * 0.1) * 20;
      const volatility = 5;

      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;

      return {
        time: date.toISOString().split("T")[0],
        open: Math.max(0, open),
        high: Math.max(0, high),
        low: Math.max(0, low),
        close: Math.max(0, close),
      };
    });

    candlestickSeries.setData(data);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = chartContainerRef.current.clientHeight;

        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        });

        // Force a resize to ensure the chart updates properly
        chartRef.current.resize(newWidth, newHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Drawing event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawingEnabled || selectedTool === "pointer") return;

    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle text tool
    if (selectedTool === "text") {
      setIsTextMode(true);
      setTextInput("");
      return;
    }

    // Handle emoji tool
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

    const newDrawing: DrawingElement = {
      id: Date.now().toString(),
      type: selectedTool,
      points: [{ x, y }],
      color: "#2962ff",
    };

    setCurrentDrawing(newDrawing);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingEnabled) return;

    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });

    if (isDrawing && currentDrawing) {
      setCurrentDrawing({
        ...currentDrawing,
        points: [...currentDrawing.points, { x, y }],
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDrawing) {
      setDrawingElements((prev) => [...prev, currentDrawing]);
      setCurrentDrawing(null);
      setIsDrawing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isTextMode && e.key === "Enter") {
      if (textInput.trim() && mousePosition) {
        const newDrawing: DrawingElement = {
          id: Date.now().toString(),
          type: "text",
          points: [mousePosition],
          text: textInput,
          color: "#ffffff",
          fontSize: 14,
        };
        setDrawingElements((prev) => [...prev, newDrawing]);
        setIsTextMode(false);
        setTextInput("");
      }
    } else if (e.key === "Escape") {
      setIsTextMode(false);
      setTextInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (isTextMode) {
      setTextInput((prev) => prev + e.key);
    }
  };

  // Effect to handle panel width changes
  useEffect(() => {
    if (chartRef.current && chartContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (chartContainerRef.current && chartRef.current) {
          const newWidth = chartContainerRef.current.clientWidth;
          const newHeight = chartContainerRef.current.clientHeight;

          chartRef.current.applyOptions({
            width: newWidth,
            height: newHeight,
          });

          // Force a resize to ensure the chart updates properly
          chartRef.current.resize(newWidth, newHeight);
        }
      });
    }
  }, [panelWidth]);

  const renderDrawingElement = (element: DrawingElement) => {
    switch (element.type) {
      case "line":
        if (element.points.length >= 2) {
          return (
            <line
              x1={element.points[0].x}
              y1={element.points[0].y}
              x2={element.points[element.points.length - 1].x}
              y2={element.points[element.points.length - 1].y}
              stroke={element.color || "#2962ff"}
              strokeWidth="2"
              fill="none"
            />
          );
        }
        break;

      case "rectangle":
        if (element.points.length >= 2) {
          return (
            <rect
              x={Math.min(
                element.points[0].x,
                element.points[element.points.length - 1].x
              )}
              y={Math.min(
                element.points[0].y,
                element.points[element.points.length - 1].y
              )}
              width={Math.abs(
                element.points[element.points.length - 1].x -
                  element.points[0].x
              )}
              height={Math.abs(
                element.points[element.points.length - 1].y -
                  element.points[0].y
              )}
              stroke={element.color || "#2962ff"}
              strokeWidth="2"
              fill="none"
            />
          );
        }
        break;

      case "text":
        if (element.points.length >= 1 && element.text) {
          return (
            <text
              x={element.points[0].x}
              y={element.points[0].y}
              fill={element.color || "#ffffff"}
              fontSize={element.fontSize || 14}
              fontFamily="Arial, sans-serif"
              dominantBaseline="middle"
            >
              {element.text}
            </text>
          );
        }
        break;

      case "emoji":
        if (element.points.length >= 1 && element.text) {
          return (
            <text
              x={element.points[0].x}
              y={element.points[0].y}
              fontSize={element.fontSize || 24}
              dominantBaseline="middle"
              textAnchor="middle"
            >
              {element.text}
            </text>
          );
        }
        break;

      case "ruler":
        if (element.points.length >= 2) {
          const start = element.points[0];
          const end = element.points[element.points.length - 1];
          const distance = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          );

          return (
            <g>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={element.color || "#ff6b6b"}
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
              />
              <text
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2 - 10}
                fill={element.color || "#ff6b6b"}
                fontSize="12"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {Math.round(distance)}px
              </text>
            </g>
          );
        }
        break;

      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-primary min-w-0 ${className}`}
      onKeyDown={handleKeyDown}
      onKeyPress={handleKeyPress}
      tabIndex={0}
    >
      <div
        ref={chartContainerRef}
        className="w-full h-full relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Drawing overlay */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Render existing drawings */}
          {drawingElements.map((element) => (
            <g key={element.id}>{renderDrawingElement(element)}</g>
          ))}

          {/* Render current drawing */}
          {currentDrawing && <g>{renderDrawingElement(currentDrawing)}</g>}
        </svg>

        {/* Text input overlay */}
        {isTextMode && mousePosition && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: mousePosition.x,
              top: mousePosition.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="bg-gray-800 text-white px-2 py-1 text-sm border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              placeholder="Type text..."
              autoFocus
              onBlur={() => {
                if (textInput.trim()) {
                  const newDrawing: DrawingElement = {
                    id: Date.now().toString(),
                    type: "text",
                    points: [mousePosition],
                    text: textInput,
                    color: "#ffffff",
                    fontSize: 14,
                  };
                  setDrawingElements((prev) => [...prev, newDrawing]);
                }
                setIsTextMode(false);
                setTextInput("");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
