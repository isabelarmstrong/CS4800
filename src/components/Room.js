import React, { useState } from "react";
import { getDatabase, ref, push, set } from "firebase/database";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faTimes } from "@fortawesome/free-solid-svg-icons";
import '../styles/rooms.css';

const RoomMenu = ({ currRoom, availableRooms, errorMessage, roomID, setRoomID, handleJoinRoom }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false); // State to manage menu visibility
    const [activeTab, setActiveTab] = useState("join"); // State to manage active tab ("join" or "create")

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen); // Toggle menu visibility
    };

    const handleCreateRoom = () => {
        const roomName = prompt("Enter a name for the new room:"); // Prompt for room name
        if (!roomName) return;

        const roomRef = ref(getDatabase(), 'rooms'); // Reference "rooms" in db
        const newRoomRef = push(roomRef); // Generate a unique room ID using push()

        set(newRoomRef, {
            name: roomName,
            users: {
                [auth.currentUser.uid]: { name: auth.currentUser.displayName || "Anonymous", email: auth.currentUser.email }
            },
            drawing: {
                strokes: {} // No strokes at creation
            }
        }).then(() => {
            alert("Room created successfully!");
            setRoomID(newRoomRef.key); // Set roomID to pass to canvas
        }).catch((error) => {
            console.error("Error creating room: ", error.message);
        });
    };

    return (
        <div className="room-menu-wrapper">
            {/* Hamburger Menu Button */}
            <button className="hamburger-menu" onClick={toggleMenu}>
                <FontAwesomeIcon icon={isMenuOpen ? faTimes : faBars} /> {/* Toggle between bars and close icon */}
            </button>

            {/* Overlay */}
            <div className={`overlay ${isMenuOpen ? "open" : ""}`} onClick={toggleMenu}></div>

            {/* Menu Content */}
            <div className={`menu-content ${isMenuOpen ? "open" : ""}`}>
                {/* Tabs to switch between Join and Create */}
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

                {/* Join Room Content */}
                {activeTab === "join" && (
                    <div className="join-room-content">
                        {currRoom ? (
                            <h2>Current room: {currRoom}</h2>
                        ) : (
                            <h2></h2>
                        )}

                        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

                        <div className='rooms-wrapper'>
                            <h3>Available rooms:</h3>
                            <ul>
                                {availableRooms.map((room) => (
                                    <li key={room}>
                                        <button
                                            onClick={() => setRoomID(room)}
                                            style={{ backgroundColor: room === roomID ? "lightblue" : "" }}
                                        >
                                            {room}
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
                    </div>
                )}

                {/* Create Room Content */}
                {activeTab === "create" && (
                    <div className="create-room-content">
                        <h3>Create a new room</h3>
                        
                        <button onClick={handleCreateRoom}>
                            Create Room
                        </button>

                        {roomID && (
                            <div>
                                <p>Room created with ID: {roomID}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomMenu;