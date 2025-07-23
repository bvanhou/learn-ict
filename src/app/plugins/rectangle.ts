import { CanvasRenderingTarget2D } from "fancy-canvas";
import {
  Coordinate,
  IChartApi,
  isBusinessDay,
  ISeriesApi,
  ISeriesPrimitiveAxisView,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  MouseEventParams,
  PrimitivePaneViewZOrder,
  SeriesType,
  Time,
} from "lightweight-charts";
import { ensureDefined } from "../helpers/assertions";
import { positionsBox } from "../helpers/dimensions/positions";
import { PluginBase } from "./base";

class RectanglePaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _fillColor: string;
  _borderColor: string;
  _borderWidth: number;
  _showHandles: boolean;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    fillColor: string,
    borderColor: string,
    borderWidth: number,
    showHandles: boolean = false
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._fillColor = fillColor;
    this._borderColor = borderColor;
    this._borderWidth = borderWidth;
    this._showHandles = showHandles;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null
      )
        return;
      const ctx = scope.context;
      const horizontalPositions = positionsBox(
        this._p1.x,
        this._p2.x,
        scope.horizontalPixelRatio
      );
      const verticalPositions = positionsBox(
        this._p1.y,
        this._p2.y,
        scope.verticalPixelRatio
      );

      // Draw fill
      ctx.fillStyle = this._fillColor;
      ctx.fillRect(
        horizontalPositions.position,
        verticalPositions.position,
        horizontalPositions.length,
        verticalPositions.length
      );

      // Draw border
      ctx.strokeStyle = this._borderColor;
      ctx.lineWidth = this._borderWidth;
      ctx.strokeRect(
        horizontalPositions.position,
        verticalPositions.position,
        horizontalPositions.length,
        verticalPositions.length
      );

      // Draw resize handles if enabled
      if (this._showHandles) {
        this._drawResizeHandles(ctx, horizontalPositions, verticalPositions);
      }
    });
  }

  private _drawResizeHandles(
    ctx: CanvasRenderingContext2D,
    horizontalPositions: { position: number; length: number },
    verticalPositions: { position: number; length: number }
  ) {
    const handleSize = 6; // Increased size for corner circles
    const handleColor = "#171B26"; // Dark color for handles
    const handleStrokeColor = this._borderColor; // Use rectangle border color

    ctx.fillStyle = handleColor;
    ctx.strokeStyle = handleStrokeColor;
    ctx.lineWidth = 1;

    const x = horizontalPositions.position;
    const y = verticalPositions.position;
    const width = horizontalPositions.length;
    const height = verticalPositions.length;

    // Corner handles (circles)
    const corners = [
      { x: x, y: y }, // Top-left
      { x: x + width, y: y }, // Top-right
      { x: x + width, y: y + height }, // Bottom-right
      { x: x, y: y + height }, // Bottom-left
    ];

    corners.forEach((corner) => {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    // Side handles (rounded rectangles) - made bigger
    const sideHandleSize = 12;
    const sideHandles = [
      { x: x + width / 2, y: y, width: sideHandleSize, height: sideHandleSize }, // Top
      {
        x: x + width / 2,
        y: y + height,
        width: sideHandleSize,
        height: sideHandleSize,
      }, // Bottom
      {
        x: x,
        y: y + height / 2,
        width: sideHandleSize,
        height: sideHandleSize,
      }, // Left
      {
        x: x + width,
        y: y + height / 2,
        width: sideHandleSize,
        height: sideHandleSize,
      }, // Right
    ];

    sideHandles.forEach((handle) => {
      ctx.beginPath();
      ctx.roundRect(
        handle.x - handle.width / 2,
        handle.y - handle.height / 2,
        handle.width,
        handle.height,
        3
      );
      ctx.fill();
      ctx.stroke();
    });
  }
}

interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
}

class RectanglePaneView implements IPrimitivePaneView {
  _source: Rectangle;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };

  constructor(source: Rectangle) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    this._p1 = { x: x1, y: y1 };
    this._p2 = { x: x2, y: y2 };
  }

  renderer() {
    return new RectanglePaneRenderer(
      this._p1,
      this._p2,
      this._source._options.fillColor,
      this._source._options.borderColor,
      this._source._options.borderWidth,
      this._source._showHandles
    );
  }
}

class RectangleAxisPaneRenderer implements IPrimitivePaneRenderer {
  _p1: number | null;
  _p2: number | null;
  _fillColor: string;
  _vertical: boolean = false;

  constructor(
    p1: number | null,
    p2: number | null,
    fillColor: string,
    vertical: boolean
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._fillColor = fillColor;
    this._vertical = vertical;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      if (this._p1 === null || this._p2 === null) return;
      const ctx = scope.context;
      ctx.globalAlpha = 0.5;
      const positions = positionsBox(
        this._p1,
        this._p2,
        this._vertical ? scope.verticalPixelRatio : scope.horizontalPixelRatio
      );
      ctx.fillStyle = this._fillColor;
      if (this._vertical) {
        ctx.fillRect(0, positions.position, 15, positions.length);
      } else {
        ctx.fillRect(positions.position, 0, positions.length, 15);
      }
    });
  }
}

