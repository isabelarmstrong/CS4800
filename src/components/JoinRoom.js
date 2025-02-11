import React, { useState, useEffect } from "react";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { auth } from "./firebase";

const JoinRoom = () => {
    const [roomID, setRoomID] = useState("");
    const [publicRooms, setPublicRooms] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const roomsRef = ref(getDatabase(), "rooms");

        const unsubscribe = onValue(roomsRef, (snapshot) => {
            const roomsData = snapshot.val();

            if (roomsData) {
                const roomsList = Object.keys(roomsData);
                setPublicRooms(roomsList);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleJoinRoom = () => {
        if (roomID){
            const roomRef = ref(getDatabase(), `rooms/${roomID}`);

            onValue(roomRef, (snapshot) => {
                if (snapshot.exists()){
                    //room exists, join room
                    joinRoom(roomID);
                } else {
                    setErrorMessage("Room does not exist. Please check Room ID.");
                }
            });
        } else {
            setErrorMessage("Please enter a Room ID.");
        }
    };

    const joinRoom = (roomID) => {
        const roomRef = ref(getDatabase(), `rooms/${roomID}/users`);

        set(roomRef, {
            [auth.currentUser.uid]: {
                name: auth.currentUser.displayName || "Anonymous",
                email: auth.currentUser.email,
            },
        }).then(() => {
            console.log("Successfully joined room: ", roomID);
        }).catch((error) => {
            console.error("Error joining room: ", error.message);
        });
    };
    
    return (
        <div>
            <h2>Join a room</h2>
            {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

            <input 
                type="text"
                placeholder="Enter Room ID"
                value={roomID}
                onChange={(e) => setRoomID(e.target.value)}
            />

            <button onClick={handleJoinRoom}>
                JoinRoom
            </button>

            <div>
                <h3>Public rooms:</h3>
                <ul> 
                    {publicRooms.map((room) => (
                        <li key={room}>
                            <button onClick={() => setRoomID(room)}>{room}</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default JoinRoom;
