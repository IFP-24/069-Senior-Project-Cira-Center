
import { javascriptGenerator } from 'blockly/javascript';

const GRID_COLS = 23;
const GRID_ROWS = 20;
const SPRITE_SIZE = 1;

const CELL_GAP_RATIO = 0.50;
const LED_RADIUS_RATIO = 0.50;
const UNLIT_COLOR = 'rgba(8, 10, 18, 0.85)';
const DEFAULT_TICK_RATE = 18;
const MIN_TICK_RATE = 1;
const MAX_TICK_RATE = 120;
const STATUS_RUNNING = 'running';
const STATUS_GAME_OVER = 'game_over';
const STATUS_WON = 'won';
const STATUS_PAUSED = 'paused';
const PERF_EMIT_INTERVAL_MS = 250;
const DEFAULT_HUD_TEXT = '';
const DEFAULT_LIVES = 3;
const DEFAULT_TIMER_SECONDS = 0;
const DEFAULT_HEALTH = 100;
const DEFAULT_GAME_OVER_TEXT = 'Game over';
const DEFAULT_WIN_TEXT = 'You win';
const HUD_METRIC_KEYS = ['score', 'lives', 'timer', 'health'];
const DEFAULT_HUD_METRIC_ORDER = ['score', 'lives', 'timer', 'health'];
const DEFAULT_HUD_METRIC_VISIBILITY = {
    score: true,
    lives: false,
    timer: false,
    health: false,
};
const DEFAULT_HUD_METRIC_LABELS = {
    score: 'Score',
    lives: 'Lives',
    timer: 'Timer',
    health: 'Health',
};
const IGNORED_DEBUG_KEYS = new Set(['Meta', 'Shift', 'Alt', 'Control']);
const SAFE_SPAWN_ATTEMPTS = 200;
const RNG_MODULUS = 0x100000000;
const DEFAULT_GRAVITY = 0;
const DEFAULT_FRICTION = 1;
const DEFAULT_JUMP_POWER = 4;
const DEFAULT_MAX_SPEED = 6;
const COLLISION_RESPONSE_NONE = 'none';
const COLLISION_RESPONSE_BOUNCE = 'bounce';
const COLLISION_RESPONSE_SLIDE = 'slide';
const DEFAULT_COLLISION_LAYER = 'default';
const DEFAULT_COLLISION_MASK = '*';
const COLLISION_PHASE_ENTER = 'enter';
const COLLISION_PHASE_STAY = 'stay';
const COLLISION_PHASE_EXIT = 'exit';
const DEFAULT_OPACITY = 1;
const DEFAULT_SCALE = 1;
const BOUNDS_MODE_CLAMP = 'clamp';
const BOUNDS_MODE_WRAP = 'wrap';
const BOUNDS_MODE_BOUNCE = 'bounce';
const MAX_EXECUTION_STEPS = 250000;
const MAX_EXECUTION_MS = 2000;

const SPRITE_COLOR_PALETTE = [
    '#4dd0e1',
    '#ff6b6b',
    '#ffd166',
    '#8ce99a',
    '#b197fc',
    '#ffa94d',
    '#74c0fc',
    '#f783ac',
];

const ROLE_COLOR_HINTS = [
    { regex: /hero|player/i, color: '#4dd0e1' },
    { regex: /enemy|foe|bad|monster/i, color: '#ff6b6b' },
    { regex: /coin|goal|target|star|gem|pickup/i, color: '#ffd166' },
];

let ctx, canvas, sprites, keys, tickHandlers, keyHandlers, keyupHandlers, rafId;
let tickRate = DEFAULT_TICK_RATE;
let tickIntervalMs = 1000 / DEFAULT_TICK_RATE;
let gameScore = 0;
let gameStatus = STATUS_RUNNING;
let lastTickTime = 0;
let lastFrameTime = 0;
let lastPerfEmitTime = 0;
let keydownListener = null;
let keyupListener = null;
let blurListener = null;
let visibilityListener = null;
let pointerMoveListener = null;
let pointerDownListener = null;
let pointerUpListener = null;
let touchStartListener = null;
let touchMoveListener = null;
let touchEndListener = null;
let logHandler = null;
let mouseClickHandlers = [];
let touchStartHandlers = [];
let mouseState = { x: 0, y: 0, down: false };
let touchState = { x: 0, y: 0, down: false };
let gamepadState = { axes: [], buttons: [] };
let sceneHandlers = {};
let currentScene = 'default';
let isPaused = false;
let hudText = DEFAULT_HUD_TEXT;
let hudLives = DEFAULT_LIVES;
let hudTimer = DEFAULT_TIMER_SECONDS;
let hudHealth = DEFAULT_HEALTH;
let hudShowScore = true;
let hudShowStatus = true;
let hudGameOverText = DEFAULT_GAME_OVER_TEXT;
let hudWinText = DEFAULT_WIN_TEXT;
let hudMetricOrder = [...DEFAULT_HUD_METRIC_ORDER];
let hudMetricVisibility = { ...DEFAULT_HUD_METRIC_VISIBILITY };
let hudMetricLabels = { ...DEFAULT_HUD_METRIC_LABELS };
let hudInlineOverlay = false;
let releaseConsoleOverride = null;
let stateListener = null;
let perfListener = null;
let currentBlockId = null;
let rngState = null;
let spriteGroups = {};
let pixelGrid = {};
let spriteSpawnCounters = {};
let spriteCollisionHandlers = [];
let spriteGroupCollisionHandlers = [];
let activeCollisionPairs = new Set();
let scheduledEveryTicks = [];
let scheduledAfterTicks = [];
let engineTickCount = 0;
let customStats = {};
let executionStepCount = 0;
let executionStartedAt = 0;
const imageAssetCache = new Map();

const KEY_ALIAS_MAP = {
    left: 'ArrowLeft',
    arrowleft: 'ArrowLeft',
    right: 'ArrowRight',
    arrowright: 'ArrowRight',
    up: 'ArrowUp',
    arrowup: 'ArrowUp',
    down: 'ArrowDown',
    arrowdown: 'ArrowDown',
    space: ' ',
    spacebar: ' ',
    ' ': ' ',
};

function formatLogArg(arg) {
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg === null || typeof arg === 'undefined') return String(arg);
    try {
        return JSON.stringify(arg);
    } catch {
        return String(arg);
    }
}

function emitLog(...args) {
    if (!logHandler) return;
    const message = args.map(formatLogArg).join(' ');
    logHandler(message);
}

function setEngineListeners(options = {}) {
    stateListener = typeof options.onState === 'function' ? options.onState : null;
    perfListener = typeof options.onPerf === 'function' ? options.onPerf : null;
}

function getStateSnapshot() {
    const spriteEntries = Object.entries(sprites || {});
    const groups = Object.fromEntries(
        Object.entries(spriteGroups || {})
            .map(([group, members]) => [group, Array.from(members || []).filter(name => sprites[name])])
            .filter(([, members]) => members.length > 0)
    );
    const status = gameStatus || STATUS_RUNNING;
    const effectiveStatus = status === STATUS_RUNNING && isPaused ? STATUS_PAUSED : status;
    return {
        spriteCount: spriteEntries.length,
        pixelCount: Object.keys(pixelGrid || {}).length,
        sprites: spriteEntries.map(([name, sprite]) => ({
            name,
            x: Math.round(Number(sprite?.x) || 0),
            y: Math.round(Number(sprite?.y) || 0),
            width: Math.max(1, Math.round(Number(sprite?.width) || 1)),
            height: Math.max(1, Math.round(Number(sprite?.height) || 1)),
            vx: Number((Number(sprite?.motion?.vx) || 0).toFixed(2)),
            vy: Number((Number(sprite?.motion?.vy) || 0).toFixed(2)),
            color: sprite?.color || '#00bcd4',
            visible: sprite?.visual?.visible !== false,
            opacity: Number((Number(sprite?.visual?.opacity ?? 1)).toFixed(2)),
            rotation: Number((Number(sprite?.visual?.rotation ?? 0)).toFixed(1)),
            scaleX: Number((Number(sprite?.visual?.scaleX ?? 1)).toFixed(2)),
            scaleY: Number((Number(sprite?.visual?.scaleY ?? 1)).toFixed(2)),
            zIndex: toRoundedInt(sprite?.visual?.zIndex, 0),
            animationState: String(sprite?.visual?.animation?.currentState || ''),
            collisionLayer: String(sprite?.collision?.layer || DEFAULT_COLLISION_LAYER),
            collisionMask: Array.isArray(sprite?.collision?.mask)
                ? sprite.collision.mask.join(',')
                : DEFAULT_COLLISION_MASK,
        })),
        groups,
        keys: Array.from(keys || []),
        tickHandlers: Array.isArray(tickHandlers) ? tickHandlers.length : 0,
        keyHandlers: Object.values(keyHandlers || {}).reduce((sum, list) => sum + (list?.length || 0), 0),
        tickRate: Math.round(Number(tickRate) || DEFAULT_TICK_RATE),
        score: Math.round(Number(gameScore) || 0),
        status: effectiveStatus,
        paused: isPaused,
        scene: currentScene,
        tickCount: engineTickCount,
        stats: { ...customStats },
        hud: {
            text: String(hudText || ''),
            lives: Math.round(Number(hudLives) || 0),
            timer: Number((Number(hudTimer) || 0).toFixed(2)),
            health: Math.max(0, Math.min(100, Number(hudHealth) || 0)),
            labels: {
                score: getHudMetricLabel('score'),
                lives: getHudMetricLabel('lives'),
                timer: getHudMetricLabel('timer'),
                health: getHudMetricLabel('health'),
            },
            showScore: hudShowScore !== false,
            showStatus: hudShowStatus !== false,
            gameOverText: String(hudGameOverText || DEFAULT_GAME_OVER_TEXT),
            winText: String(hudWinText || DEFAULT_WIN_TEXT),
            order: Array.isArray(hudMetricOrder) ? [...hudMetricOrder] : [...DEFAULT_HUD_METRIC_ORDER],
            visibility: {
                score: hudMetricVisibility?.score !== false,
                lives: hudMetricVisibility?.lives !== false,
                timer: hudMetricVisibility?.timer !== false,
                health: hudMetricVisibility?.health !== false,
            },
            inlineOverlay: hudInlineOverlay === true,
        },
        mouse: {
            x: Math.round(Number(mouseState?.x) || 0),
            y: Math.round(Number(mouseState?.y) || 0),
            down: Boolean(mouseState?.down),
        },
        touch: {
            x: Math.round(Number(touchState?.x) || 0),
            y: Math.round(Number(touchState?.y) || 0),
            down: Boolean(touchState?.down),
        },
    };
}

function emitState() {
    if (!stateListener) return;
    stateListener(getStateSnapshot());
}

function emitPerf(now, frameDurationMs, tickDurationMs) {
    if (!perfListener) return;
    if (now - lastPerfEmitTime < PERF_EMIT_INTERVAL_MS) return;
    lastPerfEmitTime = now;
    const status = gameStatus || STATUS_RUNNING;
    perfListener({
        fps: frameDurationMs > 0 ? Math.round(1000 / frameDurationMs) : 0,
        frameDurationMs: Number(frameDurationMs.toFixed(2)),
        tickDurationMs: Number(tickDurationMs.toFixed(2)),
        tickHandlers: tickHandlers.length,
        spriteCount: Object.keys(sprites).length,
        tickRate: Math.round(Number(tickRate) || DEFAULT_TICK_RATE),
        score: Math.round(Number(gameScore) || 0),
        status: status === STATUS_RUNNING && isPaused ? STATUS_PAUSED : status,
        scene: currentScene,
        paused: isPaused,
    });
}

function nowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

function resetExecutionBudget() {
    executionStepCount = 0;
    executionStartedAt = nowMs();
}

function checkExecutionBudget(blockId = null) {
    executionStepCount += 1;
    if (blockId) currentBlockId = blockId;

    if (executionStepCount > MAX_EXECUTION_STEPS) {
        throw new Error(`Execution stopped: loop iteration limit (${MAX_EXECUTION_STEPS.toLocaleString()}) exceeded. Reduce repeat/while loop counts.`);
    }

    const elapsedMs = nowMs() - executionStartedAt;
    if (elapsedMs > MAX_EXECUTION_MS) {
        throw new Error(`Execution stopped: code ran for more than ${MAX_EXECUTION_MS}ms. Reduce repeat/while loop counts.`);
    }
}

function invokeUserCallback(fn, ...args) {
    if (typeof fn !== 'function') return undefined;
    resetExecutionBudget();
    return fn(...args);
}

function overrideConsole() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
        originalLog(...args);
        emitLog(...args);
    };
    console.warn = (...args) => {
        originalWarn(...args);
        emitLog(...args);
    };
    console.error = (...args) => {
        originalError(...args);
        emitLog(...args);
    };

    return () => {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
    };
}

function clampSpritePosition(sprite) {
    if (!sprite) return;
    const width = Math.max(1, Math.round(Number(sprite.width) || 1));
    const height = Math.max(1, Math.round(Number(sprite.height) || 1));
    const maxX = Math.max(0, GRID_COLS - width);
    const maxY = Math.max(0, GRID_ROWS - height);
    if (Number.isFinite(sprite.x)) {
        sprite.x = Math.min(Math.max(Number(sprite.x), 0), maxX);
    }
    if (Number.isFinite(sprite.y)) {
        sprite.y = Math.min(Math.max(Number(sprite.y), 0), maxY);
    }
}

function spritesOverlap(a, b) {
    if (!a || !b) return false;

    const ax = Math.round(Number(a.x) || 0);
    const ay = Math.round(Number(a.y) || 0);
    const aw = Math.max(1, Math.round(Number(a.width) || 1));
    const ah = Math.max(1, Math.round(Number(a.height) || 1));

    const bx = Math.round(Number(b.x) || 0);
    const by = Math.round(Number(b.y) || 0);
    const bw = Math.max(1, Math.round(Number(b.width) || 1));
    const bh = Math.max(1, Math.round(Number(b.height) || 1));

    const aRight = ax + aw - 1;
    const aBottom = ay + ah - 1;
    const bRight = bx + bw - 1;
    const bBottom = by + bh - 1;

    return !(aRight < bx || bRight < ax || aBottom < by || bBottom < ay);
}

function normalizeColor(value, fallback = '#4dd0e1') {
    const text = String(value || '').trim();
    if (/^#[0-9a-f]{3,8}$/i.test(text)) return text;
    if (/^[a-z]+$/i.test(text)) return text;
    return fallback;
}

function clampTickRate(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_TICK_RATE;
    return Math.min(MAX_TICK_RATE, Math.max(MIN_TICK_RATE, numeric));
}

function setTickRateValue(value) {
    tickRate = clampTickRate(value);
    tickIntervalMs = 1000 / tickRate;
    return tickRate;
}

function normalizeKeyAlias(value) {
    if (typeof value !== 'string') return '';
    if (value === ' ') return ' ';
    const trimmed = value.trim();
    if (!trimmed) return '';
    const lowered = trimmed.toLowerCase();
    if (KEY_ALIAS_MAP[lowered]) return KEY_ALIAS_MAP[lowered];
    if (trimmed.length === 1) return lowered;
    return trimmed;
}

function normalizeHudMetricName(metric) {
    const key = String(metric || '').trim().toLowerCase();
    if (HUD_METRIC_KEYS.includes(key)) return key;
    return '';
}

function normalizeHudMetricOrder(order) {
    const raw = Array.isArray(order)
        ? order
        : String(order || '')
            .split(/[|,s]+/)
            .map(part => part.trim())
            .filter(Boolean);

    const out = [];
    for (const part of raw) {
        const key = normalizeHudMetricName(part);
        if (!key || out.includes(key)) continue;
        out.push(key);
    }
    for (const key of DEFAULT_HUD_METRIC_ORDER) {
        if (!out.includes(key)) out.push(key);
    }
    return out;
}

function getHudMetricLabel(metric) {
    const key = normalizeHudMetricName(metric);
    if (!key) return '';
    const custom = String(hudMetricLabels?.[key] || '').trim();
    return custom || DEFAULT_HUD_METRIC_LABELS[key] || key;
}

function getHudMetricEntries() {
    const order = normalizeHudMetricOrder(hudMetricOrder);
    const entries = [];
    for (const key of order) {
        if (hudMetricVisibility?.[key] === false) continue;
        if (key === 'score' && hudShowScore === false) continue;
        if (key === 'score') {
            entries.push({ key, label: getHudMetricLabel(key), value: Math.round(Number(gameScore) || 0) });
            continue;
        }
        if (key === 'lives') {
            entries.push({ key, label: getHudMetricLabel(key), value: Math.round(Number(hudLives) || 0) });
            continue;
        }
        if (key === 'timer') {
            entries.push({ key, label: getHudMetricLabel(key), value: Number((Number(hudTimer) || 0).toFixed(1)) + 's' });
            continue;
        }
        if (key === 'health') {
            entries.push({ key, label: getHudMetricLabel(key), value: Math.max(0, Math.min(100, Math.round(Number(hudHealth) || 0))) + '%' });
        }
    }
    return entries;
}

function normalizeSeed(rawSeed) {
    if (rawSeed === null || typeof rawSeed === 'undefined') return null;
    const text = String(rawSeed).trim();
    if (!text) return null;
    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
        return (Math.floor(Math.abs(numeric)) >>> 0);
    }
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
}

function seededRandom() {
    if (rngState === null) return Math.random();
    rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
    return rngState / RNG_MODULUS;
}

function toRoundedInt(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
}

function normalizeSpriteNameList(value) {
    if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
    if (typeof value === 'string') {
        const one = value.trim();
        return one ? [one] : [];
    }
    return [];
}

function normalizeSpawnOptions(options = {}) {
    const raw = options && typeof options === 'object' ? options : {};
    const maxDistance = Math.max(GRID_COLS, GRID_ROWS);
    return {
        avoidOccupied: raw.avoidOccupied !== false,
        avoidNames: normalizeSpriteNameList(raw.awayFrom?.length ? raw.awayFrom : raw.avoidNames),
        excludeNames: new Set(normalizeSpriteNameList(raw.excludeNames)),
        minDistance: Math.max(0, Math.min(maxDistance, toRoundedInt(raw.minDistance, 0))),
        maxAttempts: Math.max(1, toRoundedInt(raw.maxAttempts, SAFE_SPAWN_ATTEMPTS)),
    };
}

function distanceBetweenSprites(a, b) {
    if (!a || !b) return 0;
    const ax = toRoundedInt(a.x, 0);
    const ay = toRoundedInt(a.y, 0);
    const bx = toRoundedInt(b.x, 0);
    const by = toRoundedInt(b.y, 0);
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

function randomInt(min, max) {
    const a = Math.round(Number(min));
    const b = Math.round(Number(max));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return Math.floor(seededRandom() * (hi - lo + 1)) + lo;
}

function canPlaceSpriteAt(x, y, width, height, options = {}) {
    const normalizedWidth = Math.max(1, toRoundedInt(width, 1));
    const normalizedHeight = Math.max(1, toRoundedInt(height, 1));
    const maxX = GRID_COLS - normalizedWidth;
    const maxY = GRID_ROWS - normalizedHeight;
    if (x < 0 || y < 0 || x > maxX || y > maxY) return false;

    const cfg = normalizeSpawnOptions(options);
    const candidate = { x, y, width: normalizedWidth, height: normalizedHeight };

    if (cfg.avoidOccupied) {
        for (const [name, sprite] of Object.entries(sprites || {})) {
            if (!sprite) continue;
            if (cfg.excludeNames.has(name)) continue;
            if (spritesOverlap(candidate, sprite)) return false;
        }
    }

    if (cfg.minDistance > 0 && cfg.avoidNames.length) {
        for (const name of cfg.avoidNames) {
            const avoidSprite = sprites[name];
            if (!avoidSprite) continue;
            if (distanceBetweenSprites(candidate, avoidSprite) < cfg.minDistance) return false;
        }
    }

    return true;
}

function findSafeSpawnPosition(width = 1, height = 1, options = {}) {
    const normalizedWidth = Math.max(1, toRoundedInt(width, 1));
    const normalizedHeight = Math.max(1, toRoundedInt(height, 1));
    const maxX = GRID_COLS - normalizedWidth;
    const maxY = GRID_ROWS - normalizedHeight;
    if (maxX < 0 || maxY < 0) return null;

    const cfg = normalizeSpawnOptions(options);

    for (let i = 0; i < cfg.maxAttempts; i++) {
        const x = randomInt(0, maxX);
        const y = randomInt(0, maxY);
        if (canPlaceSpriteAt(x, y, normalizedWidth, normalizedHeight, cfg)) return { x, y };
    }

    for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
            if (canPlaceSpriteAt(x, y, normalizedWidth, normalizedHeight, cfg)) return { x, y };
        }
    }

    return null;
}

function normalizeGroupName(value) {
    const text = String(value || '').trim();
    return text;
}

function ensureGroup(groupName) {
    const normalized = normalizeGroupName(groupName);
    if (!normalized) return null;
    spriteGroups[normalized] = spriteGroups[normalized] || new Set();
    return spriteGroups[normalized];
}

function addSpriteToGroup(spriteName, groupName) {
    if (!sprites[spriteName]) return false;
    const group = ensureGroup(groupName);
    if (!group) return false;
    group.add(spriteName);
    return true;
}

function removeSpriteFromGroup(spriteName, groupName) {
    const normalized = normalizeGroupName(groupName);
    if (!normalized || !spriteGroups[normalized]) return false;
    spriteGroups[normalized].delete(spriteName);
    if (spriteGroups[normalized].size === 0) delete spriteGroups[normalized];
    return true;
}

function removeSpriteFromAllGroups(spriteName) {
    for (const groupName of Object.keys(spriteGroups || {})) {
        removeSpriteFromGroup(spriteName, groupName);
    }
}

function getGroupMembers(groupName) {
    const normalized = normalizeGroupName(groupName);
    if (!normalized || !spriteGroups[normalized]) return [];
    const members = [];
    for (const name of spriteGroups[normalized]) {
        if (sprites[name]) {
            members.push(name);
        } else {
            spriteGroups[normalized].delete(name);
        }
    }
    if (spriteGroups[normalized].size === 0) delete spriteGroups[normalized];
    return members;
}

