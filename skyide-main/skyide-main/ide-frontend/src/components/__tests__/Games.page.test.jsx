import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import Games from "../../../pages/Games.jsx"

describe("Games page", () => {
    it("shows round-trip support badges on shared demo cards", () => {
        render(
            <MemoryRouter>
                <Games />
            </MemoryRouter>
        )

        expect(screen.getAllByText("Safe to switch Blocks <-> Python").length).toBeGreaterThan(0)
        expect(
            screen.getAllByText("Runs in Python, switching still evolving").length
        ).toBeGreaterThan(0)
        expect(screen.getByText(/What The Badges Mean/)).toBeInTheDocument()
        expect(
            screen.getByText(
                /import statements and outside libraries are still outside the current runtime/i
            )
        ).toBeInTheDocument()
        expect(screen.getAllByRole("link", { name: "Open in Editor" }).length).toBeGreaterThan(0)
    })
})
