import { CanvasRenderingTarget2D } from "fancy-canvas";
import {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  Coordinate,
  Time,
  SeriesType,
  PrimitivePaneViewZOrder,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesPrimitiveAxisView,
} from "lightweight-charts";
import { PluginBase } from "./base";

interface Point {
  time: Time;
  price: number;
}

interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
}

export interface TrendLineDrawingToolOptions {
  lineColor: string;
  previewLineColor: string;
  lineWidth: number;
  borderColor: string;
  borderWidth: number;
  labelColor: string;
  labelTextColor: string;
  showLabels: boolean;
  priceLabelFormatter: (price: number) => string;
  timeLabelFormatter: (time: Time) => string;
}

class TrendLinePaneRenderer implements IPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _lineColor: string;
  _lineWidth: number;
  _borderColor: string;
  _borderWidth: number;
  _showHandles: boolean;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    lineColor: string,
    lineWidth: number,
    borderColor: string,
    borderWidth: number,
    showHandles: boolean = false
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._lineColor = lineColor;
    this._lineWidth = lineWidth;
    this._borderColor = borderColor;
    this._borderWidth = borderWidth;
    this._showHandles = showHandles;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(({ context: ctx }) => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null
      ) {
        return;
      }

      // Draw the trend line
      ctx.strokeStyle = this._lineColor;
      ctx.lineWidth = this._lineWidth;
      ctx.beginPath();
      ctx.moveTo(this._p1.x, this._p1.y);
      ctx.lineTo(this._p2.x, this._p2.y);
      ctx.stroke();

      // Draw handles if needed
      if (this._showHandles) {
        this._drawHandles(ctx);
      }
    });
  }

  private _drawHandles(ctx: CanvasRenderingContext2D) {
    const handleSize = 6; // Match rectangle corner handle size
    const handleColor = "#171B26"; // Dark color for handles (same as rectangle)
    const handleStrokeColor = this._borderColor; // Use border color for stroke

    ctx.fillStyle = handleColor;
    ctx.strokeStyle = handleStrokeColor;
    ctx.lineWidth = this._borderWidth;

    // Draw start handle (circle)
    if (this._p1.x !== null && this._p1.y !== null) {
      ctx.beginPath();
      ctx.arc(this._p1.x, this._p1.y, handleSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Draw end handle (circle)
    if (this._p2.x !== null && this._p2.y !== null) {
      ctx.beginPath();
      ctx.arc(this._p2.x, this._p2.y, handleSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }
}

class TrendLinePaneView implements IPrimitivePaneView {
  _source: TrendLine;
  _p1: ViewPoint = { x: null, y: null };
  _p2: ViewPoint = { x: null, y: null };

  constructor(source: TrendLine) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    this._p1.x = timeScale.timeToCoordinate(this._source._p1.time);
    this._p1.y = series.priceToCoordinate(this._source._p1.price);
    this._p2.x = timeScale.timeToCoordinate(this._source._p2.time);
    this._p2.y = series.priceToCoordinate(this._source._p2.price);
  }

  renderer() {
    return new TrendLinePaneRenderer(
      this._p1,
      this._p2,
      this._source._options.lineColor,
      this._source._options.lineWidth,
      this._source._options.borderColor,
      this._source._options.borderWidth,
      this._source._showHandles
    );
  }

  zOrder(): PrimitivePaneViewZOrder {
    return "normal";
  }
}

class TrendLineAxisPaneRenderer implements IPrimitivePaneRenderer {
  _p1: number | null;
  _p2: number | null;
  _lineColor: string;
  _vertical: boolean = false;

  constructor(
    p1: number | null,
    p2: number | null,
    lineColor: string,
    vertical: boolean
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._lineColor = lineColor;
    this._vertical = vertical;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(({ context: ctx }) => {
      if (this._p1 === null || this._p2 === null) return;

      ctx.strokeStyle = this._lineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      if (this._vertical) {
        ctx.moveTo(this._p1, 0);
        ctx.lineTo(this._p2, 0);
      } else {
        ctx.moveTo(0, this._p1);
        ctx.lineTo(0, this._p2);
      }

      ctx.stroke();
    });
  }
}

abstract class TrendLineAxisPaneView implements IPrimitivePaneView {
  _source: TrendLine;
  _p1: number | null = null;
  _p2: number | null = null;
  _vertical: boolean = false;

  constructor(source: TrendLine, vertical: boolean) {
    this._source = source;
    this._vertical = vertical;
  }

  abstract getPoints(): [Coordinate | null, Coordinate | null];

  update() {
    const [p1, p2] = this.getPoints();
    this._p1 = p1;
    this._p2 = p2;
  }

  renderer() {
    return new TrendLineAxisPaneRenderer(
      this._p1,
      this._p2,
      this._source._options.lineColor,
      this._vertical
    );
  }

  zOrder(): PrimitivePaneViewZOrder {
    return "normal";
  }
}

class TrendLinePriceAxisPaneView extends TrendLineAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    return [
      series.priceToCoordinate(this._source._p1.price),
      series.priceToCoordinate(this._source._p2.price),
    ];
  }
}