function generateSpawnName(baseName = 'sprite') {
    const normalizedBase = String(baseName || 'sprite').trim() || 'sprite';
    if (!sprites[normalizedBase]) {
        spriteSpawnCounters[normalizedBase] = Math.max(1, toRoundedInt(spriteSpawnCounters[normalizedBase], 1));
        return normalizedBase;
    }
    let next = Math.max(1, toRoundedInt(spriteSpawnCounters[normalizedBase], 1));
    let candidate = normalizedBase + '_' + next;
    while (sprites[candidate]) {
        next += 1;
        candidate = normalizedBase + '_' + next;
    }
    spriteSpawnCounters[normalizedBase] = next + 1;
    return candidate;
}

function ensureMotionState(sprite) {
    if (!sprite) return null;
    if (!sprite.motion || typeof sprite.motion !== 'object') {
        sprite.motion = {};
    }
    const m = sprite.motion;
    m.vx = Number.isFinite(Number(m.vx)) ? Number(m.vx) : 0;
    m.vy = Number.isFinite(Number(m.vy)) ? Number(m.vy) : 0;
    m.ax = Number.isFinite(Number(m.ax)) ? Number(m.ax) : 0;
    m.ay = Number.isFinite(Number(m.ay)) ? Number(m.ay) : 0;
    m.gravity = Number.isFinite(Number(m.gravity)) ? Number(m.gravity) : DEFAULT_GRAVITY;
    m.friction = Number.isFinite(Number(m.friction)) ? Number(m.friction) : DEFAULT_FRICTION;
    m.friction = Math.min(1, Math.max(0, m.friction));
    m.jumpPower = Number.isFinite(Number(m.jumpPower)) ? Number(m.jumpPower) : DEFAULT_JUMP_POWER;
    m.maxSpeed = Number.isFinite(Number(m.maxSpeed)) ? Math.max(0, Number(m.maxSpeed)) : DEFAULT_MAX_SPEED;
    m.boundsMode = normalizeBoundsMode(m.boundsMode);
    m.enabled = m.enabled !== false;
    m.onGround = Boolean(m.onGround);
    return m;
}

function ensureMotionStateByName(name) {
    const sprite = sprites[name];
    if (!sprite) return null;
    return ensureMotionState(sprite);
}

function applyBoundsModeToSprite(sprite, options = {}) {
    if (!sprite) return;
    const motion = ensureMotionState(sprite);
    const mode = normalizeBoundsMode(motion?.boundsMode);
    const resolveVelocity = options.resolveVelocity === true;

    const width = Math.max(1, Math.round(Number(sprite.width) || 1));
    const height = Math.max(1, Math.round(Number(sprite.height) || 1));
    const maxX = Math.max(0, GRID_COLS - width);
    const maxY = Math.max(0, GRID_ROWS - height);

    sprite.x = Number.isFinite(Number(sprite.x)) ? Number(sprite.x) : 0;
    sprite.y = Number.isFinite(Number(sprite.y)) ? Number(sprite.y) : 0;

    if (mode === BOUNDS_MODE_WRAP) {
        if (sprite.x < 0) sprite.x = maxX;
        else if (sprite.x > maxX) sprite.x = 0;

        if (sprite.y < 0) sprite.y = maxY;
        else if (sprite.y > maxY) sprite.y = 0;

        motion.onGround = false;
        return;
    }

    if (mode === BOUNDS_MODE_BOUNCE) {
        if (sprite.x < 0) {
            sprite.x = 0;
            if (resolveVelocity) motion.vx = Math.abs(Number(motion.vx) || 0);
        }
        if (sprite.x > maxX) {
            sprite.x = maxX;
            if (resolveVelocity) motion.vx = -Math.abs(Number(motion.vx) || 0);
        }
        if (sprite.y < 0) {
            sprite.y = 0;
            if (resolveVelocity) motion.vy = Math.abs(Number(motion.vy) || 0);
            motion.onGround = false;
        }
        if (sprite.y > maxY) {
            sprite.y = maxY;
            if (resolveVelocity) motion.vy = -Math.abs(Number(motion.vy) || 0);
            motion.onGround = true;
        } else if (sprite.y < maxY) {
            motion.onGround = false;
        }
        return;
    }

    if (sprite.x < 0) {
        sprite.x = 0;
        if (resolveVelocity && motion.vx < 0) motion.vx = 0;
    }
    if (sprite.x > maxX) {
        sprite.x = maxX;
        if (resolveVelocity && motion.vx > 0) motion.vx = 0;
    }
    if (sprite.y < 0) {
        sprite.y = 0;
        if (resolveVelocity && motion.vy < 0) motion.vy = 0;
        motion.onGround = false;
    }
    if (sprite.y > maxY) {
        sprite.y = maxY;
        if (resolveVelocity && motion.vy > 0) motion.vy = 0;
        motion.onGround = true;
    } else if (sprite.y < maxY) {
        motion.onGround = false;
    }
}

function splitPairKey(key) {
    const parts = String(key || '').split('::');
    if (parts.length !== 2) return null;
    if (!parts[0] || !parts[1]) return null;
    return [parts[0], parts[1]];
}


function normalizeCollisionLayer(value) {
    const text = String(value || DEFAULT_COLLISION_LAYER).trim();
    return text || DEFAULT_COLLISION_LAYER;
}

function normalizeCollisionMask(value) {
    if (Array.isArray(value)) {
        const list = value.map(item => String(item || '').trim()).filter(Boolean);
        return list.length ? list : [DEFAULT_COLLISION_MASK];
    }
    if (typeof value === 'string') {
        const text = value.trim();
        if (!text) return [DEFAULT_COLLISION_MASK];
        const list = text.split(/[|,\s]+/).map(item => item.trim()).filter(Boolean);
        return list.length ? list : [DEFAULT_COLLISION_MASK];
    }
    return [DEFAULT_COLLISION_MASK];
}

function normalizeCollisionResponse(value) {
    const mode = String(value || COLLISION_RESPONSE_NONE).trim().toLowerCase();
    if (mode === COLLISION_RESPONSE_BOUNCE) return COLLISION_RESPONSE_BOUNCE;
    if (mode === COLLISION_RESPONSE_SLIDE) return COLLISION_RESPONSE_SLIDE;
    return COLLISION_RESPONSE_NONE;
}

function normalizeCollisionPhase(value, fallback = COLLISION_PHASE_ENTER) {
    const phase = String(value || fallback).trim().toLowerCase();
    if (phase === COLLISION_PHASE_STAY) return COLLISION_PHASE_STAY;
    if (phase === COLLISION_PHASE_EXIT) return COLLISION_PHASE_EXIT;
    return COLLISION_PHASE_ENTER;
}

function normalizeBoundsMode(value, fallback = BOUNDS_MODE_CLAMP) {
    const mode = String(value || fallback).trim().toLowerCase();
    if (mode === BOUNDS_MODE_WRAP) return BOUNDS_MODE_WRAP;
    if (mode === BOUNDS_MODE_BOUNCE) return BOUNDS_MODE_BOUNCE;
    return BOUNDS_MODE_CLAMP;
}

function normalizeOpacity(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_OPACITY;
    return Math.min(1, Math.max(0, numeric));
}

function normalizeScale(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 0) return DEFAULT_SCALE;
    return Math.min(8, Math.max(0.1, Math.abs(numeric)));
}

function ensureCollisionState(sprite) {
    if (!sprite) return null;
    if (!sprite.collision || typeof sprite.collision !== 'object') sprite.collision = {};
    const c = sprite.collision;
    c.layer = normalizeCollisionLayer(c.layer);
    c.mask = normalizeCollisionMask(c.mask);
    c.response = normalizeCollisionResponse(c.response);
    c.enabled = c.enabled !== false;
    return c;
}

function ensureVisualState(sprite) {
    if (!sprite) return null;
    if (!sprite.visual || typeof sprite.visual !== 'object') sprite.visual = {};
    const v = sprite.visual;
    v.visible = v.visible !== false;
    v.opacity = normalizeOpacity(v.opacity);
    v.rotation = Number.isFinite(Number(v.rotation)) ? Number(v.rotation) : 0;
    v.scaleX = normalizeScale(v.scaleX);
    v.scaleY = normalizeScale(v.scaleY);
    v.zIndex = toRoundedInt(v.zIndex, 0);
    v.image = String(v.image || '').trim();
    if (v.spriteSheet && typeof v.spriteSheet === 'object') {
        v.spriteSheet = {
            src: String(v.spriteSheet.src || '').trim(),
            cols: Math.max(1, toRoundedInt(v.spriteSheet.cols, 1)),
            rows: Math.max(1, toRoundedInt(v.spriteSheet.rows, 1)),
        };
        if (!v.spriteSheet.src) v.spriteSheet = null;
    } else {
        v.spriteSheet = null;
    }
    if (!v.animation || typeof v.animation !== 'object') v.animation = {};
    v.animation.states = v.animation.states && typeof v.animation.states === 'object' ? v.animation.states : {};
    v.animation.currentState = String(v.animation.currentState || '');
    v.animation.currentFrame = Math.max(0, toRoundedInt(v.animation.currentFrame, 0));
    v.animation.elapsedMs = Math.max(0, Number(v.animation.elapsedMs) || 0);
    v.animation.playing = v.animation.playing === true;
    return v;
}

function ensureSpriteState(sprite) {
    ensureMotionState(sprite);
    ensureCollisionState(sprite);
    ensureVisualState(sprite);
    return sprite;
}

function cloneSpriteState(raw) {
    return raw ? JSON.parse(JSON.stringify(raw)) : raw;
}

function getSpriteRenderSize(sprite) {
    const v = ensureVisualState(sprite);
    const baseW = Math.max(1, Math.round(Number(sprite?.width) || 1));
    const baseH = Math.max(1, Math.round(Number(sprite?.height) || 1));
    let width = Math.max(1, Math.round(baseW * v.scaleX));
    let height = Math.max(1, Math.round(baseH * v.scaleY));
    const quarterTurns = ((Math.round((Number(v.rotation) || 0) / 90) % 4) + 4) % 4;
    if (quarterTurns % 2 === 1) {
        const temp = width;
        width = height;
        height = temp;
    }
    return { width, height, quarterTurns, opacity: v.opacity };
}

function normalizeRenderableColor(color, opacity = 1) {
    const safeOpacity = normalizeOpacity(opacity);
    if (safeOpacity >= 0.999) return color;
    const text = String(color || '').trim();
    let r = 77;
    let g = 208;
    let b = 225;
    const hexMatch = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
        const hex = hexMatch[1];
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + safeOpacity.toFixed(3) + ')';
    }
    const rgbMatch = text.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
        const nums = rgbMatch[1].split(',').map(p => Number(p.trim()));
        if (nums.length >= 3 && Number.isFinite(nums[0]) && Number.isFinite(nums[1]) && Number.isFinite(nums[2])) {
            return 'rgba(' + Math.max(0, Math.min(255, nums[0])) + ', ' + Math.max(0, Math.min(255, nums[1])) + ', ' + Math.max(0, Math.min(255, nums[2])) + ', ' + safeOpacity.toFixed(3) + ')';
        }
    }
    return color;
}

function getRenderableSprites() {
    return Object.entries(sprites || {})
        .map(([name, sprite]) => {
            ensureSpriteState(sprite);
            return { name, sprite, visual: sprite.visual };
        })
        .filter(({ sprite, visual }) => sprite && visual?.visible !== false)
        .sort((a, b) => {
            const za = toRoundedInt(a.visual?.zIndex, 0);
            const zb = toRoundedInt(b.visual?.zIndex, 0);
            if (za !== zb) return za - zb;
            return a.name.localeCompare(b.name);
        });
}

