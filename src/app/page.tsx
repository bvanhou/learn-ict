"use client";

import React, { useState } from "react";
import { Layout } from "./components/layout";
import { Sidebar } from "./components/sidebar";
import { Chart } from "./components/chart";
import { Panel } from "./components/panel";
import { Header } from "./components/header";

export default function Home() {
  const [panelWidth, setPanelWidth] = useState(320);
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(true);

  return (
    <Layout>
      {/* Header */}
      <Header />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Sidebar */}
        <Sidebar
          selectedTool={selectedTool}
          onToolSelect={setSelectedTool}
          isDrawingEnabled={isDrawingEnabled}
          onDrawingToggle={setIsDrawingEnabled}
        />

        {/* Chart area */}
        <div className="flex-1 min-w-0">
          <Chart
            className="h-full"
            panelWidth={panelWidth}
            selectedTool={selectedTool}
            isDrawingEnabled={isDrawingEnabled}
          />
        </div>

        {/* Resizable Panel */}
        <Panel onWidthChange={setPanelWidth} initialWidth={panelWidth} />
      </div>
    </Layout>
  );
}
