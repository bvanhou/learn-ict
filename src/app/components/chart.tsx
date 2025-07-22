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

  return (
    <div className={`bg-primary min-w-0 ${className}`}>
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
            <g key={element.id}>
              {element.type === "line" && element.points.length >= 2 && (
                <line
                  x1={element.points[0].x}
                  y1={element.points[0].y}
                  x2={element.points[element.points.length - 1].x}
                  y2={element.points[element.points.length - 1].y}
                  stroke={element.color || "#2962ff"}
                  strokeWidth="2"
                  fill="none"
                />
              )}
              {element.type === "rectangle" && element.points.length >= 2 && (
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
              )}
            </g>
          ))}

          {/* Render current drawing */}
          {currentDrawing && (
            <g>
              {currentDrawing.type === "line" &&
                currentDrawing.points.length >= 2 && (
                  <line
                    x1={currentDrawing.points[0].x}
                    y1={currentDrawing.points[0].y}
                    x2={
                      currentDrawing.points[currentDrawing.points.length - 1].x
                    }
                    y2={
                      currentDrawing.points[currentDrawing.points.length - 1].y
                    }
                    stroke={currentDrawing.color || "#2962ff"}
                    strokeWidth="2"
                    fill="none"
                  />
                )}
              {currentDrawing.type === "rectangle" &&
                currentDrawing.points.length >= 2 && (
                  <rect
                    x={Math.min(
                      currentDrawing.points[0].x,
                      currentDrawing.points[currentDrawing.points.length - 1].x
                    )}
                    y={Math.min(
                      currentDrawing.points[0].y,
                      currentDrawing.points[currentDrawing.points.length - 1].y
                    )}
                    width={Math.abs(
                      currentDrawing.points[currentDrawing.points.length - 1]
                        .x - currentDrawing.points[0].x
                    )}
                    height={Math.abs(
                      currentDrawing.points[currentDrawing.points.length - 1]
                        .y - currentDrawing.points[0].y
                    )}
                    stroke={currentDrawing.color || "#2962ff"}
                    strokeWidth="2"
                    fill="none"
                  />
                )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