function getImageAsset(src) {
    const key = String(src || '').trim();
    if (!key) return null;
    if (!imageAssetCache.has(key)) {
        if (typeof Image === 'undefined') return null;
        const img = new Image();
        const record = { img, loaded: false, failed: false };
        img.onload = () => { record.loaded = true; };
        img.onerror = () => { record.failed = true; };
        img.src = key;
        imageAssetCache.set(key, record);
    }
    return imageAssetCache.get(key) || null;
}

function getAnimationFrame(sprite) {
    const visual = ensureVisualState(sprite);
    const anim = visual.animation || {};
    const state = anim.states?.[anim.currentState];
    if (!state) return Math.max(0, toRoundedInt(anim.currentFrame, 0));
    const min = Math.max(0, toRoundedInt(state.start, 0));
    const max = Math.max(min, toRoundedInt(state.end, min));
    return Math.min(max, Math.max(min, toRoundedInt(anim.currentFrame, min)));
}

function advanceSpriteAnimation(sprite, deltaMs = tickIntervalMs) {
    const visual = ensureVisualState(sprite);
    const anim = visual.animation;
    if (!anim?.playing || !anim.currentState) return;
    const state = anim.states?.[anim.currentState];
    if (!state) return;
    const start = Math.max(0, toRoundedInt(state.start, 0));
    const end = Math.max(start, toRoundedInt(state.end, start));
    const fps = Math.max(1, Number(state.fps) || 8);
    const frameDuration = 1000 / fps;
    anim.elapsedMs = Number(anim.elapsedMs || 0) + Number(deltaMs || tickIntervalMs);
    if (!Number.isFinite(anim.currentFrame) || anim.currentFrame < start || anim.currentFrame > end) {
        anim.currentFrame = start;
    }
    while (anim.elapsedMs >= frameDuration) {
        anim.elapsedMs -= frameDuration;
        anim.currentFrame += 1;
        if (anim.currentFrame > end) {
            if (state.loop === false) {
                anim.currentFrame = end;
                anim.playing = false;
                break;
            }
            anim.currentFrame = start;
        }
    }
}

function maskAllowsLayer(maskValues, layer) {
    if (!Array.isArray(maskValues) || !maskValues.length) return true;
    if (maskValues.includes(DEFAULT_COLLISION_MASK)) return true;
    return maskValues.includes(layer);
}

function shouldSpritesCollideByLayer(a, b) {
    const ca = ensureCollisionState(a);
    const cb = ensureCollisionState(b);
    if (!ca?.enabled || !cb?.enabled) return false;
    return maskAllowsLayer(ca.mask, cb.layer) && maskAllowsLayer(cb.mask, ca.layer);
}

function pairKey(nameA, nameB) {
    return nameA < nameB ? nameA + '::' + nameB : nameB + '::' + nameA;
}

function resolveCollisionPair(spriteA, spriteB, mode) {
    if (!spriteA || !spriteB) return;
    if (mode !== COLLISION_RESPONSE_BOUNCE && mode !== COLLISION_RESPONSE_SLIDE) return;

    const ax = Number(spriteA.x || 0);
    const ay = Number(spriteA.y || 0);
    const bx = Number(spriteB.x || 0);
    const by = Number(spriteB.y || 0);
    const aw = Math.max(1, Math.round(Number(spriteA.width) || 1));
    const ah = Math.max(1, Math.round(Number(spriteA.height) || 1));
    const bw = Math.max(1, Math.round(Number(spriteB.width) || 1));
    const bh = Math.max(1, Math.round(Number(spriteB.height) || 1));

    const overlapX = Math.min(ax + aw, bx + bw) - Math.max(ax, bx);
    const overlapY = Math.min(ay + ah, by + bh) - Math.max(ay, by);
    if (overlapX <= 0 || overlapY <= 0) return;

    const moveX = overlapX <= overlapY;
    if (moveX) {
        const direction = ax <= bx ? -1 : 1;
        spriteA.x += direction * (overlapX / 2);
        spriteB.x -= direction * (overlapX / 2);
        const ma = ensureMotionState(spriteA);
        const mb = ensureMotionState(spriteB);
        if (mode === COLLISION_RESPONSE_BOUNCE) {
            ma.vx = -ma.vx * 0.8;
            mb.vx = -mb.vx * 0.8;
        } else {
            ma.vx = 0;
            mb.vx = 0;
        }
    } else {
        const direction = ay <= by ? -1 : 1;
        spriteA.y += direction * (overlapY / 2);
        spriteB.y -= direction * (overlapY / 2);
        const ma = ensureMotionState(spriteA);
        const mb = ensureMotionState(spriteB);
        if (mode === COLLISION_RESPONSE_BOUNCE) {
            ma.vy = -ma.vy * 0.8;
            mb.vy = -mb.vy * 0.8;
        } else {
            ma.vy = 0;
            mb.vy = 0;
        }
    }

    clampSpritePosition(spriteA);
    clampSpritePosition(spriteB);
}

function maybeTriggerCollisionHandlers(nameA, nameB, phase = COLLISION_PHASE_ENTER) {
    const normalizedPhase = normalizeCollisionPhase(phase);
    for (const entry of spriteCollisionHandlers) {
        if (!entry || typeof entry.fn !== 'function') continue;
        const direct = entry.a === nameA && entry.b === nameB;
        const reverse = entry.a === nameB && entry.b === nameA;
        if (!direct && !reverse) continue;
        if (normalizeCollisionPhase(entry.phase, COLLISION_PHASE_ENTER) !== normalizedPhase) continue;
        invokeUserCallback(entry.fn, nameA, nameB);
    }

    for (const entry of spriteGroupCollisionHandlers) {
        if (!entry || typeof entry.fn !== 'function') continue;
        if (normalizeCollisionPhase(entry.phase, COLLISION_PHASE_ENTER) !== normalizedPhase) continue;
        if (entry.name === nameA && getGroupMembers(entry.group).includes(nameB)) invokeUserCallback(entry.fn, nameA, nameB);
        if (entry.name === nameB && getGroupMembers(entry.group).includes(nameA)) invokeUserCallback(entry.fn, nameB, nameA);
    }
}

function processSpriteCollisions() {
    const names = Object.keys(sprites || {});
    const seen = new Set();

    for (let i = 0; i < names.length; i++) {
        const nameA = names[i];
        const spriteA = sprites[nameA];
        if (!spriteA) continue;
        for (let j = i + 1; j < names.length; j++) {
            const nameB = names[j];
            const spriteB = sprites[nameB];
            if (!spriteB) continue;
            if (!spritesOverlap(spriteA, spriteB)) continue;
            if (!shouldSpritesCollideByLayer(spriteA, spriteB)) continue;

            const key = pairKey(nameA, nameB);
            seen.add(key);

            const responseA = ensureCollisionState(spriteA).response;
            const responseB = ensureCollisionState(spriteB).response;
            const response =
                responseA === COLLISION_RESPONSE_BOUNCE || responseB === COLLISION_RESPONSE_BOUNCE
                    ? COLLISION_RESPONSE_BOUNCE
                    : (responseA === COLLISION_RESPONSE_SLIDE || responseB === COLLISION_RESPONSE_SLIDE)
                        ? COLLISION_RESPONSE_SLIDE
                        : COLLISION_RESPONSE_NONE;
            resolveCollisionPair(spriteA, spriteB, response);

            if (!activeCollisionPairs.has(key)) {
                maybeTriggerCollisionHandlers(nameA, nameB, COLLISION_PHASE_ENTER);
            } else {
                maybeTriggerCollisionHandlers(nameA, nameB, COLLISION_PHASE_STAY);
            }
        }
    }

    for (const key of activeCollisionPairs) {
        if (seen.has(key)) continue;
        const namesFromKey = splitPairKey(key);
        if (!namesFromKey) continue;
        maybeTriggerCollisionHandlers(namesFromKey[0], namesFromKey[1], COLLISION_PHASE_EXIT);
    }

    activeCollisionPairs = seen;
    return seen;
}

