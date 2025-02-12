import '../styles/auth.css';
import React from "react";

const UserAuth = ({ user, handleSignIn, handleSignOut }) => {
    return (
        <div className='auth-wrapper'>
            {user ? (
                <div className='user-wrapper'> 
                <button onClick={handleSignOut}>
                        Sign out
                    </button>
                    <img className='user-pic' src={user.photoURL}></img>
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