class TrendLineTimeAxisPaneView extends TrendLineAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();
    return [
      timeScale.timeToCoordinate(this._source._p1.time),
      timeScale.timeToCoordinate(this._source._p2.time),
    ];
  }
}

abstract class TrendLineAxisView implements ISeriesPrimitiveAxisView {
  _source: TrendLine;
  _p: Point;
  _pos: Coordinate | null = null;

  constructor(source: TrendLine, p: Point) {
    this._source = source;
    this._p = p;
  }

  abstract update(): void;
  abstract text(): string;

  coordinate() {
    return this._pos ?? 0;
  }

  visible(): boolean {
    return false; // Hide axis labels
  }

  tickVisible(): boolean {
    return false; // Hide axis ticks
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

class TrendLineTimeAxisView extends TrendLineAxisView {
  update() {
    const timeScale = this._source.chart.timeScale();
    this._pos = timeScale.timeToCoordinate(this._p.time);
  }

  text() {
    return this._source._options.timeLabelFormatter(this._p.time);
  }
}

class TrendLinePriceAxisView extends TrendLineAxisView {
  update() {
    const series = this._source.series;
    this._pos = series.priceToCoordinate(this._p.price);
  }

  text() {
    return this._source._options.priceLabelFormatter(this._p.price);
  }
}

class TrendLine extends PluginBase {
  _options: TrendLineDrawingToolOptions;
  _p1: Point;
  _p2: Point;
  _showHandles: boolean = false;
  _paneViews: TrendLinePaneView[];
  _timeAxisViews: TrendLineTimeAxisView[];
  _priceAxisViews: TrendLinePriceAxisView[];
  _priceAxisPaneViews: TrendLinePriceAxisPaneView[];
  _timeAxisPaneViews: TrendLineTimeAxisPaneView[];

  constructor(
    p1: Point,
    p2: Point,
    options: Partial<TrendLineDrawingToolOptions> = {}
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._options = {
      lineColor: "#2962FF",
      previewLineColor: "#2962FF80",
      lineWidth: 2,
      borderColor: "#2962FF",
      borderWidth: 1,
      labelColor: "#2962FF",
      labelTextColor: "#ffffff",
      showLabels: true,
      priceLabelFormatter: (price: number) => price.toFixed(2),
      timeLabelFormatter: (time: Time) => time.toString(),
      ...options,
    };

    this._paneViews = [new TrendLinePaneView(this)];
    this._timeAxisViews = [
      new TrendLineTimeAxisView(this, p1),
      new TrendLineTimeAxisView(this, p2),
    ];
    this._priceAxisViews = [
      new TrendLinePriceAxisView(this, p1),
      new TrendLinePriceAxisView(this, p2),
    ];
    this._priceAxisPaneViews = [new TrendLinePriceAxisPaneView(this, true)];
    this._timeAxisPaneViews = [new TrendLineTimeAxisPaneView(this, false)];
  }

  updateAllViews() {
    this._paneViews.forEach((view) => view.update());
    this._timeAxisViews.forEach((view) => view.update());
    this._priceAxisViews.forEach((view) => view.update());
    this._priceAxisPaneViews.forEach((view) => view.update());
    this._timeAxisPaneViews.forEach((view) => view.update());
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

  applyOptions(options: Partial<TrendLineDrawingToolOptions>) {
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

class PreviewTrendLine extends TrendLine {
  constructor(
    p1: Point,
    p2: Point,
    options: Partial<TrendLineDrawingToolOptions> = {}
  ) {
    super(p1, p2, {
      lineColor: options.previewLineColor || "#2962FF80",
      ...options,
    });
  }

  public updateEndPoint(p: Point) {
    this._p2 = p;
    this.updateAllViews();
  }
}

export class TrendLineDrawingTool {
  private _chart: IChartApi | undefined;
  private _series: ISeriesApi<SeriesType> | undefined;
  private _drawingsToolbarContainer: HTMLDivElement | undefined;
  private _defaultOptions: Partial<TrendLineDrawingToolOptions>;
  private _trendLines: TrendLine[];
  private _previewTrendLine: PreviewTrendLine | undefined = undefined;
  private _points: Point[] = [];
  private _drawing: boolean = false;
  private _toolbarButton: HTMLDivElement | undefined;
  private _hoveredTrendLine: TrendLine | undefined = undefined;
  private _isResizing: boolean = false;
  private _isMoving: boolean = false;
  private _resizeStartPoint: Point | undefined = undefined;
  private _resizeHandleType: string | undefined = undefined;
  private _moveStartPoint: Point | undefined = undefined;
  private _onHoverHandle?: (isHovering: boolean) => void;
  private _redrawScheduled: boolean = false;
  private _lastMoveTime: number = 0;

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    drawingsToolbarContainer: HTMLDivElement,
    options: Partial<TrendLineDrawingToolOptions>,
    onHoverHandle?: (isHovering: boolean) => void
  ) {
    this._chart = chart;
    this._series = series;
    this._drawingsToolbarContainer = drawingsToolbarContainer;
    this._defaultOptions = options;
    this._trendLines = [];
    this._onHoverHandle = onHoverHandle;

    this._addToolbarButton();
    this._setupEventListeners();
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
    if (this._chart) {
      this._chart.unsubscribeClick(this._clickHandler);
      this._chart.unsubscribeCrosshairMove(this._moveHandler);
      this._chart.unsubscribeCrosshairMove(this._resizeMoveHandler);
      this._chart.unsubscribeClick(this._resizeMouseUpHandler);
    }

    this._cleanupResizeEventListeners();
    this._cleanupMoveEventListeners();

    if (this._onMouseDownDOM && this._chart) {
      const chartElement = this._chart.chartElement();
      if (chartElement) {
        chartElement.removeEventListener("mousedown", this._onMouseDownDOM);
      }
    }

    // Remove all trend lines
    this._trendLines.forEach((trendLine) => {
      if (this._series) {
        this._series.detachPrimitive(trendLine);
      }
    });

    this._removePreviewTrendLine();

    if (this._toolbarButton) {
      this._toolbarButton.remove();
    }
  }

  startDrawing(): void {
    this._drawing = true;
    this._points = [];
    if (this._toolbarButton) {
      this._toolbarButton.classList.add("active");
    }
  }

  stopDrawing(): void {
    this._drawing = false;
    this._points = [];
    this._removePreviewTrendLine();
    if (this._toolbarButton) {
      this._toolbarButton.classList.remove("active");
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

    // Convert screen coordinates to chart coordinates
    const timeScale = this._chart?.timeScale();
    if (!timeScale) return;

    const time = timeScale.coordinateToTime(x);
    const price = this._series.coordinateToPrice(y);

    if (time === null || price === null) return;

    const point = { time, price };

    // Check if clicking on a handle for resizing
    const handleType = this._getHandleType(point);
    if (handleType && this._hoveredTrendLine) {
      this._isResizing = true;
      this._resizeStartPoint = point;
      this._resizeHandleType = handleType;

      // Disable chart scrolling
      this._chart.applyOptions({
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: false,
          horzTouchDrag: false,
          vertTouchDrag: false,
        },
      });

      // Disable pointer events on chart element
      chartElement.style.pointerEvents = "none";
      chartElement.style.cursor = "grabbing";

      this._setupResizeEventListeners();
      return;
    }

    // Check if clicking inside a trend line for moving
    if (
      this._hoveredTrendLine &&
      this._isPointOnTrendLine(point, this._hoveredTrendLine)
    ) {
      this._isMoving = true;
      this._moveStartPoint = point;

      // Disable chart scrolling
      this._chart.applyOptions({
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: false,
          horzTouchDrag: false,
          vertTouchDrag: false,
        },
      });

      // Disable pointer events on chart element
      chartElement.style.pointerEvents = "none";
      chartElement.style.cursor = "grabbing";

      this._setupMoveEventListeners();
      return;
    }

    // If not clicking on handles or trend line, allow normal chart interaction
    // Reset cursor and pointer events
    chartElement.style.cursor = "default";
    chartElement.style.pointerEvents = "auto";
  }

  private _setupEventListeners() {
    if (this._chart) {
      this._chart.subscribeClick(this._clickHandler);
      this._chart.subscribeCrosshairMove(this._moveHandler);

      // Add DOM event listener for mousedown
      const chartElement = this._chart.chartElement();
      if (chartElement) {
        this._onMouseDownDOM = this._handleMouseDownDOM.bind(this);
        chartElement.addEventListener("mousedown", this._onMouseDownDOM);

        // Add mouseup listener to reset cursor
        chartElement.addEventListener("mouseup", () => {
          if (!this._isResizing && !this._isMoving) {
            chartElement.style.cursor = "default";
          }
        });
      }

      // Add keyboard event listeners for shift key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Shift") {
          this._shiftPressed = true;
        }
      });

      document.addEventListener("keyup", (e) => {
        if (e.key === "Shift") {
          this._shiftPressed = false;
        }
      });
    }
  }

