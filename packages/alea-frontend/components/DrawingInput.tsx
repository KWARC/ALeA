import React, { useRef, useEffect, useState } from 'react';

enum DrawingStatus {
  start,
  continue,
  end,
}
type DrawingOperation = {
  status: DrawingStatus;
  x: number;
  y: number;
  color: string;
  opacity: number;
  width: number;
};
const DrawingComponent = ({
  initialDrawing = [],
  children,
  onExport,
  width = '100%',
  height = '400px',
  id = '',
}: {
  initialDrawing?: [];
  children?;
  onExport?;
  width?: string;
  height?: string;
  id?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineWidth, setLineWidth] = useState(2);
  const [lineColor, setLineColor] = useState('black');
  const [lineOpacity, setLineOpacity] = useState(1);

  const [drawingOperations, setDrawingOperations] = useState<DrawingOperation[]>(
    JSON.parse(localStorage.getItem(`${id}-draw`) ?? '[]')
  );
  // Initialization when the component
  // mounts for the first time
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.canvas.style.touchAction = 'none';
    // ctx.lineCap = 'round';
    // ctx.lineJoin = 'round';
    ctx.globalAlpha = lineOpacity;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctxRef.current = ctx;
  }, [lineColor, lineOpacity, lineWidth]);
  useEffect(() => {
    drawingOperations.forEach((c) => {
      ctxRef.current.globalAlpha = c.opacity;
      ctxRef.current.strokeStyle = c.color;
      ctxRef.current.lineWidth = c.width;
      switch (c.status) {
        case DrawingStatus.start:
          ctxRef.current.beginPath();
          ctxRef.current.moveTo(c.x, c.y);
          break;
        case DrawingStatus.continue:
          ctxRef.current.lineTo(c.x, c.y);
          ctxRef.current.stroke();
          ctxRef.current.beginPath();
          ctxRef.current.moveTo(c.x, c.y);
          break;
        case DrawingStatus.end:
          ctxRef.current.closePath();
          break;
        default:
          break;
      }
    });
  }, []);
  // Function for starting the drawing
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const { x, y } = getMousePos(e);
    ctxRef.current.beginPath();

    ctxRef.current.moveTo(x, y);
    drawingOperations.push({
      status: DrawingStatus.start,
      x,
      y,
      color: lineColor,
      opacity: lineOpacity,
      width: lineWidth,
    });
    setIsDrawing(true);
  };
  function getMousePos(
    evt: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } {
    let clientX: number, clientY: number;
    if (!evt) return;
    if ('clientX' in evt) {
      clientX = evt.clientX;
      clientY = evt.clientY;
    } else {
      clientX = evt.touches[0]?.clientX ?? 0;
      clientY = evt.touches[0]?.clientY ?? 0;
    }
    const rect = canvasRef.current.getBoundingClientRect(),
      scaleX = canvasRef.current.width / rect.width,
      scaleY = canvasRef.current.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }
  // Function for ending the drawing
  const endDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    ctxRef.current.closePath();
    const { x, y } = getMousePos(e);
    drawingOperations.push({
      status: DrawingStatus.end,
      x,
      y,
      color: lineColor,
      opacity: lineOpacity,
      width: lineWidth,
    });
    setIsDrawing(false);
  };
  setTimeout(() => localStorage.setItem(`${id}-draw`, JSON.stringify(drawingOperations)), 300);
  const onResetClicked = () => {
    setDrawingOperations([]);
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }
    e.preventDefault();
    const { x, y } = getMousePos(e);
    ctxRef.current.lineTo(x, y);

    ctxRef.current.stroke();
    // for smoother drawing
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    drawingOperations.push({
      status: DrawingStatus.continue,
      x,
      y,
      color: lineColor,
      opacity: lineOpacity,
      width: lineWidth,
    });
  };
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    console.log(e);
  };
  const drawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    console.log(e);
  };
  const endDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    console.log(e);
  };
  return (
    <div
      ref={ctxRef}
      style={{ position: 'relative', width: width, height: height, touchAction: 'none' }}
    >
      {children}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={endDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      />
      <Menu
        onReset={onResetClicked}
        setLineColor={setLineColor}
        setLineWidth={setLineWidth}
        setLineOpacity={setLineOpacity}
      />
    </div>
  );
};

export default DrawingComponent;
function Menu({ setLineColor, setLineWidth, setLineOpacity, onReset }) {
  return (
    <div className="Menu">
      <label>Brush Color </label>
      <input
        type="color"
        onChange={(e) => {
          setLineColor(e.target.value);
        }}
      />
      <label>Brush Width </label>
      <input
        type="range"
        min="3"
        max="20"
        onChange={(e) => {
          setLineWidth(e.target.value);
        }}
      />
      <label>Brush Opacity</label>
      <input
        type="range"
        min="1"
        max="100"
        onChange={(e) => {
          setLineOpacity(+e.target.value / 100);
        }}
      />
      <button onClick={onReset}>Reset</button>
    </div>
  );
}
