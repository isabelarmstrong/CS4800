import React from "react";

const JoinRoom = ({ currRoom, availableRooms, errorMessage, roomID, setRoomID, handleJoinRoom}) => {
    return (
        <div>
            { currRoom ? (
                <h2>Current room: {currRoom}</h2>
            ) : (
                <h2>Join a room</h2>
            )}

            {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

            <div>

                <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomID}
                    onChange={(e) => setRoomID(e.target.value)}
                />
                <button onClick={handleJoinRoom}>Join Room</button>

                <h3>Available rooms:</h3>
                <ul> 
                    {availableRooms.map((room) => (
                        <li key={room}>
                            <button
                                onClick={() => setRoomID(room)}  // Set roomID when clicking on a room
                                style={{ backgroundColor: room === roomID ? "lightblue" : "" }}
                            >
                            {room}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default JoinRoom;