function drawSpriteImages(renderables, cellW, cellH, gapX, gapY) {
    for (const { sprite, visual } of renderables) {
        if (!visual?.visible || visual.opacity <= 0) continue;
        const sheet = visual.spriteSheet;
        const source = sheet?.src || visual.image;
        if (!source) continue;
        const asset = getImageAsset(source);
        if (!asset?.loaded || asset.failed) continue;

        const renderSize = getSpriteRenderSize(sprite);
        const baseCol = Math.round(Number(sprite.x) || 0);
        const baseRow = Math.round(Number(sprite.y) || 0);
        const dx = baseCol * cellW + gapX / 2;
        const dy = baseRow * cellH + gapY / 2;
        const dw = Math.max(1, renderSize.width * cellW - gapX);
        const dh = Math.max(1, renderSize.height * cellH - gapY);

        ctx.save();
        ctx.globalAlpha = normalizeOpacity(visual.opacity);
        const cx = dx + dw / 2;
        const cy = dy + dh / 2;
        ctx.translate(cx, cy);
        ctx.rotate((Number(visual.rotation) || 0) * Math.PI / 180);

        if (sheet) {
            const cols = Math.max(1, toRoundedInt(sheet.cols, 1));
            const rows = Math.max(1, toRoundedInt(sheet.rows, 1));
            const total = Math.max(1, cols * rows);
            const frame = Math.min(total - 1, Math.max(0, getAnimationFrame(sprite)));
            const sw = asset.img.width / cols;
            const sh = asset.img.height / rows;
            const sx = (frame % cols) * sw;
            const sy = Math.floor(frame / cols) * sh;
            ctx.drawImage(asset.img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
        } else {
            ctx.drawImage(asset.img, -dw / 2, -dh / 2, dw, dh);
        }
        ctx.restore();
    }
}

function applyMotionToSprite(sprite) {
    if (!sprite) return;
    const motion = ensureMotionState(sprite);
    if (!motion?.enabled) return;

    motion.vx += motion.ax;
    motion.vy += motion.ay + motion.gravity;

    if (motion.friction >= 0 && motion.friction <= 1) {
        motion.vx *= motion.friction;
        motion.vy *= motion.friction;
    }

    if (Number.isFinite(motion.maxSpeed) && motion.maxSpeed > 0) {
        const cap = motion.maxSpeed;
        motion.vx = Math.max(-cap, Math.min(cap, motion.vx));
        motion.vy = Math.max(-cap, Math.min(cap, motion.vy));
    }

    sprite.x = Number(sprite.x || 0) + motion.vx;
    sprite.y = Number(sprite.y || 0) + motion.vy;
    applyBoundsModeToSprite(sprite, { resolveVelocity: true });
}

function setStatus(status, message = '') {
    const nextStatus = status || STATUS_RUNNING;
    gameStatus = nextStatus;
    if (nextStatus !== STATUS_RUNNING) isPaused = false;
    const fallbackMessage =
        nextStatus === STATUS_GAME_OVER ? hudGameOverText :
            nextStatus === STATUS_WON ? hudWinText : '';
    const text = String(message || fallbackMessage || '').trim();
    if (text) emitLog(text);
    emitState();
}

function runScheduledTickHandlers() {
    if (!scheduledEveryTicks.length && !scheduledAfterTicks.length) return;

    for (const entry of scheduledEveryTicks) {
        if (!entry || typeof entry.fn !== 'function') continue;
        while (engineTickCount >= entry.nextTick) {
            entry.nextTick += entry.every;
            invokeUserCallback(entry.fn);
        }
    }

    if (scheduledAfterTicks.length) {
        const pending = [];
        for (const entry of scheduledAfterTicks) {
            if (!entry || typeof entry.fn !== 'function') continue;
            if (engineTickCount >= entry.runAt) {
                invokeUserCallback(entry.fn);
            } else {
                pending.push(entry);
            }
        }
        scheduledAfterTicks = pending;
    }
}

function hashString(text) {
    let hash = 0;
    const source = String(text || '');
    for (let i = 0; i < source.length; i++) {
        hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function usedSpriteColors(exceptName = null) {
    const used = new Set();
    for (const [name, sprite] of Object.entries(sprites || {})) {
        if (exceptName && name === exceptName) continue;
        used.add(normalizeColor(sprite?.color));
    }
    return used;
}

function pickRoleColor(name) {
    const text = String(name || '');
    for (const hint of ROLE_COLOR_HINTS) {
        if (hint.regex.test(text)) return hint.color;
    }
    return null;
}

function pickDistinctColor(name, exceptName = null) {
    const used = usedSpriteColors(exceptName);
    const preferred = pickRoleColor(name);
    if (preferred && !used.has(preferred)) return preferred;

    const start = hashString(name) % SPRITE_COLOR_PALETTE.length;
    for (let i = 0; i < SPRITE_COLOR_PALETTE.length; i++) {
        const color = SPRITE_COLOR_PALETTE[(start + i) % SPRITE_COLOR_PALETTE.length];
        if (!used.has(color)) return color;
    }

    return preferred || SPRITE_COLOR_PALETTE[start];
}

function pickDistinctColorFromUsed(name, used) {
    const preferred = pickRoleColor(name);
    if (preferred && !used.has(preferred)) return preferred;

    const start = hashString(name) % SPRITE_COLOR_PALETTE.length;
    for (let i = 0; i < SPRITE_COLOR_PALETTE.length; i++) {
        const color = SPRITE_COLOR_PALETTE[(start + i) % SPRITE_COLOR_PALETTE.length];
        if (!used.has(color)) return color;
    }

    return preferred || SPRITE_COLOR_PALETTE[start];
}

function reassignAutoSpriteColors() {
    const used = new Set();
    const names = Object.keys(sprites || {});

    for (const name of names) {
        const sprite = sprites[name];
        if (!sprite || !sprite.colorLocked) continue;
        used.add(normalizeColor(sprite.color));
    }

    for (const name of names) {
        const sprite = sprites[name];
        if (!sprite || sprite.colorLocked) continue;
        const color = pickDistinctColorFromUsed(name, used);
        sprite.color = normalizeColor(color, pickDistinctColor(name));
        used.add(sprite.color);
    }
}

function buildLitMap(renderables = getRenderableSprites()) {
    const lit = {};
    for (const { sprite, visual } of renderables) {
        if (!sprite || !visual?.visible || visual.opacity <= 0) continue;
        const col = Math.round(Number(sprite.x) || 0);
        const row = Math.round(Number(sprite.y) || 0);
        const renderSize = getSpriteRenderSize(sprite);
        const w = renderSize.width;
        const h = renderSize.height;
        const color = normalizeRenderableColor(sprite.color, visual.opacity);
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const c = col + dx;
                const r = row + dy;
                if (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) {
                    lit[c + ',' + r] = color;
                }
            }
        }
    }
    for (const [key, color] of Object.entries(pixelGrid || {})) {
        lit[key] = color;
    }
    return lit;
}

function drawLed(x, y, w, h, radius, color) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

function getGridPointFromClient(clientX, clientY) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Number(rect.width) || 1);
    const height = Math.max(1, Number(rect.height) || 1);
    const relX = (Number(clientX) - rect.left) / width;
    const relY = (Number(clientY) - rect.top) / height;
    const gx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(relX * GRID_COLS)));
    const gy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(relY * GRID_ROWS)));
    return { x: gx, y: gy };
}

function pollGamepadState() {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
        gamepadState = { axes: [], buttons: [] };
        return;
    }
    const pads = navigator.getGamepads() || [];
    let active = null;
    for (const pad of pads) {
        if (pad) {
            active = pad;
            break;
        }
    }
    if (!active) {
        gamepadState = { axes: [], buttons: [] };
        return;
    }
    gamepadState = {
        axes: Array.from(active.axes || []).map(value => Number.isFinite(Number(value)) ? Number(value) : 0),
        buttons: Array.from(active.buttons || []).map(button => Boolean(button?.pressed || Number(button?.value) > 0.5)),
    };
}

function drawHudOverlay(cw, ch) {
    ctx.save();

    if (hudInlineOverlay === true) {
        const metricEntries = getHudMetricEntries();
        const lines = [];
        if (hudText) lines.push(String(hudText));
        for (const entry of metricEntries) {
            lines.push(entry.label + ': ' + entry.value);
        }

        if (lines.length > 0) {
            ctx.font = '600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
            ctx.textBaseline = 'top';
            const lineHeight = 15;
            const panelHeight = lines.length * lineHeight + 10;
            const panelWidth = 180;
            ctx.fillStyle = 'rgba(8, 10, 18, 0.68)';
            ctx.fillRect(6, 6, panelWidth, panelHeight);
            ctx.fillStyle = '#d7ebff';
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], 12, 10 + i * lineHeight);
            }

            const hasHealth = metricEntries.some(entry => entry.key === 'health');
            if (hasHealth) {
                const barX = 12;
                const barY = 10 + (lines.length - 1) * lineHeight + 2;
                const barW = 140;
                const barH = 7;
                const health = Math.max(0, Math.min(100, Number(hudHealth) || 0));
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.fillRect(barX, barY + 14, barW, barH);
                ctx.fillStyle = health > 50 ? '#39d98a' : health > 20 ? '#ffd166' : '#ff6b6b';
                ctx.fillRect(barX, barY + 14, Math.round(barW * (health / 100)), barH);
            }
        }
    }

    if (hudShowStatus !== false && isPaused) {
        ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
        ctx.fillRect(cw / 2 - 90, ch / 2 - 44, 180, 32);
        ctx.fillStyle = '#ffe082';
        ctx.textAlign = 'center';
        ctx.font = '700 18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText('Paused', cw / 2, ch / 2 - 37);
    }

    if (hudShowStatus !== false && (gameStatus === STATUS_GAME_OVER || gameStatus === STATUS_WON)) {
        const msg = gameStatus === STATUS_GAME_OVER ? String(hudGameOverText || DEFAULT_GAME_OVER_TEXT) : String(hudWinText || DEFAULT_WIN_TEXT);
        ctx.fillStyle = 'rgba(8, 10, 18, 0.80)';
        ctx.fillRect(cw / 2 - 140, ch / 2 - 22, 280, 44);
        ctx.fillStyle = gameStatus === STATUS_GAME_OVER ? '#ff9aa2' : '#b9f6ca';
        ctx.textAlign = 'center';
        ctx.font = '700 20px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText(msg, cw / 2, ch / 2 - 12);
    }
    ctx.restore();
}

function loop() {
    const now = performance.now();
    const frameDuration = lastFrameTime ? now - lastFrameTime : 0;
    lastFrameTime = now;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const cellW = cw / GRID_COLS;
    const cellH = ch / GRID_ROWS;
    const gapX = cellW * CELL_GAP_RATIO;
    const gapY = cellH * CELL_GAP_RATIO;
    const ledW = cellW - gapX;
    const ledH = cellH - gapY;
    const radius = Math.min(ledW, ledH) * LED_RADIUS_RATIO;

    const renderables = getRenderableSprites();
    const lit = buildLitMap(renderables);

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const x = col * cellW + gapX / 2;
            const y = row * cellH + gapY / 2;
            const key = `${col},${row}`;
            const color = lit[key] || UNLIT_COLOR;
            drawLed(x, y, ledW, ledH, radius, color);

            if (lit[key]) {
                ctx.save();
                ctx.shadowColor = lit[key];
                ctx.shadowBlur = Math.min(ledW, ledH) * 0.5;
                drawLed(x, y, ledW, ledH, radius, lit[key]);
                ctx.restore();
            }
        }
    }

    pollGamepadState();

    let tickDurationMs = 0;
    if (!isPaused && now - lastTickTime >= tickIntervalMs) {
        const tickStart = performance.now();
        lastTickTime = now;
        engineTickCount += 1;
        if (gameStatus === STATUS_RUNNING) {
            hudTimer = Math.max(0, Number(hudTimer) + (tickIntervalMs / 1000));
        }
        runScheduledTickHandlers();
        for (const fn of tickHandlers) invokeUserCallback(fn);
        for (const sprite of Object.values(sprites || {})) {
            ensureSpriteState(sprite);
            applyMotionToSprite(sprite);
            advanceSpriteAnimation(sprite, tickIntervalMs);
        }
        processSpriteCollisions();
        tickDurationMs = performance.now() - tickStart;
    }

    drawSpriteImages(renderables, cellW, cellH, gapX, gapY);
    drawHudOverlay(cw, ch);
    emitState();
    emitPerf(now, frameDuration, tickDurationMs);

    rafId = requestAnimationFrame(loop);
}

export function stopEngine() {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    if (keydownListener) {
        window.removeEventListener('keydown', keydownListener, { capture: true });
        keydownListener = null;
    }
    if (keyupListener) {
        window.removeEventListener('keyup', keyupListener, { capture: true });
        keyupListener = null;
    }
    if (blurListener) {
        window.removeEventListener('blur', blurListener);
        blurListener = null;
    }
    if (visibilityListener) {
        document.removeEventListener('visibilitychange', visibilityListener);
        visibilityListener = null;
    }
    if (canvas && pointerMoveListener) {
        canvas.removeEventListener('pointermove', pointerMoveListener);
        pointerMoveListener = null;
    }
    if (canvas && pointerDownListener) {
        canvas.removeEventListener('pointerdown', pointerDownListener);
        pointerDownListener = null;
    }
    if (pointerUpListener) {
        window.removeEventListener('pointerup', pointerUpListener);
        pointerUpListener = null;
    }
    if (canvas && touchStartListener) {
        canvas.removeEventListener('touchstart', touchStartListener);
        touchStartListener = null;
    }
    if (canvas && touchMoveListener) {
        canvas.removeEventListener('touchmove', touchMoveListener);
        touchMoveListener = null;
    }
    if (touchEndListener) {
        window.removeEventListener('touchend', touchEndListener);
        touchEndListener = null;
    }
}

