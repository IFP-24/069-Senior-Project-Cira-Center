import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as Blockly from 'blockly'
import 'blockly/blocks'
import { javascriptGenerator } from 'blockly/javascript'
import { pythonGenerator } from 'blockly/python'
import 'blockly/msg/en'

import '../blocks/gameBlocks.js'
import '../blocks/gameGenerators.js'
import '../blocks/pythonGenerators.js'
import '../blocks/astShims.js'
import '../renders/custom.js'
import { toolboxJson } from '../blocks/toolbox.js'

import { clearWorkspace } from '../lib/workspaceIO.js'
import { runGeneratedCode, resetEngine } from '../lib/simEngine.js'
import {
    GAME_TEMPLATES,
    addHistorySnapshot,
    analyzeRoundTripReadiness,
    analyzePythonLearningStage,
    applyTemplate,
    detectPythonCompatibilityIssues,
    getBlockingPythonCompatibilityIssues,
    getPythonRuntimeBlockingIssues,
    hashWorkspaceSnapshot,
    lintWorkspace,
    loadHistory,
} from '../lib/editorEnhancements.js'

const BlockMirrorDock = lazy(() => import('../components/BlockMirrorDock.jsx'))
import CustomDropdown from '../src/components/CustomDropdown.jsx'
import ConversionStatusBadge from '../src/components/ConversionStatusBadge.jsx'
import { usePythonToBlocks } from '../src/hooks/usePythonToBlocks.js'

import { sanitizeAstJson } from '../lib/sanitizeAstJson.js'
import { convertPythonToBlockly } from '../lib/astConverter.js'
import { getGameFixtureMeta } from '../lib/gameFixtures.js'

import { useAuth } from '../src/context/AuthContext.jsx'

import '../src/styles/blockmirror.css'
import '../src/styles/editorLayout.css'

const AUTOSAVE_DEBOUNCE_MS = 900
const ERROR_HISTORY_LIMIT = 50

const getWorkspaceBlockCount = workspace => workspace
    ? workspace.getAllBlocks(false).filter(block => !block.isShadow()).length
    : 0