abstract class RectangleAxisPaneView implements IPrimitivePaneView {
  _source: Rectangle;
  _p1: number | null = null;
  _p2: number | null = null;
  _vertical: boolean = false;

  constructor(source: Rectangle, vertical: boolean) {
    this._source = source;
    this._vertical = vertical;
  }

  abstract getPoints(): [Coordinate | null, Coordinate | null];

  update() {
    [this._p1, this._p2] = this.getPoints();
  }

  renderer() {
    return new RectangleAxisPaneRenderer(
      this._p1,
      this._p2,
      this._source._options.fillColor,
      this._vertical
    );
  }
  zOrder(): PrimitivePaneViewZOrder {
    return "bottom";
  }
}

class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    return [y1, y2];
  }
}

class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    return [x1, x2];
  }
}

abstract class RectangleAxisView implements ISeriesPrimitiveAxisView {
  _source: Rectangle;
  _p: Point;
  _pos: Coordinate | null = null;
  constructor(source: Rectangle, p: Point) {
    this._source = source;
    this._p = p;
  }
  abstract update(): void;
  abstract text(): string;

  coordinate() {
    return this._pos ?? -1;
  }

  visible(): boolean {
    return this._source._options.showLabels;
  }

  tickVisible(): boolean {
    return this._source._options.showLabels;
  }

  textColor() {
    return this._source._options.labelTextColor;
  }
  backColor() {
    return this._source._options.labelColor;
  }
  movePoint(p: Point) {
    this._p = p;
    this.update();
  }
}

class RectangleTimeAxisView extends RectangleAxisView {
  update() {
    const timeScale = this._source.chart.timeScale();
    this._pos = timeScale.timeToCoordinate(this._p.time);
  }
  text() {
    return this._source._options.timeLabelFormatter(this._p.time);
  }
}

class RectanglePriceAxisView extends RectangleAxisView {
  update() {
    const series = this._source.series;
    this._pos = series.priceToCoordinate(this._p.price);
  }
  text() {
    return this._source._options.priceLabelFormatter(this._p.price);
  }
}

interface Point {
  time: Time;
  price: number;
}

export interface RectangleDrawingToolOptions {
  fillColor: string;
  previewFillColor: string;
  borderColor: string;
  borderWidth: number;
  labelColor: string;
  labelTextColor: string;
  showLabels: boolean;
  priceLabelFormatter: (price: number) => string;
  timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: RectangleDrawingToolOptions = {
  fillColor: "rgba(200, 50, 100, 0.75)",
  previewFillColor: "rgba(200, 50, 100, 0.25)",
  borderColor: "rgba(200, 50, 100, 1)",
  borderWidth: 2,
  labelColor: "rgba(200, 50, 100, 1)",
  labelTextColor: "white",
  showLabels: true,
  priceLabelFormatter: (price: number) => price.toFixed(2),
  timeLabelFormatter: (time: Time) => {
    if (typeof time == "string") return time;
    const date = isBusinessDay(time)
      ? new Date(time.year, time.month, time.day)
      : new Date(time * 1000);
    return date.toLocaleDateString();
  },
};

class Rectangle extends PluginBase {
  _options: RectangleDrawingToolOptions;
  _p1: Point;
  _p2: Point;
  _showHandles: boolean = false;
  _paneViews: RectanglePaneView[];
  _timeAxisViews: RectangleTimeAxisView[];
  _priceAxisViews: RectanglePriceAxisView[];
  _priceAxisPaneViews: RectanglePriceAxisPaneView[];
  _timeAxisPaneViews: RectangleTimeAxisPaneView[];

  constructor(
    p1: Point,
    p2: Point,
    options: Partial<RectangleDrawingToolOptions> = {}
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new RectanglePaneView(this)];
    this._timeAxisViews = [
      new RectangleTimeAxisView(this, p1),
      new RectangleTimeAxisView(this, p2),
    ];
    this._priceAxisViews = [
      new RectanglePriceAxisView(this, p1),
      new RectanglePriceAxisView(this, p2),
    ];
    this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
    this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
  }

  updateAllViews() {
    this._paneViews.forEach((pw) => pw.update());
    this._timeAxisViews.forEach((pw) => pw.update());
    this._priceAxisViews.forEach((pw) => pw.update());
    this._priceAxisPaneViews.forEach((pw) => pw.update());
    this._timeAxisPaneViews.forEach((pw) => pw.update());
  }

  priceAxisViews() {
    return this._priceAxisViews;
  }

  timeAxisViews() {
    return this._timeAxisViews;
  }

  paneViews() {
    return this._paneViews;
  }

  priceAxisPaneViews() {
    return this._priceAxisPaneViews;
  }

  timeAxisPaneViews() {
    return this._timeAxisPaneViews;
  }

  applyOptions(options: Partial<RectangleDrawingToolOptions>) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

  showHandles() {
    this._showHandles = true;
    this.requestUpdate();
  }

  hideHandles() {
    this._showHandles = false;
    this.requestUpdate();
  }
}

class PreviewRectangle extends Rectangle {
  constructor(
    p1: Point,
    p2: Point,
    options: Partial<RectangleDrawingToolOptions> = {}
  ) {
    super(p1, p2, options);
    this._options.fillColor = this._options.previewFillColor;
  }

