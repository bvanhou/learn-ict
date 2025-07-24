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

interface FibLevel {
  level: number;
  color: string;
  label: string;
  price: number;
}

export interface FibonacciDrawingToolOptions {
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
  fibLevels: FibLevel[];
}

const defaultFibLevels: FibLevel[] = [
  { level: 0.0, color: "#FF0000", label: "0.0%", price: 0 },
  { level: 0.236, color: "#FFA500", label: "23.6%", price: 0 },
  { level: 0.382, color: "#FFFF00", label: "38.2%", price: 0 },
  { level: 0.5, color: "#00FF00", label: "50.0%", price: 0 },
  { level: 0.618, color: "#0000FF", label: "61.8%", price: 0 },
  { level: 0.786, color: "#4B0082", label: "78.6%", price: 0 },
  { level: 1.0, color: "#8B00FF", label: "100.0%", price: 0 },
];

class FibLinePaneRenderer implements IPrimitivePaneRenderer {
  _startPoint: ViewPoint;
  _endPoint: ViewPoint;
  _lineColor: string;
  _lineWidth: number;
  _borderColor: string;
  _borderWidth: number;
  _showHandles: boolean;

  constructor(
    startPoint: ViewPoint,
    endPoint: ViewPoint,
    lineColor: string,
    lineWidth: number,
    borderColor: string,
    borderWidth: number,
    showHandles: boolean = false
  ) {
    this._startPoint = startPoint;
    this._endPoint = endPoint;
    this._lineColor = lineColor;
    this._lineWidth = lineWidth;
    this._borderColor = borderColor;
    this._borderWidth = borderWidth;
    this._showHandles = showHandles;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(({ context: ctx }) => {
      if (
        this._startPoint.x === null ||
        this._startPoint.y === null ||
        this._endPoint.x === null ||
        this._endPoint.y === null
      ) {
        return;
      }

      // Draw the main trend line
      ctx.strokeStyle = this._lineColor;
      ctx.lineWidth = this._lineWidth;
      ctx.beginPath();
      ctx.moveTo(this._startPoint.x, this._startPoint.y);
      ctx.lineTo(this._endPoint.x, this._endPoint.y);
      ctx.stroke();

      // Draw handles if needed
      if (this._showHandles) {
        this._drawHandles(ctx);
      }
    });
  }

