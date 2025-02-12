import React, { useState } from "react";
import { getDatabase, ref, push, set } from "firebase/database";
import { auth } from "./firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faTimes } from "@fortawesome/free-solid-svg-icons";

const CreateRoom = () => {
    const [roomName, setRoomName] = useState("");
    const [userName, setUserName] = useState(auth.currentUser?.displayName || "Anonymous");
    const [roomID, setRoomID] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false); // State to manage menu visibility

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen); // Toggle menu visibility
    };

    // Handle room creation
    const handleCreateRoom = () => {
        const roomRef = ref(getDatabase(), 'rooms'); // Reference "rooms" in db
        const newRoomRef = push(roomRef); // Generate a unique room ID using push()

        set(newRoomRef, {
            name: roomName,
            users: {
                [auth.currentUser.uid]: { name: userName, email: auth.currentUser.email }
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
        <div className="create-room-wrapper">
            {/* Hamburger Menu Button */}
            <button className="hamburger-menu" onClick={toggleMenu}>
                <FontAwesomeIcon icon={isMenuOpen ? faTimes : faBars} /> {/* Toggle between bars and close icon */}
            </button>

            {/* Menu Content */}
            <div className={`menu-content ${isMenuOpen ? "open" : ""}`}>
                <h3>Create a new room</h3>

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
        </div>
    );
};

export default CreateRoom;