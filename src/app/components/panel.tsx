"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { api, LearningContent } from "../services/api";

interface PanelProps {
  className?: string;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange?: (width: number) => void;
}

export const Panel: React.FC<PanelProps> = ({
  className = "",
  initialWidth = 320,
  minWidth = 200,
  maxWidth = 800,
  onWidthChange,
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [learningContent, setLearningContent] =
    useState<LearningContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updateWidth = useCallback(
    (newWidth: number) => {
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(clampedWidth);
      onWidthChange?.(clampedWidth);
    },
    [minWidth, maxWidth, onWidthChange]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const newWidth = rect.right - e.clientX;
        updateWidth(newWidth);
      }
    },
    [isResizing, updateWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Load learning content on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const content = await api.getLearningContent("chapter-1");
        setLearningContent(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  return (
    <div
      ref={panelRef}
      className={`bg-primary border-l-4 border-primary border-b-4 border-b-primary relative ${className}`}
      style={{ width: `${width}px`, flexShrink: 0 }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize transition-colors bg-transparent z-10"
        onMouseDown={handleMouseDown}
      />

      {/* Panel content */}
      <div className="flex flex-col h-full bg-primary">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted">Loading learning content...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-accent-red text-center">
              <div className="font-medium">Error loading content</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        ) : learningContent ? (
          <>
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3">
              <h2 className="text-lg font-semibold text-primary">
                {learningContent.title}
              </h2>
              <p className="text-sm text-secondary mt-1">
                {learningContent.subtitle}
              </p>
            </div>

            {/* Two equal sections */}
            <div className="flex-1 flex flex-col">
              {/* Top section - Video/Content */}
              <div className="flex-1 border-b-4 border-primary overflow-auto">
                <div className="p-4">
                  <h3 className="text-md font-medium mb-3 text-primary">
                    {learningContent.videoTitle}
                  </h3>

                  {/* Video embed */}
                  <div
                    className={`w-full border border-primary rounded mb-4 overflow-hidden ${
                      width > 400 ? "h-120" : "h-64"
                    }`}
                  >
                    <iframe
                      src={`https://www.youtube.com/embed/${
                        learningContent.videoUrl.split("v=")[1]
                      }`}
                      title={learningContent.videoTitle}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>

                  {/* Content area */}
                  <div className="text-sm text-primary leading-relaxed whitespace-pre-line">
                    {learningContent.content}
                  </div>
                </div>
              </div>

              {/* Bottom section - Questions/Homework */}
              <div className="flex-1 overflow-auto">
                <div className="p-4">
                  <h3 className="text-md font-medium mb-3 text-primary">
                    Questions & Homework
                  </h3>

                  {/* Questions */}
                  {learningContent.questions.map((question) => (
                    <div
                      key={question.id}
                      className="mb-4 p-3 bg-secondary border border-accent-blue rounded"
                    >
                      <div className="text-sm font-medium text-accent-blue mb-2">
                        {question.title}
                      </div>
                      <div className="text-sm text-accent-blue mb-2">
                        {question.content}
                      </div>
                      {question.options && (
                        <div className="space-y-1">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className="text-xs text-accent-blue"
                            >
                              • {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Homework */}
                  {learningContent.homework.map((hw, index) => (
                    <div
                      key={hw.id}
                      className={`mb-4 p-3 border rounded ${
                        hw.type === "practice"
                          ? "bg-secondary border-accent-green"
                          : hw.type === "quiz"
                          ? "bg-secondary border-accent-orange"
                          : "bg-secondary border-accent-orange"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium mb-2 ${
                          hw.type === "practice"
                            ? "text-accent-green"
                            : hw.type === "quiz"
                            ? "text-accent-orange"
                            : "text-accent-orange"
                        }`}
                      >
                        {hw.title}
                        {hw.dueDate && (
                          <span className="text-xs ml-2 opacity-75">
                            Due: {hw.dueDate}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-sm ${
                          hw.type === "practice"
                            ? "text-accent-green"
                            : hw.type === "quiz"
                            ? "text-accent-orange"
                            : "text-accent-orange"
                        }`}
                      >
                        {hw.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
