import '../styles/canvas.css';
import gunshotAudio from '../media/Gunshot.mp3'
import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faEraser, faGun, faRotateLeft, faRotateRight, faDownload } from "@fortawesome/free-solid-svg-icons";
import { getDatabase, ref, push, onValue, get, set, update } from 'firebase/database';
import { auth } from "./firebase";

const DrawingCanvas = ({ user, userID, roomID }) => {
    const canvasRef = useRef(null);
    const db = getDatabase();
    const audio = new Audio(gunshotAudio);
    const canvasWidth = 1000;
    const canvasHeight = 1000;

    
    //const historyRef = ref(db, `rooms/${roomID}/drawing/history/${userID}`);

    //State management for layers? ------------TO DO IF HAVE TIME
    const [backgroundColor, setBackgroundColor] = useState("whitesmoke");
    
    //State management for drawing/brush properties
    const [isDrawing, setIsDrawing] = useState(false);
    const [isErasing, setIsErasing] = useState(false);
    const [lineWidth, setLineWidth] = useState(1); 
    const [strokeStyle, setStrokeStyle] = useState("black"); 

    //State managemnt for canvas history
    const [history, setHistory] = useState([]); //Stores snapshots of canvas
    const [historyIndex, setHistoryIndex] = useState(-1); //tracks undo/redo position
    const [currStrokePoints, setCurrStrokePoints] = useState([]); //store points of the curr stroke

    
    
    const getCanvasContext = () => {

        //check to make sure canvas exists
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas is not available.");
            return { canvas: null, ctx: null };
        }

        //check to make sure context exists
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("Canvas context is not available.");
            return { canvas: null, ctx: null };
        }

        //if they both exist, return both
        return { canvas, ctx };
    }

    useEffect( () => {
        console.log("User: ", user);
        console.log("Room: ", roomID);

        if (!user && !roomID) {
            console.error("User is not authenticated or roomID is missing.");
            return;
        }

        console.log("Authenticated!")

        const {ctx} = getCanvasContext();

        if (!isErasing){
            console.log("setting brush properties")
            //set brush properties
            ctx.lineWidth = lineWidth;
            ctx.lineCap = "round";
            ctx.strokeStyle = strokeStyle;
        }

        saveCanvasState();

        //create a db reference to retrieve stroke data for the drawing session
        const strokesRef = ref(db, `rooms/${roomID}/drawing/strokes`);
        const historyRef = ref(db, `rooms/${roomID}/drawing/history`);

        //listem for real-time stroke updates from Firebase
        console.log("Listening for strokes");

        //onValue() listens for changes in strokesRef. Wheenver a stroke is added/changed, the callback funct is triggered
        //unsubscribe means the event listener onValue is removed when rerendering or unmounting
    
        //listen for stroke updates
        const unsubscribeStrokes = onValue(strokesRef, async (snapshot) => {
            const data = snapshot.val();

            //check to make sure data exists
            if (data) {
                console.log("Got stroke data");
                //extract strokes and convert to arr
                const strokes = Object.values(data);

                //process stroke data
                const processedStrokes = processStrokes(strokes);

                //retrieve history data
                const historySnapshot = await get(historyRef);
                const history = historySnapshot.val();

                //check that history exists
                if (history){
                    console.log("Got history data");

                    //flatten history data
                    const historyArr = [];
                    for (const userID in history) {
                        if (history.hasOwnProperty(userID)) {
                            const userHistory = history[userID];
                            for (const strokeID in userHistory) {
                                if (userHistory.hasOwnProperty(strokeID)) {
                                    historyArr.push({
                                        strokeID, // Include the strokeID
                                        ...userHistory[strokeID] // Spread the rest of the properties (e.g., action)
                                    });
                                }
                            }
                        }
                    }

                    redrawCanvas(processedStrokes, historyArr);
                }
            } else {
                console.log("No stroke data found.");
            }
        });

        const unsubscribeHistory = onValue(historyRef, async (snapshot) => {
            const history = snapshot.val();

            //check to make sure data exists
            if (history) {
                console.log("Got history data");

                //flatten history data
                const historyArr = [];
                for (const userID in history) {
                    if (history.hasOwnProperty(userID)) {
                        const userHistory = history[userID];
                        for (const strokeID in userHistory) {
                            if (userHistory.hasOwnProperty(strokeID)) {
                                historyArr.push({
                                    strokeID, // Include the strokeID
                                    ...userHistory[strokeID] // Spread the rest of the properties (e.g., action)
                                });
                            }
                        }
                    }
                }

                //retrieve snapshot data
                const strokesSnapshot = await get(strokesRef);
                const strokes = strokesSnapshot.val();

                //check that strokes exist
                if (strokes) {
                    console.log("Got strokes data");
                    //process stroke data
                    const processedStrokes = processStrokes(strokes);

                    redrawCanvas(processedStrokes, historyArr)
                }
            } else {
                console.log("No history data found.");
            }
        });

        //clean up listeners on re-render or unmount
        return () => {
            unsubscribeStrokes();
            unsubscribeHistory();
        };
    }, [lineWidth, strokeStyle, isErasing, roomID, user]);

    const processStrokes = (strokes) => {
        const totalStrokes = [];

        //for each user
        for (const uID in strokes) {
            //check to make sure that uID is valid and belongs directly to the strokes object
            if (strokes.hasOwnProperty(uID)){
                const userStrokes = strokes[uID]; //arr to hold user strokes for that uID
                
                //for each stroke in userStrokes
                for (const sID in userStrokes){
                    //check to make sure that sID is valid and belongs directly to userStrokes
                    if (userStrokes.hasOwnProperty(sID)){
                        //add the data to the totalStrokes arr
                        totalStrokes.push({
                            ...userStrokes[sID], //properties of the stroke
                            sID, //strokeID for sorting purposes
                            uID //userID for reference
                        });
                    }
                }
            }
        }
      

        return totalStrokes;
    };

    //redraw canvas for when new strokes are made
    const redrawCanvas = (strokes, history) => {
        const { ctx } = getCanvasContext();
        if (!ctx) {
            console.error("Canvas context is not available.");
            return;
        }

        if (!strokes || !history){
            console.error("Invalid strokes or history data: ", strokes, history);
            return;
        }
    
        console.log("Redrawing canvas with strokes:", strokes);
        console.log("History: ", history);
    
        // Clear the canvas before redrawing
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
        // Draw each stroke
        //iterate over each user
        strokes.forEach((stroke) => {
            const { sID, color, width, points } = stroke; 

            const isAdded = history.some((entry) => {

                console.log(entry.strokeID, "   ", sID);
                
                return entry.strokeID === sID && entry.action === "add";
            });
        
            //check in the case stroke is marked as "remove"
            if (!isAdded){
                //console.log("Skipping stroke: ", sID);
                return;
            }
            
            // Convert points object to an array
            const pointsArray = Object.values(points);

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = "round"; // Ensure smooth line ending
    
            // Move to the first point
            if (pointsArray.length > 0) {
                //console.log("First point:", pointsArray[0]);
                ctx.moveTo(pointsArray[0].x, pointsArray[0].y);
    
                // Draw lines to the rest of the points
                pointsArray.forEach((point, pointIndex) => {
                    //console.log(`Point ${pointIndex}:`, point);
                    ctx.lineTo(point.x, point.y);
                });
    
                // Render the stroke
                ctx.stroke();
            }
        
        });
    };

    //push stroke to Firebase when user draws
    const saveStrokeToFireBase = async (points, color, width) => {

        //check to make sure param points is an arr
        if (!Array.isArray(points)) {
            console.error("points is not an array:", points);
            return;
        }
    
        //Convert arr to dictionary with sequential keys
        const pointsDict = {};
        points.forEach((point, index) => {
            pointsDict[index] = point;
        });
    
        //create stroke object
        const newStroke = {
            color,
            width,
            points: pointsDict,
        };
    
        console.log("Saving stroke to Firebase:", newStroke);
        
        //try catch block for graceful error handling
        try{
            // Generate a unique strokeID
            const strokeID = push(ref(db, `rooms/${roomID}/drawing/strokes/${userID}`)).key;

            // Save the history entry first
            const historyEntry = { strokeID, action: "add" };
            await push(ref(db, `rooms/${roomID}/drawing/history/${userID}`), historyEntry);
            console.log("History saved successfully.");

            // Save the stroke to Firebase
            await set(ref(db, `rooms/${roomID}/drawing/strokes/${userID}/${strokeID}`), newStroke);
            console.log("Stroke saved successfully.");
        }catch (error){
            console.error("Error saving stroke: ", error);

        }
    };
    
    

    /*************************** DRAWING/ERASE/CLEAR CANVAS ***************************/
    const handleMouseDown = (e) => {
        const {ctx} = getCanvasContext();
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;

        setIsDrawing(true);

        if(!isErasing){
            //Start a new path
            ctx.beginPath();

            //Sets starting position for the next drawing operation
            ctx.moveTo(x, y);

            //reset curr stroke points
            setCurrStrokePoints([{x, y}]);
        } else {
            eraser(ctx, e);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
    
        const { ctx } = getCanvasContext();
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
    
        if (!isErasing) {
            // Add a new point with the given (x, y) and create a line from the previous point to the new point
            ctx.lineTo(x, y);
    
            // Render current path
            ctx.stroke();
    
            // Add the new point to the current stroke
            setCurrStrokePoints((prevPoints) => {
                const updatedPoints = [...prevPoints, { x, y }];
                return updatedPoints;
            });
        } else {
            eraser(ctx, e);
        }
    };

    const handleMouseUp = () => {
        if (!isErasing && currStrokePoints.length > 0) {
            // Save the completed stroke to Firebase
            saveStrokeToFireBase(currStrokePoints, strokeStyle, lineWidth);
        }
    
        setIsDrawing(false);
        setCurrStrokePoints([]); // Reset current stroke points
        saveCanvasState();
    };

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
        // database.ref("canvasState").set({
        //     dataURL: dataURL,
        // })

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
    
    const undo = async () => {
        console.log("Undo")

        try{
            //retrieve user's history
            const snapshot = await get(ref(db, `rooms/${roomID}/drawing/history/${userID}`));
            //extract data
            const historyObject = snapshot.val();

            //convert history to an arr
            const history = Object.values(historyObject);

            //check to make sure that history for user exists
            if (!history){
                console.error("No history found for user: ", userID);
                return;
            }

            //reverse history arr, find the index of the first entry where action is "add"
            const lastAdd = history.reverse().findIndex(entry => entry.action === "add");

            //check in the case there is no previous "add" action
            if (lastAdd === -1){
                console.error("No strokes to undo.");
                return;
            }

            //grab the strokeID of lastAdd
            const strokeID = history[lastAdd].strokeID;

            //copy the history arr
            const updatedHistory = [...history];
            //update the entry at the lastAdd index to mark it as "remove"
            updatedHistory[lastAdd] = { strokeID, action: "remove" };
            await set(ref(db, `rooms/${roomID}/drawing/history/${userID}`), updatedHistory); 

        } catch (error){
            console.error("Error during undo: ", error);
        }
    }

    const redo = async () => {
        console.log("Redo")

        try{
            //retrieve user's history
            const snapshot = await get(ref(db, `rooms/${roomID}/drawing/history/${userID}`));
            //extract data
            const historyObject = snapshot.val();

            //convert history to an arr
            const history = Object.values(historyObject);


            //check to make sure that history for user exists
            if (!history){
                console.error("No history found for user: ", userID);
                return;
            }

            //reverse history arr, find the index of the first entry where action is "remove"
            const lastRemove = history.reverse().findIndex(entry => entry.action === "remove");

            //check in the case there is no previous "remove" action
            if (lastRemove === -1){
                console.error("No strokes to redo.");
                return;
            }

            //grab the strokeID of lastRemove
            const strokeID = history[lastRemove].strokeID;

            //copy the history arr
            const updatedHistory = [...history];
            //update the entry at the lastAdd index to mark it as "add"
            updatedHistory[lastRemove] = { strokeID, action: "add" };
            await set(ref(db, `rooms/${roomID}/drawing/history/${userID}`), updatedHistory); 

        } catch (error){
            console.error("Error during redo: ", error);
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