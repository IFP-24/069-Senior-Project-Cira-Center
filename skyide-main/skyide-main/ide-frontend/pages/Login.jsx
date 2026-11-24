import React from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
    const handleSubmit = (event) => {
        event.preventDefault();
        alert('Login flow will connect to the workshop backend soon.');
    };

    return (
        <main className="page auth login">
            <h1>Welcome Back</h1>
            <p className="intro">Sign in to continue building your skyscraper experiences.</p>
            <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                    Email
                    <input type="email" name="email" placeholder="you@example.com" required />
                </label>
                <label>
                    Password
                    <input type="password" name="password" placeholder="Enter your password" required />
                </label>
                <button type="submit">Log In</button>
            </form>
            <p className="switch">
                Need an account? <Link to="/signup">Create one</Link>.
            </p>
        </main>
    );
}