"use client";

import React, { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return <div className="h-screen flex flex-col bg-primary">{children}</div>;
};