export function resetEngine(canvasNode, options = {}) {
    stopEngine();
    setEngineListeners(options);

    canvas = canvasNode;
    ctx = canvas.getContext('2d');
    sprites = {};
    keys = new Set();
    tickHandlers = [];
    keyHandlers = {};
    keyupHandlers = {};
    currentBlockId = null;
    lastTickTime = 0;
    lastFrameTime = 0;
    lastPerfEmitTime = 0;
    setTickRateValue(DEFAULT_TICK_RATE);
    gameScore = 0;
    gameStatus = STATUS_RUNNING;
    rngState = null;
    spriteGroups = {};
    pixelGrid = {};
    spriteSpawnCounters = {};
    spriteCollisionHandlers = [];
    spriteGroupCollisionHandlers = [];
    activeCollisionPairs = new Set();
    scheduledEveryTicks = [];
    scheduledAfterTicks = [];
    engineTickCount = 0;
    customStats = {};
    resetExecutionBudget();
    imageAssetCache.clear();
    mouseClickHandlers = [];
    touchStartHandlers = [];
    mouseState = { x: 0, y: 0, down: false };
    touchState = { x: 0, y: 0, down: false };
    gamepadState = { axes: [], buttons: [] };
    sceneHandlers = {};
    currentScene = 'default';
    isPaused = false;
    hudText = DEFAULT_HUD_TEXT;
    hudLives = DEFAULT_LIVES;
    hudTimer = DEFAULT_TIMER_SECONDS;
    hudHealth = DEFAULT_HEALTH;
    hudShowScore = true;
    hudShowStatus = true;
    hudGameOverText = DEFAULT_GAME_OVER_TEXT;
    hudWinText = DEFAULT_WIN_TEXT;
    hudMetricOrder = [...DEFAULT_HUD_METRIC_ORDER];
    hudMetricVisibility = { ...DEFAULT_HUD_METRIC_VISIBILITY };
    hudMetricLabels = { ...DEFAULT_HUD_METRIC_LABELS };
    hudInlineOverlay = false;

    const PREVENT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);

    const clearPressedKeys = () => {
        if (!keys?.size) return;
        keys.clear();
        emitState();
    };

    keydownListener = (e) => {
        const key = normalizeKeyAlias(e.key);
        if (!IGNORED_DEBUG_KEYS.has(key)) keys.add(key);
        /* Only prevent default scrolling/page behaviour when focus is NOT
           inside a text-entry element (textarea, input, contenteditable). */
        const tag = e.target?.tagName;
        const isTextEntry = tag === 'TEXTAREA' || tag === 'INPUT' || e.target?.isContentEditable;
        if (PREVENT_KEYS.has(key) && !isTextEntry) e.preventDefault();
        const handlers = keyHandlers[key];
        if (handlers?.length) {
            handlers.forEach(fn => invokeUserCallback(fn));
        }
    };
    keyupListener = (e) => {
        const key = normalizeKeyAlias(e.key);
        keys.delete(key);
        const handlers = keyupHandlers[key];
        if (handlers?.length) {
            handlers.forEach(fn => invokeUserCallback(fn));
        }
    };
    blurListener = () => clearPressedKeys();
    visibilityListener = () => {
        if (document.hidden) clearPressedKeys();
    };

    window.addEventListener('keydown', keydownListener, { capture: true });
    window.addEventListener('keyup', keyupListener, { capture: true });
    window.addEventListener('blur', blurListener);
    document.addEventListener('visibilitychange', visibilityListener);

    pointerMoveListener = (e) => {
        const point = getGridPointFromClient(e.clientX, e.clientY);
        mouseState.x = point.x;
        mouseState.y = point.y;
    };
    pointerDownListener = (e) => {
        const point = getGridPointFromClient(e.clientX, e.clientY);
        mouseState.x = point.x;
        mouseState.y = point.y;
        mouseState.down = true;
        if (e.pointerType === 'touch') {
            touchState.x = point.x;
            touchState.y = point.y;
            touchState.down = true;
            for (const fn of touchStartHandlers) invokeUserCallback(fn, point.x, point.y);
        } else {
            for (const fn of mouseClickHandlers) invokeUserCallback(fn, point.x, point.y);
        }
        emitState();
    };
    pointerUpListener = (e) => {
        mouseState.down = false;
        if (e.pointerType === 'touch') touchState.down = false;
        emitState();
    };
    canvas.addEventListener('pointermove', pointerMoveListener);
    canvas.addEventListener('pointerdown', pointerDownListener);
    window.addEventListener('pointerup', pointerUpListener);

    touchStartListener = (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        const point = getGridPointFromClient(t.clientX, t.clientY);
        touchState.x = point.x;
        touchState.y = point.y;
        touchState.down = true;
        for (const fn of touchStartHandlers) invokeUserCallback(fn, point.x, point.y);
        emitState();
    };
    touchMoveListener = (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        const point = getGridPointFromClient(t.clientX, t.clientY);
        touchState.x = point.x;
        touchState.y = point.y;
    };
    touchEndListener = () => {
        touchState.down = false;
        emitState();
    };
    canvas.addEventListener('touchstart', touchStartListener, { passive: true });
    canvas.addEventListener('touchmove', touchMoveListener, { passive: true });
    window.addEventListener('touchend', touchEndListener, { passive: true });

    window.Engine = {
        __markBlock(blockId) {
            currentBlockId = blockId;
        },
        __checkExecutionBudget(blockId) {
            checkExecutionBudget(blockId);
        },
        createSprite(name, x, y, group = '') {
            const safeName = String(name || 'sprite').trim() || 'sprite';
            const existing = sprites[safeName];
            const sprite = {
                x: Math.round(Number(x) || 0),
                y: Math.round(Number(y) || 0),
                width: Math.max(1, Math.round(Number(existing?.width) || 1)),
                height: Math.max(1, Math.round(Number(existing?.height) || 1)),
                colorLocked: Boolean(existing?.colorLocked),
                color: normalizeColor(existing?.color, pickDistinctColor(safeName, safeName)),
                motion: existing?.motion ? { ...existing.motion } : undefined,
                collision: existing?.collision ? { ...existing.collision, mask: [...normalizeCollisionMask(existing.collision.mask)] } : undefined,
                visual: cloneSpriteState(existing?.visual),
            };
            if (!sprite.colorLocked) {
                sprite.color = pickDistinctColor(safeName, safeName);
            }
            clampSpritePosition(sprite);
            ensureSpriteState(sprite);
            sprites[safeName] = sprite;
            if (group) addSpriteToGroup(safeName, group);
            reassignAutoSpriteColors();
            emitState();
            return safeName;
        },
        spawnSprite(baseName, x, y, group = '') {
            const spawnName = generateSpawnName(baseName || 'sprite');
            this.createSprite(spawnName, x, y, group);
            return spawnName;
        },
        cloneSprite(sourceName, cloneName = '', x = null, y = null, group = '') {
            const source = sprites[sourceName];
            if (!source) return null;
            let target = String(cloneName || '').trim();
            if (!target) {
                target = generateSpawnName(sourceName + '_clone');
            } else if (sprites[target]) {
                target = generateSpawnName(target);
            }
            const clone = {
                ...source,
                x: Number.isFinite(Number(x)) ? Number(x) : Number(source.x),
                y: Number.isFinite(Number(y)) ? Number(y) : Number(source.y),
                motion: source.motion ? { ...source.motion } : undefined,
                collision: source.collision ? { ...source.collision, mask: [...normalizeCollisionMask(source.collision.mask)] } : undefined,
                visual: cloneSpriteState(source.visual),
            };
            clampSpritePosition(clone);
            ensureSpriteState(clone);
            sprites[target] = clone;
            if (group) addSpriteToGroup(target, group);
            reassignAutoSpriteColors();
            emitState();
            return target;
        },
        addToGroup(name, group) {
            if (!sprites[name]) return false;
            const added = addSpriteToGroup(name, group);
            if (added) emitState();
            return added;
        },
        removeFromGroup(name, group) {
            const removed = removeSpriteFromGroup(name, group);
            if (removed) emitState();
            return removed;
        },
        getGroupMembers(group) {
            return getGroupMembers(group);
        },
        forEachInGroup(group, fn) {
            if (typeof fn !== 'function') return 0;
            const members = getGroupMembers(group);
            for (let i = 0; i < members.length; i++) {
                invokeUserCallback(fn, members[i], i);
            }
            return members.length;
        },
        groupCount(group) {
            return getGroupMembers(group).length;
        },
        deleteGroup(group) {
            const normalized = normalizeGroupName(group);
            if (!normalized || !spriteGroups[normalized]) return false;
            delete spriteGroups[normalized];
            emitState();
            return true;
        },
        touchingGroup(name, group) {
            const sprite = sprites[name];
            if (!sprite) return false;
            for (const otherName of getGroupMembers(group)) {
                if (otherName === name) continue;
                if (spritesOverlap(sprite, sprites[otherName])) return true;
            }
            return false;
        },
        setCollisionLayer(name, layer) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureCollisionState(sprite).layer = normalizeCollisionLayer(layer);
            emitState();
            return true;
        },
        setCollisionMask(name, mask) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureCollisionState(sprite).mask = normalizeCollisionMask(mask);
            emitState();
            return true;
        },
        setCollisionResponse(name, response) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureCollisionState(sprite).response = normalizeCollisionResponse(response);
            emitState();
            return true;
        },
        onCollide(nameA, nameB, fn, phase = COLLISION_PHASE_ENTER) {
            if (typeof fn !== 'function') return;
            spriteCollisionHandlers.push({
                a: String(nameA || ''),
                b: String(nameB || ''),
                phase: normalizeCollisionPhase(phase, COLLISION_PHASE_ENTER),
                fn,
            });
        },
        onCollideEnter(nameA, nameB, fn) {
            this.onCollide(nameA, nameB, fn, COLLISION_PHASE_ENTER);
        },
        onCollideStay(nameA, nameB, fn) {
            this.onCollide(nameA, nameB, fn, COLLISION_PHASE_STAY);
        },
        onCollideExit(nameA, nameB, fn) {
            this.onCollide(nameA, nameB, fn, COLLISION_PHASE_EXIT);
        },
        onCollideGroup(name, group, fn, phase = COLLISION_PHASE_ENTER) {
            if (typeof fn !== 'function') return;
            spriteGroupCollisionHandlers.push({
                name: String(name || ''),
                group: normalizeGroupName(group),
                phase: normalizeCollisionPhase(phase, COLLISION_PHASE_ENTER),
                fn,
            });
        },
        onCollideGroupEnter(name, group, fn) {
            this.onCollideGroup(name, group, fn, COLLISION_PHASE_ENTER);
        },
        onCollideGroupStay(name, group, fn) {
            this.onCollideGroup(name, group, fn, COLLISION_PHASE_STAY);
        },
        onCollideGroupExit(name, group, fn) {
            this.onCollideGroup(name, group, fn, COLLISION_PHASE_EXIT);
        },
        showSprite(name) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureVisualState(sprite).visible = true;
            emitState();
            return true;
        },
        hideSprite(name) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureVisualState(sprite).visible = false;
            emitState();
            return true;
        },
        setVisible(name, visible) {
            return visible ? this.showSprite(name) : this.hideSprite(name);
        },
        setOpacity(name, opacity) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureVisualState(sprite).opacity = normalizeOpacity(opacity);
            emitState();
            return true;
        },
        setRotation(name, rotation) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureVisualState(sprite).rotation = Number.isFinite(Number(rotation)) ? Number(rotation) : 0;
            emitState();
            return true;
        },
        setScale(name, scaleX, scaleY = scaleX) {
            const sprite = sprites[name];
            if (!sprite) return false;
            const visual = ensureVisualState(sprite);
            visual.scaleX = normalizeScale(scaleX);
            visual.scaleY = normalizeScale(scaleY);
            emitState();
            return true;
        },
        setZIndex(name, zIndex) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureVisualState(sprite).zIndex = toRoundedInt(zIndex, 0);
            emitState();
            return true;
        },
        setImage(name, src) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureVisualState(sprite).image = String(src || '').trim();
            emitState();
            return true;
        },
        setSpriteSheet(name, src, cols = 1, rows = 1) {
            const sprite = sprites[name];
            if (!sprite) return false;
            const visual = ensureVisualState(sprite);
            visual.spriteSheet = {
                src: String(src || '').trim(),
                cols: Math.max(1, toRoundedInt(cols, 1)),
                rows: Math.max(1, toRoundedInt(rows, 1)),
            };
            visual.animation.currentFrame = 0;
            emitState();
            return true;
        },
        defineAnimation(name, stateName, startFrame, endFrame, fps = 8, loop = true) {
            const sprite = sprites[name];
            if (!sprite) return false;
            const visual = ensureVisualState(sprite);
            const key = String(stateName || '').trim();
            if (!key) return false;
            const start = Math.max(0, toRoundedInt(startFrame, 0));
            const end = Math.max(start, toRoundedInt(endFrame, start));
            visual.animation.states[key] = {
                start,
                end,
                fps: Math.max(1, Number(fps) || 8),
                loop: loop !== false,
            };
            emitState();
            return true;
        },
        playAnimation(name, stateName = '') {
            const sprite = sprites[name];
            if (!sprite) return false;
            const visual = ensureVisualState(sprite);
            const requested = String(stateName || '').trim();
            if (requested) visual.animation.currentState = requested;
            const state = visual.animation.states?.[visual.animation.currentState];
            if (!state) return false;
            visual.animation.currentFrame = Math.max(0, toRoundedInt(state.start, 0));
            visual.animation.elapsedMs = 0;
            visual.animation.playing = true;
            emitState();
            return true;
        },
        stopAnimation(name) {
            const sprite = sprites[name];
            if (!sprite) return false;
            ensureVisualState(sprite).animation.playing = false;
            emitState();
            return true;
        },
        getAnimationState(name) {
            const sprite = sprites[name];
            if (!sprite) return '';
            return String(ensureVisualState(sprite).animation.currentState || '');
        },
        moveBy(name, dx, dy) {
            const s = sprites[name];
            if (!s) return;
            s.x += Math.round(Number(dx) || 0);
            s.y += Math.round(Number(dy) || 0);
            applyBoundsModeToSprite(s);
            emitState();
        },
        setXY(name, x, y) {
            const s = sprites[name];
            if (!s) return;
            s.x = Math.round(Number(x) || 0);
            s.y = Math.round(Number(y) || 0);
            applyBoundsModeToSprite(s);
            emitState();
        },
        setColor(name, color) {
            const s = sprites[name];
            if (!s) return;
            s.color = normalizeColor(color, s.color || pickDistinctColor(name, name));
            s.colorLocked = true;
            reassignAutoSpriteColors();
            emitState();
        },
        setPixel(x, y, color = '#ffd54f') {
            const col = toRoundedInt(x, 0);
            const row = toRoundedInt(y, 0);
            if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
            const key = `${col},${row}`;
            const text = String(color ?? '').trim().toLowerCase();
            if (!text || ['off', 'clear', 'transparent', 'none'].includes(text)) {
                delete pixelGrid[key];
            } else {
                pixelGrid[key] = normalizeColor(color, '#ffd54f');
            }
            emitState();
            return true;
        },
        setSize(name, width, height = width) {
            const s = sprites[name];
            if (!s) return;
            s.width = Math.max(1, toRoundedInt(width, 1));
            s.height = Math.max(1, toRoundedInt(height, s.width));
            applyBoundsModeToSprite(s);
            emitState();
        },
        setLayer(name, layer) {
            return this.setCollisionLayer(name, layer);
        },
        setMask(name, mask) {
            return this.setCollisionMask(name, mask);
        },
        keepInBounds(name, mode = BOUNDS_MODE_CLAMP) {
            const sprite = sprites[name];
            if (!sprite) return false;
            const motion = ensureMotionState(sprite);
            motion.boundsMode = normalizeBoundsMode(mode);
            applyBoundsModeToSprite(sprite);
            emitState();
            return motion.boundsMode;
        },
        setVelocity(name, vx, vy) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            m.vx = Number.isFinite(Number(vx)) ? Number(vx) : m.vx;
            m.vy = Number.isFinite(Number(vy)) ? Number(vy) : m.vy;
            emitState();
        },
        setVelocityX(name, vx) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            m.vx = Number.isFinite(Number(vx)) ? Number(vx) : m.vx;
            emitState();
        },
        setVelocityY(name, vy) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            m.vy = Number.isFinite(Number(vy)) ? Number(vy) : m.vy;
            emitState();
        },
        changeVelocity(name, dvx, dvy) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            m.vx += Number.isFinite(Number(dvx)) ? Number(dvx) : 0;
            m.vy += Number.isFinite(Number(dvy)) ? Number(dvy) : 0;
            emitState();
        },
        changeVelocityX(name, dvx) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            m.vx += Number.isFinite(Number(dvx)) ? Number(dvx) : 0;
            emitState();
        },
        changeVelocityY(name, dvy) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            m.vy += Number.isFinite(Number(dvy)) ? Number(dvy) : 0;
            emitState();
        },
        getVelocityX(name) {
            const m = ensureMotionStateByName(name);
            return m ? Number(m.vx || 0) : 0;
        },
        getVelocityY(name) {
            const m = ensureMotionStateByName(name);
            return m ? Number(m.vy || 0) : 0;
        },
        setAcceleration(name, ax, ay) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            m.ax = Number.isFinite(Number(ax)) ? Number(ax) : m.ax;
            m.ay = Number.isFinite(Number(ay)) ? Number(ay) : m.ay;
            emitState();
        },
        setGravity(name, gravity) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            m.gravity = Number.isFinite(Number(gravity)) ? Number(gravity) : m.gravity;
            emitState();
        },
        setFriction(name, friction) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            if (Number.isFinite(Number(friction))) {
                m.friction = Math.min(1, Math.max(0, Number(friction)));
            }
            emitState();
        },
        setJumpPower(name, jumpPower) {
            const m = ensureMotionStateByName(name);
            if (!m) return;
            if (Number.isFinite(Number(jumpPower))) {
                m.jumpPower = Math.abs(Number(jumpPower));
            }
            emitState();
        },
        jump(name, jumpPower = null) {
            const m = ensureMotionStateByName(name);
            if (!m) return false;
            if (!m.onGround) return false;
            const power = Number.isFinite(Number(jumpPower))
                ? Math.abs(Number(jumpPower))
                : Math.abs(Number(m.jumpPower) || DEFAULT_JUMP_POWER);
            m.vy = -power;
            m.onGround = false;
            emitState();
            return true;
        },
        deleteSprite(name) {
            if (typeof name !== 'string') return;
            delete sprites[name];
            removeSpriteFromAllGroups(name);
            activeCollisionPairs = new Set(Array.from(activeCollisionPairs).filter(key => !key.includes(name + '::') && !key.includes('::' + name)));
            reassignAutoSpriteColors();
            emitState();
        },
        setTickRate(rate) {
            const next = setTickRateValue(rate);
            emitState();
            return next;
        },
        changeTickRate(delta) {
            const next = setTickRateValue((tickRate || DEFAULT_TICK_RATE) + Number(delta || 0));
            emitState();
            return next;
        },
        getTickRate() {
            return Math.round(Number(tickRate) || DEFAULT_TICK_RATE);
        },
        setRandomSeed(seed) {
            rngState = normalizeSeed(seed);
            return rngState;
        },
        clearRandomSeed() {
            rngState = null;
        },
        getRandomSeed() {
            return rngState;
        },
        randomInt(min, max) {
            return randomInt(min, max);
        },
        randomX() {
            return randomInt(0, GRID_COLS - 1);
        },
        randomY() {
            return randomInt(0, GRID_ROWS - 1);
        },
        chance(percent = 50) {
            const value = Number(percent);
            if (!Number.isFinite(value)) return false;
            const clamped = Math.max(0, Math.min(100, value));
            return seededRandom() * 100 < clamped;
        },
        randomGroupMember(group) {
            const members = getGroupMembers(group);
            if (!members.length) return '';
            const index = randomInt(0, members.length - 1);
            return members[index] || '';
        },
        findSafeSpawn(options = {}) {
            const width = Math.max(1, toRoundedInt(options?.width, 1));
            const height = Math.max(1, toRoundedInt(options?.height, 1));
            return findSafeSpawnPosition(width, height, options);
        },
        respawnSprite(name, options = {}) {
            const s = sprites[name];
            if (!s) return null;
            const cfg = {
                ...options,
                excludeNames: [...normalizeSpriteNameList(options?.excludeNames), name],
            };
            const spawn = findSafeSpawnPosition(s.width || 1, s.height || 1, cfg);
            if (!spawn) return null;
            s.x = spawn.x;
            s.y = spawn.y;
            clampSpritePosition(s);
            emitState();
            return { x: s.x, y: s.y };
        },
        setScore(value) {
            gameScore = Math.round(Number(value) || 0);
            emitState();
            return gameScore;
        },
        addScore(delta) {
            gameScore = Math.round(Number(gameScore) || 0) + Math.round(Number(delta) || 0);
            emitState();
            return gameScore;
        },
        getScore() {
            return Math.round(Number(gameScore) || 0);
        },
        setStat(key, value) {
            const k = String(key || '').trim();
            if (!k) return null;
            customStats[k] = value;
            emitState();
            return customStats[k];
        },
        getStat(key, fallback = 0) {
            const k = String(key || '').trim();
            if (!k) return fallback;
            return Object.prototype.hasOwnProperty.call(customStats, k) ? customStats[k] : fallback;
        },
        setHudText(text) {
            hudText = String(text ?? '');
            emitState();
            return hudText;
        },
        setLives(value) {
            hudLives = Math.round(Number(value) || 0);
            emitState();
            return hudLives;
        },
        addLives(delta) {
            hudLives = Math.round(Number(hudLives) || 0) + Math.round(Number(delta) || 0);
            emitState();
            return hudLives;
        },
        getLives() {
            return Math.round(Number(hudLives) || 0);
        },
        setTimer(value) {
            hudTimer = Math.max(0, Number(value) || 0);
            emitState();
            return hudTimer;
        },
        addTimer(delta) {
            hudTimer = Math.max(0, Number(hudTimer) + (Number(delta) || 0));
            emitState();
            return hudTimer;
        },
        getTimer() {
            return Number(hudTimer) || 0;
        },
        setHealth(value) {
            hudHealth = Math.max(0, Math.min(100, Number(value) || 0));
            emitState();
            return hudHealth;
        },
        addHealth(delta) {
            hudHealth = Math.max(0, Math.min(100, Number(hudHealth) + (Number(delta) || 0)));
            emitState();
            return hudHealth;
        },
        getHealth() {
            return Math.max(0, Math.min(100, Number(hudHealth) || 0));
        },
        setScoreOverlayVisible(visible) {
            hudShowScore = visible !== false;
            emitState();
            return hudShowScore;
        },
        setStatusOverlayVisible(visible) {
            hudShowStatus = visible !== false;
            emitState();
            return hudShowStatus;
        },
        setHudMetricVisible(metric, visible = true) {
            const key = normalizeHudMetricName(metric);
            if (!key) return false;
            hudMetricVisibility[key] = visible !== false;
            emitState();
            return hudMetricVisibility[key];
        },
        setHudMetricLabel(metric, label) {
            const key = normalizeHudMetricName(metric);
            if (!key) return '';
            hudMetricLabels[key] = String(label || '').trim() || DEFAULT_HUD_METRIC_LABELS[key];
            emitState();
            return hudMetricLabels[key];
        },
        setHudOrder(order) {
            hudMetricOrder = normalizeHudMetricOrder(order);
            emitState();
            return [...hudMetricOrder];
        },
        setHudInlineOverlay(visible) {
            hudInlineOverlay = visible === true;
            emitState();
            return hudInlineOverlay;
        },
        setGameOverText(text) {
            hudGameOverText = String(text || DEFAULT_GAME_OVER_TEXT);
            emitState();
            return hudGameOverText;
        },
        setWinText(text) {
            hudWinText = String(text || DEFAULT_WIN_TEXT);
            emitState();
            return hudWinText;
        },
        registerScene(name, fn) {
            const key = String(name || '').trim();
            if (!key || typeof fn !== 'function') return false;
            sceneHandlers[key] = fn;
            emitState();
            return true;
        },
        loadScene(name) {
            const key = String(name || '').trim();
            if (!key) return false;
            currentScene = key;
            isPaused = false;
            setStatus(STATUS_RUNNING);
            const fn = sceneHandlers[key];
            invokeUserCallback(fn);
            emitState();
            return true;
        },
        restartScene() {
            if (!currentScene) return false;
            const fn = sceneHandlers[currentScene];
            isPaused = false;
            setStatus(STATUS_RUNNING);
            invokeUserCallback(fn);
            emitState();
            return true;
        },
        pause() {
            isPaused = true;
            emitState();
            return true;
        },
        resume() {
            isPaused = false;
            emitState();
            return true;
        },
        isPaused() {
            return isPaused === true;
        },
        getScene() {
            return String(currentScene || '');
        },
        gameOver(message = '') {
            setStatus(STATUS_GAME_OVER, message || hudGameOverText || DEFAULT_GAME_OVER_TEXT);
        },
        winGame(message = '') {
            setStatus(STATUS_WON, message || hudWinText || DEFAULT_WIN_TEXT);
        },
        isGameOver() {
            return gameStatus === STATUS_GAME_OVER;
        },
        isWon() {
            return gameStatus === STATUS_WON;
        },
        getStatus() {
            return gameStatus || STATUS_RUNNING;
        },
        getX(name) {
            const s = sprites[name];
            return s ? Math.round(Number(s.x) || 0) : 0;
        },
        getY(name) {
            const s = sprites[name];
            return s ? Math.round(Number(s.y) || 0) : 0;
        },
        touching(nameA, nameB) {
            const a = sprites[nameA];
            const b = sprites[nameB];
            if (!a || !b) return false;
            return spritesOverlap(a, b);
        },
        colliding(nameA, nameB) {
            const a = sprites[nameA];
            const b = sprites[nameB];
            if (!a || !b) return false;
            return spritesOverlap(a, b) && shouldSpritesCollideByLayer(a, b);
        },
        spriteExists(name) {
            if (typeof name !== 'string') return false;
            return Object.prototype.hasOwnProperty.call(sprites, name);
        },
        touchingEdge(name) {
            const s = sprites[name];
            if (!s) return false;
            const x = Math.round(Number(s.x) || 0);
            const y = Math.round(Number(s.y) || 0);
            const w = Math.max(1, Math.round(Number(s.width) || 1));
            const h = Math.max(1, Math.round(Number(s.height) || 1));
            const maxX = GRID_COLS - 1;
            const maxY = GRID_ROWS - 1;
            return x <= 0 || y <= 0 || x + w - 1 >= maxX || y + h - 1 >= maxY;
        },
        distanceBetween(nameA, nameB) {
            const a = sprites[nameA];
            const b = sprites[nameB];
            if (!a || !b) return 0;
            return distanceBetweenSprites(a, b);
        },
        moveToward(name, targetName, step = 1, stopDistance = 0) {
            const sprite = sprites[name];
            const target = sprites[targetName];
            if (!sprite || !target) return false;
            const distance = distanceBetweenSprites(sprite, target);
            const stop = Math.max(0, toRoundedInt(stopDistance, 0));
            if (distance <= stop) return true;

            const stepSize = Math.max(1, toRoundedInt(step, 1));
            const dx = toRoundedInt(target.x, 0) - toRoundedInt(sprite.x, 0);
            const dy = toRoundedInt(target.y, 0) - toRoundedInt(sprite.y, 0);

            if (Math.abs(dx) >= Math.abs(dy)) {
                const delta = Math.min(stepSize, Math.abs(dx)) * (dx < 0 ? -1 : 1);
                sprite.x += delta;
            } else {
                const delta = Math.min(stepSize, Math.abs(dy)) * (dy < 0 ? -1 : 1);
                sprite.y += delta;
            }

            applyBoundsModeToSprite(sprite);
            emitState();
            return distanceBetweenSprites(sprite, target) <= stop;
        },
        onTick(fn) {
            if (typeof fn === 'function') tickHandlers.push(fn);
        },
        everyNTicks(interval, fn) {
            const every = Math.max(1, toRoundedInt(interval, 1));
            if (typeof fn !== 'function') return false;
            scheduledEveryTicks.push({ every, nextTick: engineTickCount + every, fn });
            return true;
        },
        afterNTicks(delay, fn) {
            const after = Math.max(1, toRoundedInt(delay, 1));
            if (typeof fn !== 'function') return false;
            scheduledAfterTicks.push({ runAt: engineTickCount + after, fn });
            return true;
        },
        onKey(key, fn) {
            if (typeof fn !== 'function') return;
            const normalizedKey = normalizeKeyAlias(key);
            if (!normalizedKey) return;
            keyHandlers[normalizedKey] = keyHandlers[normalizedKey] || [];
            keyHandlers[normalizedKey].push(fn);
        },
        onKeyUp(key, fn) {
            if (typeof fn !== 'function') return;
            const normalizedKey = normalizeKeyAlias(key);
            if (!normalizedKey) return;
            keyupHandlers[normalizedKey] = keyupHandlers[normalizedKey] || [];
            keyupHandlers[normalizedKey].push(fn);
        },
        onMouseClick(fn) {
            if (typeof fn !== 'function') return;
            mouseClickHandlers.push(fn);
        },
        onTouchStart(fn) {
            if (typeof fn !== 'function') return;
            touchStartHandlers.push(fn);
        },
        getMouseX() {
            return Math.round(Number(mouseState?.x) || 0);
        },
        getMouseY() {
            return Math.round(Number(mouseState?.y) || 0);
        },
        isMouseDown() {
            return Boolean(mouseState?.down);
        },
        getTouchX() {
            return Math.round(Number(touchState?.x) || 0);
        },
        getTouchY() {
            return Math.round(Number(touchState?.y) || 0);
        },
        isTouchDown() {
            return Boolean(touchState?.down);
        },
        isGamepadButtonDown(index = 0) {
            const i = Math.max(0, toRoundedInt(index, 0));
            return Boolean(gamepadState?.buttons?.[i]);
        },
        getGamepadAxis(index = 0) {
            const i = Math.max(0, toRoundedInt(index, 0));
            const value = Number(gamepadState?.axes?.[i]);
            return Number.isFinite(value) ? value : 0;
        },
        isDown(key) {
            const normalizedKey = normalizeKeyAlias(key);
            if (!normalizedKey) return false;
            return keys.has(normalizedKey);
        },
        log(...args) {
            emitLog(...args);
        },
        getState() {
            return getStateSnapshot();
        },
        stop() {
            stopEngine();
        },
        getBounds() {
            return {
                width: GRID_COLS,
                height: GRID_ROWS,
                spriteSize: SPRITE_SIZE,
                maxX: GRID_COLS - 1,
                maxY: GRID_ROWS - 1
            };
        },
        get canvasWidth() { return GRID_COLS; },
        get canvasHeight() { return GRID_ROWS; },
        get spriteSize() { return SPRITE_SIZE; },
        get gridCols() { return GRID_COLS; },
        get gridRows() { return GRID_ROWS; }
    };

    window.GAME_BOUNDS = Object.freeze({
        get width() { return GRID_COLS; },
        get height() { return GRID_ROWS; },
        get spriteSize() { return SPRITE_SIZE; },
        get maxX() { return GRID_COLS - 1; },
        get maxY() { return GRID_ROWS - 1; },
        get gridCols() { return GRID_COLS; },
        get gridRows() { return GRID_ROWS; }
    });

    loop();
}