  private _drawHandles(ctx: CanvasRenderingContext2D) {
    const handleSize = 6;
    const handleColor = "#171B26";
    const handleStrokeColor = this._borderColor;

    ctx.fillStyle = handleColor;
    ctx.strokeStyle = handleStrokeColor;
    ctx.lineWidth = this._borderWidth;

    // Draw start handle (circle)
    if (this._startPoint.x !== null && this._startPoint.y !== null) {
      ctx.beginPath();
      ctx.arc(
        this._startPoint.x,
        this._startPoint.y,
        handleSize,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.stroke();
    }

    // Draw end handle (circle)
    if (this._endPoint.x !== null && this._endPoint.y !== null) {
      ctx.beginPath();
      ctx.arc(this._endPoint.x, this._endPoint.y, handleSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }
}

class FibLinePaneView implements IPrimitivePaneView {
  _source: FibonacciRetracement;
  _startPoint: ViewPoint = { x: null, y: null };
  _endPoint: ViewPoint = { x: null, y: null };

  constructor(source: FibonacciRetracement) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    this._startPoint.x = timeScale.timeToCoordinate(
      this._source._startPoint.time
    );
    this._startPoint.y = series.priceToCoordinate(
      this._source._startPoint.price
    );
    this._endPoint.x = timeScale.timeToCoordinate(this._source._endPoint.time);
    this._endPoint.y = series.priceToCoordinate(this._source._endPoint.price);
  }

  renderer() {
    return new FibLinePaneRenderer(
      this._startPoint,
      this._endPoint,
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

class FibLevelPaneRenderer implements IPrimitivePaneRenderer {
  _level: FibLevel;
  _startX: Coordinate | null;
  _endX: Coordinate | null;
  _y: Coordinate | null;

  constructor(
    level: FibLevel,
    startX: Coordinate | null,
    endX: Coordinate | null,
    y: Coordinate | null
  ) {
    this._level = level;
    this._startX = startX;
    this._endX = endX;
    this._y = y;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace(({ context: ctx }) => {
      if (this._startX === null || this._endX === null || this._y === null) {
        return;
      }

      // Draw horizontal line at Fibonacci level
      ctx.strokeStyle = this._level.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this._startX, this._y);
      ctx.lineTo(this._endX, this._y);
      ctx.stroke();
    });
  }
}

class FibLevelPaneView implements IPrimitivePaneView {
  _source: FibonacciRetracement;
  _level: FibLevel;
  _startX: Coordinate | null = null;
  _endX: Coordinate | null = null;
  _y: Coordinate | null = null;

  constructor(source: FibonacciRetracement, level: FibLevel) {
    this._source = source;
    this._level = level;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    // Calculate Fibonacci level price
    const priceDiff =
      this._source._endPoint.price - this._source._startPoint.price;
    const fibPrice =
      this._source._endPoint.price - priceDiff * this._level.level;
    this._level.price = fibPrice;

    // Get time range for the line
    const startTime = this._source._startPoint.time;
    const endTime = this._source._endPoint.time;

    this._startX = timeScale.timeToCoordinate(startTime);
    this._endX = timeScale.timeToCoordinate(endTime);
    this._y = series.priceToCoordinate(fibPrice);
  }

  renderer() {
    return new FibLevelPaneRenderer(
      this._level,
      this._startX,
      this._endX,
      this._y
    );
  }

  zOrder(): PrimitivePaneViewZOrder {
    return "normal";
  }
}

class FibHandlePaneRenderer implements IPrimitivePaneRenderer {
  _startPoint: ViewPoint;
  _endPoint: ViewPoint;
  _borderColor: string;
  _borderWidth: number;
  _showHandles: boolean;

  constructor(
    startPoint: ViewPoint,
    endPoint: ViewPoint,
    borderColor: string,
    borderWidth: number,
    showHandles: boolean = false
  ) {
    this._startPoint = startPoint;
    this._endPoint = endPoint;
    this._borderColor = borderColor;
    this._borderWidth = borderWidth;
    this._showHandles = showHandles;
  }

  draw(target: CanvasRenderingTarget2D) {
    if (!this._showHandles) return;

    target.useBitmapCoordinateSpace(({ context: ctx }) => {
      const handleSize = 6;
      const handleColor = "#171B26";
      const handleStrokeColor = this._borderColor;

      ctx.fillStyle = handleColor;
      ctx.strokeStyle = handleStrokeColor;
      ctx.lineWidth = this._borderWidth;

      // Draw start handle (circle)
      if (this._startPoint.x !== null && this._startPoint.y !== null) {
        ctx.beginPath();
        ctx.arc(
          this._startPoint.x,
          this._startPoint.y,
          handleSize,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
      }

      // Draw end handle (circle)
      if (this._endPoint.x !== null && this._endPoint.y !== null) {
        ctx.beginPath();
        ctx.arc(this._endPoint.x, this._endPoint.y, handleSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    });
  }
}

class FibHandlePaneView implements IPrimitivePaneView {
  _source: FibonacciRetracement;
  _startPoint: ViewPoint = { x: null, y: null };
  _endPoint: ViewPoint = { x: null, y: null };

  constructor(source: FibonacciRetracement) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const timeScale = this._source.chart.timeScale();

    this._startPoint.x = timeScale.timeToCoordinate(
      this._source._startPoint.time
    );
    this._startPoint.y = series.priceToCoordinate(
      this._source._startPoint.price
    );
    this._endPoint.x = timeScale.timeToCoordinate(this._source._endPoint.time);
    this._endPoint.y = series.priceToCoordinate(this._source._endPoint.price);
  }

  renderer() {
    return new FibHandlePaneRenderer(
      this._startPoint,
      this._endPoint,
      this._source._options.borderColor,
      this._source._options.borderWidth,
      this._source._showHandles
    );
  }

  zOrder(): PrimitivePaneViewZOrder {
    return "normal";
  }
}

class FibonacciRetracement extends PluginBase {
  _options: FibonacciDrawingToolOptions;
  _startPoint: Point;
  _endPoint: Point;
  _showHandles: boolean = false;
  _fibLevels: FibLevel[];
  _paneViews: FibLinePaneView[];
  _levelViews: FibLevelPaneView[];
  _handleView: FibHandlePaneView;

  constructor(
    startPoint: Point,
    endPoint: Point,
    options: Partial<FibonacciDrawingToolOptions> = {}
  ) {
    super();
    this._startPoint = startPoint;
    this._endPoint = endPoint;
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
      fibLevels: defaultFibLevels,
      ...options,
    };

    this._fibLevels = [...this._options.fibLevels];
    this._paneViews = [new FibLinePaneView(this)];
    this._levelViews = this._fibLevels.map(
      (level) => new FibLevelPaneView(this, level)
    );
    this._handleView = new FibHandlePaneView(this);
  }

  updateAllViews() {
    this._paneViews.forEach((view) => view.update());
    this._levelViews.forEach((view) => view.update());
    this._handleView.update();
  }

  paneViews() {
    return [...this._levelViews, this._handleView];
  }

  applyOptions(options: Partial<FibonacciDrawingToolOptions>) {
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

class PreviewFibonacciRetracement extends FibonacciRetracement {
  constructor(
    startPoint: Point,
    endPoint: Point,
    options: Partial<FibonacciDrawingToolOptions> = {}
  ) {
    super(startPoint, endPoint, {
      lineColor: options.previewLineColor || "#2962FF80",
      ...options,
    });
  }

  public updateEndPoint(p: Point) {
    this._endPoint = p;
    this.updateAllViews();
  }
}

export class FibonacciDrawingTool {
  private _chart: IChartApi | undefined;
  private _series: ISeriesApi<SeriesType> | undefined;
  private _drawingsToolbarContainer: HTMLDivElement | undefined;
  private _defaultOptions: Partial<FibonacciDrawingToolOptions>;
  private _fibRetracements: FibonacciRetracement[];
  private _previewFibRetracement: PreviewFibonacciRetracement | undefined =
    undefined;
  private _points: Point[] = [];
  private _drawing: boolean = false;
  private _toolbarButton: HTMLDivElement | undefined;
  private _hoveredFibRetracement: FibonacciRetracement | undefined = undefined;
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
    options: Partial<FibonacciDrawingToolOptions>,
    onHoverHandle?: (isHovering: boolean) => void
  ) {
    this._chart = chart;
    this._series = series;
    this._drawingsToolbarContainer = drawingsToolbarContainer;
    this._defaultOptions = options;
    this._fibRetracements = [];
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

    // Remove all Fibonacci retracements
    this._fibRetracements.forEach((fibRetracement) => {
      if (this._series) {
        this._series.detachPrimitive(fibRetracement);
      }
    });

    this._removePreviewFibRetracement();

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
    this._removePreviewFibRetracement();
    if (this._toolbarButton) {
      this._toolbarButton.classList.remove("active");
    }
  }

  isDrawing(): boolean {
    return this._drawing;
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
    }
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
    if (handleType && this._hoveredFibRetracement) {
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
      chartElement.style.cursor = "move";

      this._setupResizeEventListeners();
      return;
    }

    // Check if clicking inside a Fibonacci retracement for moving
    if (
      this._hoveredFibRetracement &&
      this._isPointOnFibRetracement(point, this._hoveredFibRetracement)
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
      chartElement.style.cursor = "move";

      this._setupMoveEventListeners();
      return;
    }

    // If not clicking on handles or Fibonacci retracement, allow normal chart interaction
    // Reset cursor and pointer events
    chartElement.style.cursor = "default";
    chartElement.style.pointerEvents = "auto";
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
    if (
      this._isResizing &&
      this._hoveredFibRetracement &&
      this._resizeStartPoint
    ) {
      this._resizeFibRetracement(
        this._hoveredFibRetracement,
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
    if (this._drawing && this._previewFibRetracement) {
      this._previewFibRetracement.updateEndPoint({ time: param.time, price });

      // Use requestAnimationFrame to batch updates
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
      this._hoveredFibRetracement &&
      this._resizeStartPoint &&
      this._resizeHandleType
    ) {
      const newPoint = { time: param.time, price };
      this._resizeFibRetracement(
        this._hoveredFibRetracement,
        newPoint,
        this._resizeHandleType
      );
      return;
    }

    // Handle hover for showing handles
    const mousePoint = { time: param.time, price };
    let foundHoveredFibRetracement = false;

    for (const fibRetracement of this._fibRetracements) {
      const handleType = this._getHandleType(mousePoint);
      if (handleType && this._hoveredFibRetracement === fibRetracement) {
        fibRetracement.showHandles();
        this._setCursorForHandle(handleType);
        foundHoveredFibRetracement = true;

        if (this._onHoverHandle) {
          this._onHoverHandle(true);
        }
        break;
      } else if (this._isPointOnFibRetracement(mousePoint, fibRetracement)) {
        // Hovering on Fibonacci retracement (not on handles)
        this._hoveredFibRetracement = fibRetracement;
        fibRetracement.showHandles();
        if (this._chart && !this._isMoving && !this._isResizing) {
          const chartElement = this._chart.chartElement();
          if (chartElement) {
            chartElement.style.cursor = "grab";
          }
        }
        foundHoveredFibRetracement = true;
        break;
      }
    }

    // Reset if not hovering over any Fibonacci retracement
    if (!foundHoveredFibRetracement && this._hoveredFibRetracement) {
      this._hoveredFibRetracement.hideHandles();
      this._hoveredFibRetracement = undefined;

      if (this._onHoverHandle) {
        this._onHoverHandle(false);
      }

      if (this._chart && !this._isMoving && !this._isResizing) {
        const chartElement = this._chart.chartElement();
        if (chartElement) {
          chartElement.style.cursor = "default";
          chartElement.style.pointerEvents = "auto";
        }
      }
    } else if (
      !foundHoveredFibRetracement &&
      this._chart &&
      !this._isMoving &&
      !this._isResizing
    ) {
      const chartElement = this._chart.chartElement();
      if (chartElement) {
        chartElement.style.cursor = "default";
      }
    }
  }

  private _addPoint(p: Point) {
    this._points.push(p);
    if (this._points.length >= 2) {
      this._addNewFibRetracement(this._points[0], this._points[1]);
      this.stopDrawing();
      this._removePreviewFibRetracement();
    }
    if (this._points.length === 1) {
      this._addPreviewFibRetracement(this._points[0]);
    }
  }

  private _addNewFibRetracement(startPoint: Point, endPoint: Point) {
    const fibRetracement = new FibonacciRetracement(startPoint, endPoint, {
      ...this._defaultOptions,
    });
    this._fibRetracements.push(fibRetracement);
    if (this._series) {
      this._series.attachPrimitive(fibRetracement);
    }
  }

  private _removeFibRetracement(fibRetracement: FibonacciRetracement) {
    if (this._series) {
      this._series.detachPrimitive(fibRetracement);
    }
    const index = this._fibRetracements.indexOf(fibRetracement);
    if (index > -1) {
      this._fibRetracements.splice(index, 1);
    }
  }

  private _addPreviewFibRetracement(p: Point) {
    this._removePreviewFibRetracement();
    this._previewFibRetracement = new PreviewFibonacciRetracement(p, p, {
      ...this._defaultOptions,
      lineColor: this._defaultOptions.previewLineColor || "#2962FF80",
    });
    if (this._series) {
      this._series.attachPrimitive(this._previewFibRetracement);
    }
  }

  private _removePreviewFibRetracement() {
    if (this._previewFibRetracement && this._series) {
      this._series.detachPrimitive(this._previewFibRetracement);
      this._previewFibRetracement = undefined;
    }
  }

  private _addToolbarButton() {
    if (!this._drawingsToolbarContainer) return;

    this._toolbarButton = document.createElement("div");
    this._toolbarButton.className = "drawing-tool-button";
    this._toolbarButton.innerHTML = "📊";
    this._toolbarButton.title = "Fibonacci Retracement Tool";
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

    // Add color picker for Fibonacci line color
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = "#2962FF"; // Blue color for Fibonacci
    colorPicker.style.cssText = `
      width: 24px;
      height: 20px;
      border: none;
      padding: 0px;
      background-color: transparent;
    `;
    colorPicker.addEventListener("change", () => {
      const newColor = colorPicker.value;
      this._defaultOptions.lineColor = newColor;
      this._defaultOptions.previewLineColor = newColor + "80";
      this._defaultOptions.borderColor = newColor;
    });
    this._drawingsToolbarContainer.appendChild(colorPicker);
  }

  private _resizeFibRetracement(
    fibRetracement: FibonacciRetracement,
    newPoint: Point,
    handleType: string
  ) {
    if (handleType === "start") {
      fibRetracement._startPoint = newPoint;
    } else if (handleType === "end") {
      fibRetracement._endPoint = newPoint;
    }

    // Update all views
    fibRetracement.updateAllViews();

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
      this._hoveredFibRetracement &&
      this._resizeStartPoint &&
      this._resizeHandleType
    ) {
      const newPoint = { time: param.time, price };
      this._resizeFibRetracement(
        this._hoveredFibRetracement,
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

      // Update Fibonacci retracement based on handle type
      if (this._hoveredFibRetracement && this._resizeHandleType) {
        this._resizeFibRetracement(
          this._hoveredFibRetracement,
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

      // Calculate the price offset from the start point
      const priceOffset = newPoint.price - this._moveStartPoint!.price;

      // Move the Fibonacci retracement by the offset while maintaining shape
      const fibRetracement = this._hoveredFibRetracement;
      if (!fibRetracement) return;

      // Calculate the time difference and apply it to both points
      const startX = timeScale.timeToCoordinate(this._moveStartPoint!.time);
      const currentX = timeScale.timeToCoordinate(newPoint.time);
      const startP1X = timeScale.timeToCoordinate(
        fibRetracement._startPoint.time
      );
      const startP2X = timeScale.timeToCoordinate(
        fibRetracement._endPoint.time
      );

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
          fibRetracement._startPoint = {
            time: newP1Time,
            price: fibRetracement._startPoint.price + priceOffset,
          };
          fibRetracement._endPoint = {
            time: newP2Time,
            price: fibRetracement._endPoint.price + priceOffset,
          };
        }
      }

      // Update the start point for the next move
      this._moveStartPoint = newPoint;

      // Update all views to ensure the Fibonacci retracement is visible
      fibRetracement.updateAllViews();

      // Force a chart redraw to ensure the Fibonacci retracement is visible during drag
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
    if (!this._hoveredFibRetracement) return null;

    const timeScale = this._chart?.timeScale();
    const series = this._series;

    if (!timeScale || !series) return null;

    const pointX = timeScale.timeToCoordinate(point.time);
    const pointY = series.priceToCoordinate(point.price);

    const startX = timeScale.timeToCoordinate(
      this._hoveredFibRetracement._startPoint.time
    );
    const startY = series.priceToCoordinate(
      this._hoveredFibRetracement._startPoint.price
    );
    const endX = timeScale.timeToCoordinate(
      this._hoveredFibRetracement._endPoint.time
    );
    const endY = series.priceToCoordinate(
      this._hoveredFibRetracement._endPoint.price
    );

    if (
      pointX === null ||
      pointY === null ||
      startX === null ||
      startY === null ||
      endX === null ||
      endY === null
    ) {
      return null;
    }

    // Calculate rectangle dimensions for adaptive tolerance
    const rectWidth = Math.abs(endX - startX);
    const rectHeight = Math.abs(endY - startY);
    const isSmallFibRetracement = rectWidth < 40 || rectHeight < 40;

    // Use larger tolerance for small Fibonacci retracements
    const handleTolerance = isSmallFibRetracement ? 20 : 12;

    // Check start handle
    if (
      Math.abs(pointX - startX) <= handleTolerance &&
      Math.abs(pointY - startY) <= handleTolerance
    ) {
      return "start";
    }

    // Check end handle
    if (
      Math.abs(pointX - endX) <= handleTolerance &&
      Math.abs(pointY - endY) <= handleTolerance
    ) {
      return "end";
    }

    return null;
  }

  private _isPointOnFibRetracement(
    point: Point,
    fibRetracement: FibonacciRetracement
  ): boolean {
    const timeScale = this._chart?.timeScale();
    const series = this._series;

    if (!timeScale || !series) return false;

    const pointX = timeScale.timeToCoordinate(point.time);
    const pointY = series.priceToCoordinate(point.price);

    if (pointX === null || pointY === null) return false;

    // Check if point is on any of the Fibonacci level lines
    const tolerance = 8; // pixels
    const startTime = fibRetracement._startPoint.time;
    const endTime = fibRetracement._endPoint.time;

    // Check each Fibonacci level
    for (const level of fibRetracement._fibLevels) {
      // Calculate Fibonacci level price
      const priceDiff =
        fibRetracement._endPoint.price - fibRetracement._startPoint.price;
      const fibPrice = fibRetracement._endPoint.price - priceDiff * level.level;

      // Get the Y coordinate of this Fibonacci level
      const fibY = series.priceToCoordinate(fibPrice);
      if (fibY === null) continue;

      // Get the X coordinates for the start and end of this level line
      const startX = timeScale.timeToCoordinate(startTime);
      const endX = timeScale.timeToCoordinate(endTime);
      if (startX === null || endX === null) continue;

      // Check if point is close to this horizontal line
      const distanceToLine = Math.abs(pointY - fibY);
      const withinTimeBounds =
        pointX >= Math.min(startX, endX) - tolerance &&
        pointX <= Math.max(startX, endX) + tolerance;

      if (distanceToLine <= tolerance && withinTimeBounds) {
        return true;
      }
    }

    return false;
  }

  private _setCursorForHandle(handleType: string) {
    if (this._chart) {
      const chartElement = this._chart.chartElement();
      if (chartElement) {
        chartElement.style.cursor = "pointer";
      }
    }
  }

  // Method to delete a specific Fibonacci retracement
  deleteFibRetracement(fibRetracement: FibonacciRetracement) {
    this._removeFibRetracement(fibRetracement);
    const index = this._fibRetracements.indexOf(fibRetracement);
    if (index > -1) {
      this._fibRetracements.splice(index, 1);
    }
  }

  // Method to delete all Fibonacci retracements
  deleteAllFibRetracements() {
    this._fibRetracements.forEach((fibRetracement) => {
      this._removeFibRetracement(fibRetracement);
    });
    this._fibRetracements = [];
  }

  // Method to get all Fibonacci retracements
  getFibRetracements() {
    return this._fibRetracements;
  }

  // Method to select a Fibonacci retracement
  selectFibRetracement(fibRetracement: FibonacciRetracement) {
    fibRetracement.showHandles();
    this._hoveredFibRetracement = fibRetracement;
  }

  // Method to deselect a Fibonacci retracement
  deselectFibRetracement(fibRetracement: FibonacciRetracement) {
    fibRetracement.hideHandles();
    if (this._hoveredFibRetracement === fibRetracement) {
      this._hoveredFibRetracement = undefined;
    }
  }

  // Method to get selected Fibonacci retracements
  getSelectedFibRetracements(): FibonacciRetracement[] {
    return this._hoveredFibRetracement ? [this._hoveredFibRetracement] : [];
  }

  // Method to delete selected Fibonacci retracements
  deleteSelectedFibRetracements() {
    if (this._hoveredFibRetracement) {
      this.deleteFibRetracement(this._hoveredFibRetracement);
      this._hoveredFibRetracement = undefined;
    }
  }
}