const normalizeBlockSearchLabel = value => String(value || '')
    .replace(/^game_/, '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()

const filterToolboxContents = (contents = [], query = '') => {
    if (!query) return contents
    const loweredQuery = query.trim().toLowerCase()
    if (!loweredQuery) return contents

    const filtered = []
    for (const item of contents) {
        if (!item) continue
        if (item.kind === 'block') {
            const matches = normalizeBlockSearchLabel(item.type).includes(loweredQuery)
                || String(item.type || '').toLowerCase().includes(loweredQuery)
            if (matches) filtered.push(item)
            continue
        }
        if (item.kind === 'category') {
            const nested = filterToolboxContents(item.contents || [], loweredQuery)
            const nameMatches = String(item.name || '').toLowerCase().includes(loweredQuery)
            if (nameMatches || nested.length) {
                filtered.push({
                    ...item,
                    contents: nested.length ? nested : (nameMatches ? (item.contents || []) : []),
                })
            }
            continue
        }
        if (!loweredQuery && (item.kind === 'sep' || item.kind === 'label')) {
            filtered.push(item)
        }
    }
    return filtered
}

export default function Editor() {
    const blocklyDivRef = useRef(null)
    const canvasRef = useRef(null)
    const workspaceShellRef = useRef(null)
    const blockMirrorRef = useRef(null)
    const importProjectInputRef = useRef(null)
    const autosaveTimerRef = useRef(null)
    const toastTimerRef = useRef(null)

    const [ws, setWs] = useState(null)
    const [, setJsCode] = useState('')
    const [generatedPythonCode, setGeneratedPythonCode] = useState('')
    const [pythonCodeForBlockMirror, setPythonCodeForBlockMirror] = useState('')
    const [viewMode, setViewMode] = useState('blocks')
    const [fullscreenPanel, setFullscreenPanel] = useState(null)
    const [toast, setToast] = useState(null)
    const [busy, setBusy] = useState({ run: false, save: false, load: false, clear: false, delete: false, duplicate: false, rename: false })
    const [isRunning, setIsRunning] = useState(false)
    const [runtimeError, setRuntimeError] = useState(null)

    const [projects, setProjects] = useState([])
    const [selectedProject, setSelectedProject] = useState('')
    const [showRenameModal, setShowRenameModal] = useState(false)
    const [newProjectName, setNewProjectName] = useState('')
    const [showNewProjectModal, setShowNewProjectModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [modalErrors, setModalErrors] = useState([])
    const [blockSearchQuery, setBlockSearchQuery] = useState('')

    const [dirty, setDirty] = useState(false)
    const [lastSavedHash, setLastSavedHash] = useState('')
    const [history, setHistory] = useState([])
    const [selectedTemplate, setSelectedTemplate] = useState('blank')

    const [lintFindings, setLintFindings] = useState([])
    const [compatIssues, setCompatIssues] = useState([])
    const [workspaceBlockCount, setWorkspaceBlockCount] = useState(0)
    const [engineState, setEngineState] = useState({ spriteCount: 0, sprites: [], keys: [], tickHandlers: 0, keyHandlers: 0, score: 0, status: 'running' })
    const [_enginePerf, setEnginePerf] = useState({ fps: 0, frameDurationMs: 0, tickDurationMs: 0, spriteCount: 0 })

    const { user, getExistingProjects, loadProject, saveProject, deleteProject, duplicateProject, renameProject } = useAuth()

    const pythonBridge = usePythonToBlocks({ autoLoad: false })
    const { isConverting, hasRecentConversion, getStats, conversionHistory, pythonCode } = pythonBridge
    const [hasLoadedSavedPython, setHasLoadedSavedPython] = useState(false)

    const [searchParams] = useSearchParams()
    const projectParam = searchParams.get('project')
    const templateParam = searchParams.get('template')

    const activeProjectKey = selectedProject || 'draft'
    const activeProjectKeyRef = useRef(activeProjectKey)
    const lastSavedHashRef = useRef(lastSavedHash)
    const templateQueryAppliedRef = useRef('')
    const errorSequenceRef = useRef(0)

    useEffect(() => {
        activeProjectKeyRef.current = activeProjectKey
    }, [activeProjectKey])

    useEffect(() => {
        lastSavedHashRef.current = lastSavedHash
    }, [lastSavedHash])

    const setSavedHash = useCallback(hash => {
        lastSavedHashRef.current = hash
        setLastSavedHash(hash)
    }, [])

    const dismissToast = useCallback(() => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current)
            toastTimerRef.current = null
        }
        setToast(null)
    }, [])

    const pushModalError = useCallback((entry = {}) => {
        const message = String(entry.message || '').trim()
        if (!message) return
        const nextSequence = errorSequenceRef.current + 1
        errorSequenceRef.current = nextSequence
        setModalErrors(prev => {
            return [{
                id: `${entry.title || 'Error'}:${entry.blockId || ''}:${nextSequence}`,
                title: entry.title || 'Error',
                message,
                detail: entry.detail || '',
                blockId: entry.blockId || null,
            }, ...prev].slice(0, ERROR_HISTORY_LIMIT)
        })
    }, [])

    const showToast = useCallback((kind, msg, ms, options = {}) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current)
            toastTimerRef.current = null
        }
        const resolvedMs = typeof ms === 'number' ? ms : (kind === 'err' ? 0 : 2200)
        const persistent = resolvedMs <= 0
        setToast({ kind, msg, persistent })
        if (kind === 'err' && options.captureInModal !== false) {
            pushModalError({ title: 'Error', message: msg })
        }
        if (!persistent) {
            toastTimerRef.current = setTimeout(() => {
                toastTimerRef.current = null
                setToast(null)
            }, resolvedMs)
        }
    }, [pushModalError])

    const activeToolboxJson = useMemo(() => {
        if (!blockSearchQuery.trim()) return toolboxJson
        return {
            ...toolboxJson,
            contents: filterToolboxContents(toolboxJson.contents || [], blockSearchQuery),
        }
    }, [blockSearchQuery])

    useEffect(() => () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }, [])

    useEffect(() => {
        if (viewMode !== 'python') setHasLoadedSavedPython(false)
    }, [viewMode])

    useEffect(() => {
        setHistory(loadHistory(activeProjectKey))
    }, [activeProjectKey])

    useEffect(() => {
        setCompatIssues(detectPythonCompatibilityIssues(pythonCode))
    }, [pythonCode])

    useEffect(() => {
        const fetchProjects = async () => {
            if (user) {
                const result = await getExistingProjects()
                if (result.success) {
                    setProjects(result.projects)
                    if (projectParam && result.projects.includes(projectParam)) {
                        setSelectedProject(projectParam)
                    }
                }
            } else {
                setProjects([])
                setSelectedProject('')
            }
        }
        fetchProjects()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, projectParam])

    useEffect(() => {
        if (projectParam && selectedProject === projectParam && ws && !busy.load) {
            handleLoad()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProject, ws, projectParam])

    useEffect(() => {
        if (!templateParam) {
            templateQueryAppliedRef.current = ''
            return
        }
        if (!ws || projectParam) return
        if (!GAME_TEMPLATES.some(template => template.id === templateParam)) return
        if (templateQueryAppliedRef.current === templateParam) return
        templateQueryAppliedRef.current = templateParam
        handleTemplateApply(templateParam, { suppressToast: true, historyReason: `template-link:${templateParam}` })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ws, templateParam, projectParam])

    useEffect(() => {
        const warnOnUnload = event => {
            if (!dirty) return
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', warnOnUnload)
        return () => window.removeEventListener('beforeunload', warnOnUnload)
    }, [dirty])

    const updateCanvasSize = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const w = Math.floor(rect.width)
        const h = Math.floor(rect.height)
        if (!w || !h) return

        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
        }
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const handleResize = () => updateCanvasSize()

        handleResize()
        resetEngine(canvas, {
            onState: snapshot => setEngineState(snapshot),
            onPerf: stats => setEnginePerf(stats),
        })

        let observer = null
        let usingWindowListener = false

        if (typeof ResizeObserver === 'function') {
            observer = new ResizeObserver(() => handleResize())
            observer.observe(canvas)
        } else {
            usingWindowListener = true
            window.addEventListener('resize', handleResize)
        }

        return () => {
            if (observer) observer.disconnect()
            if (usingWindowListener) window.removeEventListener('resize', handleResize)
        }
    }, [updateCanvasSize])

    useEffect(() => {
        updateCanvasSize()
    }, [updateCanvasSize, fullscreenPanel])

    const scheduleAutosave = useCallback((workspace, reason = 'autosave') => {
        if (!workspace) return
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = setTimeout(() => {
            const snapshot = Blockly.serialization.workspaces.save(workspace)
            const nextHistory = addHistorySnapshot(activeProjectKeyRef.current, snapshot, reason)
            setHistory(nextHistory)
        }, AUTOSAVE_DEBOUNCE_MS)
    }, [])

    useEffect(() => {
        if (!blocklyDivRef.current) return

        const workspace = Blockly.inject(blocklyDivRef.current, {
            toolbox: toolboxJson,
            trashcan: true,
            zoom: { controls: true, wheel: true, startScale: 0.95, maxScale: 2.2, minScale: 0.5 },
            grid: { spacing: 24, length: 3, colour: '#eee', snap: true },
            media: 'https://unpkg.com/blockly/media/',
        })

        /* Keep the toolbox flyout at a constant scale (1.0) so it doesn't
           zoom with the workspace, and prevent it from auto-closing when the
           user interacts with zoom controls or scroll wheel. */
        const flyout = workspace.getToolbox()?.getFlyout?.()
        if (flyout) {
            /* Lock flyout zoom at 1× */
            flyout.getFlyoutScale = () => 1

            /* Prevent flyout from closing on workspace click/zoom.
               The toolbox clearSelection closes the flyout; we override it
               to only close when the click target is the main workspace SVG
               background (not zoom buttons, scroll, etc.). */
            const toolbox = workspace.getToolbox()
            if (toolbox) {
                const origClearSelection = toolbox.clearSelection.bind(toolbox)
                toolbox.clearSelection = () => {
                    /* Only close if user explicitly clicked the workspace canvas */
                    const active = document.activeElement
                    const isSvgClick = active?.closest?.('.blocklyMainBackground') ||
                        active?.closest?.('.blocklySvg')
                    if (!isSvgClick) return
                    origClearSelection()
                }
            }
        }

        /* Force dark text in comment bubbles — Blockly renders textareas
           inside SVG foreignObjects that inherit the page's white text. */
        const commentObserver = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue
                    const textareas = node.matches?.('textarea')
                        ? [node]
                        : [...(node.querySelectorAll?.('textarea') || [])]
                    for (const ta of textareas) {
                        if (ta.closest?.('.blocklyTextInputBubble')) {
                            ta.style.color = '#1a1a1a'
                        }
                    }
                }
            }
        })
        commentObserver.observe(blocklyDivRef.current, { childList: true, subtree: true })

        workspace.registerToolboxCategoryCallback('MY_VARIABLES', ws => {
            const xmlList = []
            const button = Blockly.utils.xml.createElement('button')
            button.setAttribute('text', 'Create variable...')
            button.setAttribute('callbackKey', 'MY_CREATE_VARIABLE')
            xmlList.push(button)

            ws.registerButtonCallback('MY_CREATE_VARIABLE', () => {
                Blockly.Variables.createVariableButtonHandler(ws)
                ws.getToolbox()?.refreshSelection()
            })

            const vars = ws.getVariableMap()?.getAllVariables() || []
            if (!vars.length) return xmlList

            for (const v of vars) {
                const setBlock = Blockly.utils.xml.createElement('block')
                setBlock.setAttribute('type', 'variables_set')
                const setField = Blockly.utils.xml.createElement('field')
                setField.setAttribute('name', 'VAR')
                setField.setAttribute('id', v.getId())
                setField.textContent = v.name
                setBlock.appendChild(setField)
                xmlList.push(setBlock)

                const getBlock = Blockly.utils.xml.createElement('block')
                getBlock.setAttribute('type', 'variables_get')
                const getField = Blockly.utils.xml.createElement('field')
                getField.setAttribute('name', 'VAR')
                getField.setAttribute('id', v.getId())
                getField.textContent = v.name
                getBlock.appendChild(getField)
                xmlList.push(getBlock)
            }
            return xmlList
        })

        const onChange = event => {

            if (event?.isUiEvent) return

            setJsCode(javascriptGenerator.workspaceToCode(workspace))
            setGeneratedPythonCode(pythonGenerator.workspaceToCode(workspace))
            setWorkspaceBlockCount(getWorkspaceBlockCount(workspace))

            const snapshot = Blockly.serialization.workspaces.save(workspace)
            const hash = hashWorkspaceSnapshot(snapshot)
            setDirty(lastSavedHashRef.current ? hash !== lastSavedHashRef.current : true)
            scheduleAutosave(workspace)
        }

        workspace.addChangeListener(onChange)
        setWs(workspace)
        setWorkspaceBlockCount(getWorkspaceBlockCount(workspace))
        setGeneratedPythonCode(pythonGenerator.workspaceToCode(workspace))


        const initialSnapshot = Blockly.serialization.workspaces.save(workspace)
        const initialHash = hashWorkspaceSnapshot(initialSnapshot)
        setSavedHash(initialHash)
        setDirty(false)

        return () => {
            commentObserver.disconnect()
            workspace.dispose()
        }
    }, [scheduleAutosave, setSavedHash])

    useEffect(() => {
        if (!ws) return
        if (typeof ws.updateToolbox === 'function') ws.updateToolbox(activeToolboxJson)
        ws.getToolbox()?.refreshSelection()
    }, [activeToolboxJson, ws])

    const handleStop = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        resetEngine(canvas, {
            onState: snapshot => setEngineState(snapshot),
            onPerf: stats => setEnginePerf(stats),
        })
        setIsRunning(false)
        setRuntimeError(null)
        showToast('info', 'Execution stopped')
    }

    const handleInspectError = useCallback(blockId => {
        if (blockId) ws?.highlightBlock(blockId)
        setShowErrorModal(false)
    }, [ws])

    const handleRun = async () => {
        if (!ws || busy.run) return

        const findings = lintWorkspace(ws)
        setLintFindings(findings)
        const blockingErrors = findings.filter(f => f.severity === 'error')
        if (blockingErrors.length) {
            const first = blockingErrors[0]
            if (first.blockId) ws.highlightBlock(first.blockId)
            showToast('err', first.message)
            return
        }

        if (viewMode === 'python') {
            if (runtimeBlockingCompatIssues.length) {
                showToast('err', `Python run blocked: ${runtimeBlockingCompatIssues[0].reason || runtimeBlockingCompatIssues[0].message}`)
                return
            }
            const result = await blockMirrorRef.current?.convertPythonToBlocks?.({
                autoImport: false,
                enforceConversionGuards: false,
            })
            if (!result) {
                showToast('err', 'Conversion failed')
                return
            }
            const success = importBlocksFromBM(result, {
                suppressToast: true,
                enforceConversionGuards: false,
                stayInPython: true,
            })
            if (!success) return
        } else if (viewMode !== 'blocks') {
            setViewMode('blocks')
        }

        await new Promise(requestAnimationFrame)
        await new Promise(requestAnimationFrame)

        const canvas = canvasRef.current
        if (!canvas) {
            showToast('err', 'Preview not ready')
            return
        }

        try {
            setBusy(b => ({ ...b, run: true }))
            setRuntimeError(null)
            let runtimeFailed = false
            resetEngine(canvas, {
                onState: snapshot => setEngineState(snapshot),
                onPerf: stats => setEnginePerf(stats),
            })
            await Promise.resolve(
                runGeneratedCode(ws, {
                    onError: payload => {
                        runtimeFailed = true
                        setRuntimeError(payload)
                        setIsRunning(false)
                        if (payload?.blockId) ws.highlightBlock(payload.blockId)
                        pushModalError({ title: 'Runtime error', message: payload?.message || 'Runtime error', blockId: payload?.blockId || null })
                        showToast('err', payload?.message || 'Runtime error', undefined, { captureInModal: false })
                    },
                })
            )
            if (!runtimeFailed) {
                setIsRunning(true)
                showToast('ok', 'Running…')
            }
        } catch (e) {
            console.error(e)
            showToast('err', e?.message || 'Run failed')
        } finally {
            setBusy(b => ({ ...b, run: false }))
        }
    }

    const saveExistingProject = async projectName => {
        try {
            setBusy(b => ({ ...b, save: true }))
            const workspaceData = Blockly.serialization.workspaces.save(ws)
            const result = await saveProject(projectName, workspaceData)

            if (result.success) {
                showToast('ok', 'Saved ✓')
                setSelectedProject(projectName)
                const hash = hashWorkspaceSnapshot(workspaceData)
                setSavedHash(hash)
                setDirty(false)
                setHistory(addHistorySnapshot(projectName || 'draft', workspaceData, 'manual-save'))
                const projectsResult = await getExistingProjects()
                if (projectsResult.success) {
                    setProjects(projectsResult.projects)
                }
            } else {
                showToast('err', result.error || 'Save failed')
            }
        } catch (e) {
            console.error(e)
            showToast('err', e?.message || 'Save failed')
        } finally {
            setBusy(b => ({ ...b, save: false }))
        }
    }

    const handleSave = async () => {
        if (!ws || busy.save) return
        const canSave = await ensureBlocksReadyForSave()
        if (!canSave) return
        if (!selectedProject) {
            setNewProjectName('')
            setShowNewProjectModal(true)
            return
        }
        await saveExistingProject(selectedProject)
    }

    const confirmNewProject = async () => {
        if (!newProjectName.trim()) return
        const canSave = await ensureBlocksReadyForSave()
        if (!canSave) return
        setShowNewProjectModal(false)
        await saveExistingProject(newProjectName.trim())
    }

    const handleLoad = async () => {
        if (!ws || busy.load) return
        if (!selectedProject) {
            showToast('info', 'Please select a project first')
            return
        }

        try {
            setBusy(b => ({ ...b, load: true }))
            const result = await loadProject(selectedProject)

            if (result.success) {
                const projectData = typeof result.projectFile === 'string'
                    ? JSON.parse(result.projectFile)
                    : result.projectFile

                ws.clear()
                Blockly.serialization.workspaces.load(projectData, ws)
                const hash = hashWorkspaceSnapshot(projectData)
                setSavedHash(hash)
                setDirty(false)
                setHistory(addHistorySnapshot(selectedProject, projectData, 'load'))
                showToast('ok', 'Loaded ✓')
                Blockly.svgResize(ws)
            } else {
                showToast('err', result.error || 'Load failed')
            }
        } catch (e) {
            console.error(e)
            showToast('err', e?.message || 'Load failed')
        } finally {
            setBusy(b => ({ ...b, load: false }))
        }
    }

    const handleDelete = async () => {
        if (!selectedProject || busy.delete) {
            showToast('info', 'Please select a project first')
            return
        }
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        setShowDeleteModal(false)
        try {
            setBusy(b => ({ ...b, delete: true }))
            const result = await deleteProject(selectedProject)
            if (result.success) {
                showToast('ok', 'Deleted ✓')
                setSelectedProject('')
                const projectsResult = await getExistingProjects()
                if (projectsResult.success) setProjects(projectsResult.projects)
            } else {
                showToast('err', result.error || 'Delete failed')
            }
        } catch (e) {
            console.error(e)
            showToast('err', e?.message || 'Delete failed')
        } finally {
            setBusy(b => ({ ...b, delete: false }))
        }
    }

    const handleDuplicate = async () => {
        if (!selectedProject || busy.duplicate) {
            showToast('info', 'Please select a project first')
            return
        }

        try {
            setBusy(b => ({ ...b, duplicate: true }))
            const result = await duplicateProject(selectedProject)

            if (result.success) {
                showToast('ok', 'Duplicated ✓')
                const projectsResult = await getExistingProjects()
                if (projectsResult.success) setProjects(projectsResult.projects)
            } else {
                showToast('err', result.error || 'Duplicate failed')
            }
        } catch (e) {
            console.error(e)
            showToast('err', e?.message || 'Duplicate failed')
        } finally {
            setBusy(b => ({ ...b, duplicate: false }))
        }
    }

    const handleRename = async () => {
        if (!selectedProject || busy.rename) {
            showToast('info', 'Please select a project first')
            return
        }
        setShowRenameModal(true)
        setNewProjectName(selectedProject)
    }

    const confirmRename = async () => {
        if (!newProjectName || newProjectName === selectedProject) {
            setShowRenameModal(false)
            return
        }

        try {
            setBusy(b => ({ ...b, rename: true }))
            const result = await renameProject(selectedProject, newProjectName)
            if (result.success) {
                showToast('ok', 'Renamed ✓')
                setSelectedProject(newProjectName)
                setShowRenameModal(false)
                const projectsResult = await getExistingProjects()
                if (projectsResult.success) setProjects(projectsResult.projects)
            } else {
                showToast('err', result.error || 'Rename failed')
            }
        } catch (e) {
            console.error(e)
            showToast('err', e?.message || 'Rename failed')
        } finally {
            setBusy(b => ({ ...b, rename: false }))
        }
    }

    const handleExport = () => {
        const fileData = new Blob([pythonCode], { type: 'text/plain' })
        const fileURL = URL.createObjectURL(fileData)
        const anchorTag = document.createElement('a')
        anchorTag.href = fileURL
        anchorTag.download = 'pythonCode.py'
        anchorTag.click()
        URL.revokeObjectURL(fileURL)
    }

    const handleExportProjectFile = () => {
        if (!ws) return
        const workspaceData = Blockly.serialization.workspaces.save(ws)
        const payload = {
            format: 'skyide-project',
            version: 1,
            exportedAt: new Date().toISOString(),
            projectName: selectedProject || null,
            projectFile: workspaceData,
            pythonCode: pythonCode || '',
        }
        const fileData = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const fileURL = URL.createObjectURL(fileData)
        const anchorTag = document.createElement('a')
        const suggestedName = `${selectedProject || 'skyide-project'}.skyide.json`
        anchorTag.href = fileURL
        anchorTag.download = suggestedName
        anchorTag.click()
        URL.revokeObjectURL(fileURL)
        showToast('ok', `Exported project file (${suggestedName})`)
    }

    const handleImportProjectFilePick = () => {
        importProjectInputRef.current?.click()
    }

    const handleImportProjectFile = async event => {
        const file = event.target.files?.[0]
        if (!file || !ws) return

        try {
            const isJsonName = /\.json$/i.test(file.name || '')
            const allowedMimeTypes = new Set(['application/json', 'text/json', ''])
            if (!isJsonName || !allowedMimeTypes.has(file.type || '')) {
                showToast('err', 'Only JSON project files are supported.')
                return
            }

            const text = await file.text()
            const parsed = JSON.parse(text)
            const isWrappedSkyIDEProject = parsed?.format === 'skyide-project' && parsed?.projectFile
            const looksLikeWorkspaceJson = parsed && typeof parsed === 'object' && parsed?.blocks && typeof parsed?.languageVersion !== 'undefined'
            if (!isWrappedSkyIDEProject && !looksLikeWorkspaceJson) {
                showToast('err', 'Invalid project file. Please import a SkyIDE JSON export file.')
                return
            }
            const importedWorkspace = isWrappedSkyIDEProject ? parsed.projectFile : parsed
            const projectNameFromFile = isWrappedSkyIDEProject && typeof parsed?.projectName === 'string' ? parsed.projectName.trim() : ''
            const safeJson = sanitizeAstJson(importedWorkspace)
            ws.clear()
            Blockly.serialization.workspaces.load(safeJson, ws)
            if (typeof ws.cleanUp === 'function') ws.cleanUp()
            const hash = hashWorkspaceSnapshot(safeJson)
            setSavedHash(hash)
            setDirty(false)
            setHistory(addHistorySnapshot(projectNameFromFile || activeProjectKey, safeJson, 'file-import'))
            if (projectNameFromFile) setSelectedProject(projectNameFromFile)
            setViewMode('blocks')
            showToast('ok', `Imported project from file${projectNameFromFile ? ` (${projectNameFromFile})` : ''}`)
            Blockly.svgResize(ws)
        } catch (error) {
            console.error('Import project file failed:', error)
            showToast('err', 'Failed to import project file. Please choose a valid exported project JSON file.')
        } finally {
            event.target.value = ''
        }
    }

    const handleClear = async () => {
        if (!ws || busy.clear) return
        try {
            setBusy(b => ({ ...b, clear: true }))
            await Promise.resolve(clearWorkspace(ws))
            setLintFindings([])
            setRuntimeError(null)
            showToast('info', 'Workspace cleared')
        } catch (e) {
            console.error(e)
            showToast('err', e?.message || 'Clear failed')
        } finally {
            setBusy(b => ({ ...b, clear: false }))
        }
    }

    const getCurrentBlocksJson = () => (ws ? Blockly.serialization.workspaces.save(ws) : null)

    const importBlocksFromBM = (data, options = {}) => {
        const { stayInPython = false, suppressToast = false, enforceConversionGuards = true } = options
        try {
            let json
            let pyCode = ''
            if (data && typeof data === 'object' && data.json) {
                json = data.json
                pyCode = data.pythonCode || ''
            } else {
                json = data
            }

            const blockingIssues = pyCode
                ? (
                    enforceConversionGuards
                        ? getBlockingPythonCompatibilityIssues(detectPythonCompatibilityIssues(pyCode))
                        : getPythonRuntimeBlockingIssues(detectPythonCompatibilityIssues(pyCode))
                )
                : []
            if (blockingIssues.length) {
                if (!suppressToast) {
                    showToast(
                        'err',
                        `${enforceConversionGuards ? 'Python -> Blocks blocked' : 'Python run blocked'}: ${blockingIssues[0].reason || blockingIssues[0].message}`
                    )
                }
                return false
            }

            const converted = convertPythonToBlockly(json, pyCode)
            const safeJson = converted?.blocks ? converted : sanitizeAstJson(json)

            if (safeJson && ws) {
                ws.clear()
                Blockly.serialization.workspaces.load(safeJson, ws)
                if (typeof ws.cleanUp === 'function') ws.cleanUp()
                const hash = hashWorkspaceSnapshot(safeJson)
                setSavedHash(hash)
                setDirty(false)
                setHistory(addHistorySnapshot(activeProjectKey, safeJson, 'python-import'))
            }
            if (!stayInPython) setViewMode('blocks')
            if (!suppressToast) showToast('ok', 'Imported ✓')
            return true
        } catch (err) {
            console.error('[Python→Blocks] import failed:', err)
            showToast('err', err?.message || 'Import failed')
            return false
        }
    }

    const handleLoadSavedPython = () => {
        const loaded = blockMirrorRef.current?.loadSavedPythonCode?.()
        if (loaded) setHasLoadedSavedPython(true)
    }

    const handlePythonToBlocksButton = async () => {
        if (blockingCompatIssues.length) {
            showToast('err', `Python -> Blocks blocked: ${blockingCompatIssues[0].reason || blockingCompatIssues[0].message}`)
            return
        }
        await blockMirrorRef.current?.convertPythonToBlocks?.()
    }

    const handleLoadRecentBlocksButton = () => {
        blockMirrorRef.current?.loadRecentBlocks?.()
    }

    const handleTemplateApply = (templateId, options = {}) => {
        const { suppressToast = false, historyReason = `template:${templateId}` } = options
        if (!ws) return
        applyTemplate(Blockly, ws, templateId)
        /* Auto-arrange blocks so multi-statement templates don't overlap */
        if (typeof ws.cleanUp === 'function') ws.cleanUp()
        setSelectedTemplate(templateId)
        const snapshot = Blockly.serialization.workspaces.save(ws)
        setHistory(addHistorySnapshot(activeProjectKey, snapshot, historyReason))
        if (!suppressToast) {
            showToast('ok', `Template loaded: ${GAME_TEMPLATES.find(t => t.id === templateId)?.label || templateId}`)
        }
    }

    const handleRestoreHistory = historyId => {
        if (!ws || !historyId) return
        const entry = history.find(h => h.id === historyId)
        if (!entry?.snapshot) return
        ws.clear()
        Blockly.serialization.workspaces.load(entry.snapshot, ws)
        const hash = hashWorkspaceSnapshot(entry.snapshot)
        setSavedHash(hash)
        setDirty(false)
        showToast('ok', 'Restored snapshot')
    }

    useEffect(() => {
        if (!ws) return
        const host = workspaceShellRef.current
        if (!host || typeof ResizeObserver === 'undefined') return

        let raf = 0
        const ro = new ResizeObserver(() => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => Blockly.svgResize(ws))
        })

        ro.observe(host)
        raf = requestAnimationFrame(() => Blockly.svgResize(ws))
        return () => {
            ro.disconnect()
            cancelAnimationFrame(raf)
        }
    }, [ws, viewMode, fullscreenPanel])

    useEffect(() => {
        const onKey = e => {
            if (e.key === 'Escape' && fullscreenPanel) setFullscreenPanel(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [fullscreenPanel])

    const togglePanelFullscreen = panel => {
        setFullscreenPanel(current => (current === panel ? null : panel))
    }

    const isPanelFullscreen = Boolean(fullscreenPanel)
    const workspaceClass = [
        'editor-workspace',
        `mode-${viewMode}`,
        isPanelFullscreen ? 'has-fullscreen' : '',
        fullscreenPanel ? `fullscreen-${fullscreenPanel}` : '',
    ]
        .filter(Boolean)
        .join(' ')

    const blocksPanelClass = [
        'workspace-panel',
        'workspace-main',
        fullscreenPanel === 'blocks' ? 'is-fullscreen' : '',
        fullscreenPanel && fullscreenPanel !== 'blocks' ? 'is-hidden' : '',
    ]
        .filter(Boolean)
        .join(' ')

    const isPreviewFullscreen = fullscreenPanel === 'preview'
    const previewPanelClass = [
        'workspace-panel',
        'workspace-preview',
        isPreviewFullscreen ? 'is-fullscreen' : '',
        fullscreenPanel && !isPreviewFullscreen ? 'is-hidden' : '',
    ]
        .filter(Boolean)
        .join(' ')

    const pythonStats = getStats()
    const recentConversionAvailable = hasRecentConversion()
    const blockingCompatIssues = useMemo(
        () => getBlockingPythonCompatibilityIssues(compatIssues),
        [compatIssues]
    )
    const runtimeBlockingCompatIssues = useMemo(
        () => getPythonRuntimeBlockingIssues(compatIssues),
        [compatIssues]
    )
    const ensureBlocksReadyForSave = useCallback(async () => {
        if (viewMode !== 'python') return true
        if (blockingCompatIssues.length) {
            const message = `Save only works if your Python can be converted to blocks. ${blockingCompatIssues[0].reason || blockingCompatIssues[0].message}`
            window.alert(message)
            showToast('err', message)
            return false
        }

        const result = await blockMirrorRef.current?.convertPythonToBlocks?.({
            autoImport: true,
            enforceConversionGuards: true,
        })

        if (!result) {
            const message = 'Save only works if your Python code is convertible to blocks.'
            window.alert(message)
            showToast('err', message)
            return false
        }

        setViewMode('blocks')
        showToast('ok', 'Converted Python to blocks for save')
        return true
    }, [viewMode, blockingCompatIssues, showToast])

    const activePythonCode = pythonCode || pythonCodeForBlockMirror
    const pythonLearningStage = useMemo(
        () => analyzePythonLearningStage(activePythonCode, compatIssues),
        [activePythonCode, compatIssues]
    )
    const pythonRoundTripReadiness = useMemo(
        () => analyzeRoundTripReadiness({ source: 'python', pythonCode: activePythonCode, findings: compatIssues }),
        [activePythonCode, compatIssues]
    )
    const blocksRoundTripReadiness = useMemo(
        () => analyzeRoundTripReadiness({ source: 'blocks', pythonCode: generatedPythonCode }),
        [generatedPythonCode]
    )
    const selectedDemoMeta = useMemo(
        () => getGameFixtureMeta(selectedTemplate),
        [selectedTemplate]
    )
    const errorEntries = useMemo(() => {
        const entries = []
        const seen = new Set()
        const appendEntry = entry => {
            if (!entry?.message) return
            const key = `${entry.title || 'Error'}:${entry.blockId || ''}:${entry.message}`
            if (seen.has(key)) return
            seen.add(key)
            entries.push(entry)
        }
        for (const finding of lintFindings.filter(finding => finding?.severity === 'error')) {
            appendEntry({
                id: `lint-${finding.blockId || finding.message}`,
                title: 'Lint error',
                message: finding.message,
                blockId: finding.blockId || null,
            })
        }
        if (runtimeError?.message) {
            appendEntry({
                id: `runtime-${runtimeError.blockId || runtimeError.message}`,
                title: 'Runtime error',
                message: runtimeError.message,
                blockId: runtimeError.blockId || null,
            })
        }
        if (viewMode === 'python') {
            for (const issue of runtimeBlockingCompatIssues) {
                appendEntry({
                    id: `runtime-python-${issue.line}-${issue.reason || issue.message}`,
                    title: `Python run blocked${issue.line ? ` (line ${issue.line})` : ''}`,
                    message: issue.reason || issue.message || 'Python runtime issue',
                    detail: issue.suggestion || '',
                })
            }
            for (const issue of blockingCompatIssues) {
                appendEntry({
                    id: `python-blocks-${issue.line}-${issue.reason || issue.message}`,
                    title: `Python → Blocks blocked${issue.line ? ` (line ${issue.line})` : ''}`,
                    message: issue.reason || issue.message || 'Python compatibility issue',
                    detail: issue.suggestion || '',
                })
            }
        }
        for (const modalEntry of modalErrors) appendEntry(modalEntry)
        return entries
    }, [blockingCompatIssues, lintFindings, modalErrors, runtimeBlockingCompatIssues, runtimeError, viewMode])

    const sortedHistory = useMemo(
        () => [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
        [history]
    )


    const hud = engineState.hud || {}
    const hudOrder = Array.isArray(hud.order) && hud.order.length
        ? hud.order
        : ['score', 'lives', 'timer', 'health']
    const hudVisibility = hud.visibility || {}

    const isHudMetricVisible = key => {
        if (hudVisibility[key] === false) return false
        if (key === 'score' && hud.showScore === false) return false
        return true
    }

    const hudMetricByKey = {
        score: engineState.score ?? 0,
        lives: Number.isFinite(Number(hud.lives)) ? Math.round(Number(hud.lives)) : null,
        timer: Number.isFinite(Number(hud.timer)) ? Number(hud.timer).toFixed(1) + 's' : null,
        health: Number.isFinite(Number(hud.health)) ? Math.max(0, Math.min(100, Math.round(Number(hud.health)))) + '%' : null,
    }
    const hudMetricLabels = hud.labels || {}

    const hudMetricChips = hudOrder
        .filter(key => ['score', 'lives', 'timer', 'health'].includes(key) && isHudMetricVisible(key))
        .map(key => ({ key, value: hudMetricByKey[key], label: hudMetricLabels[key] || (key[0].toUpperCase() + key.slice(1)) }))
        .filter(item => item.value !== null)

    return (
        <div className={`editor-page ${isPanelFullscreen ? 'page-fullscreen' : ''}`}>
            <div className={`editor-inner ${isPanelFullscreen ? 'inner-fullscreen' : ''}`}>
                <div className='editor-toolbar minimal'>
                    <div className='seg'>
                        <button className={viewMode === 'blocks' ? 'seg-active' : ''} onClick={() => setViewMode('blocks')}>Blocks</button>
                        <button className={viewMode === 'python' ? 'seg-active' : ''} onClick={() => setViewMode('python')}>Python</button>
                    </div>

                    <span className={`dirty-pill ${dirty ? 'dirty' : 'clean'}`}>{dirty ? 'Unsaved changes' : 'Saved'}</span>

                    <div className='toolbar-actions'>
                        <CustomDropdown
                            value={selectedProject}
                            onChange={value => setSelectedProject(value)}
                            options={projects}
                            placeholder='Select Project...'
                        />

                        <select
                            className='project-dropdown'
                            value={selectedTemplate}
                            onChange={event => handleTemplateApply(event.target.value)}
                            aria-label='Choose starter template'
                        >
                            {GAME_TEMPLATES.map(template => (
                                <option key={template.id} value={template.id}>
                                    Template: {template.label}
                                </option>
                            ))}
                        </select>

                        <select
                            className='project-dropdown'
                            onChange={event => handleRestoreHistory(event.target.value)}
                            defaultValue=''
                            aria-label='Restore autosave snapshot'
                        >
                            <option value=''>Restore Snapshot…</option>
                            {sortedHistory.map(entry => (
                                <option key={entry.id} value={entry.id}>
                                    {new Date(entry.timestamp).toLocaleString()} ({entry.reason})
                                </option>
                            ))}
                        </select>

                        <button onClick={handleRun} disabled={busy.run || (viewMode === 'python' && runtimeBlockingCompatIssues.length > 0)} aria-label='Run the game preview'>
                            {busy.run ? 'Running…' : 'Run ▶'}
                        </button>
                        <button onClick={handleStop} disabled={!isRunning} aria-label='Stop execution'>Stop ■</button>
                        <button onClick={handleSave} disabled={busy.save}>{busy.save ? 'Saving…' : 'Save'}</button>
                        <button onClick={handleLoad} disabled={busy.load || !selectedProject}>{busy.load ? 'Loading…' : 'Load'}</button>
                        <button onClick={handleExportProjectFile} disabled={!ws}>Export Project File</button>
                        <button onClick={handleImportProjectFilePick} disabled={!ws}>Import Project File</button>
                        <button onClick={handleDelete} disabled={busy.delete || !selectedProject}>{busy.delete ? 'Deleting…' : 'Delete'}</button>
                        <button onClick={handleDuplicate} disabled={busy.duplicate || !selectedProject}>{busy.duplicate ? 'Duplicating…' : 'Duplicate'}</button>
                        <button onClick={handleRename} disabled={busy.rename || !selectedProject}>{busy.rename ? 'Renaming…' : 'Rename'}</button>
                        <button onClick={handleClear} disabled={busy.clear}>{busy.clear ? 'Clearing…' : 'Clear'}</button>

                        {viewMode === 'blocks' && (
                            <>
                                <button
                                    onClick={() => {
                                        const generatedPython = pythonGenerator.workspaceToCode(ws)
                                        setPythonCodeForBlockMirror(generatedPython)
                                        setViewMode('python')
                                        showToast('ok', 'Sent Python to editor')
                                    }}
                                >
                                    Blocks → Python
                                </button>
                                <span
                                    className={`toolbar-roundtrip-badge ${blocksRoundTripReadiness.isRoundTripSafe ? 'is-safe' : 'is-risky'}`}
                                    title={`${blocksRoundTripReadiness.summary} ${blocksRoundTripReadiness.hint}`}
                                >
                                    {blocksRoundTripReadiness.isRoundTripSafe ? 'Round-Trip Safe' : 'Round-Trip Risk'}
                                </span>
                            </>
                        )}

                        {viewMode === 'python' && (
                            <>
                                {!hasLoadedSavedPython && pythonStats.hasStoredCode && (
                                    <button onClick={handleLoadSavedPython}>Load Saved Code</button>
                                )}
                                <button onClick={handlePythonToBlocksButton} disabled={isConverting || blockingCompatIssues.length > 0}>
                                    {isConverting ? 'Converting…' : 'Python → Blocks'}
                                </button>
                                <span
                                    className={`toolbar-roundtrip-badge ${pythonRoundTripReadiness.isRoundTripSafe ? 'is-safe' : 'is-risky'}`}
                                    title={`${pythonRoundTripReadiness.summary} ${pythonRoundTripReadiness.hint}`}
                                >
                                    {pythonRoundTripReadiness.isRoundTripSafe ? 'Round-Trip Safe' : 'Round-Trip Risk'}
                                </span>
                                {recentConversionAvailable && (
                                    <button onClick={handleLoadRecentBlocksButton}>Load Recent Blocks</button>
                                )}
                                <Link className='toolbar-link-button' to='/help#python-support-guide'>
                                    Python Support Guide
                                </Link>
                            </>
                        )}

                        <button onClick={handleExport}>Export Python</button>
                        <input
                            ref={importProjectInputRef}
                            type='file'
                            accept='.json,.skyide.json,application/json'
                            onChange={handleImportProjectFile}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                {viewMode === 'blocks' && selectedDemoMeta && (
                    <section className='template-brief' aria-label='Starter demo details'>
                        <div className='template-brief-copy'>
                            <p className='template-brief-kicker'>Starter Demo</p>
                            <span className={`template-support-badge is-${selectedDemoMeta.supportLevel}`}>
                                {selectedDemoMeta.supportLabel}
                            </span>
                            <h2>{selectedDemoMeta.name}</h2>
                            <p>{selectedDemoMeta.blurb}</p>
                        </div>
                        <div className='template-brief-facts'>
                            <p><strong>Learning level:</strong> {selectedDemoMeta.learningLevel || 'Beginner'}</p>
                            <p><strong>Built with:</strong> {selectedDemoMeta.tech}</p>
                            <p><strong>Controls:</strong> {selectedDemoMeta.controls}</p>
                            <p><strong>Learning goal:</strong> {selectedDemoMeta.goal}</p>
                        </div>
                    </section>
                )}

                <ConversionStatusBadge
                    isConverting={isConverting}
                    hasRecentConversion={recentConversionAvailable}
                    lastConversionTime={conversionHistory[0]?.timestamp}
                    blockCount={viewMode === 'blocks' ? workspaceBlockCount : (pythonStats.hasStoredBlocks ? (conversionHistory[0]?.blocksCount || 0) : workspaceBlockCount)}
                />

                {errorEntries.length > 0 && (
                    <div className='editor-error-actions'>
                        <button
                            type='button'
                            className='error-summary-button'
                            onClick={() => setShowErrorModal(true)}
                            aria-label={`Open error list (${errorEntries.length} ${errorEntries.length === 1 ? 'error' : 'errors'})`}
                        >
                            !
                        </button>
                        <span>{errorEntries.length} error{errorEntries.length === 1 ? '' : 's'}</span>
                    </div>
                )}

                {lintFindings.length > 0 && (
                    <div className='editor-warning-strip'>
                        <strong>Lint:</strong> {lintFindings[0].message}
                    </div>
                )}

                {runtimeError && (
                    <div className='editor-error-strip'>
                        <strong>Runtime:</strong> {runtimeError.message}
                        {runtimeError.blockId ? ` (block ${runtimeError.blockId.slice(0, 8)}…)` : ''}
                    </div>
                )}

                {runtimeBlockingCompatIssues.length > 0 && viewMode === 'python' && (
                    <div className='editor-error-strip'>
                        <strong>Python Run Blocked:</strong> line {runtimeBlockingCompatIssues[0].line} - {(runtimeBlockingCompatIssues[0].reason || runtimeBlockingCompatIssues[0].message)}{runtimeBlockingCompatIssues[0].suggestion ? ` Suggested rewrite: ${runtimeBlockingCompatIssues[0].suggestion}` : ''}
                        {' '}See <a href='/help#python-support-guide'>Help Center</a> for the current Python environment limits.
                    </div>
                )}
                {runtimeBlockingCompatIssues.length === 0 && blockingCompatIssues.length > 0 && viewMode === 'python' && (
                    <div className='editor-warning-strip'>
                        <strong>Python → Blocks blocked:</strong> line {blockingCompatIssues[0].line} - {(blockingCompatIssues[0].reason || blockingCompatIssues[0].message)}{blockingCompatIssues[0].suggestion ? ` Suggested rewrite: ${blockingCompatIssues[0].suggestion}` : ''}
                        {' '}This code can still run in Python mode, but switching back to blocks is still evolving. See <a href='/help#python-support-guide'>Help Center</a>.
                    </div>
                )}
                {runtimeBlockingCompatIssues.length === 0 && blockingCompatIssues.length === 0 && compatIssues.length > 0 && viewMode === 'python' && (
                    <div className='editor-warning-strip'>
                        <strong>Python Compatibility:</strong> line {compatIssues[0].line} - {(compatIssues[0].reason || compatIssues[0].message)}{compatIssues[0].suggestion ? ` Suggested rewrite: ${compatIssues[0].suggestion}` : ''}
                        {' '}See <a href='/help#python-support-guide'>Help Center</a> for the supported {'Python -> Blocks'} subset.
                    </div>
                )}
                {viewMode === 'blocks' && generatedPythonCode.trim() && (
                    <div className={`editor-info-strip ${blocksRoundTripReadiness.isRoundTripSafe ? 'is-supported' : 'is-frontier'}`}>
                        <strong>Round-Trip:</strong> {blocksRoundTripReadiness.summary} {blocksRoundTripReadiness.hint}
                    </div>
                )}
                {viewMode === 'python' && activePythonCode.trim() && (
                    <div className={`editor-info-strip ${pythonRoundTripReadiness.isRoundTripSafe ? 'is-supported' : 'is-frontier'}`}>
                        <strong>Round-Trip:</strong> {pythonRoundTripReadiness.summary} {pythonRoundTripReadiness.hint}
                    </div>
                )}
                {viewMode === 'python' && activePythonCode.trim() && (
                    <div className={`editor-info-strip ${pythonLearningStage.isBlockSafe ? 'is-supported' : 'is-frontier'}`}>
                        <strong>Learning Stage:</strong> {pythonLearningStage.stage.title}. {pythonLearningStage.summary}
                        {pythonLearningStage.matchedSignals.length > 0 ? ` Detected: ${pythonLearningStage.matchedSignals.join(', ')}.` : ''}
                    </div>
                )}

                <div ref={workspaceShellRef} className={workspaceClass}>
                    <section className={blocksPanelClass}>
                        <div className='panel-header'>
                            <span className='panel-title'>{viewMode === 'python' ? 'Python Editor' : 'Blocks Workspace'}</span>
                            {viewMode === 'blocks' && (
                                <input
                                    type='search'
                                    className='block-search-input'
                                    placeholder='Search blocks…'
                                    value={blockSearchQuery}
                                    onChange={event => setBlockSearchQuery(event.target.value)}
                                    aria-label='Search blocks in toolbox'
                                />
                            )}
                            <button
                                type='button'
                                className='panel-fullscreen-toggle'
                                onClick={() => togglePanelFullscreen('blocks')}
                            >
                                {fullscreenPanel === 'blocks' ? 'Exit Fullscreen' : 'Fullscreen'}
                            </button>
                        </div>



                        <div
                            className={`workspace-surface blockly-surface ${viewMode === 'blocks' ? '' : 'is-hidden'}`}
                            aria-hidden={viewMode !== 'blocks'}
                        >
                            <div ref={blocklyDivRef} id='blocklyDiv' className='blockly-host fill' />
                        </div>

                        {viewMode === 'python' && (
                            <div className='workspace-surface python-surface'>
                                <Suspense fallback={<div className='dock-loading'>Loading Python editor…</div>}>
                                    <BlockMirrorDock
                                        ref={blockMirrorRef}
                                        visible={true}
                                        mode='python'
                                        onToggleVisible={() => setViewMode('blocks')}
                                        onImportBlocks={importBlocksFromBM}
                                        getCurrentBlocksJson={getCurrentBlocksJson}
                                        exportBlocksToPython={() => pythonGenerator.workspaceToCode(ws)}
                                        incomingPythonCode={pythonCodeForBlockMirror}
                                        pythonBridge={pythonBridge}
                                        showInlineActions={false}
                                    />
                                </Suspense>
                            </div>
                        )}
                    </section>

                    <section className={previewPanelClass}>
                        {!isPreviewFullscreen && (
                            <div className='preview-header'>
                                <div className='preview-metrics'>
                                    {hud.text ? <span>HUD: {hud.text}</span> : null}
                                    {hudMetricChips.map(item => (
                                        <span key={item.key}>{item.label}: {item.value}</span>
                                    ))}
                                </div>
                                <h3>Preview</h3>
                                <button
                                    type='button'
                                    className='panel-fullscreen-toggle'
                                    onClick={() => togglePanelFullscreen('preview')}
                                >
                                    Fullscreen
                                </button>
                            </div>
                        )}
                        <div style={{ gap: '0px' }} className={`preview-stage ${isPreviewFullscreen ? 'is-fullscreen' : ''}`}>
                            {isPreviewFullscreen && (
                                <button
                                    type='button'
                                    className='panel-fullscreen-toggle preview-fullscreen-exit'
                                    onClick={() => togglePanelFullscreen('preview')}
                                >
                                    Exit Fullscreen
                                </button>
                            )}
                            <div className='led-preview-wrapper'>
                                <img src='/cira_building.png' alt='' className='led-building-bg' />
                                <canvas ref={canvasRef} className='preview-canvas' width={400} height={460} />
                            </div>
                        </div>

                    </section>
                </div>

                {toast && (
                    <div
                        className={`mini-toast ${toast.kind} ${toast.persistent ? 'is-persistent' : ''}`}
                        role={toast.kind === 'err' ? 'alert' : 'status'}
                    >
                        <span className='mini-toast-message'>{toast.msg}</span>
                        {toast.persistent && (
                            <button
                                type='button'
                                className='mini-toast-dismiss'
                                onClick={dismissToast}
                                aria-label='Dismiss message'
                            >
                                ×
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showErrorModal && (
                <div className='rename-modal-overlay' onClick={() => setShowErrorModal(false)}>
                    <div className='rename-modal error-list-modal' onClick={event => event.stopPropagation()}>
                        <h3>Current Errors</h3>
                        <p className='error-list-intro'>Review every active error in one place, including toast-only failures, so students can debug without waiting for a toast.</p>
                        <div className='error-list-body'>
                            {errorEntries.map(entry => (
                                <article key={entry.id} className='error-list-item'>
                                    <strong>{entry.title}</strong>
                                    <p>{entry.message}</p>
                                    {entry.detail ? <small>{entry.detail}</small> : null}
                                    {entry.blockId ? (
                                        <button type='button' className='error-jump-button' onClick={() => handleInspectError(entry.blockId)}>Jump to block</button>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                        <div className='rename-modal-actions'>
                            <button type='button' onClick={() => setShowErrorModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {showRenameModal && (
                <div className='rename-modal-overlay'>
                    <div className='rename-modal'>
                        <h3>Rename Project</h3>
                        <input
                            type='text'
                            className='rename-modal-input'
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && confirmRename()}
                            autoFocus
                        />
                        <div className='rename-modal-actions'>
                            <button onClick={() => setShowRenameModal(false)}>Cancel</button>
                            <button onClick={confirmRename} disabled={busy.rename}>
                                {busy.rename ? 'Renaming...' : 'Rename'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showNewProjectModal && (
                <div className='rename-modal-overlay'>
                    <div className='rename-modal'>
                        <h3>New Project</h3>
                        <input
                            type='text'
                            className='rename-modal-input'
                            placeholder='Enter project name...'
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && confirmNewProject()}
                            autoFocus
                        />
                        <div className='rename-modal-actions'>
                            <button onClick={() => setShowNewProjectModal(false)}>Cancel</button>
                            <button onClick={confirmNewProject} disabled={busy.save || !newProjectName.trim()}>
                                {busy.save ? 'Saving...' : 'Create & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className='rename-modal-overlay'>
                    <div className='rename-modal'>
                        <h3>Delete Project</h3>
                        <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)' }}>
                            Are you sure you want to delete "<strong>{selectedProject}</strong>"?
                            <br />
                            This action cannot be undone.
                        </p>
                        <div className='rename-modal-actions'>
                            <button onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button
                                onClick={confirmDelete}
                                disabled={busy.delete}
                                style={{
                                    background: 'rgba(255, 89, 89, 0.2)',
                                    borderColor: 'rgba(255, 120, 120, 0.4)',
                                    color: '#ffe3e3',
                                }}
                            >
                                {busy.delete ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}