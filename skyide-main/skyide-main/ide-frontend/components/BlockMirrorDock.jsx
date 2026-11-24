import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState
} from 'react'
import { useNotifications } from '../src/hooks/useNotifications.js'
import ProgressIndicator from '../src/components/ProgressIndicator.jsx'
import NotificationCenter from '../src/components/NotificationCenter.jsx'
import ErrorBoundary from '../src/components/ErrorBoundary.jsx'
import {
	detectPythonCompatibilityIssues,
	getBlockingPythonCompatibilityIssues,
	getPythonRuntimeBlockingIssues,
} from '../lib/editorEnhancements.js'

const uid = () => Math.random().toString(36).slice(2)

const base = import.meta.env.BASE_URL


const BlockMirrorDock = (
	{
		visible = true,
		mode: controlledMode,
		// showModeTabs = false,
		// onRequestLayoutMode,
		onToggleVisible,
		onImportBlocks,
		getCurrentBlocksJson,
		exportBlocksToPython,
		incomingPythonCode,
		pythonBridge,
		showInlineActions = true
	},
	ref
) => {
	const iframeRef = useRef(null)
	const pending = useRef(new Map())
	const [mirrorReady, setMirrorReady] = useState(false)

	const bridge = pythonBridge

	const {
		pythonCode,
		isConverting,
		conversionError,
		updatePythonCode,
		convertPythonToBlocks,
		loadRecentConversion,
		loadSavedPythonCode,
		hasRecentConversion,
		getStats
	} = bridge

	const { notifications, addNotification, removeNotification } = useNotifications()
	const [progress, setProgress] = useState({ visible: false, message: '', step: 0, total: 4 })
	const [localMode] = useState(controlledMode ?? 'block')
	const normalizedMode = useMemo(() => {
		if (!localMode) return 'block'
		if (localMode === 'python' || localMode === 'text') return 'text'
		if (localMode === 'blocks' || localMode === 'block') return 'block'
		return localMode
	}, [localMode])
	const [error, setError] = useState(conversionError)
	const [hasLoadedSavedCode, setHasLoadedSavedCode] = useState(false)

	useEffect(() => setError(conversionError), [conversionError])

	// --- post helper guarded by mirrorReady ---
	const post = useCallback(
		(action, payload) =>
			new Promise((resolve, reject) => {
				if (!mirrorReady) {
					reject(new Error('BlockMirror not ready yet'))
					return
				}
				const id = uid()
				pending.current.set(id, { resolve, reject })
				iframeRef.current?.contentWindow?.postMessage(
					{ type: 'app->bm', action, payload, requestId: id },
					'*'
				)
				setTimeout(() => {
					if (pending.current.has(id)) {
						pending.current.delete(id)
						reject(new Error('BlockMirror timeout'))
					}
				}, 10000)
			}),
		[mirrorReady]
	)

	useEffect(() => {
		if (!mirrorReady || !iframeRef.current) return
		post('setPython', { code: pythonCode || '' }).catch(err => {
			console.error('[BlockMirrorDock] Failed to sync Python code to BlockMirror:', err)
		})
	}, [pythonCode, mirrorReady, post])

	// --- listen for "blockmirror-ready" ---
	useEffect(() => {
		const onMsg = e => {
			if (e.data?.type === 'blockmirror-ready') {
				setMirrorReady(true)
				console.log('[BlockMirrorDock] BlockMirror is ready')
			}
		}
		window.addEventListener('message', onMsg)
		return () => window.removeEventListener('message', onMsg)
	}, [])

	// --- notify when new Python code arrives from the outside ---
	useEffect(() => {
		if (incomingPythonCode && incomingPythonCode.trim()) {
			updatePythonCode(incomingPythonCode)
			addNotification({
				type: 'success',
				title: '🐍 Python Code Loaded',
				message: `Generated Python code (${incomingPythonCode
					.split('\n')
					.filter(line => line.trim()).length} lines) loaded into BlockMirror editor.`,
				autoClose: 3000
			})
		}
	}, [incomingPythonCode, addNotification, updatePythonCode])

	// --- handle messages from BlockMirror ---
	useEffect(() => {
		const handler = evt => {
			const { type, action, requestId, payload } = evt.data || {}
			if (type !== 'bm->app') return
			const entry = pending.current.get(requestId)
			if (!entry) return
			if (action === 'error') entry.reject(new Error(payload?.message || 'BlockMirror error'))
			else entry.resolve(payload)
			pending.current.delete(requestId)
		}
		window.addEventListener('message', handler)
		return () => window.removeEventListener('message', handler)
	}, [])

	// --- push mode changes into iframe once ready ---
	useEffect(() => {
		if (!visible || !iframeRef.current || !mirrorReady) return
		post('setMode', { mode: normalizedMode }).catch(() => { })
	}, [normalizedMode, visible, mirrorReady, post])

	const importPythonToBlocks = useCallback(
		async (options = {}) => {
			const { autoImport = true, enforceConversionGuards = true } = options
			if (!mirrorReady) {
				addNotification('⚠️ BlockMirror not ready yet. Try again in a moment.', 'warning', 3000)
				return null
			}
			setError(null)
			setProgress({ visible: true, message: 'Fetching Python code from editor...', step: 1, total: 4 })

			try {
				const { code } = await post('getPython', {})
				const pythonFromEditor = code || ''
				updatePythonCode(pythonFromEditor)

				if (!pythonFromEditor.trim()) {
					setError('Please enter some Python code first')
					addNotification('⚠️ Please enter some Python code before converting.', 'warning', 3000)
					setProgress({ visible: false, message: '', step: 0, total: 4 })
					return null
				}

				const findings = detectPythonCompatibilityIssues(pythonFromEditor)
				const blockingIssues = enforceConversionGuards
					? getBlockingPythonCompatibilityIssues(findings)
					: getPythonRuntimeBlockingIssues(findings)
					if (blockingIssues.length) {
						const message = blockingIssues[0].reason || blockingIssues[0].message || 'Python conversion blocked'
						setError(message)
						addNotification(`❌ ${enforceConversionGuards ? 'Python to blocks blocked' : 'Python run blocked'}: ${message}`, 'error', 0)
						setProgress({ visible: false, message: '', step: 0, total: 4 })
						return null
					}

				setProgress({ visible: true, message: 'Converting Python to blocks...', step: 2, total: 4 })
				const convertFn = async code => {
					await post('setPython', { code })
					const { json } = await post('getBlocks', {})
					return { json, pythonCode: code }
				}

				const result = await convertPythonToBlocks(convertFn, pythonFromEditor)
				if (result) {
					setProgress({ visible: true, message: 'Adding blocks to workspace...', step: 3, total: 4 })
					if (autoImport) {
						const imported = onImportBlocks?.(result)
						if (imported === false) {
							throw new Error('Conversion was blocked before blocks could be imported')
						}
						await new Promise(r => setTimeout(r, 500))
					}
					setProgress({ visible: true, message: 'Conversion complete!', step: 4, total: 4 })

					if (autoImport) {
						const blockCount = result?.blocks?.blocks?.length || 0
						addNotification(
							`✅ Successfully converted Python to ${blockCount} block${blockCount !== 1 ? 's' : ''}!`,
							'success',
							4000
						)
					}

					return result
				}
				throw new Error('Conversion failed - no result returned')
			} catch (err) {
				console.error('[Python→Blocks] Conversion failed:', err)
				addNotification(`❌ Failed to convert Python to blocks: ${err.message}`, 'error', 0)
				return null
			} finally {
				setTimeout(() => setProgress({ visible: false, message: '', step: 0, total: 4 }), 1000)
			}
		},
		[mirrorReady, addNotification, post, updatePythonCode, convertPythonToBlocks, onImportBlocks]
	)

	const handleExportBlocksToPython = useCallback(async () => {
		if (!mirrorReady) {
			addNotification('⚠️ BlockMirror not ready yet.', 'warning', 3000)
			return null
		}
		try {
			if (exportBlocksToPython) {
				const generated = exportBlocksToPython() || ''
				updatePythonCode(generated)
				addNotification('✅ Blocks converted to Python code!', 'success', 3000)
				return generated
			}
			const json = getCurrentBlocksJson?.()
			await post('setBlocks', { json })
			const { code } = await post('getPython', {})
			updatePythonCode(code || '')
			return code || ''
		} catch (err) {
			console.error('[Blocks→Python] Export failed:', err)
			addNotification('❌ Failed to convert blocks to Python', 'error', 0)
			return null
		}
	}, [mirrorReady, addNotification, exportBlocksToPython, updatePythonCode, getCurrentBlocksJson, post])

	const handleLoadSavedCode = useCallback(() => {
		const saved = loadSavedPythonCode()
		if (saved) {
			setHasLoadedSavedCode(true)
			addNotification('📋 Loaded your saved Python code', 'info', 2000)
			return saved
		}
		addNotification('⚠️ No saved Python code found', 'warning', 2500)
		return null
	}, [loadSavedPythonCode, addNotification])

	const handleLoadRecentBlocks = useCallback(() => {
		if (!hasRecentConversion()) {
			addNotification('⚠️ No recent conversion available', 'warning', 2500)
			return null
		}

		const recent = loadRecentConversion()
		if (recent) {
			onImportBlocks?.(recent)
			const count = recent?.blocks?.blocks?.length || 0
			addNotification(`📋 Loaded ${count} block${count !== 1 ? 's' : ''} from recent conversion`, 'success', 3000)
		}
		return recent
	}, [hasRecentConversion, loadRecentConversion, onImportBlocks, addNotification])

	useImperativeHandle(
		ref,
		() => ({
			convertPythonToBlocks: importPythonToBlocks,
			exportBlocksToPython: handleExportBlocksToPython,
			loadSavedPythonCode: handleLoadSavedCode,
			loadRecentBlocks: handleLoadRecentBlocks,
			hideDock: () => onToggleVisible?.(false),
			isMirrorReady: () => mirrorReady
		}),
		[
			importPythonToBlocks,
			handleExportBlocksToPython,
			handleLoadSavedCode,
			handleLoadRecentBlocks,
			onToggleVisible,
			mirrorReady
		]
	)

	if (!visible) {
		const stats = getStats()
		return (
			<button
				className='bm-showchip'
				onClick={() => onToggleVisible?.(true)}
				title={`Show Python/Blocks dock. ${stats.hasStoredCode ? 'Has saved Python code. ' : ''}${stats.hasStoredBlocks ? 'Has recent conversion.' : ''}`}
			>
				Show Python/Blocks {stats.hasStoredCode && '●'}
			</button>
		)
	}

	return (
		<aside className='bm-dock' style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<div className='bm-card' style={{ flex: 1, minHeight: 0 }}>
				{showInlineActions && (
					<div style={{ marginLeft: 'auto', display: 'flex', gap: 8, padding: '8px' }}>
						{!hasLoadedSavedCode && getStats().hasStoredCode && (
							<button className='bm-btn secondary' onClick={handleLoadSavedCode}>
								Load Saved Code
							</button>
						)}

						<button className='bm-btn' onClick={handleExportBlocksToPython}>Blocks → Python</button>
						<button
							className='bm-btn primary'
							onClick={() => importPythonToBlocks()}
							disabled={isConverting}
						>
							{isConverting ? 'Converting…' : 'Python → Blocks'}
						</button>

						{hasRecentConversion() && (
							<button className='bm-btn secondary' onClick={handleLoadRecentBlocks}>
								Load Recent Blocks
							</button>
						)}

						<button className='bm-btn' onClick={() => onToggleVisible?.(false)}>Hide</button>
					</div>
				)}

				{(error || conversionError) && (
					<div style={{ color: '#ff5252', background: '#2d1a1a', padding: 8, margin: 8, borderRadius: 4 }}>
						Error: {error || conversionError}
					</div>
				)}

				{isConverting && (
					<div style={{ color: '#4fc3f7', background: '#1a252d', padding: 8, margin: 8, borderRadius: 4 }}>
						Converting Python to blocks…
					</div>
				)}

				<div className='bm-iframe-container' style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderTop: '1px solid #20263b' }}>
					<iframe
						ref={iframeRef}
						src={`${base}blockmirror/index.html`}
						title='BlockMirror'
						style={{ width: '100%', height: '100%', border: 0 }}
						onLoad={() => {
							// fallback: mark ready after a small delay if no message arrives
							setTimeout(() => {
								if (!mirrorReady) {
									setMirrorReady(true)
									console.warn('[BlockMirrorDock] Ready fallback triggered after iframe load')
								}
							}, 200)
						}}
					/>
				</div>
			</div>

			<ProgressIndicator
				isVisible={progress.visible}
				message={progress.message}
				progress={Math.round((progress.step / progress.total) * 100)}
				type='determinate'
			/>

			<ErrorBoundary>
				<NotificationCenter notifications={notifications} onRemove={removeNotification} />
			</ErrorBoundary>
		</aside>
	)
}

export default forwardRef(BlockMirrorDock)
