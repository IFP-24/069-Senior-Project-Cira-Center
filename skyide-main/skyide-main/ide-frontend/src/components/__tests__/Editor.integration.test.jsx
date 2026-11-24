import React, { forwardRef, useEffect, useImperativeHandle } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
    blocklyLoad,
    blocklySave,
    workspaceMock,
    dockConvertSpy,
    mockDockState,
    pythonWorkspaceToCode
} = vi.hoisted(() => ({
    blocklyLoad: vi.fn(),
    blocklySave: vi.fn(() => ({ blocks: { languageVersion: 0, blocks: [] } })),
    workspaceMock: {
        registerToolboxCategoryCallback: vi.fn(),
        registerButtonCallback: vi.fn(),
        getVariableMap: vi.fn(() => ({ getAllVariables: () => [] })),
        getToolbox: vi.fn(() => ({ refreshSelection: vi.fn() })),
        addChangeListener: vi.fn(),
        dispose: vi.fn(),
        clear: vi.fn(),
        getAllBlocks: vi.fn(() => []),
        getSelected: vi.fn(() => null),
        highlightBlock: vi.fn()
    },
    dockConvertSpy: vi.fn(),
    mockDockState: {
        python: "",
        conversionResult: null
    },
    pythonWorkspaceToCode: vi.fn(() => "# Generated Python code")
}))

vi.mock("blockly", () => {
    const Blocks = {}
    return {
        Blocks,
        Events: { SELECTED: "selected" },
        common: {
            defineBlocksWithJsonArray: vi.fn(),
            getSelected: vi.fn(() => null)
        },
        utils: {
            xml: {
                createElement: name => document.createElement(name)
            }
        },
        Variables: {
            createVariableButtonHandler: vi.fn()
        },
        getSelected: vi.fn(() => null),
        inject: vi.fn(() => workspaceMock),
        serialization: {
            workspaces: {
                save: blocklySave,
                load: blocklyLoad
            }
        },
        svgResize: vi.fn()
    }
})

vi.mock("blockly/blocks", () => ({}))
vi.mock("blockly/msg/en", () => ({}))
vi.mock("blockly/javascript", () => ({
    javascriptGenerator: {
        workspaceToCode: vi.fn(() => "// Generated code")
    }
}))
vi.mock("blockly/python", () => ({
    pythonGenerator: {
        forBlock: {},
        quote_: vi.fn(value => `"${value}"`),
        ORDER_NONE: 0,
        ORDER_FUNCTION_CALL: 0,
        ORDER_ATOMIC: 0,
        INDENT: "    ",
        statementToCode: vi.fn(() => ""),
        valueToCode: vi.fn(() => "0"),
        workspaceToCode: pythonWorkspaceToCode
    }
}))

vi.mock("../../../blocks/gameBlocks.js", () => ({}))
vi.mock("../../../blocks/gameGenerators.js", () => ({}))
vi.mock("../../../blocks/pythonGenerators.js", () => ({}))
vi.mock("../../../blocks/astShims.js", () => ({}))
vi.mock("../../../renders/custom.js", () => ({}))
vi.mock("../../../blocks/toolbox.js", () => ({ toolboxJson: { contents: [] } }))

vi.mock("../../components/CustomDropdown.jsx", () => ({
    default: ({ value = "", onChange, placeholder = "Select" }) => (
        <select
            aria-label={placeholder}
            value={value}
            onChange={event => onChange?.(event.target.value)}
        >
            <option value="">{placeholder}</option>
        </select>
    )
}))

vi.mock("../../components/ConversionStatusBadge.jsx", () => ({
    default: () => <div data-testid="conversion-status">conversion-status</div>
}))

vi.mock("../../context/AuthContext.jsx", () => ({
    useAuth: () => ({
        user: null,
        getExistingProjects: vi.fn(async () => ({ success: false, projects: [] })),
        loadProject: vi.fn(),
        saveProject: vi.fn(),
        deleteProject: vi.fn(),
        duplicateProject: vi.fn(),
        renameProject: vi.fn()
    })
}))

vi.mock("../../../lib/workspaceIO.js", () => ({
    clearWorkspace: vi.fn(workspace => workspace.clear())
}))

vi.mock("../../../lib/simEngine.js", () => ({
    runGeneratedCode: vi.fn(),
    resetEngine: vi.fn()
}))

