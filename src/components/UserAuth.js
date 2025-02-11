import '../styles/auth.css';
import React, { useEffect, useState } from "react";

const UserAuth = ({ user, handleSignIn, handleSignOut }) => {
    return (
        <div>
            {user ? (
                <div> 
                    <img src={user.photoURL}></img>
                    <p>{user.displayName}</p>
                    <button onClick={handleSignOut}>
                        Sign out
                    </button>
                </div>
            ) : (
                <button onClick={handleSignIn}>
                    Sign in with Google
                </button>
            )}
        
        </div>
    );
};

export default UserAuth;