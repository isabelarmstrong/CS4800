import '../styles/canvas.css';
import gunshotAudio from '../media/Gunshot.mp3'
import React, { useEffect, useState, useRef } from "react";
import { database } from './firebase';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faEraser, faGun, faRotateLeft, faRotateRight, faDownload } from "@fortawesome/free-solid-svg-icons";
/*

//curr time: _ hours

Feb 23rd:
    - setting up Firebase for real-time updates.

Mar 30th: 
    - Implementation of multi-user collaboration
        - real time collaboration (multiple users can draw on the same canvas and their changes will be synced in real time)
        - sync undo/redo (all users will see each other's undo/redo actions)
        - user specific data (track who is drawing what)
    - room-based sessions
    - Firebase authentication

April 20th: Deployment of the application using Firebase
*/



const DrawingCanvas = () => {
    const canvasRef = useRef(null);
    const audio = new Audio(gunshotAudio);
    const canvasWidth = 2000;
    const canvasHeight = 2000;
    
    //State management for drawing/brush properties
    const [isDrawing, setIsDrawing] = useState(false);
    const [isErasing, setIsErasing] = useState(false);
    const [lineWidth, setLineWidth] = useState(1); 
    const [strokeStyle, setStrokeStyle] = useState("black"); 

    //State management for layers?
    const [backgroundColor, setBackgroundColor] = useState("whitesmoke");

    //State managemnt for canvas history
    const [history, setHistory] = useState([]); //Stores snapshots of canvas
    const [historyIndex, setHistoryIndex] = useState(-1); //tracks undo/redo position
    
    const getCanvasContext = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
    
        return {canvas, ctx};
    }

    useEffect( () => {
        const {ctx} = getCanvasContext();

        if (!isErasing){
            //set brush properties
            ctx.lineWidth = lineWidth;
            ctx.lineCap = "round";
            ctx.strokeStyle = strokeStyle;
        }

        saveCanvasState();

        //listen for changes from Firebase and restore canvas state
        const canvasRef = database.ref("canvasState");
        canvasRef.on("value", (snapshot) => {
            const canvasData = snapshot.val();

            if(canvasData) {
                //restore canvas state from firebase
                restoreCanvasState(canvasData.dataURL);
            }
        });

        //cleanup firebase listener when component unmounts
        return () => {
            canvasRef.off();
        }

    }, [lineWidth, strokeStyle, isErasing]);

    /*************************** DRAWING/ERASE/CLEAR CANVAS ***************************/
    const handleMouseDown = (e) => {
        const {ctx} = getCanvasContext();

        setIsDrawing(true);

        if(!isErasing){
            //Start a new path
            ctx.beginPath();

            //Sets starting position for the next drawing operation
            ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        } else {
            eraser(ctx, e);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;

        const {ctx} = getCanvasContext();

        
        if(!isErasing){
            //Add a new point with the given (x, y) and create a line from the previous point to the new point 
            ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

            //Render current path
            ctx.stroke();
        } else {
            eraser(ctx, e);
        }
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        saveCanvasState();
    }

    const eraser = (ctx, e) => {
        //lineWidth * 2 for better erasing experience
        const eraserSize = lineWidth * 2;

        //get the x and y coords of cursor, subtract (eraserSize/2) to center over the cursor to erase from the middle. eraser size for height and width of rectangle
        ctx.clearRect(e.nativeEvent.offsetX - eraserSize / 2, e.nativeEvent.offsetY - eraserSize / 2, eraserSize, eraserSize);
    }

    const clearCanvas = () => {
        const {ctx} = getCanvasContext();

        //Clear the canvas starting at (0,0) to (canvasWidth, canvasHeight)
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        saveCanvasState();
        audio.play();
    }


    /*************************** UNDO/REDO ***************************/
    
    const saveCanvasState = () => {
        const {canvas} = getCanvasContext();

        //Capture curr canvas state
        const dataURL = canvas.toDataURL();

        //save dataURL to Firebase db
        database.ref("canvasState").set({
            dataURL: dataURL,
        })

        //remove any future states 
        const newHistory = history.slice(0, historyIndex + 1);

        //add current state to newHistory arr
        newHistory.push(dataURL);

        //update state history arr with newHistory arr 
        setHistory(newHistory);

        //set the index to the index of the latest state
        setHistoryIndex(newHistory.length - 1);

    }

    const restoreCanvasState = (dataURL) => {
        const {ctx} = getCanvasContext();
        const img = new Image();

        //load the image from dataURL
        img.src = dataURL;

        //ensures that the canvas is cleared and the image is drawn only AFTER the image has loaded
        img.onload = () => {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(img, 0, 0);
        }
    }
    
    const undo = () => {
        console.log("Undo")

        //check to make sure user doesn't undo past index 0 (oldest index in history arr)
        if (historyIndex > 0) {
            //go back an index
            setHistoryIndex(historyIndex - 1);

            //set the canvas state to that prev index
            restoreCanvasState(history[historyIndex - 1]);
        }
    }

    const redo = () => {
        console.log("Redo")

        //check to make sure there is a state ahead to redo to
        if (historyIndex < history.length - 1) {
            //go forward an index
            setHistoryIndex(historyIndex + 1);

            //set canvas state to that new index
            restoreCanvasState(history[historyIndex + 1]);
        }
    }

    /*************************** EXPORT AS IMAGE ***************************/
    const exportCanvas = () => {
        const {canvas, ctx} = getCanvasContext();

        //fill the entire canvas with the background color (so downloaded image's bg won't appear transparent)
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        //get most recent saved state from history arr
        const lastState = history[historyIndex];
        
        if(lastState){
            //restore drawings
            const img = new Image();
            img.src = lastState;

            img.onload = () => {
                //draw the saved strokes back on
                ctx.drawImage(img, 0, 0);

                const dataURL = canvas.toDataURL("image/png");
                
                //create a temp link to trigger download
                const link = document.createElement("a");
                link.href = dataURL;
                link.download = "canvas_image.png"; //file name for image

                //trigger download
                link.click();
            }
            }
    }

  return (
    <div className="canvas-container">
        <div className="toolbar">
            <div className='group'>
                <button
                    onClick = {() => exportCanvas()}
                >
                    <FontAwesomeIcon icon={faDownload} />
                </button>
            </div>

            <div className="group">
                <label>Color: </label>
                <input
                    type="color"
                    value={strokeStyle}
                    onChange={(e) => setStrokeStyle(e.target.value)}
                    disabled={isErasing}
                />
            </div>

            <div className="group">
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

            <div className="group">

                <button
                    onClick={() => setIsErasing(false)}
                    style={{backgroundColor: !isErasing ? "darkgrey" : "white" }}
                >
                    <FontAwesomeIcon icon={faPencil} />
                </button>

                <button
                    onClick={() => setIsErasing(true)}
                    style={{backgroundColor: isErasing ? "darkgrey" : "white" }}
                >
                    <FontAwesomeIcon icon={faEraser} />
                </button>

                <button
                    onClick={() => clearCanvas()}
                >
                    <FontAwesomeIcon icon={faGun} />
                </button>
            </div>

            <div className="group">

                <button
                    onClick = {() => undo()}
                >
                    <FontAwesomeIcon icon={faRotateLeft} />
                </button>

                <button
                    onClick = {() => redo()}
                >
                    <FontAwesomeIcon icon={faRotateRight} />
                </button>
            
            </div>
        </div>

        <canvas
            ref={canvasRef} 
            style={{backgroundColor: backgroundColor}} 
            width={canvasWidth} 
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        ></canvas>
    </div>
  );
};

export default DrawingCanvas;