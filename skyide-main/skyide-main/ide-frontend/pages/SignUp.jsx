import React from 'react';
import { Link } from 'react-router-dom';

export default function SignUp() {
    const handleSubmit = (event) => {
        event.preventDefault();
        alert('Sign-up will connect to the workshop backend soon.');
    };

    return (
        <main className="page auth signup">
            <h1>Create Your Workshop Account</h1>
            <p className="intro">
                Signing up lets you save games, share them with friends, and pick up where you left off.
            </p>
            <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                    Name
                    <input type="text" name="name" placeholder="First and last name" required />
                </label>
                <label>
                    Email
                    <input type="email" name="email" placeholder="you@example.com" required />
                </label>
                <label>
                    Password
                    <input type="password" name="password" placeholder="Create a password" required />
                </label>
                <button type="submit">Sign Up</button>
            </form>
            <p className="switch">
                Already registered? <Link to="/login">Log in</Link> instead.
            </p>
        </main>
    );
}