vi.mock("../../../components/BlockMirrorDock.jsx", () => ({
    default: forwardRef(function MockBlockMirrorDock(props, ref) {
        useEffect(() => {
            props.pythonBridge?.updatePythonCode?.(props.incomingPythonCode || mockDockState.python)
        }, [props.incomingPythonCode, props.pythonBridge])

        useImperativeHandle(ref, () => ({
            convertPythonToBlocks: dockConvertSpy.mockImplementation(async () => {
                if (mockDockState.conversionResult) {
                    props.onImportBlocks?.(mockDockState.conversionResult)
                }
                return mockDockState.conversionResult
            }),
            loadSavedPythonCode: vi.fn(),
            loadRecentBlocks: vi.fn()
        }))

        return <div data-testid="mock-blockmirror-dock">mock-blockmirror-dock</div>
    })
}))

import Editor from "../../../pages/Editor.jsx"
import { convertPythonToBlockly } from "../../../lib/astConverter.js"
import { getGameWorkspaceFixture } from "../../../lib/gameFixtures.js"

function topTypes(workspaceJson) {
    return (workspaceJson?.blocks?.blocks || []).map(block => block.type)
}

function renderEditor(route = "/editor") {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <Editor />
        </MemoryRouter>
    )
}

describe("Editor conversion integration", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockDockState.python = ""
        mockDockState.conversionResult = null
        pythonWorkspaceToCode.mockReturnValue("# Generated Python code")
    })

    it("shows a blocked runtime banner and disables Run only for imports/outside-runtime Python", async () => {
        mockDockState.python = 'import math\nprint("debug")\nset_score(1)'

        renderEditor()

        fireEvent.click(screen.getByRole("button", { name: "Python" }))

        await waitFor(() => {
            expect(screen.getByText(/Outside Current Python Scope/)).toBeInTheDocument()
        })

        expect(
            screen.getAllByText((_, node) => node?.textContent?.includes("Python Run Blocked:"))
                .length
        ).toBeGreaterThan(0)
        expect(screen.getByText(/Outside Current Python Scope/)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Python → Blocks" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Run the game preview" })).toBeDisabled()
    })

    it("keeps Run enabled for advanced Python that is risky to round-trip but still supported at runtime", async () => {
        mockDockState.python = [
            "def hit_enemy(name):",
            "    return name",
            "register_frame_handler(hit_enemy)"
        ].join("\n")

        renderEditor()

        fireEvent.click(screen.getByRole("button", { name: "Python" }))

        await waitFor(() => {
            expect(screen.getByText(/Python → Blocks blocked:/)).toBeInTheDocument()
        })

        expect(screen.getByText(/Stage 3 · Advanced/)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Python → Blocks" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Run the game preview" })).toBeEnabled()
    })

    it("keeps runtime errors visible instead of replacing them with the running toast", async () => {
        const { runGeneratedCode } = await import("../../../lib/simEngine.js")
        runGeneratedCode.mockImplementation((_, { onError }) => {
            onError?.({ message: "Group loop failed", blockId: "loop-block-id" })
        })

        renderEditor()

        fireEvent.click(screen.getByRole("button", { name: "Run the game preview" }))

        await waitFor(() => {
            expect(screen.getByText(/Runtime:/)).toBeInTheDocument()
        })

        expect(screen.getAllByText(/Group loop failed/)).toHaveLength(2)
        expect(screen.queryByText("Running…")).not.toBeInTheDocument()
        expect(workspaceMock.highlightBlock).toHaveBeenCalledWith("loop-block-id")
    })

    it("opens an error modal that lists active errors", async () => {
        const { runGeneratedCode } = await import("../../../lib/simEngine.js")
        runGeneratedCode.mockImplementation((_, { onError }) => {
            onError?.({ message: "Group loop failed", blockId: "loop-block-id" })
        })

        renderEditor()

        fireEvent.click(screen.getByRole("button", { name: "Run the game preview" }))

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /Open error list \(\d+ errors?\)/ })
            ).toBeInTheDocument()
        })

        fireEvent.click(screen.getByRole("button", { name: /Open error list \(\d+ errors?\)/ }))

        expect(screen.getByText("Current Errors")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Jump to block" })).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Jump to block" }))
        expect(workspaceMock.highlightBlock).toHaveBeenCalledWith("loop-block-id")
    })

    it("allows dismissing modal errors and closes the modal when the last error is dismissed", async () => {
        const { runGeneratedCode } = await import("../../../lib/simEngine.js")
        runGeneratedCode.mockImplementation((_, { onError }) => {
            onError?.({ message: "Group loop failed", blockId: "loop-block-id" })
        })

        renderEditor()

        fireEvent.click(screen.getByRole("button", { name: "Run the game preview" }))

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /Open error list \(\d+ errors?\)/ })
            ).toBeInTheDocument()
        })

        fireEvent.click(screen.getByRole("button", { name: /Open error list \(\d+ errors?\)/ }))
        expect(screen.getByText("Current Errors")).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: /Close/i }))

        await waitFor(() => {
            expect(screen.queryByText("Current Errors")).not.toBeInTheDocument()
        })
    })

    it("shows a round-trip readiness message in blocks mode", async () => {
        renderEditor()

        await waitFor(() => {
            expect(
                screen.getByText(
                    /Current blocks generate Python inside the dependable Blocks ⇄ Python learning subset\./
                )
            ).toBeInTheDocument()
        })

        expect(screen.getByText("Round-Trip Safe")).toBeInTheDocument()
    })

    it("shows starter demo support status in blocks mode for shared game templates", async () => {
        renderEditor("/editor?template=pong")

        await waitFor(() => {
            expect(screen.getByLabelText("Starter demo details")).toBeInTheDocument()
        })

        expect(screen.getByText("Safe to switch Blocks <-> Python")).toBeInTheDocument()
        expect(screen.getByText("Pong")).toBeInTheDocument()
    })

    it("imports converted blocks from the Editor toolbar for supported Python", async () => {
        mockDockState.python = "set_score(1)"
        mockDockState.conversionResult = {
            json: {
                blocks: {
                    languageVersion: 0,
                    blocks: [{ type: "game_set_score", id: "score-1" }]
                }
            },
            pythonCode: "set_score(1)"
        }

        renderEditor()

        fireEvent.click(screen.getByRole("button", { name: "Python" }))

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Python → Blocks" })).toBeEnabled()
        })

        expect(screen.getByText(/Stage 1 · Beginner/)).toBeInTheDocument()
        expect(
            screen.getByText(
                /Current Python is inside the dependable Python ⇄ Blocks learning subset\./
            )
        ).toBeInTheDocument()
        expect(screen.getByText("Round-Trip Safe")).toBeInTheDocument()
        fireEvent.click(screen.getByRole("button", { name: "Python → Blocks" }))

        await waitFor(() => {
            expect(blocklyLoad).toHaveBeenCalled()
        })

        expect(dockConvertSpy).toHaveBeenCalledTimes(1)
        expect(screen.getByText("Blocks Workspace")).toBeInTheDocument()
    })

    it("loads a mixed AST-native and custom-event conversion result through the Editor page flow", async () => {
        const astWorkspace = {
            blocks: {
                languageVersion: 0,
                blocks: [
                    {
                        type: "procedures_defnoreturn",
                        id: "proc-on-frame",
                        fields: { NAME: "on_frame" },
                        inputs: {
                            STACK: {
                                block: {
                                    type: "controls_if",
                                    id: "if-ast",
                                    inputs: {
                                        IF0: {
                                            block: {
                                                type: "logic_boolean",
                                                id: "bool-ast",
                                                fields: { BOOL: "TRUE" }
                                            }
                                        },
                                        DO0: {
                                            block: {
                                                type: "game_set_score",
                                                id: "score-ast",
                                                inputs: {
                                                    VALUE: {
                                                        shadow: {
                                                            type: "math_number",
                                                            id: "score-num",
                                                            fields: { NUM: "1" }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        type: "ast_Expr",
                        id: "expr-register-frame",
                        inputs: {
                            VALUE: {
                                block: {
                                    type: "ast_Call",
                                    id: "call-register-frame",
                                    inputs: {
                                        FUNC: {
                                            block: {
                                                type: "ast_Name",
                                                id: "fn-register-frame",
                                                fields: { ID: "register_frame_handler" }
                                            }
                                        },
                                        ARG0: {
                                            block: {
                                                type: "ast_Name",
                                                id: "arg-on-frame",
                                                fields: { ID: "on_frame" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        }

        mockDockState.python = [
            'create_sprite("player", 1, 1)',
            "def on_frame():",
            "    if True:",
            "        set_score(1)",
            "register_frame_handler(on_frame)"
        ].join("\n")
        mockDockState.conversionResult = {
            json: convertPythonToBlockly(astWorkspace, mockDockState.python),
            pythonCode: mockDockState.python
        }

        renderEditor()

        fireEvent.click(screen.getByRole("button", { name: "Python" }))

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Python → Blocks" })).toBeEnabled()
        })

        fireEvent.click(screen.getByRole("button", { name: "Python → Blocks" }))

        await waitFor(() => {
            expect(blocklyLoad).toHaveBeenCalled()
        })

        const [loadedWorkspaceJson] = blocklyLoad.mock.calls.at(-1)
        const rootTypes = (loadedWorkspaceJson?.blocks?.blocks || []).map(block => block.type)

        expect(rootTypes).toContain("game_create_sprite")
        expect(rootTypes).toContain("game_on_tick")
    })

    it("switches a saved game workspace from blocks to python and back without losing core game roots", async () => {
        const savedWorkspaceJson = {
            blocks: {
                languageVersion: 0,
                blocks: [
                    {
                        type: "game_create_sprite",
                        id: "breakout-paddle",
                        fields: { NAME: "paddle" },
                        inputs: {
                            X: {
                                shadow: {
                                    type: "math_number",
                                    id: "paddle-x",
                                    fields: { NUM: "11" }
                                }
                            },
                            Y: {
                                shadow: {
                                    type: "math_number",
                                    id: "paddle-y",
                                    fields: { NUM: "17" }
                                }
                            }
                        }
                    },
                    {
                        type: "game_create_sprite",
                        id: "breakout-ball",
                        fields: { NAME: "ball" },
                        inputs: {
                            X: {
                                shadow: { type: "math_number", id: "ball-x", fields: { NUM: "11" } }
                            },
                            Y: {
                                shadow: { type: "math_number", id: "ball-y", fields: { NUM: "15" } }
                            }
                        }
                    },
                    {
                        type: "game_on_key",
                        id: "breakout-launch",
                        fields: { KEY: " " },
                        inputs: {
                            DO: {
                                block: {
                                    type: "game_move_by",
                                    id: "breakout-launch-move",
                                    fields: { NAME: "ball" },
                                    inputs: {
                                        DX: {
                                            shadow: {
                                                type: "math_number",
                                                id: "launch-dx",
                                                fields: { NUM: "0" }
                                            }
                                        },
                                        DY: {
                                            shadow: {
                                                type: "math_number",
                                                id: "launch-dy",
                                                fields: { NUM: "-1" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        type: "game_on_collide",
                        id: "breakout-hit",
                        fields: { A: "ball", B: "brick1" },
                        inputs: {
                            DO: {
                                block: {
                                    type: "game_change_score",
                                    id: "breakout-score-up",
                                    inputs: {
                                        DELTA: {
                                            shadow: {
                                                type: "math_number",
                                                id: "score-ten",
                                                fields: { NUM: "10" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        }

        const generatedPython = [
            "set_score(0)",
            "set_lives(3)",
            'create_sprite("paddle", 11, 17)',
            'create_sprite("ball", 11, 15)',
            'create_sprite("brick1", 11, 3)',
            "def on_space_pressed():",
            '    move_by("ball", 0, -1)',
            'register_key_handler("space", on_space_pressed)',
            "def on_ball_hits_brick1():",
            "    change_score(10)",
            'register_collision_handler("ball", "brick1", on_ball_hits_brick1)'
        ].join("\n")

        blocklySave.mockReturnValue(savedWorkspaceJson)
        pythonWorkspaceToCode.mockReturnValue(generatedPython)
        mockDockState.conversionResult = {
            json: convertPythonToBlockly(null, generatedPython),
            pythonCode: generatedPython
        }

        renderEditor()

        expect(
            screen.getByText(
                /Current blocks generate Python inside the dependable Blocks ⇄ Python learning subset\./
            )
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Blocks → Python" }))

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Python → Blocks" })).toBeEnabled()
        })

        expect(
            screen.getByText(
                /Current Python is inside the dependable Python ⇄ Blocks learning subset\./
            )
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Python → Blocks" }))

        await waitFor(() => {
            expect(blocklyLoad).toHaveBeenCalled()
        })

        const [loadedWorkspaceJson] = blocklyLoad.mock.calls.at(-1)
        const rootTypes = topTypes(loadedWorkspaceJson)

        expect(rootTypes).toEqual(
            expect.arrayContaining(["game_create_sprite", "game_on_key", "game_on_collide"])
        )
        expect(dockConvertSpy).toHaveBeenCalledTimes(1)
    })

    it("auto-loads a shared game template when the editor opens with a template query parameter", async () => {
        renderEditor("/editor?template=shooter")

        await waitFor(() => {
            expect(blocklyLoad).toHaveBeenCalled()
        })

        const [loadedWorkspaceJson] = blocklyLoad.mock.calls.at(-1)
        const expectedFixture = getGameWorkspaceFixture("shooter")
        const rootTypes = topTypes(loadedWorkspaceJson)

        expect(loadedWorkspaceJson).toEqual(expectedFixture)
        expect(screen.getByRole("heading", { name: "Shooter" })).toBeInTheDocument()
        expect(screen.getByText(/Move, fire, dodge enemies/)).toBeInTheDocument()
        expect(screen.getByText(/Practice repeated input, projectile logic/)).toBeInTheDocument()
        expect(rootTypes).toEqual(
            expect.arrayContaining(["game_create_sprite", "game_on_key", "game_on_tick"])
        )
    })
})
