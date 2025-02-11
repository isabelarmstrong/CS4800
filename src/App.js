import "./styles/styles.css";
import React, { useState, useEffect } from "react";
import { auth, googleProvider, signInWithPopup, signOut } from "./components/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Canvas from "./components/Canvas";
import UserAuth from "./components/UserAuth";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";

export default function App() {
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

  return (
    <div className="App">
      <UserAuth user={user} handleSignIn={handleSignIn} handleSignOut={handleSignOut} />

      { user &&
      (
        <>
          <CreateRoom/>
          <JoinRoom />
          <Canvas />
        </>
      )}
    </div>
  );
}
