import "./styles/styles.css";
import React, { useState, useEffect } from "react";
import { auth, googleProvider, signInWithPopup, signOut } from "./components/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, set } from "firebase/database";
import Canvas from "./components/Canvas";
import UserAuth from "./components/UserAuth";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";

export default function App() {
  //user
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

  //room
  const [currRoom, setCurrRoom] = useState("");
  const [roomID, setRoomID] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const roomsRef = ref(getDatabase(), "rooms");

    const unsubscribe = onValue(roomsRef, (snapshot) => {
        const roomsData = snapshot.val();

        if (roomsData) {
            const roomsList = Object.keys(roomsData);
            setAvailableRooms(roomsList);
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
                setCurrRoom(roomID);
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
    <div className="App">
      <UserAuth user={user} handleSignIn={handleSignIn} handleSignOut={handleSignOut} />
      <CreateRoom />
      <JoinRoom currRoom={currRoom} availableRooms={availableRooms} errorMessage={errorMessage} roomID={roomID} setRoomID={setRoomID} handleJoinRoom={handleJoinRoom} />

      { user && 
      ( roomID &&
        <>
          <Canvas user={user} roomID={roomID}/>
        </>
      )}
    </div>
  );
}
