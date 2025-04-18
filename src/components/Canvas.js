import '../styles/canvas.css';
import gunshotAudio from '../media/Gunshot.mp3'
import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faEraser, faGun, faRotateLeft, faRotateRight, faDownload } from "@fortawesome/free-solid-svg-icons";
import { getDatabase, ref, push, onValue, get, set } from 'firebase/database';

const DrawingCanvas = ({ user, userID, roomID }) => {
    const canvasRef = useRef(null);
    const db = getDatabase();
    const audio = new Audio(gunshotAudio);
    const canvasWidth = 1000;
    const canvasHeight = 1000;

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
    };

    useEffect( () => {
        console.log("User: ", user);
        console.log("Room: ", roomID);

        if (!user && !roomID) {
            console.error("User is not authenticated or roomID is missing.");
            return;
        }

        console.log("Authenticated!");

        const {ctx} = getCanvasContext();

        if (!isErasing){
            console.log("setting brush properties");
            //set brush properties
            ctx.lineWidth = lineWidth;
            ctx.lineCap = "round";
            ctx.strokeStyle = strokeStyle;
        }

        saveCanvasState();

        //create a db reference to retrieve stroke data for the drawing session
        const strokesRef = ref(db, `rooms/${roomID}/drawing/strokes`);
        const historyRef = ref(db, `rooms/${roomID}/drawing/history`);

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

                const processedStrokes = processStrokes(strokes);

                //retrieve history data
                const historySnapshot = await get(historyRef);
                const history = historySnapshot.val();

                if (history){
                    console.log("Got history data");

                    //flatten history data to make it easier to work with
                    const historyArr = [];
                    //for each user in history
                    for (const userID in history) {

                        if (history.hasOwnProperty(userID)) {
                            //access that user's history
                            const userHistory = history[userID];

                            //for each stroke for that user
                            for (const strokeID in userHistory) {
                                if (userHistory.hasOwnProperty(strokeID)) {

                                    //push a flattened object into historyArr
                                    historyArr.push({
                                        strokeID,
                                        ...userHistory[strokeID] //spread the rest of the properties
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

                
                    //flatten history data to make it easier to work with
                    const historyArr = [];
                    //for each user in history
                    for (const userID in history) {

                        if (history.hasOwnProperty(userID)) {
                            //access that user's history
                            const userHistory = history[userID];

                            //for each stroke for that user
                            for (const strokeID in userHistory) {
                                if (userHistory.hasOwnProperty(strokeID)) {

                                    //push a flattened object into historyArr
                                    historyArr.push({
                                        strokeID,
                                        ...userHistory[strokeID] //spread the rest of the properties
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


    //flatten and combine nested strokes data structure from multiple users into a single arr
    const processStrokes = (strokes) => {
        const totalStrokes = [];

        //for each user
        for (const uID in strokes) {

            //check to make sure that uID is valid and belongs directly to the strokes object
            if (strokes.hasOwnProperty(uID)){
                const userStrokes = strokes[uID]; //arr to hold user strokes for that uID
                
                //for each stroke
                for (const sID in userStrokes){

                    //check to make sure that sID is valid and belongs directly to userStrokes
                    if (userStrokes.hasOwnProperty(sID)){

                        //add the data to the totalStrokes arr
                        totalStrokes.push({
                            ...userStrokes[sID], //properties of the stroke
                            sID,
                            uID
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
    
        if (!strokes || !history) {
            console.error("Invalid strokes or history data: ", strokes, history);
            return;
        }
    
        console.log("Redrawing canvas with strokes:", strokes);
        console.log("History: ", history);
    
        //clear canvas before redrawing
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
        //draw each stroke
        strokes.forEach((stroke) => {
            const { sID, color, width, points, isEraser } = stroke;
    
            //filter and skip strokes that haven't been "added" to the canvas
            const isAdded = history.some((entry) => entry.strokeID === sID && entry.action === "add");
            if (!isAdded) return;
    
            const pointsArray = Object.values(points);
    
            //handle eraser strokes
            if (isEraser) {
                ctx.save(); //save curr canvas state
                ctx.globalCompositeOperation = "destination-out"; //set canvas to erase mode (anything drawn will remove pixels instead of adding)
                ctx.lineWidth = width;
                ctx.lineCap = "round";
    
                //make sure stroke has at least one point before drawing or erasing
                if (pointsArray.length > 0) {
                    ctx.beginPath();
                    ctx.moveTo(pointsArray[0].x, pointsArray[0].y);
    
                    //draw a line to each point (erase as it goes)
                    pointsArray.forEach((point) => {
                        ctx.lineTo(point.x, point.y);
                    });
    
                    ctx.stroke(); //apply stroke
                }
    
                ctx.restore(); //restore default drawing mode
            } else { //handle pen strokes
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.lineCap = "round";
    
                if (pointsArray.length > 0) {
                    ctx.moveTo(pointsArray[0].x, pointsArray[0].y);
    
                    pointsArray.forEach((point) => {
                        ctx.lineTo(point.x, point.y);
                    });
    
                    ctx.stroke();
                }
            }
        });
    };

    //push stroke to Firebase when user draws
    const saveStrokeToFireBase = async (points, color, width, isEraser = false) => {
        // Check to make sure param points is an array
        if (!Array.isArray(points)) {
            console.error("Points is not an array:", points);
            return;
        }
    
        // Convert array to dictionary with sequential keys
        const pointsDict = {};
        points.forEach((point, index) => {
            pointsDict[index] = point;
        });
    
        // Create stroke object
        const newStroke = {
            color,
            width,
            points: pointsDict,
            isEraser,
        };
    
        console.log("Saving stroke to Firebase:", newStroke);
    
        try {
            //retrieve curr user's history
            const historyRef = ref(db, `rooms/${roomID}/drawing/history/${userID}`);
            const snapshot = await get(historyRef);
            const historyObject = snapshot.val();
    
            //clean up history
            if (historyObject) {
                //convert history to arr
                const history = Object.values(historyObject);
    
                //filter out any redo entries
                const updatedHistory = history.filter((entry) => entry.action === "add");
    
                //convert updated history back to an object
                const updatedHistoryObject = Object.fromEntries(
                    updatedHistory.map((entry, index) => [index, entry])
                );
    
                //update hisotry in firebase
                await set(historyRef, updatedHistoryObject);
            }
    
            //gen a unique strokeID
            const strokeID = push(ref(db, `rooms/${roomID}/drawing/strokes/${userID}`)).key;
    
            //save history entry
            const historyEntry = { strokeID, action: "add" };
            await push(ref(db, `rooms/${roomID}/drawing/history/${userID}`), historyEntry);
            console.log("History saved successfully.");
    
            //save stroke
            await set(ref(db, `rooms/${roomID}/drawing/strokes/${userID}/${strokeID}`), newStroke);
            console.log("Stroke saved successfully.");
        } catch (error) {
            console.error("Error saving stroke: ", error);
        }
    };

    /*************************** DRAWING/ERASE/CLEAR CANVAS ***************************/

    //set up start of stroke or erase
    const handleMouseDown = (e) => {
        const { ctx } = getCanvasContext();

        //get coordinates of cursor
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
    
        setIsDrawing(true);
    
        if (!isErasing) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            setCurrStrokePoints([{ x, y }]);
        } else { //start new eraser stroke
            setCurrStrokePoints([{ x, y }]);
        }
    };

    //handle drawing/erasing as mouse moves
    const handleMouseMove = (e) => {
        if (!isDrawing) return;
    
        const { ctx } = getCanvasContext();
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
    
        if (!isErasing) {
            ctx.lineTo(x, y);
            ctx.stroke();
            setCurrStrokePoints((prevPoints) => [...prevPoints, { x, y }]);
        } else {
            //erase locally
            eraser(ctx, e);
    
            //add points to the curr eraser stroke
            setCurrStrokePoints((prevPoints) => [...prevPoints, { x, y }]);
        }
    };

    const handleMouseUp = () => {
        if (currStrokePoints.length > 0) {
            if (!isErasing) {
                //save pen stroke to firebase
                saveStrokeToFireBase(currStrokePoints, strokeStyle, lineWidth);
            } else {
                //save eraser stroke to firebase
                saveStrokeToFireBase(currStrokePoints, "transparent", lineWidth * 2, true);
            }
        }
    
        setIsDrawing(false);
        setCurrStrokePoints([]); //reset curr stroke points for next stroke
        saveCanvasState();
    };

    const eraser = (ctx, e) => {
        //lineWidth * 2 for better erasing experience
        const eraserSize = lineWidth * 2;

        //get the x and y coords of cursor, subtract (eraserSize/2) to center over the cursor to erase from the middle. eraser size for height and width of rectangle
        ctx.clearRect(e.nativeEvent.offsetX - eraserSize / 2, e.nativeEvent.offsetY - eraserSize / 2, eraserSize, eraserSize);
    };

    const clearCanvas = async () => {
        const { ctx } = getCanvasContext();
        if (!ctx) {
            console.error("Canvas context is not available.");
            return;
        }

        //clear local canvas for user
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        try {
            const userStrokesRef = ref(db, `rooms/${roomID}/drawing/strokes/${userID}`);
            const userHistoryRef = ref(db, `rooms/${roomID}/drawing/history/${userID}`);

            //remove all strokes/history for curr user
            await set(userStrokesRef, null);
            await set(userHistoryRef, null);
            console.log("User's strokes cleared successfully.");
        } catch (error) {
            console.error("Error clearing user's strokes: ", error);
        }

        audio.play();
    };


    /*************************** UNDO/REDO ***************************/
    
    const saveCanvasState = () => {
        const {canvas} = getCanvasContext();

        //Capture curr canvas state
        const dataURL = canvas.toDataURL();

        //remove any future states 
        const newHistory = history.slice(0, historyIndex + 1);

        //add current state to newHistory arr
        newHistory.push(dataURL);

        //update state history arr with newHistory arr 
        setHistory(newHistory);

        //set the index to the index of the latest state
        setHistoryIndex(newHistory.length - 1);

    };
    
    const undo = async () => {
        console.log("Undo");
    
        try {
            //retrieve user's history
            const snapshot = await get(ref(db, `rooms/${roomID}/drawing/history/${userID}`));
            const historyObject = snapshot.val();
    
            //check if history exists
            if (!historyObject) {
                console.error("No history found for user:", userID);
                return;
            }
    
            //convert history to an arr
            const history = Object.values(historyObject);
    
            if (history.length === 0) {
                console.error("No history found for user:", userID);
                return;
            }
    
            //reverse history arr, find index of last entry where action is "add"
            const lastAdd = history.toReversed().findIndex(entry => entry.action === "add");
    
            if (lastAdd === -1) {
                console.error("No strokes to undo.");
                return;
            }
    
            //convert reversed index to original index
            const originalIndex = history.length - 1 - lastAdd;
    
            //grab the strokeID of lastAdd
            const strokeID = history[originalIndex].strokeID;
    
            //copy and update history arr
            const updatedHistory = [...history];
            updatedHistory[originalIndex] = { strokeID, action: "remove" };
    
            //convert updatedHistory back to an object
            const updatedHistoryObject = Object.fromEntries(
                updatedHistory.map((entry, index) => [index, entry])
            );
    
            //update history in the db
            await set(ref(db, `rooms/${roomID}/drawing/history/${userID}`), updatedHistoryObject);
        } catch (error) {
            console.error("Error during undo:", error);
        }
    };
    

    const redo = async () => {
        console.log("Redo");
    
        try {
            //retrieve curr user's history
            const historyRef = ref(db, `rooms/${roomID}/drawing/history/${userID}`);
            const snapshot = await get(historyRef);
            const historyObject = snapshot.val();
    
            if (!historyObject) {
                console.error("No history found for user:", userID);
                return;
            }
    
            //convert history to arr
            const history = Object.values(historyObject);
    
            //find last "remove" to redo
            const lastRemoveIndex = history.findIndex((entry) => entry.action === "remove");
    
            if (lastRemoveIndex === -1) {
                console.error("No strokes to redo.");
                return;
            }
    
            //get strokeID of last "remove" action
            const strokeID = history[lastRemoveIndex].strokeID;
    
            //update action to "add" to redo the stroke
            const updatedHistory = [...history];
            updatedHistory[lastRemoveIndex] = { strokeID, action: "add" };
    
            //convert updated history to an object
            const updatedHistoryObject = Object.fromEntries(
                updatedHistory.map((entry, index) => [index, entry])
            );
    
            //update history in fb
            await set(ref(db, `rooms/${roomID}/drawing/history/${userID}`), updatedHistoryObject);
            console.log("Redo successful.");
        } catch (error) {
            console.error("Error during redo:", error);
        }
    };
    

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
    };

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