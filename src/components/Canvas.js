import React, { useEffect, useState, useRef } from "react";

const DrawingCanvas = () => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false); //default not drawing
    const [lineWidth, setLineWidth] = useState(1); //default line with = 1
    const [strokeStyle, setStrokeStyle] = useState("black"); //default line color = black
    

    useEffect( () => {
        //get canvas element and rendering context
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        //set brush properties
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.strokeStyle = strokeStyle;

    }, [lineWidth, strokeStyle]);

    const handleMouseDown = (e) => {
        //get canvas element and rendering context
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        setIsDrawing(true);

        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
    }
    

  return (
    <div>
        <div style={{
            position: "fixed",
            padding: "20px",
            borderRadius: "10px",
            backgroundColor: "rgba(0, 26, 255, 0.25)"
        }}>
            <div>
                <label>Color: </label>
                <input
                    type="color"
                    value={strokeStyle}
                    onChange={(e) => setStrokeStyle(e.target.value)}
                />
            </div>

            <div>
                <label>Width: </label>
                <select onChange={(e) => setLineWidth(e.target.value)}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10</option>
                </select>
            </div>

           
      </div>

        <canvas
            ref={canvasRef} 
            style={{backgroundColor: "whitesmoke"}} 
            width={2000} 
            height={2000}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        ></canvas>
    </div>
  );
};

export default DrawingCanvas;