  public updateEndPoint(p: Point) {
    this._p2 = p;
    this._paneViews[0].update();
    this._timeAxisViews[1].movePoint(p);
    this._priceAxisViews[1].movePoint(p);
    this.requestUpdate();
  }
}

export class RectangleDrawingTool {
  private _chart: IChartApi | undefined;
  private _series: ISeriesApi<SeriesType> | undefined;
  private _drawingsToolbarContainer: HTMLDivElement | undefined;
  private _defaultOptions: Partial<RectangleDrawingToolOptions>;
  private _rectangles: Rectangle[];
  private _previewRectangle: PreviewRectangle | undefined = undefined;
  private _points: Point[] = [];
  private _drawing: boolean = false;
  private _toolbarButton: HTMLDivElement | undefined;
  private _hoveredRectangle: Rectangle | undefined = undefined;
  private _isResizing: boolean = false;
  private _isMoving: boolean = false;
  private _resizeStartPoint: Point | undefined = undefined;
  private _resizeHandleType: string | undefined = undefined;
  private _moveStartPoint: Point | undefined = undefined;
  private _onHoverHandle?: (isHovering: boolean) => void;

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    drawingsToolbarContainer: HTMLDivElement,
    options: Partial<RectangleDrawingToolOptions>,
    onHoverHandle?: (isHovering: boolean) => void
  ) {
    this._chart = chart;
    this._series = series;
    this._drawingsToolbarContainer = drawingsToolbarContainer;
    this._onHoverHandle = onHoverHandle;
    this._addToolbarButton();
    this._defaultOptions = options;
    this._rectangles = [];
    this._chart.subscribeClick(this._clickHandler);
    this._chart.subscribeCrosshairMove(this._moveHandler);
    this._chart.subscribeCrosshairMove(this._resizeMouseUpHandler);

    // Add DOM mousedown handler for initiating resize
    const chartElement = this._chart.chartElement();
    if (chartElement) {
      this._onMouseDownDOM = this._handleMouseDownDOM.bind(this);
      chartElement.addEventListener("mousedown", this._onMouseDownDOM);

      // Add mouseup handler to reset cursor after panning
      chartElement.addEventListener("mouseup", () => {
        if (!this._isResizing) {
          chartElement.style.cursor = "default";
        }
      });
    }
  }

  private _clickHandler = (param: MouseEventParams) => this._onClick(param);
  private _moveHandler = (param: MouseEventParams) => this._onMouseMove(param);
  private _resizeMoveHandler = (param: MouseEventParams) =>
    this._onResizeMove(param);
  private _resizeMouseUpHandler = (param: MouseEventParams) =>
    this._onResizeMouseUp(param);
  private _domResizeMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private _domResizeMouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private _domMoveMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private _domMoveMouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private _onMouseDownDOM: ((e: MouseEvent) => void) | null = null;

  remove() {
    this.stopDrawing();
    this._cleanupResizeEventListeners();
    this._cleanupMoveEventListeners();
    if (this._chart) {
      this._chart.unsubscribeClick(this._clickHandler);
      this._chart.unsubscribeCrosshairMove(this._moveHandler);
      this._chart.unsubscribeCrosshairMove(this._resizeMouseUpHandler);

      const chartElement = this._chart.chartElement();
      if (chartElement && this._onMouseDownDOM) {
        chartElement.removeEventListener("mousedown", this._onMouseDownDOM);
        this._onMouseDownDOM = null;
      }
    }
    this._rectangles.forEach((rectangle) => {
      this._removeRectangle(rectangle);
    });
    this._rectangles = [];
    this._removePreviewRectangle();
    this._chart = undefined;
    this._series = undefined;
    this._drawingsToolbarContainer = undefined;
  }

  startDrawing(): void {
    this._drawing = true;
    this._points = [];
    if (this._toolbarButton) {
      this._toolbarButton.style.fill = "rgb(100, 150, 250, 0.25)";
    }
  }

  stopDrawing(): void {
    this._drawing = false;
    this._points = [];
    if (this._toolbarButton) {
      this._toolbarButton.style.fill = "rgb(0, 0, 0, 0.5)";
    }
  }

  isDrawing(): boolean {
    return this._drawing;
  }

  private _handleMouseDownDOM(e: MouseEvent) {
    if (!this._chart || !this._series) return;
    const chartElement = this._chart.chartElement();
    if (!chartElement) return;

    const rect = chartElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = this._chart.timeScale().coordinateToTime(x);
    const price = this._series.coordinateToPrice(y);
    if (time === null || price === null) return;

    const point = { time, price };

    for (const rectangle of this._rectangles) {
      const handleType = this._getHandleType(point, rectangle);
      if (handleType) {
        this._isResizing = true;
        this._resizeStartPoint = point;
        this._resizeHandleType = handleType;
        this._hoveredRectangle = rectangle;

        this._chart.applyOptions({
          handleScroll: {
            mouseWheel: false,
            pressedMouseMove: false,
            horzTouchDrag: false,
            vertTouchDrag: false,
          },
        });

        // Temporarily disable pointer events on chart to prevent interference
        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.pointerEvents = "none";
        }

        this._setupResizeEventListeners();
        e.preventDefault();
        console.log("Started resizing via DOM:", handleType); // Debug log
        return;
      } else if (this._isPointInsideRectangle(point, rectangle)) {
        // Start moving the rectangle
        this._isMoving = true;
        this._moveStartPoint = point;
        this._hoveredRectangle = rectangle;

        this._chart.applyOptions({
          handleScroll: {
            mouseWheel: false,
            pressedMouseMove: false,
            horzTouchDrag: false,
            vertTouchDrag: false,
          },
        });

        // Temporarily disable pointer events on chart to prevent interference
        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.pointerEvents = "none";
          chartElement.style.cursor = "grabbing";
        }

        this._setupMoveEventListeners();
        e.preventDefault();
        console.log("Started moving rectangle via DOM"); // Debug log
        return;
      }
    }

    // If not resizing or moving, set grabbing cursor for chart panning
    chartElement.style.cursor = "grabbing";
  }

  private _onClick(param: MouseEventParams) {
    if (!param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }

    // Handle drawing mode
    if (this._drawing) {
      this._addPoint({
        time: param.time,
        price,
      });
      return;
    }

    // Handle rectangle interaction (resize) - this is now handled by DOM mousedown
    const clickPoint = { time: param.time, price };

    // Check all rectangles for handle clicks, not just the hovered one
    for (const rectangle of this._rectangles) {
      const handleType = this._getHandleType(clickPoint, rectangle);
      if (handleType) {
        // Start resize mode
        this._isResizing = true;
        this._resizeStartPoint = clickPoint;
        this._resizeHandleType = handleType;
        this._hoveredRectangle = rectangle;

        // Disable chart scrolling only
        if (this._chart) {
          this._chart.applyOptions({
            handleScroll: {
              mouseWheel: false,
              pressedMouseMove: false,
              horzTouchDrag: false,
              vertTouchDrag: false,
            },
          });

          // Set up direct DOM event listeners for resize
          this._setupResizeEventListeners();
        }

        console.log("Started resizing:", handleType); // Debug log
        return;
      }
    }
  }

  private _onMouseMove(param: MouseEventParams) {
    if (!param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }

    // Handle drawing mode
    if (this._drawing && this._previewRectangle) {
      this._previewRectangle.updateEndPoint({
        time: param.time,
        price,
      });
      return;
    }

    // Handle resize mode - this should take priority over chart movement
    if (
      this._isResizing &&
      this._hoveredRectangle &&
      this._resizeStartPoint &&
      this._resizeHandleType
    ) {
      const newPoint = { time: param.time, price };

      // Update rectangle based on handle type
      this._resizeRectangle(
        this._hoveredRectangle,
        newPoint,
        this._resizeHandleType
      );

      // Notify chart component that we're resizing
      if (this._onHoverHandle) {
        this._onHoverHandle(true);
      }

      console.log("Resizing:", this._resizeHandleType, newPoint); // Debug log
      return;
    }

    // Handle hover for showing handles
    const mousePoint = { time: param.time, price };
    let foundHoveredRectangle = false;

    for (const rectangle of this._rectangles) {
      const handleType = this._getHandleType(mousePoint, rectangle);
      if (handleType) {
        this._hoveredRectangle = rectangle;
        rectangle.showHandles();
        this._setCursorForHandle(handleType);
        foundHoveredRectangle = true;

        // Notify chart component that we're hovering over a handle
        if (this._onHoverHandle) {
          this._onHoverHandle(true);
        }
        break;
      } else if (this._isPointInsideRectangle(mousePoint, rectangle)) {
        // Hovering inside rectangle (not on handles)
        this._hoveredRectangle = rectangle;
        rectangle.showHandles();
        if (this._chart) {
          const chartElement = this._chart.chartElement();
          if (chartElement) {
            chartElement.style.cursor = "grab";
          }
        }
        foundHoveredRectangle = true;
        break;
      }
    }

    // Reset if not hovering over any rectangle
    if (!foundHoveredRectangle && this._hoveredRectangle) {
      this._hoveredRectangle.hideHandles();
      this._hoveredRectangle = undefined;

      // Notify chart component that we're no longer hovering over a handle
      if (this._onHoverHandle) {
        this._onHoverHandle(false);
      }

      if (this._chart) {
        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.cursor = "default";
          chartElement.style.pointerEvents = "auto";
        }
      }
    } else if (!foundHoveredRectangle && this._chart) {
      // Set default cursor when not hovering over handles
      const chartElement = this._chart.chartElement();
      if (chartElement) {
        chartElement.style.cursor = "default";
      }
    }
  }

  private _resizeRectangle(
    rectangle: Rectangle,
    newPoint: Point,
    handleType: string
  ) {
    const timeScale = this._chart?.timeScale();
    const series = this._series;

    if (!timeScale || !series) return;

    // Calculate resize based on handle type
    switch (handleType) {
      case "nw-resize": // Top-left corner
        rectangle._p1 = newPoint;
        break;
      case "ne-resize": // Top-right corner
        rectangle._p1 = { time: rectangle._p1.time, price: newPoint.price };
        rectangle._p2 = { time: newPoint.time, price: rectangle._p2.price };
        break;
      case "se-resize": // Bottom-right corner
        rectangle._p2 = newPoint;
        break;
      case "sw-resize": // Bottom-left corner
        rectangle._p1 = { time: newPoint.time, price: rectangle._p1.price };
        rectangle._p2 = { time: rectangle._p2.time, price: newPoint.price };
        break;
      case "ns-resize": // Top/bottom handles
        // Determine if we're resizing from top or bottom handle
        const rectY1 = series.priceToCoordinate(rectangle._p1.price);
        const rectY2 = series.priceToCoordinate(rectangle._p2.price);
        const newY = series.priceToCoordinate(newPoint.price);

        if (rectY1 !== null && rectY2 !== null && newY !== null) {
          const minY = Math.min(rectY1, rectY2);
          const maxY = Math.max(rectY1, rectY2);

          // If mouse is closer to top, resize from top
          if (Math.abs(newY - minY) < Math.abs(newY - maxY)) {
            rectangle._p1 = { time: rectangle._p1.time, price: newPoint.price };
          } else {
            rectangle._p2 = { time: rectangle._p2.time, price: newPoint.price };
          }
        }
        break;
      case "ew-resize": // Left/right handles
        // Determine if we're resizing from left or right handle
        const rectX1 = timeScale.timeToCoordinate(rectangle._p1.time);
        const rectX2 = timeScale.timeToCoordinate(rectangle._p2.time);
        const newX = timeScale.timeToCoordinate(newPoint.time);

        if (rectX1 !== null && rectX2 !== null && newX !== null) {
          const minX = Math.min(rectX1, rectX2);
          const maxX = Math.max(rectX1, rectX2);

          // If mouse is closer to left, resize from left
          if (Math.abs(newX - minX) < Math.abs(newX - maxX)) {
            rectangle._p1 = { time: newPoint.time, price: rectangle._p1.price };
          } else {
            rectangle._p2 = { time: newPoint.time, price: rectangle._p2.price };
          }
        }
        break;
    }

    rectangle.updateAllViews();
  }

  private _onResizeMove(param: MouseEventParams) {
    if (!param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) {
      return;
    }

    // Handle resize mode
    if (
      this._isResizing &&
      this._hoveredRectangle &&
      this._resizeStartPoint &&
      this._resizeHandleType
    ) {
      const newPoint = { time: param.time, price };

      // Update rectangle based on handle type
      this._resizeRectangle(
        this._hoveredRectangle,
        newPoint,
        this._resizeHandleType
      );

      // Notify chart component that we're resizing
      if (this._onHoverHandle) {
        this._onHoverHandle(true);
      }

      console.log("Resizing:", this._resizeHandleType, newPoint); // Debug log
    }
  }

  private _onResizeMouseUp(param: MouseEventParams) {
    // Stop resizing when mouse is released
    if (this._isResizing) {
      this._isResizing = false;
      this._resizeStartPoint = undefined;
      this._resizeHandleType = undefined;

      // Notify chart component that we're no longer resizing
      if (this._onHoverHandle) {
        this._onHoverHandle(false);
      }

      // Re-enable chart scrolling
      if (this._chart) {
        this._chart.applyOptions({
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
          },
        });

        // Re-subscribe to chart events
        this._chart.subscribeCrosshairMove(this._moveHandler);
        this._chart.subscribeCrosshairMove(this._resizeMouseUpHandler);

        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.cursor = "default";
        }
      }
    }
  }

  private _setupResizeEventListeners() {
    if (!this._chart) return;

    const chartElement = this._chart.chartElement();
    if (!chartElement) return;

    console.log("Setting up DOM resize event listeners"); // Debug log

    // Remove existing listeners if any
    this._cleanupResizeEventListeners();

    // Temporarily unsubscribe from chart events to prevent interference
    this._chart.unsubscribeCrosshairMove(this._moveHandler);
    this._chart.unsubscribeCrosshairMove(this._resizeMouseUpHandler);

    // Add direct DOM event listeners
    this._domResizeMouseMoveHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("DOM mousemove event triggered"); // Debug log

      if (
        !this._isResizing ||
        !this._hoveredRectangle ||
        !this._resizeHandleType
      ) {
        console.log("Resize conditions not met:", {
          isResizing: this._isResizing,
          hasHoveredRectangle: !!this._hoveredRectangle,
          resizeHandleType: this._resizeHandleType,
        });
        return;
      }

      const rect = chartElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log("Mouse position:", {
        clientX: e.clientX,
        clientY: e.clientY,
        x,
        y,
      }); // Debug log

      // Convert screen coordinates to chart coordinates
      const timeScale = this._chart?.timeScale();
      const series = this._series;

      if (!timeScale || !series) return;

      const time = timeScale.coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) {
        console.log("Failed to convert coordinates:", { x, y, time, price }); // Debug log
        return;
      }

      const newPoint = { time, price };

      // Update rectangle based on handle type
      this._resizeRectangle(
        this._hoveredRectangle,
        newPoint,
        this._resizeHandleType
      );

      // Force chart update to show real-time changes
      if (this._chart) {
        // Force a chart redraw
        this._chart.applyOptions({});
      }

      // Notify chart component that we're resizing
      if (this._onHoverHandle) {
        this._onHoverHandle(true);
      }

      console.log("Resizing via DOM:", this._resizeHandleType, newPoint);
    };

    this._domResizeMouseUpHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("DOM mouseup event triggered"); // Debug log

      this._cleanupResizeEventListeners();

      // Stop resizing
      this._isResizing = false;
      this._resizeStartPoint = undefined;
      this._resizeHandleType = undefined;

      // Notify chart component that we're no longer resizing
      if (this._onHoverHandle) {
        this._onHoverHandle(false);
      }

      // Re-enable chart scrolling and resubscribe to chart events
      if (this._chart) {
        this._chart.applyOptions({
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
          },
        });

        // Resubscribe to chart events
        this._chart.subscribeCrosshairMove(this._moveHandler);
        this._chart.subscribeCrosshairMove(this._resizeMouseUpHandler);

        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.cursor = "default";
          chartElement.style.pointerEvents = "auto";
        }
      }
    };

    // Add event listeners
    document.addEventListener("mousemove", this._domResizeMouseMoveHandler);
    document.addEventListener("mouseup", this._domResizeMouseUpHandler);
  }

  private _setupMoveEventListeners() {
    if (!this._chart) return;

    const chartElement = this._chart.chartElement();
    if (!chartElement) return;

    console.log("Setting up DOM move event listeners"); // Debug log

    // Remove existing listeners if any
    this._cleanupMoveEventListeners();

    // Temporarily unsubscribe from chart events to prevent interference
    this._chart.unsubscribeCrosshairMove(this._moveHandler);
    this._chart.unsubscribeCrosshairMove(this._resizeMouseUpHandler);

    // Add direct DOM event listeners for moving
    this._domMoveMouseMoveHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("DOM mousemove event triggered for moving"); // Debug log

      if (!this._isMoving || !this._hoveredRectangle || !this._moveStartPoint) {
        console.log("Move conditions not met:", {
          isMoving: this._isMoving,
          hasHoveredRectangle: !!this._hoveredRectangle,
          moveStartPoint: this._moveStartPoint,
        });
        return;
      }

      const rect = chartElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log("Mouse position for moving:", {
        clientX: e.clientX,
        clientY: e.clientY,
        x,
        y,
      }); // Debug log

      // Convert screen coordinates to chart coordinates
      const timeScale = this._chart?.timeScale();
      const series = this._series;

      if (!timeScale || !series) return;

      const time = timeScale.coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) {
        console.log("Failed to convert coordinates for moving:", {
          x,
          y,
          time,
          price,
        }); // Debug log
        return;
      }

      const newPoint = { time, price };

      // Calculate the price offset from the start point
      const priceOffset = newPoint.price - this._moveStartPoint!.price;

      // Move the rectangle by the offset while maintaining shape
      const rectangle = this._hoveredRectangle;

      // Calculate the time difference and apply it to both points
      if (timeScale) {
        const startX = timeScale.timeToCoordinate(this._moveStartPoint!.time);
        const currentX = timeScale.timeToCoordinate(newPoint.time);
        const startP1X = timeScale.timeToCoordinate(rectangle._p1.time);
        const startP2X = timeScale.timeToCoordinate(rectangle._p2.time);

        if (
          startX !== null &&
          currentX !== null &&
          startP1X !== null &&
          startP2X !== null
        ) {
          const xOffset = currentX - startX;
          const newP1X = startP1X + xOffset;
          const newP2X = startP2X + xOffset;

          const newP1Time = timeScale.coordinateToTime(newP1X);
          const newP2Time = timeScale.coordinateToTime(newP2X);

          if (newP1Time !== null && newP2Time !== null) {
            rectangle._p1 = {
              time: newP1Time,
              price: rectangle._p1.price + priceOffset,
            };
            rectangle._p2 = {
              time: newP2Time,
              price: rectangle._p2.price + priceOffset,
            };
          }
        }
      }

      // Update the start point for the next move
      this._moveStartPoint = newPoint;

      // Force a chart redraw
      if (this._chart) {
        this._chart.applyOptions({});
      }

      // Update all views
      rectangle.updateAllViews();

      console.log("Moving rectangle:", { priceOffset });
    };

    this._domMoveMouseUpHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("DOM mouseup event triggered for moving"); // Debug log

      this._cleanupMoveEventListeners();

      // Stop moving
      this._isMoving = false;
      this._moveStartPoint = undefined;

      // Re-enable chart scrolling and resubscribe to chart events
      if (this._chart) {
        this._chart.applyOptions({
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
          },
        });

        // Resubscribe to chart events
        this._chart.subscribeCrosshairMove(this._moveHandler);
        this._chart.subscribeCrosshairMove(this._resizeMouseUpHandler);

        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.cursor = "default";
          chartElement.style.pointerEvents = "auto";
        }
      }
    };

    // Add event listeners
    document.addEventListener("mousemove", this._domMoveMouseMoveHandler);
    document.addEventListener("mouseup", this._domMoveMouseUpHandler);
  }

  private _cleanupMoveEventListeners() {
    if (this._domMoveMouseMoveHandler) {
      document.removeEventListener("mousemove", this._domMoveMouseMoveHandler);
      this._domMoveMouseMoveHandler = null;
    }
    if (this._domMoveMouseUpHandler) {
      document.removeEventListener("mouseup", this._domMoveMouseUpHandler);
      this._domMoveMouseUpHandler = null;
    }
  }

  private _cleanupResizeEventListeners() {
    if (this._domResizeMouseMoveHandler) {
      document.removeEventListener(
        "mousemove",
        this._domResizeMouseMoveHandler
      );
      this._domResizeMouseMoveHandler = null;
    }
    if (this._domResizeMouseUpHandler) {
      document.removeEventListener("mouseup", this._domResizeMouseUpHandler);
      this._domResizeMouseUpHandler = null;
    }
  }

  private _getHandleType(point: Point, rectangle: Rectangle): string | null {
    const timeScale = this._chart?.timeScale();
    const series = this._series;

    if (!timeScale || !series) return null;

    const pointX = timeScale.timeToCoordinate(point.time);
    const pointY = series.priceToCoordinate(point.price);

    const rectX1 = timeScale.timeToCoordinate(rectangle._p1.time);
    const rectY1 = series.priceToCoordinate(rectangle._p1.price);
    const rectX2 = timeScale.timeToCoordinate(rectangle._p2.time);
    const rectY2 = series.priceToCoordinate(rectangle._p2.price);

    if (
      pointX === null ||
      pointY === null ||
      rectX1 === null ||
      rectY1 === null ||
      rectX2 === null ||
      rectY2 === null
    ) {
      return null;
    }

    const minX = Math.min(rectX1, rectX2);
    const maxX = Math.max(rectX1, rectX2);
    const minY = Math.min(rectY1, rectY2);
    const maxY = Math.max(rectY1, rectY2);

    // Calculate rectangle dimensions for adaptive tolerance
    const rectWidth = maxX - minX;
    const rectHeight = maxY - minY;
    const isSmallRectangle = rectWidth < 40 || rectHeight < 40;

    // Use larger tolerance for small rectangles
    const cornerTolerance = isSmallRectangle ? 20 : 12;
    const sideHandleSize = isSmallRectangle ? 24 : 16;

    if (
      Math.abs(pointX - minX) <= cornerTolerance &&
      Math.abs(pointY - minY) <= cornerTolerance
    ) {
      return "nw-resize"; // Top-left
    }
    if (
      Math.abs(pointX - maxX) <= cornerTolerance &&
      Math.abs(pointY - minY) <= cornerTolerance
    ) {
      return "ne-resize"; // Top-right
    }
    if (
      Math.abs(pointX - maxX) <= cornerTolerance &&
      Math.abs(pointY - maxY) <= cornerTolerance
    ) {
      return "se-resize"; // Bottom-right
    }
    if (
      Math.abs(pointX - minX) <= cornerTolerance &&
      Math.abs(pointY - maxY) <= cornerTolerance
    ) {
      return "sw-resize"; // Bottom-left
    }

    // Check side handles with adaptive tolerance
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Top handle
    if (
      Math.abs(pointX - centerX) <= sideHandleSize / 2 &&
      Math.abs(pointY - minY) <= sideHandleSize / 2
    ) {
      return "ns-resize";
    }
    // Bottom handle
    if (
      Math.abs(pointX - centerX) <= sideHandleSize / 2 &&
      Math.abs(pointY - maxY) <= sideHandleSize / 2
    ) {
      return "ns-resize";
    }
    // Left handle
    if (
      Math.abs(pointX - minX) <= sideHandleSize / 2 &&
      Math.abs(pointY - centerY) <= sideHandleSize / 2
    ) {
      return "ew-resize";
    }
    // Right handle
    if (
      Math.abs(pointX - maxX) <= sideHandleSize / 2 &&
      Math.abs(pointY - centerY) <= sideHandleSize / 2
    ) {
      return "ew-resize";
    }

    return null;
  }

  private _setCursorForHandle(handleType: string) {
    if (this._chart) {
      // Set cursor based on handle type
      const chartElement = this._chart.chartElement();
      if (chartElement) {
        chartElement.style.cursor = handleType;
      }
    }
  }

  private _isPointInsideRectangle(point: Point, rectangle: Rectangle): boolean {
    const timeScale = this._chart?.timeScale();
    const series = this._series;

    if (!timeScale || !series) return false;

    const pointX = timeScale.timeToCoordinate(point.time);
    const pointY = series.priceToCoordinate(point.price);

    const rectX1 = timeScale.timeToCoordinate(rectangle._p1.time);
    const rectY1 = series.priceToCoordinate(rectangle._p1.price);
    const rectX2 = timeScale.timeToCoordinate(rectangle._p2.time);
    const rectY2 = series.priceToCoordinate(rectangle._p2.price);

    if (
      pointX === null ||
      pointY === null ||
      rectX1 === null ||
      rectY1 === null ||
      rectX2 === null ||
      rectY2 === null
    ) {
      return false;
    }

    const minX = Math.min(rectX1, rectX2);
    const maxX = Math.max(rectX1, rectX2);
    const minY = Math.min(rectY1, rectY2);
    const maxY = Math.max(rectY1, rectY2);

    // Check if point is inside the rectangle (not on handles)
    const rectWidth = maxX - minX;
    const rectHeight = maxY - minY;

    // For very small rectangles (less than 30px in either dimension), allow clicking anywhere inside
    if (rectWidth < 30 || rectHeight < 30) {
      return (
        pointX >= minX && pointX <= maxX && pointY >= minY && pointY <= maxY
      );
    }

    // For medium rectangles (30-60px), use smaller exclusion area
    if (rectWidth < 60 || rectHeight < 60) {
      const exclusion = Math.min(8, Math.min(rectWidth, rectHeight) / 4);
      const insideX = pointX > minX + exclusion && pointX < maxX - exclusion;
      const insideY = pointY > minY + exclusion && pointY < maxY - exclusion;
      return insideX && insideY;
    }

    // For larger rectangles, avoid handle areas
    const insideX = pointX > minX + 12 && pointX < maxX - 12;
    const insideY = pointY > minY + 12 && pointY < maxY - 12;

    return insideX && insideY;
  }

  private _isPointNearRectangleBorder(
    point: Point,
    rectangle: Rectangle
  ): boolean {
    const tolerance = 5; // pixels
    const timeScale = this._chart?.timeScale();
    const series = this._series;

    if (!timeScale || !series) return false;

    const pointX = timeScale.timeToCoordinate(point.time);
    const pointY = series.priceToCoordinate(point.price);

    const rectX1 = timeScale.timeToCoordinate(rectangle._p1.time);
    const rectY1 = series.priceToCoordinate(rectangle._p1.price);
    const rectX2 = timeScale.timeToCoordinate(rectangle._p2.time);
    const rectY2 = series.priceToCoordinate(rectangle._p2.price);

    if (
      pointX === null ||
      pointY === null ||
      rectX1 === null ||
      rectY1 === null ||
      rectX2 === null ||
      rectY2 === null
    ) {
      return false;
    }

    const minX = Math.min(rectX1, rectX2);
    const maxX = Math.max(rectX1, rectX2);
    const minY = Math.min(rectY1, rectY2);
    const maxY = Math.max(rectY1, rectY2);

    // Check if point is near the border
    const nearLeft = Math.abs(pointX - minX) <= tolerance;
    const nearRight = Math.abs(pointX - maxX) <= tolerance;
    const nearTop = Math.abs(pointY - minY) <= tolerance;
    const nearBottom = Math.abs(pointY - maxY) <= tolerance;

    const insideX = pointX >= minX && pointX <= maxX;
    const insideY = pointY >= minY && pointY <= maxY;

    return (
      (insideX && (nearTop || nearBottom)) ||
      (insideY && (nearLeft || nearRight))
    );
  }

  private _addPoint(p: Point) {
    this._points.push(p);
    if (this._points.length >= 2) {
      this._addNewRectangle(this._points[0], this._points[1]);
      this.stopDrawing();
      this._removePreviewRectangle();
    }
    if (this._points.length === 1) {
      this._addPreviewRectangle(this._points[0]);
    }
  }

  private _addNewRectangle(p1: Point, p2: Point) {
    const rectangle = new Rectangle(p1, p2, { ...this._defaultOptions });
    this._rectangles.push(rectangle);
    ensureDefined(this._series).attachPrimitive(rectangle);
  }

  private _removeRectangle(rectangle: Rectangle) {
    ensureDefined(this._series).detachPrimitive(rectangle);
  }

  private _addPreviewRectangle(p: Point) {
    this._previewRectangle = new PreviewRectangle(p, p, {
      ...this._defaultOptions,
    });
    ensureDefined(this._series).attachPrimitive(this._previewRectangle);
  }

  private _removePreviewRectangle() {
    if (this._previewRectangle) {
      ensureDefined(this._series).detachPrimitive(this._previewRectangle);
      this._previewRectangle = undefined;
    }
  }

  private _addToolbarButton() {
    if (!this._drawingsToolbarContainer) return;
    const button = document.createElement("div");
    button.style.width = "20px";
    button.style.height = "20px";
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M315.4 15.5C309.7 5.9 299.2 0 288 0s-21.7 5.9-27.4 15.5l-96 160c-5.9 9.9-6.1 22.2-.4 32.2s16.3 16.2 27.8 16.2H384c11.5 0 22.2-6.2 27.8-16.2s5.5-22.3-.4-32.2l-96-160zM288 312V456c0 22.1 17.9 40 40 40H472c22.1 0 40-17.9 40-40V312c0-22.1-17.9-40-40-40H328c-22.1 0-40 17.9-40 40zM128 512a128 128 0 1 0 0-256 128 128 0 1 0 0 256z"/></svg>`;
    button.addEventListener("click", () => {
      if (this.isDrawing()) {
        this.stopDrawing();
      } else {
        this.startDrawing();
      }
    });
    this._drawingsToolbarContainer.appendChild(button);
    this._toolbarButton = button;
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = "#C83264";
    colorPicker.style.width = "24px";
    colorPicker.style.height = "20px";
    colorPicker.style.border = "none";
    colorPicker.style.padding = "0px";
    colorPicker.style.backgroundColor = "transparent";
    colorPicker.addEventListener("change", () => {
      const newColor = colorPicker.value;
      this._defaultOptions.fillColor = newColor + "CC";
      this._defaultOptions.previewFillColor = newColor + "77";
      this._defaultOptions.labelColor = newColor;
    });
    this._drawingsToolbarContainer.appendChild(colorPicker);
  }
}
