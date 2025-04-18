import React, { useState } from "react";
import { getDatabase, ref, push, set } from "firebase/database";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faTimes } from "@fortawesome/free-solid-svg-icons";
import '../styles/rooms.css';

const RoomMenu = ({ roomName, currRoom, availableRooms, errorMessage, roomID, setRoomID, handleJoinRoom, handleLeaveRoom }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false); //manage menu visibility
    const [activeTab, setActiveTab] = useState("join"); //manage active tab ("join" or "create")

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen); //toggle menu visibility
    };

    const handleCreateRoom = () => {
        const roomName = prompt("Enter a name for the new room:"); //prompt for room name
        if (!roomName) return;

        const roomRef = ref(getDatabase(), 'rooms'); //reference "rooms" in db
        const newRoomRef = push(roomRef); //generate a unique roomID using push()

        set(newRoomRef, {
            name: roomName,
            users: {
                [auth.currentUser.uid]: { name: auth.currentUser.displayName || "Anonymous", email: auth.currentUser.email }
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
        <div className="room-menu-wrapper">
            <button className="hamburger-menu" onClick={toggleMenu}>
                <FontAwesomeIcon icon={isMenuOpen ? faTimes : faBars} />
            </button>

            <div className={`overlay ${isMenuOpen ? "open" : ""}`} onClick={toggleMenu}></div>

            <div className={`menu-content ${isMenuOpen ? "open" : ""}`}>
                
                {!currRoom && (
                    <div className="tabs">
                        <button
                            className={activeTab === "join" ? "active" : ""}
                            onClick={() => setActiveTab("join")}
                        >
                            Join Room
                        </button>
                        <button
                            className={activeTab === "create" ? "active" : ""}
                            onClick={() => setActiveTab("create")}
                        >
                            Create Room
                        </button>
                    </div>
                    )
                }


                {activeTab === "join" && (
                    <div className="join-room-content">
                        {currRoom && (
                            <div className="current-room-header">
                                <h2>Current room: {roomName}</h2>
                                <h4>Room ID: <br/> {roomID}</h4>
                                <button
                                    onClick={handleLeaveRoom}
                                    className="leave-room-button"
                                >
                                    Leave Room
                                </button>
                            </div>
                        )}

                        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

                        {!currRoom && 
                            (
                            <div className='rooms-wrapper'>
                                <h3>Available rooms:</h3>
                                <ul>
                                    {availableRooms.map((room) => (
                                        <li key={room.id}>
                                            <button
                                                onClick={() => setRoomID(room.id)}
                                                style={{ backgroundColor: room.id === roomID ? "lightblue" : "" }}
                                            >
                                                {room.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                <input
                                    type="text"
                                    placeholder="Enter Room ID"
                                    value={roomID}
                                    onChange={(e) => setRoomID(e.target.value)}
                                />
                                <button onClick={handleJoinRoom}>Join Room</button>
                            </div>
                            )
                        }
                    </div>
                )}

                {activeTab === "create" && (
                    <div className="create-room-content">
                        <h3>Create a new room</h3>
                        
                        <button onClick={handleCreateRoom}>
                            Create Room
                        </button>

                        {roomID && (
                            <div>
                                <p>Room created with ID: <br/> {roomID}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomMenu;