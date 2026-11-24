import React, { useState, useRef, useEffect } from "react"
import "../styles/customDropdown.css"

export default function CustomDropdown({ value, onChange, options, placeholder = "Select..." }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = event => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Close dropdown on escape key
    useEffect(() => {
        const handleEscape = event => {
            if (event.key === "Escape") {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("keydown", handleEscape)
            return () => document.removeEventListener("keydown", handleEscape)
        }
    }, [isOpen])

    const handleSelect = option => {
        onChange(option)
        setIsOpen(false)
    }

    const displayValue = value || placeholder

    return (
        <div className="custom-dropdown" ref={dropdownRef}>
            <button
                type="button"
                className="custom-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={!value ? "placeholder" : ""}>{displayValue}</span>
                <svg
                    className={`dropdown-arrow ${isOpen ? "open" : ""}`}
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M1 1.5L6 6.5L11 1.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {isOpen && (
                <div className="custom-dropdown-menu" role="listbox">
                    {/* Option to deselect (create new project) */}
                    <div
                        className={`custom-dropdown-option ${!value ? "selected" : ""}`}
                        onClick={() => handleSelect("")}
                        role="option"
                        aria-selected={!value}
                    >
                        <em>{placeholder}</em>
                    </div>

                    {/* Existing projects */}
                    {options.length > 0 ? (
                        options.map(option => (
                            <div
                                key={option}
                                className={`custom-dropdown-option ${option === value ? "selected" : ""}`}
                                onClick={() => handleSelect(option)}
                                role="option"
                                aria-selected={option === value}
                            >
                                {option}
                            </div>
                        ))
                    ) : (
                        <div className="custom-dropdown-option disabled">No projects yet</div>
                    )}
                </div>
            )}
        </div>
    )
}
