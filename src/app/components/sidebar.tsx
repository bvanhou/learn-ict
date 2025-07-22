"use client";

import React from "react";
import {
  MousePointer,
  Minus,
  Square,
  Type,
  Smile,
  Ruler,
  ZoomIn,
  Magnet,
  Edit,
  Unlock,
  Eye,
  Link,
  Trash2,
  Clipboard,
  Lock,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  selectedTool?: string;
  onToolSelect?: (tool: string) => void;
  isDrawingEnabled?: boolean;
  onDrawingToggle?: (enabled: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  className = "",
  selectedTool = "pointer",
  onToolSelect,
  isDrawingEnabled = true,
  onDrawingToggle,
}) => {
  const drawingTools = [
    { id: "pointer", icon: MousePointer, label: "Pointer" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "text", icon: Type, label: "Text" },
    { id: "emoji", icon: Smile, label: "Emoji" },
    { id: "ruler", icon: Ruler, label: "Ruler" },
    { id: "zoom", icon: ZoomIn, label: "Zoom" },
    { id: "magnet", icon: Magnet, label: "Snap" },
    { id: "edit", icon: Edit, label: "Edit" },
    { id: "lock", icon: Lock, label: "Lock" },
    { id: "unlock", icon: Unlock, label: "Unlock" },
    { id: "visibility", icon: Eye, label: "Hide" },
    { id: "link", icon: Link, label: "Link" },
    { id: "delete", icon: Trash2, label: "Delete" },
    { id: "clipboard", icon: Clipboard, label: "Paste" },
  ];

  return (
    <aside
      className={`w-12 bg-primary border-r border-primary flex-shrink-0 ${className}`}
    >
      <div className="flex flex-col items-center py-4 space-y-2">
        {drawingTools.map((tool) => {
          const IconComponent = tool.icon;
          const isSelected = selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect?.(tool.id)}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                isSelected
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }`}
              title={tool.label}
            >
              <IconComponent className="w-4 h-4" />
            </button>
          );
        })}

        {/* Drawing toggle */}
        <div className="w-8 h-8 flex items-center justify-center mt-4">
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
        </div>
      </div>
    </aside>
  );
};