  private _onClick(param: MouseEventParams) {
    if (!param.point || !param.time || !this._series) return;

    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) return;

    const point = { time: param.time, price };

    // Handle drawing mode
    if (this._drawing) {
      this._addPoint(point);
      return;
    }

    // Handle resize mode
    if (this._isResizing && this._hoveredTrendLine && this._resizeStartPoint) {
      this._resizeTrendLine(
        this._hoveredTrendLine,
        point,
        this._resizeHandleType!
      );
      this._isResizing = false;
      this._resizeStartPoint = undefined;
      this._resizeHandleType = undefined;

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
      }
      return;
    }
  }

  private _onMouseMove(param: MouseEventParams) {
    if (!param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) return;

    // Handle drawing mode
    if (this._drawing && this._previewTrendLine) {
      const isLevelLine = this._isShiftHeld();
      const endPoint = isLevelLine
        ? { time: param.time, price: this._points[0].price }
        : { time: param.time, price };

      this._previewTrendLine.updateEndPoint(endPoint);

      // Use requestAnimationFrame to batch updates and avoid rendering artifacts
      if (this._chart && !this._redrawScheduled) {
        this._redrawScheduled = true;
        requestAnimationFrame(() => {
          if (this._chart) {
            this._chart.applyOptions({});
          }
          this._redrawScheduled = false;
        });
      }
      return;
    }

    // Handle resize mode
    if (
      this._isResizing &&
      this._hoveredTrendLine &&
      this._resizeStartPoint &&
      this._resizeHandleType
    ) {
      const newPoint = { time: param.time, price };
      this._resizeTrendLine(
        this._hoveredTrendLine,
        newPoint,
        this._resizeHandleType
      );
      return;
    }

    // Handle hover for showing handles
    const mousePoint = { time: param.time, price };
    let foundHoveredTrendLine = false;

    for (const trendLine of this._trendLines) {
      const handleType = this._getHandleType(mousePoint);
      if (handleType && this._hoveredTrendLine === trendLine) {
        trendLine.showHandles();
        this._setCursorForHandle(handleType);
        foundHoveredTrendLine = true;

        if (this._onHoverHandle) {
          this._onHoverHandle(true);
        }
        break;
      } else if (this._isPointOnTrendLine(mousePoint, trendLine)) {
        // Hovering on trend line (not on handles)
        this._hoveredTrendLine = trendLine;
        trendLine.showHandles();
        if (this._chart) {
          const chartElement = this._chart.chartElement();
          if (chartElement) {
            chartElement.style.cursor = "grab";
          }
        }
        foundHoveredTrendLine = true;
        break;
      }
    }

    // Reset if not hovering over any trend line
    if (!foundHoveredTrendLine && this._hoveredTrendLine) {
      this._hoveredTrendLine.hideHandles();
      this._hoveredTrendLine = undefined;

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
    } else if (!foundHoveredTrendLine && this._chart) {
      const chartElement = this._chart.chartElement();
      if (chartElement) {
        chartElement.style.cursor = "default";
      }
    }
  }

  private _resizeTrendLine(
    trendLine: TrendLine,
    newPoint: Point,
    handleType: string
  ) {
    if (handleType === "start") {
      trendLine._p1 = newPoint;
    } else if (handleType === "end") {
      trendLine._p2 = newPoint;
    }

    // Update all views
    trendLine.updateAllViews();

    // Force a chart redraw to ensure updates are visible
    if (this._chart) {
      this._chart.applyOptions({});
    }
  }

  private _onResizeMove(param: MouseEventParams) {
    if (!param.point || !param.time || !this._series) return;
    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) return;

    if (
      this._isResizing &&
      this._hoveredTrendLine &&
      this._resizeStartPoint &&
      this._resizeHandleType
    ) {
      const newPoint = { time: param.time, price };
      this._resizeTrendLine(
        this._hoveredTrendLine,
        newPoint,
        this._resizeHandleType
      );
    }
  }

  private _onResizeMouseUp(param: MouseEventParams) {
    if (this._isResizing) {
      this._isResizing = false;
      this._resizeStartPoint = undefined;
      this._resizeHandleType = undefined;

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
      }
    }
  }

  private _setupResizeEventListeners() {
    if (this._chart) {
      // Unsubscribe from chart events temporarily
      this._chart.unsubscribeCrosshairMove(this._moveHandler);
      this._chart.unsubscribeClick(this._resizeMouseUpHandler);
    }

    // Add DOM event listeners
    this._domResizeMouseMoveHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!this._chart || !this._series || !this._isResizing) return;

      // Throttle updates to reduce jumpiness
      const now = Date.now();
      if (now - this._lastMoveTime < 16) return; // ~60fps
      this._lastMoveTime = now;

      const chartElement = this._chart.chartElement();
      if (!chartElement) return;

      const rect = chartElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert screen coordinates to chart coordinates
      const timeScale = this._chart?.timeScale();
      if (!timeScale) return;

      const time = timeScale.coordinateToTime(x);
      const price = this._series.coordinateToPrice(y);

      if (time === null || price === null) return;

      const newPoint = { time, price };

      // Update trend line based on handle type
      if (this._hoveredTrendLine && this._resizeHandleType) {
        this._resizeTrendLine(
          this._hoveredTrendLine,
          newPoint,
          this._resizeHandleType
        );
      }
    };

    this._domResizeMouseUpHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      this._cleanupResizeEventListeners();

      // Stop resizing
      this._isResizing = false;
      this._resizeStartPoint = undefined;
      this._resizeHandleType = undefined;

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
        this._chart.subscribeClick(this._resizeMouseUpHandler);

        // Re-enable pointer events and reset cursor
        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.pointerEvents = "auto";
          chartElement.style.cursor = "default";
        }
      }
    };

    document.addEventListener("mousemove", this._domResizeMouseMoveHandler);
    document.addEventListener("mouseup", this._domResizeMouseUpHandler);
  }

  private _setupMoveEventListeners() {
    if (this._chart) {
      // Unsubscribe from chart events temporarily
      this._chart.unsubscribeCrosshairMove(this._moveHandler);
      this._chart.unsubscribeClick(this._resizeMouseUpHandler);
    }

    // Add DOM event listeners for moving (like rectangle tool)
    this._domMoveMouseMoveHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!this._chart || !this._series || !this._isMoving) return;

      // Throttle updates to reduce jumpiness
      const now = Date.now();
      if (now - this._lastMoveTime < 16) return; // ~60fps
      this._lastMoveTime = now;

      const chartElement = this._chart.chartElement();
      if (!chartElement) return;

      const rect = chartElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Convert screen coordinates to chart coordinates
      const timeScale = this._chart?.timeScale();
      if (!timeScale) return;

      const time = timeScale.coordinateToTime(x);
      const price = this._series.coordinateToPrice(y);

      if (time === null || price === null) return;

      const newPoint = { time, price };

      // Move the trend line by the offset while maintaining shape
      const trendLine = this._hoveredTrendLine;
      if (!trendLine) return;

      // Calculate the offsets from the original start point
      const priceOffset = price - this._moveStartPoint!.price;

      // Move the trend line by the offset while maintaining shape
      // Calculate the time difference and apply it to both points
      const startX = timeScale.timeToCoordinate(this._moveStartPoint!.time);
      const currentX = timeScale.timeToCoordinate(newPoint.time);
      const startP1X = timeScale.timeToCoordinate(trendLine._p1.time);
      const startP2X = timeScale.timeToCoordinate(trendLine._p2.time);

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
          trendLine._p1 = {
            time: newP1Time,
            price: trendLine._p1.price + priceOffset,
          };
          trendLine._p2 = {
            time: newP2Time,
            price: trendLine._p2.price + priceOffset,
          };
        }
      }

      // Update the start point for the next move
      this._moveStartPoint = newPoint;

      // Update all views to ensure the line is visible
      trendLine.updateAllViews();

      // Force a chart redraw to ensure the line is visible during drag
      if (this._chart) {
        this._chart.applyOptions({});
      }
    };

    this._domMoveMouseUpHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

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
        this._chart.subscribeClick(this._resizeMouseUpHandler);

        // Re-enable pointer events and reset cursor
        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.pointerEvents = "auto";
          chartElement.style.cursor = "default";
        }
      }
    };

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

  private _getHandleType(point: Point): string | null {
    if (!this._hoveredTrendLine) return null;

    const timeScale = this._chart?.timeScale();
    const series = this._series;

    if (!timeScale || !series) return null;

    const pointX = timeScale.timeToCoordinate(point.time);
    const pointY = series.priceToCoordinate(point.price);

    const p1X = timeScale.timeToCoordinate(this._hoveredTrendLine._p1.time);
    const p1Y = series.priceToCoordinate(this._hoveredTrendLine._p1.price);
    const p2X = timeScale.timeToCoordinate(this._hoveredTrendLine._p2.time);
    const p2Y = series.priceToCoordinate(this._hoveredTrendLine._p2.price);

    if (
      pointX === null ||
      pointY === null ||
      p1X === null ||
      p1Y === null ||
      p2X === null ||
      p2Y === null
    ) {
      return null;
    }

    // Calculate rectangle dimensions for adaptive tolerance
    const rectWidth = Math.abs(p2X - p1X);
    const rectHeight = Math.abs(p2Y - p1Y);
    const isSmallTrendLine = rectWidth < 40 || rectHeight < 40;

    // Use larger tolerance for small trend lines
    const handleTolerance = isSmallTrendLine ? 20 : 12;

    // Check start handle
    if (
      Math.abs(pointX - p1X) <= handleTolerance &&
      Math.abs(pointY - p1Y) <= handleTolerance
    ) {
      return "start";
    }

    // Check end handle
    if (
      Math.abs(pointX - p2X) <= handleTolerance &&
      Math.abs(pointY - p2Y) <= handleTolerance
    ) {
      return "end";
    }

    return null;
  }

  private _setCursorForHandle(handleType: string) {
    if (this._chart) {
      const chartElement = this._chart.chartElement();
      if (chartElement) {
        chartElement.style.cursor = "pointer";
      }
    }
  }

  private _isPointOnTrendLine(point: Point, trendLine: TrendLine): boolean {
    const timeScale = this._chart?.timeScale();
    const series = this._series;

    if (!timeScale || !series) return false;

    const pointX = timeScale.timeToCoordinate(point.time);
    const pointY = series.priceToCoordinate(point.price);

    const p1X = timeScale.timeToCoordinate(trendLine._p1.time);
    const p1Y = series.priceToCoordinate(trendLine._p1.price);
    const p2X = timeScale.timeToCoordinate(trendLine._p2.time);
    const p2Y = series.priceToCoordinate(trendLine._p2.price);

    if (
      pointX === null ||
      pointY === null ||
      p1X === null ||
      p1Y === null ||
      p2X === null ||
      p2Y === null
    ) {
      return false;
    }

    // Calculate distance from point to line
    const tolerance = 8; // pixels
    const A = pointY - p1Y;
    const B = p2X - p1X;
    const C = pointX - p1X;
    const D = p2Y - p1Y;

    const numerator = Math.abs(A * B - C * D);
    const denominator = Math.sqrt(B * B + D * D);

    if (denominator === 0) return false;

    const distance = numerator / denominator;

    // Check if point is within the line segment bounds
    const minX = Math.min(p1X, p2X);
    const maxX = Math.max(p1X, p2X);
    const minY = Math.min(p1Y, p2Y);
    const maxY = Math.max(p1Y, p2Y);

    const withinBounds =
      pointX >= minX - tolerance &&
      pointX <= maxX + tolerance &&
      pointY >= minY - tolerance &&
      pointY <= maxY + tolerance;

    return distance <= tolerance && withinBounds;
  }

  private _addPoint(p: Point) {
    this._points.push(p);
    if (this._points.length >= 2) {
      // Check if shift is held for level line
      const isLevelLine = this._isShiftHeld();
      this._addNewTrendLine(this._points[0], this._points[1], isLevelLine);
      this.stopDrawing();
      this._removePreviewTrendLine();
    }
    if (this._points.length === 1) {
      this._addPreviewTrendLine(this._points[0]);
    }
  }

  private _shiftPressed: boolean = false;

  private _isShiftHeld(): boolean {
    return this._shiftPressed;
  }

  private _addNewTrendLine(p1: Point, p2: Point, isLevelLine: boolean = false) {
    // For level lines, make the second point have the same price as the first
    const finalP2 = isLevelLine ? { ...p2, price: p1.price } : p2;

    const trendLine = new TrendLine(p1, finalP2, { ...this._defaultOptions });
    this._trendLines.push(trendLine);
    if (this._series) {
      this._series.attachPrimitive(trendLine);
    }
  }

  private _removeTrendLine(trendLine: TrendLine) {
    if (this._series) {
      this._series.detachPrimitive(trendLine);
    }
    const index = this._trendLines.indexOf(trendLine);
    if (index > -1) {
      this._trendLines.splice(index, 1);
    }
  }

  private _addPreviewTrendLine(p: Point) {
    this._removePreviewTrendLine();
    this._previewTrendLine = new PreviewTrendLine(p, p, {
      ...this._defaultOptions,
      lineColor: this._defaultOptions.previewLineColor || "#2962FF80",
    });
    if (this._series) {
      this._series.attachPrimitive(this._previewTrendLine);
    }
  }

  private _removePreviewTrendLine() {
    if (this._previewTrendLine && this._series) {
      this._series.detachPrimitive(this._previewTrendLine);
      this._previewTrendLine = undefined;
    }
  }

  private _addToolbarButton() {
    if (!this._drawingsToolbarContainer) return;

    this._toolbarButton = document.createElement("div");
    this._toolbarButton.className = "drawing-tool-button";
    this._toolbarButton.innerHTML = "📈";
    this._toolbarButton.title = "Trend Line Tool";
    this._toolbarButton.style.cssText = `
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin: 2px;
      background: white;
      font-size: 16px;
    `;

    this._toolbarButton.addEventListener("click", () => {
      if (this._drawing) {
        this.stopDrawing();
      } else {
        this.startDrawing();
      }
    });

    this._drawingsToolbarContainer.appendChild(this._toolbarButton);

    // Add color picker for trendline color
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = "#FFA500"; // Orange color for trendlines
    colorPicker.style.width = "24px";
    colorPicker.style.height = "20px";
    colorPicker.style.border = "none";
    colorPicker.style.padding = "0px";
    colorPicker.style.backgroundColor = "transparent";
    colorPicker.addEventListener("change", () => {
      const newColor = colorPicker.value;
      this._defaultOptions.lineColor = newColor;
      this._defaultOptions.previewLineColor = newColor + "80";
      this._defaultOptions.labelColor = newColor;
    });
    this._drawingsToolbarContainer.appendChild(colorPicker);
  }

  // Method to delete a specific trend line
  deleteTrendLine(trendLine: TrendLine) {
    this._removeTrendLine(trendLine);
    const index = this._trendLines.indexOf(trendLine);
    if (index > -1) {
      this._trendLines.splice(index, 1);
    }
  }

  // Method to delete all trend lines
  deleteAllTrendLines() {
    this._trendLines.forEach((trendLine) => {
      this._removeTrendLine(trendLine);
    });
    this._trendLines = [];
  }

  // Method to get all trend lines
  getTrendLines() {
    return this._trendLines;
  }

  // Method to select a trend line
  selectTrendLine(trendLine: TrendLine) {
    trendLine.showHandles();
    this._hoveredTrendLine = trendLine;
  }

  // Method to deselect a trend line
  deselectTrendLine(trendLine: TrendLine) {
    trendLine.hideHandles();
    if (this._hoveredTrendLine === trendLine) {
      this._hoveredTrendLine = undefined;
    }
  }

  // Method to get selected trend lines
  getSelectedTrendLines(): TrendLine[] {
    return this._hoveredTrendLine ? [this._hoveredTrendLine] : [];
  }

  // Method to delete selected trend lines
  deleteSelectedTrendLines() {
    if (this._hoveredTrendLine) {
      this.deleteTrendLine(this._hoveredTrendLine);
      this._hoveredTrendLine = undefined;
    }
  }
}
