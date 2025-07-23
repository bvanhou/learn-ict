"use client";

import React, { useState } from "react";
import { Layout } from "./components/layout";
import { Sidebar } from "./components/sidebar";
import { Chart } from "./components/chart";
import { Panel } from "./components/panel";
import { Header } from "./components/header";
import { Footer } from "./components/footer";

export default function Home() {
  const [panelWidth, setPanelWidth] = useState(320);
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(true);
  const [headerTimeframe, setHeaderTimeframe] = useState("1h");
  const [footerTimeframe, setFooterTimeframe] = useState("1D");
  const [crosshairMode, setCrosshairMode] = useState("hidden");

  return (
    <Layout>
      {/* Header */}
      <Header
        selectedTimeframe={headerTimeframe}
        onTimeframeChange={setHeaderTimeframe}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Sidebar */}
        <Sidebar
          selectedTool={selectedTool}
          onToolSelect={setSelectedTool}
          isDrawingEnabled={isDrawingEnabled}
          onDrawingToggle={setIsDrawingEnabled}
          crosshairMode={crosshairMode}
          onCrosshairModeChange={setCrosshairMode}
        />

        {/* Chart area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Chart
            className="h-full"
            panelWidth={panelWidth}
            selectedTool={selectedTool}
            isDrawingEnabled={isDrawingEnabled}
            headerTimeframe={headerTimeframe}
            footerTimeframe={footerTimeframe}
            crosshairMode={crosshairMode}
          />
          <Footer
            selectedTimeframe={footerTimeframe}
            onTimeframeChange={setFooterTimeframe}
          />
        </div>

        {/* Resizable Panel */}
        <Panel onWidthChange={setPanelWidth} initialWidth={panelWidth} />
      </div>
    </Layout>
  );
}
