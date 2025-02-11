import React, {useState} from "react";
import { getDatabase, ref, push, set} from "firebase/database";
import { auth } from "./firebase";

const CreateRoom = () => {
    const [roomName, setRoomName] = useState("");
    const [userName, setUserName] = useState(auth.currentUser?.displayName || "Anonymous" );
    const [roomID, setRoomID] = useState("");

    //handle room creation
    const handleCreateRoom = () => {
        const roomRef = ref(getDatabase(), 'rooms'); //reference "rooms" in db
        const newRoomRef = push(roomRef); //generate a unique room ID using push()

        set(newRoomRef, {
            name: roomName,
            users: {
                [auth.currentUser.uid]: {name: userName, email: auth.currentUser.email}
            },
            drawing: {
                strokes: {} //no strokes at creation
            }
        }).then(() => {
            alert("Room created successfully!");
            setRoomID(newRoomRef.key); //set roomID to pass to canvas
        }).catch((error) => {
            console.error("Error creating room: ", error.message);
        });
    };

    return (
        <div>
            <h2>Create a new room</h2>

            <input 
                type="text"
                placeholder="Enter Room Name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                required
            />
            <button onClick={handleCreateRoom}>
                Create Room
            </button>

            {roomID && (
                <div> 
                    <p>Room created with ID: {roomID}</p>
                </div>
            )}
        </div>
    );
};

export default CreateRoom;