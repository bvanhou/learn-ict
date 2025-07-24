"use client";

import React, { useState } from "react";
import { Icon } from "@/app/components/icons";
import { iconMap } from "./icons/map";

interface SidebarProps {
  className?: string;
  selectedTool?: string;
  onToolSelect?: (tool: string) => void;
  isDrawingEnabled?: boolean;
  onDrawingToggle?: (enabled: boolean) => void;
  crosshairMode?: string;
  onCrosshairModeChange?: (mode: string) => void;
}

interface ToolOption {
  id: string;
  icon: string;
  label: string;
  crosshairMode?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  className = "",
  selectedTool = "pointer",
  onToolSelect,
  isDrawingEnabled = true,
  onDrawingToggle,
  crosshairMode = "hidden",
  onCrosshairModeChange,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const drawingTools = [
    { id: "pointer", icon: "pointer", label: "Pointer" },
    { id: "trendline", icon: "trendline", label: "Trend Line" },
    {
      id: "fibonacci",
      icon: "fibonacci",
      label: "Fib Retracement",
    },
    { id: "long-position", icon: "long-position", label: "Long Position" },
    { id: "rectangle", icon: "rectangle", label: "Rectangle" },
    { id: "trash", icon: "trash", label: "Trash" },
  ];

  // Define dropdown options for each tool
  const toolOptions: Record<string, ToolOption[]> = {
    pointer: [
      {
        id: "crosshair",
        icon: "crosshair",
        label: "Cross",
        crosshairMode: "normal",
      },
      {
        id: "pointer",
        icon: "pointer",
        label: "Arrow",
        crosshairMode: "hidden",
      },
    ],
    trendline: [{ id: "trendline", icon: "trendline", label: "Trend Line" }],
    fibonacci: [
      {
        id: "fibonacci",
        icon: "fibonacci",
        label: "Fib Retracement",
      },
    ],
    "long-position": [
      { id: "long-position", icon: "long-position", label: "Long Position" },
    ],
    rectangle: [{ id: "rectangle", icon: "rectangle", label: "Rectangle" }],
    trash: [{ id: "trash", icon: "trash", label: "Trash" }],
  };

  const handleToolSelect = (toolId: string, crosshairMode?: string) => {
    onToolSelect?.(toolId);
    if (crosshairMode) {
      onCrosshairModeChange?.(crosshairMode);
    }
    setOpenDropdown(null);
  };

  const toggleDropdown = (toolId: string) => {
    setOpenDropdown(openDropdown === toolId ? null : toolId);
  };

  const getCurrentToolIcon = (toolId: string) => {
    if (toolId === "pointer") {
      // Return the appropriate icon based on crosshair mode
      switch (crosshairMode) {
        case "hidden":
          return "pointer";
        case "magnet":
          return "crosshair";
        default:
          return "crosshair";
      }
    }
    return toolId;
  };

  return (
    <aside className={`w-14 bg-primary flex-shrink-0 ${className}`}>
      <div className="flex flex-col items-center py-4 space-y-2">
        {drawingTools.map((tool) => {
          const isSelected = selectedTool === tool.id;
          const currentIcon = getCurrentToolIcon(tool.id);
          const options = toolOptions[tool.id] || [];

          return (
            <div key={tool.id} className="relative">
              {tool.id === "trash" && (
                <div className="w-10 h-px bg-gray-500 my-2" />
              )}
              <div className="flex items-center">
                <button
                  onClick={() => onToolSelect?.(tool.id)}
                  className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                    isSelected
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-600"
                  }`}
                  title={tool.label}
                >
                  <Icon
                    name={currentIcon as keyof typeof iconMap}
                    size={30}
                    className="text-white"
                  />
                </button>
                <button
                  onClick={() => options.length > 1 && toggleDropdown(tool.id)}
                  className={`w-4 h-8 flex items-center justify-center transition-colors ${
                    options.length > 1
                      ? "text-gray-400 hover:text-white"
                      : "text-transparent cursor-default"
                  } ${openDropdown === tool.id ? "text-white" : ""}`}
                  disabled={options.length <= 1}
                >
                  <Icon
                    name="arrow"
                    width={16}
                    height={16}
                    className={`transform transition-transform duration-200 origin-center ${
                      openDropdown === tool.id ? "-scale-x-100" : "scale-x-100"
                    }`}
                  />
                </button>
              </div>

              {/* Dropdown Menu */}
              {openDropdown === tool.id && options.length > 1 && (
                <div className="absolute left-12 top-0 z-50 bg-primary  rounded-md shadow-lg min-w-64">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() =>
                        handleToolSelect(option.id, option.crosshairMode)
                      }
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Icon
                          name={option.icon as keyof typeof iconMap}
                          size={20}
                          className="text-white"
                        />
                        <span className="text-sm">{option.label}</span>
                      </div>
                    </button>
                  ))}
                  {/* <div className="border-t border-gray-600 mt-2 pt-2">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-gray-400">
                        Values tooltip on long press
                      </span>
                      <div className="w-8 h-4 bg-gray-600 rounded-full relative">
                        <div className="w-3 h-3 bg-gray-400 rounded-full absolute left-0.5 top-0.5"></div>
                      </div>
                    </div>
                  </div> */}
                </div>
              )}
            </div>
          );
        })}

        {/* Drawing toggle */}
        {/* <div className="w-8 h-8 flex items-center justify-center mt-4">
          <button
            onClick={() => onDrawingToggle?.(!isDrawingEnabled)}
            className={`w-6 h-6 rounded transition-colors ${
              isDrawingEnabled
                ? "bg-green-600 text-white"
                : "bg-gray-600 text-gray-400"
            }`}
            title={isDrawingEnabled ? "Drawing Enabled" : "Drawing Disabled"}
          >
            <div className="w-3 h-3 rounded-sm bg-current" />
          </button>
        </div> */}
      </div>
    </aside>
  );
};
