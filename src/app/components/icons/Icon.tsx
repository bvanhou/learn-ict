// components/icons/Icon.tsx
import React from "react";
import { iconMap } from "./map";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: keyof typeof iconMap;
  color?: string;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  direction?: "left" | "right" | "up" | "down";
}

export const Icon: React.FC<IconProps> = ({
  name,
  color = "currentColor",
  size = 24,
  width,
  height,
  className = "",
  direction = "right",
  ...rest
}) => {
  const icon = iconMap[name];
  if (!icon) return null;

  const finalWidth = width || size;
  const finalHeight = height || size;

  const rotationMap: Record<string, string> = {
    right: "rotate(0)",
    left: "rotate(180deg)",
    up: "rotate(-90deg)",
    down: "rotate(90deg)",
  };

  const transform = rotationMap[direction] || "rotate(0)";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 28 28"
      width={finalWidth}
      height={finalHeight}
      className={className}
      style={{ transform }}
      fill={color}
      {...rest}
    >
      {icon}
    </svg>
  );
};
