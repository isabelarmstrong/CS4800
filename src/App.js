import "./styles/styles.css";
import React, { useState, useEffect } from "react";
import { auth, googleProvider, signInWithPopup, signOut } from "./components/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, set } from "firebase/database";
import Canvas from "./components/Canvas";
import UserAuth from "./components/UserAuth";
import Room from "./components/Room";

export default function App() {
  /*****************************************USER****************************************************/
  const [user, setUser] = useState(null);

  useEffect(() => {
    //firebase listener that tracks auth state
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      //when user logs in, currUser contains their firebase auth details
      //when logged out, currUser becomes null

      //update react state with user's auth details
      setUser(currUser);
    });

    return () => unsubscribe(); //clean up on unmount
  }, []);

  const handleSignIn = async () => {
    //try catch for graceful error handling
    try{
      //open google popup for user to sign in
      await signInWithPopup(auth, googleProvider);
    }catch (error){
      console.error("Errror signing in with Google", error.message);
    }
  };

  const handleSignOut = async () => {
    //try catch for graceful error handling
    try{
      //firebase funct to log user out
      await signOut(auth);
    }catch (error){
      console.error("Error signing out", error.message);
    }
  };

  /*****************************************ROOM****************************************************/
  const [roomName, setRoomName] = useState("");
  const [currRoom, setCurrRoom] = useState("");
  const [roomID, setRoomID] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);

  useEffect(() => {
    const roomsRef = ref(getDatabase(), "rooms");
    
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      //get data of rooms
      const roomsData = snapshot.val();

      if (roomsData) {
        //convert roomsData to an arr of room objects
        const roomsList = Object.entries(roomsData).map(([id, roomData]) => ({
          id,
          name: roomData.name || `Room ${id}`
        }));

        //update availableRooms list in UI
        setAvailableRooms(roomsList);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleJoinRoom = () => {
    if (roomID){
      //ref to the room in the db
      const roomRef = ref(getDatabase(), `rooms/${roomID}`);

      //set up a real-time listener ofr that room
      onValue(roomRef, (snapshot) => {

        //check to make sure room exists
        if (snapshot.exists()){
          joinRoom(roomID);
          setCurrRoom(roomID); //curr room for the sake of keeping rooms hamburger menu functional
          setRoomName(snapshot.val().name || `Room ${roomID}`)
        } else {
          setErrorMessage("Room does not exist. Please check Room ID.");
        }
      });
    } else {
        setErrorMessage("Please enter a Room ID.");
    }
  };

  const joinRoom = (roomID) => {
    //ref to the "users" subcollection in the rooom
    const roomUsersRef = ref(getDatabase(), `rooms/${roomID}/users`);

    //create an object to write the current user's info to the db
    set(roomUsersRef, {
      [auth.currentUser.uid]: {
        name: auth.currentUser.displayName || "Anonymous",
        email: auth.currentUser.email,
      },
    }).catch((error) => {
      console.error("Error joining room: ", error.message);
    });

    //indicate the user has joined and is currently in a room
    setJoinedRoom(true); 
  };

  const handleLeaveRoom = () => {
    if (!roomID || !user) return;

    //get the user's db reference
    const userInRoomRef = ref(getDatabase(), `rooms/${roomID}/users/${user.uid}`);

    //remove the user from the room
    set(userInRoomRef, null)
    .then(() => {
      setCurrRoom("");
      setRoomID("");
      setRoomName("");
      setJoinedRoom(false);
      console.log("Left room successfully!");
    })
    .catch((error) => {
      console.error("Error leaving room: ", error.message);
    });
  };

  return (
    <div className="App">
      <div className="navbar">
        
      <Room roomName={roomName} currRoom={currRoom} availableRooms={availableRooms} errorMessage={errorMessage} roomID={roomID} setRoomID={setRoomID} handleJoinRoom={handleJoinRoom} handleLeaveRoom={handleLeaveRoom} />
        <UserAuth user={user} handleSignIn={handleSignIn} handleSignOut={handleSignOut} />

        { user && 
        ( joinedRoom &&
          <>
            <Canvas user={user} userID={auth.currentUser.uid} roomID={roomID}/>
          </>
        )}
      </div>
    </div>
  );
}