function validateGeneratedCode(code) {
    const forbiddenPatterns = [
        /\bfetch\s*\(/,
        /\bXMLHttpRequest\b/,
        /\bWebSocket\b/,
        /\blocalStorage\b/,
        /\bsessionStorage\b/,
        /\bdocument\b/,
        /\bwindow\b/,
        /\bFunction\b/,
        /\beval\b/,
        /\bglobalThis\b/,
    ];

    for (const pattern of forbiddenPatterns) {
        if (pattern.test(code)) {
            throw new Error('Blocked unsafe generated code construct.');
        }
    }
}

function executeGeneratedCode(code) {
    validateGeneratedCode(code);
    const runner = new Function(
        'Engine',
        'GAME_BOUNDS',
        `"use strict";
const window = undefined;
const document = undefined;
const globalThis = undefined;
const Function = undefined;
${code}`
    );
    runner(window.Engine, window.GAME_BOUNDS);
}

export function runGeneratedCode(ws, options = {}) {
    javascriptGenerator.STATEMENT_PREFIX = 'Engine.__markBlock(%1);\n';
    const previousInfiniteLoopTrap = javascriptGenerator.INFINITE_LOOP_TRAP;
    javascriptGenerator.INFINITE_LOOP_TRAP = 'Engine.__checkExecutionBudget(%1);\n';
    const code = javascriptGenerator.workspaceToCode(ws);
    const { onLog, onError } = options;

    if (typeof onLog === 'function') {
        logHandler = onLog;
    } else {
        logHandler = null;
    }

    if (releaseConsoleOverride) {
        releaseConsoleOverride();
        releaseConsoleOverride = null;
    }

    if (logHandler) {
        releaseConsoleOverride = overrideConsole();
    }

    try {
        resetExecutionBudget();
        executeGeneratedCode(code);
    } catch (error) {
        const payload = {
            error,
            message: error?.message || String(error),
            blockId: currentBlockId,
        };
        console.error('[Engine] error running generated code', error);
        emitLog('Runtime error:', payload.message);
        if (typeof onError === 'function') onError(payload);
    } finally {
        javascriptGenerator.INFINITE_LOOP_TRAP = previousInfiniteLoopTrap;
    }
}


export const __engineInternals = {
    normalizeKeyAlias,
    normalizeSeed,
    normalizeGroupName,
    normalizeCollisionMask,
    normalizeCollisionResponse,
    normalizeCollisionPhase,
    normalizeBoundsMode,
    spritesOverlap,
    shouldSpritesCollideByLayer,
    distanceBetweenSprites,
};