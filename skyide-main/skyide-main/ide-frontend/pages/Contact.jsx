import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';

export default function ContactUs() {
    const { sendEmail } = useAuth()
    // eslint-disable-next-line no-unused-vars
    const [errors, setErrors] = useState({})
    const [formData, setFormData] = useState({
        email: "",
        description: ""
    })

    // eslint-disable-next-line no-unused-vars
    const handleSubmit = async (event) => {
        // eslint-disable-next-line no-unused-vars
        const result = await sendEmail(formData.email, formData.description)
    };

    const handleChange = e => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    return (
        <main className="page auth signup">
            <h1>Contact Us</h1>
            <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                    Email
                    <input
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Reason of Contact
                    <textarea
                        style={{ resize: "none" }}
                        type="text"
                        name="description"
                        placeholder="Description"
                        rows="10"
                        onChange={handleChange}
                        required
                    />
                </label>
                <button type="submit">Submit</button>
            </form>
        </main>
    );
}