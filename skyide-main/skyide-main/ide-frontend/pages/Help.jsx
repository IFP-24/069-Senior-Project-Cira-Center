import React from 'react'
import CreateSpriteImg from '../src/assets/create-sprite.png'
import EveryFrameImg from '../src/assets/every-frame.png'
import GameBoundsImg from '../src/assets/game-bounds.png'
import SetPositionImg from '../src/assets/set-position.png'
import KeyPressedImg from '../src/assets/key-pressed.png'
import RepeatImg from '../src/assets/repeat.png'
import IfImg from '../src/assets/if.png'
import ArithmeticImg from '../src/assets/arithmetic.png'
import VariablesImg from '../src/assets/variables.png'
import {
    BLOCK_ROUNDTRIP_GUIDE,
    PYTHON_COMPATIBILITY_GUIDE,
    ROUNDTRIP_MUST_GUARANTEES,
    ROUNDTRIP_SUPPORT_LEVELS,
} from '../lib/editorEnhancements.js'

const quickStartSteps = [
    'Create a sprite for your player. Give it a simple name like "player".',
    'Add an "every frame" block so your game keeps updating.',
    'Use key input blocks (Arrow keys or WASD) to move your player.',
    'Add a goal (like a coin) and use a touching block to detect collection.',
    'Update score/HUD and call win_game() or game_over() when rules are met.',
]

const movementTips = [
    'X moves left/right. Y moves up/down.',
    'Use GAME_BOUNDS["maxX"] and GAME_BOUNDS["maxY"] to keep sprites on screen.',
    'Use move_by("player", dx, dy) for smooth movement in loops.',
    'Use set_position("player", x, y) when teleporting or resetting.',
    'Use set_pixel(x, y, "#ffd54f") when you want to light a single cell without making a sprite.',
]

const spriteCreationTips = [
    'Use create_sprite(...) when you want a named object that you will move, resize, collide with, or reuse later.',
    'Use set_pixel(...) when you only need to light one cell and do not want to manage a sprite name.',
    'Use spawn_sprite(...) for a brand-new 1x1 sprite with a unique generated name. It does not copy size, color, or other settings from another sprite.',
    "Use clone_sprite(...) when you want to copy an existing sprite's size, color, and setup into a new sprite.",
    'To make a prefab/template sprite, create it once, style it, hide it, and keep it. Deleting the template removes the thing clone_sprite(...) needs to copy.',
]

const keyboardGuide = [
    { action: 'Move Left', keys: 'ArrowLeft, left, or A', python: 'key_is_pressed("left") or key_is_pressed("a")' },
    { action: 'Move Right', keys: 'ArrowRight, right, or D', python: 'key_is_pressed("right") or key_is_pressed("d")' },
    { action: 'Move Up', keys: 'ArrowUp, up, or W', python: 'key_is_pressed("up") or key_is_pressed("w")' },
    { action: 'Move Down', keys: 'ArrowDown, down, or S', python: 'key_is_pressed("down") or key_is_pressed("s")' },
    { action: 'Action / Jump', keys: 'Space, " ", or space', python: 'key_is_pressed("space")' },
]

const functionCheatSheet = [
    {
        title: 'Create + Move',
        why: 'Use these in almost every game.',
        code: 'create_sprite("player", 2, 2)\nmove_by("player", 1, 0)\nset_position("player", 5, 8)',
    },
    {
        title: 'Draw One Cell',
        why: 'Fastest way to light a single location without a sprite.',
        code: 'set_pixel(4, 6, "#ffd54f")\nset_pixel(4, 7, "#ff6b6b")\nset_pixel(4, 6, "off")',
    },
    {
        title: 'Game Loop',
        why: 'Put game logic here so it runs continuously.',
        code: 'def on_frame():\n    if key_is_pressed("left") or key_is_pressed("a"):\n        move_by("player", -1, 0)\nregister_frame_handler(on_frame)',
    },
    {
        title: 'Collision + Score',
        why: 'Detect pickups, hits, and goals.',
        code: 'if sprites_touching("player", "coin"):\n    change_score(1)\n    respawn_sprite_safe("coin", "player", 2)',
    },
    {
        title: 'HUD Control',
        why: 'Show only the metrics your game needs.',
        code: 'set_hud_metric_visible("score", True)\nset_hud_metric_visible("timer", False)\nset_hud_order("score,lives")',
    },
    {
        title: 'Win / Lose',
        why: 'Set clear end rules for players.',
        code: 'if get_score() >= 10:\n    win_game()\nif sprites_touching("player", "enemy"):\n    game_over()',
    },
    {
        title: 'Speed + Randomness',
        why: 'Control difficulty and replay value.',
        code: 'set_game_speed(8)\nset_random_seed(42)\ncreate_sprite("coin", random_int(0, GAME_BOUNDS["maxX"]), random_int(0, GAME_BOUNDS["maxY"]))',
    },
    {
        title: 'Template + Clone',
        why: 'Best pattern when you want prefab-like copies.',
        code: 'create_sprite("enemy_seed", 0, 0)\nset_sprite_color("enemy_seed", "#ef5350")\nhide_sprite("enemy_seed")\nclone_sprite("enemy_seed", "enemy_1", 8, 3, "enemies")',
    },
    {
        title: 'Group Loop',
        why: 'Use the loop variable as the current sprite name while you inspect or update a whole group.',
        code: 'for enemy_name in get_group_members("enemies"):\n    move_by(enemy_name, -1, 0)',
    },
]

const blockGuides = [
    {
        category: 'Game Basics',
        blocks: [
            {
                name: 'Create Sprite',
                description: 'Creates a sprite with a name at a starting grid position.',
                example: 'create sprite player at x=2 y=2',
                pythonExample: 'create_sprite("player", 2, 2)',
                imageSrc: CreateSpriteImg,
            },
            {
                name: 'Set Pixel',
                description: 'Lights one grid cell directly without creating a sprite first.',
                example: 'set pixel x=4 y=6 color #ffd54f',
                pythonExample: 'set_pixel(4, 6, "#ffd54f")',
                imageSrc: '',
            },
            {
                name: 'Set Position',
                description: 'Moves a sprite to an exact x/y coordinate.',
                example: 'set player position x=10 y=6',
                pythonExample: 'set_position("player", 10, 6)',
                imageSrc: SetPositionImg,
            },
            {
                name: 'Game Bounds',
                description: 'Gives width, height, maxX, and maxY so you can clamp movement.',
                example: 'if x > game max X then set x to game max X',
                pythonExample: 'if x > GAME_BOUNDS["maxX"]:\n    x = GAME_BOUNDS["maxX"]',
                imageSrc: GameBoundsImg,
            },
            {
                name: 'Delete Sprite',
                description: 'Removes a sprite from the game world.',
                example: 'delete sprite coin',
                pythonExample: 'if sprite_exists("coin"):\n    delete_sprite("coin")',
                imageSrc: '',
            },
        ],
    },
    {
        category: 'Input + Loop',
        blocks: [
            {
                name: 'Every Frame',
                description: 'Runs your update logic over and over while the game is running.',
                example: 'every frame do -> move player',
                pythonExample: 'def on_frame():\n    move_by("player", 1, 0)\nregister_frame_handler(on_frame)',
                imageSrc: EveryFrameImg,
            },
            {
                name: 'Key Pressed?',
                description: 'Checks if a key is currently down (great inside every frame).',
                example: 'if key Left pressed? then move player left',
                pythonExample: 'if key_is_pressed("left") or key_is_pressed("a"):\n    move_by("player", -1, 0)',
                imageSrc: KeyPressedImg,
            },
            {
                name: 'When Key Pressed',
                description: 'Runs once when a key is pressed (good for jump/shoot actions).',
                example: 'when key Space pressed do -> jump',
                pythonExample: 'def on_space():\n    jump("player")\nregister_key_handler("space", on_space)',
                imageSrc: '',
            },
            {
                name: 'When Key Released',
                description: 'Runs when a key is released (good for stop or charge actions).',
                example: 'when key Right released do -> stop moving',
                pythonExample: 'def on_right_up():\n    set_velocity("player", 0, 0)\nregister_key_up_handler("right", on_right_up)',
                imageSrc: '',
            },
        ],
    },
    {
        category: 'Collision + Random Spawns',
        blocks: [
            {
                name: 'Touching?',
                description: 'Returns true when two sprites overlap.',
                example: 'if player touching coin then +1 score',
                pythonExample: 'if sprites_touching("player", "coin"):\n    change_score(1)',
                imageSrc: '',
            },
            {
                name: 'On Collide',
                description: 'Event block that runs automatically when two sprites collide.',
                example: 'on player collide enemy -> game over',
                pythonExample: 'def on_hit():\n    game_over()\nregister_collision_handler("player", "enemy", on_hit)',
                imageSrc: '',
            },
            {
                name: 'Random Integer',
                description: 'Picks a random number between min and max (inclusive).',
                example: 'random int 0 to game max X',
                pythonExample: 'rx = random_int(0, GAME_BOUNDS["maxX"])',
                imageSrc: '',
            },
            {
                name: 'Respawn Safe',
                description: 'Respawns a sprite in a free cell and can keep distance from another sprite.',
                example: 'respawn coin away from player by 2 cells',
                pythonExample: 'respawn_sprite_safe("coin", "player", 2)',
                imageSrc: '',
            },
        ],
    },
    {
        category: 'HUD + Game State',
        blocks: [
            {
                name: 'Set/Change Score',
                description: 'Uses built-in score so your HUD and game logic stay in sync.',
                example: 'set score to 0, then change score by 1',
                pythonExample: 'set_score(0)\nchange_score(1)',
                imageSrc: VariablesImg,
            },
            {
                name: 'Set HUD Metric Visible',
                description: 'Choose which metrics appear for this specific game (score/lives/timer/health).',
                example: 'show score, hide timer and health',
                pythonExample: 'set_hud_metric_visible("score", True)\nset_hud_metric_visible("timer", False)\nset_hud_metric_visible("health", False)',
                imageSrc: '',
            },
            {
                name: 'Set HUD Order',
                description: 'Reorder HUD metrics to match your game style.',
                example: 'score first, then lives',
                pythonExample: 'set_hud_order("score,lives")',
                imageSrc: '',
            },
            {
                name: 'Game Over / Win Game',
                description: 'Ends the game with a loss or win state.',
                example: 'if score >= 10 then win game',
                pythonExample: 'if get_score() >= 10:\n    win_game()',
                imageSrc: '',
            },
        ],
    },
    {
        category: 'Control + Math + Logic',
        blocks: [
            {
                name: 'Repeat / While / For',
                description: 'Loop blocks for repeated behavior and counters.',
                example: 'repeat 10 times -> move enemy',
                pythonExample: 'for i in range(10):\n    move_by("enemy", 1, 0)',
                imageSrc: RepeatImg,
            },
            {
                name: 'If + Compare + Boolean',
                description: 'Decision blocks that run code only when conditions are true.',
                example: 'if score > 5 then show boss',
                pythonExample: 'if get_score() > 5:\n    show_sprite("boss")',
                imageSrc: IfImg,
            },
            {
                name: 'Number + Arithmetic',
                description: 'Use numbers and math operators to update position, speed, and score.',
                example: 'x = x + 1',
                pythonExample: 'x = x + 1\nspeed = speed - 0.2',
                imageSrc: ArithmeticImg,
            },
            {
                name: 'Variables + Functions',
                description: 'Store values and organize reusable code blocks.',
                example: 'set score to 0, create a function for spawning',
                pythonExample: 'score = 0\ndef spawn_coin():\n    create_sprite("coin", 5, 5)',
                imageSrc: VariablesImg,
            },
        ],
    },
]

const miniChallenges = [
    'Coin Collector: Player moves, coin respawns safely, score reaches 10 to win.',
    'Dodge Game: Survive moving enemies for 20 seconds using timer + game over.',
    'Snake Lite: One food at a time, grow on eat, lose if you hit wall or body.',
    'Chase Game: Enemy follows player by comparing x/y each frame.',
]

export default function Help() {
    return (
        <main className='page help'>
            <h1>Help Center</h1>
            <p className='intro'>
                This page is your game-building guide. Start with the quick steps, copy examples,
                and test often in the preview window.
            </p>

            <section className='help-panel'>
                <h2>Start Here</h2>
                <p className='help-panel-intro'>
                    If you are new, follow these in order. You can build your first game in under 10
                    minutes.
                </p>
                <ol className='help-steps'>
                    {quickStartSteps.map(step => (
                        <li key={step}>{step}</li>
                    ))}
                </ol>
            </section>

            <section className='help-panel'>
                <h2>Movement + Grid Tips</h2>
                <ul className='help-bullets'>
                    {movementTips.map(tip => (
                        <li key={tip}>{tip}</li>
                    ))}
                </ul>
            </section>

            <section className='help-panel'>
                <h2>Pixel Vs Sprite Vs Clone</h2>
                <ul className='help-bullets'>
                    {spriteCreationTips.map(tip => (
                        <li key={tip}>{tip}</li>
                    ))}
                </ul>
            </section>

            <section className='help-panel'>
                <h2>Keyboard Quick Reference</h2>
                <p className='help-panel-intro'>
                    Use either arrow keys or words like <code>left</code>. Both styles work.
                </p>
                <div className='help-keyboard-grid'>
                    {keyboardGuide.map(item => (
                        <article key={item.action} className='help-key-row'>
                            <strong>{item.action}</strong>
                            <span>{item.keys}</span>
                            <code>{item.python}</code>
                        </article>
                    ))}
                </div>
            </section>

            <section className='help-panel'>
                <h2>Most Useful Python Functions</h2>
                <p className='help-panel-intro'>
                    These are the functions students use the most while testing game ideas.
                </p>
                <div className='help-function-grid'>
                    {functionCheatSheet.map(item => (
                        <article key={item.title} className='help-function-card'>
                            <h3>{item.title}</h3>
                            <p>{item.why}</p>
                            <pre>
                                <code>{item.code}</code>
                            </pre>
                        </article>
                    ))}
                </div>
            </section>

            <section id='python-support-guide' className='help-panel'>
                <h2>Python Runtime + Blocks Round-Trip Guide</h2>
                <p className='help-panel-intro'>{PYTHON_COMPATIBILITY_GUIDE.intro}</p>

                <ul className='help-bullets'>
                    {PYTHON_COMPATIBILITY_GUIDE.productPromise.map(item => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>

                <p className='help-panel-intro'>
                    Advanced Python game logic can still run in Python mode today. The guidance below
                    distinguishes what is dependable for switching back to blocks, what still runs but
                    has evolving round-trip support, and what is outside the current Python
                    environment entirely.
                </p>

                <div className='help-function-grid'>
                    <article className='help-function-card'>
                        <h3>{ROUNDTRIP_MUST_GUARANTEES.title}</h3>
                        <ul className='help-bullets'>
                            {ROUNDTRIP_MUST_GUARANTEES.items.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>
                </div>

                <div className='help-function-grid'>
                    {ROUNDTRIP_SUPPORT_LEVELS.map(level => (
                        <article key={level.title} className='help-function-card'>
                            <h3>{level.title}</h3>
                            <p>{level.description}</p>
                            <ul className='help-bullets'>
                                {level.examples.map(item => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>

                <div className='help-function-grid'>
                    <article className='help-function-card'>
                        <h3>Write Python This Way</h3>
                        <ul className='help-bullets'>
                            {PYTHON_COMPATIBILITY_GUIDE.writePythonThisWay.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>

                    <article className='help-function-card'>
                        <h3>Round-Trip Checklist</h3>
                        <ul className='help-bullets'>
                            {PYTHON_COMPATIBILITY_GUIDE.roundTripChecklist.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>
                </div>

                <div className='help-function-grid'>
                    <article className='help-function-card'>
                        <h3>Compatible Python Starter Pattern</h3>
                        <p>Use this shape when you want to keep switching between Python and blocks.</p>
                        <pre>
                            <code>{PYTHON_COMPATIBILITY_GUIDE.compatibleTemplate}</code>
                        </pre>
                    </article>

                    <article className='help-function-card'>
                        <h3>Supported API Families</h3>
                        {PYTHON_COMPATIBILITY_GUIDE.supportedApiFamilies.map(item => (
                            <div key={item.title} className='help-stage-section'>
                                <strong>{item.title}</strong>
                                <p>{item.examples.join(', ')}</p>
                            </div>
                        ))}
                    </article>
                </div>

                <div className='help-stage-grid'>
                    {PYTHON_COMPATIBILITY_GUIDE.learningPath.map(stage => (
                        <article
                            key={stage.id}
                            className={`help-stage-card ${stage.conversionStatus === 'supported' ? 'is-supported' : 'is-future'}`}
                        >
                            <div className='help-stage-header'>
                                <h3>{stage.title}</h3>
                                <span className='help-stage-status'>{stage.status}</span>
                            </div>
                            <p>{stage.summary}</p>
                            <div className='help-stage-section'>
                                <strong>Core concepts</strong>
                                <ul className='help-bullets'>
                                    {stage.concepts.map(item => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className='help-stage-section'>
                                <strong>Good fit games</strong>
                                <ul className='help-bullets'>
                                    {stage.games.map(item => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <p className='help-stage-goal'><strong>Goal:</strong> {stage.goal}</p>
                        </article>
                    ))}
                </div>

                <div className='help-function-grid'>
                    <article className='help-function-card'>
                        <h3>Guaranteed Round-Trip Today</h3>
                        <ul className='help-bullets'>
                            {PYTHON_COMPATIBILITY_GUIDE.supportedPatterns.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>

                    <article className='help-function-card'>
                        <h3>Runs in Python, Switching Still Evolving</h3>
                        <ul className='help-bullets'>
                            {PYTHON_COMPATIBILITY_GUIDE.pythonOnlyPatterns.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>

                    <article className='help-function-card'>
                        <h3>Not Supported in This Python Environment</h3>
                        <ul className='help-bullets'>
                            {PYTHON_COMPATIBILITY_GUIDE.notSupportedPatterns.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>
                </div>

                <div className='help-function-grid'>
                    {PYTHON_COMPATIBILITY_GUIDE.rewriteTips.map(item => (
                        <article key={item.title} className='help-function-card'>
                            <h3>{item.title}</h3>
                            <p><strong>Avoid:</strong></p>
                            <pre>
                                <code>{item.before}</code>
                            </pre>
                            <p><strong>Prefer:</strong></p>
                            <pre>
                                <code>{item.after}</code>
                            </pre>
                        </article>
                    ))}
                </div>

                <div className='help-compare-grid'>
                    {PYTHON_COMPATIBILITY_GUIDE.sideBySideExamples.map(item => (
                        <article key={item.title} className='help-compare-card'>
                            <h3>{item.title}</h3>
                            <p>{item.why}</p>
                            <div className='help-compare-columns'>
                                <div className='help-compare-column is-avoid'>
                                    <span className='help-compare-label'>Runs in Python, but switching may drift</span>
                                    <pre>
                                        <code>{item.pythonOnly}</code>
                                    </pre>
                                </div>
                                <div className='help-compare-column is-prefer'>
                                    <span className='help-compare-label'>Block-safe rewrite</span>
                                    <pre>
                                        <code>{item.blockSafe}</code>
                                    </pre>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <ul className='help-bullets'>
                    {PYTHON_COMPATIBILITY_GUIDE.workflowTips.map(item => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </section>

            <section id='blocks-roundtrip-guide' className='help-panel'>
                <h2>Blocks -&gt; Python Round-Trip Guide</h2>
                <p className='help-panel-intro'>{BLOCK_ROUNDTRIP_GUIDE.intro}</p>

                <div className='help-function-grid'>
                    <article className='help-function-card'>
                        <h3>Build Blocks This Way</h3>
                        <ul className='help-bullets'>
                            {BLOCK_ROUNDTRIP_GUIDE.buildBlocksThisWay.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>

                    <article className='help-function-card'>
                        <h3>Round-Trip Checklist</h3>
                        <ul className='help-bullets'>
                            {BLOCK_ROUNDTRIP_GUIDE.roundTripChecklist.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>
                </div>

                <div className='help-function-grid'>
                    <article className='help-function-card'>
                        <h3>Starter Recipe</h3>
                        <ol className='help-steps'>
                            {BLOCK_ROUNDTRIP_GUIDE.starterPatternSteps.map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ol>
                    </article>

                    <article className='help-function-card'>
                        <h3>Supported Block Families</h3>
                        {BLOCK_ROUNDTRIP_GUIDE.supportedBlockFamilies.map(item => (
                            <div key={item.title} className='help-stage-section'>
                                <strong>{item.title}</strong>
                                <p>{item.examples.join(', ')}</p>
                            </div>
                        ))}
                    </article>
                </div>
            </section>

            <section className='block-guides'>
                <h2>Block Guide</h2>
                <p>
                    Each block below includes plain-English behavior plus a Python version so you can
                    learn both ways.
                </p>

                {blockGuides.map(category => (
                    <article key={category.category} className='block-category'>
                        <h3>{category.category}</h3>
                        <ul>
                            {category.blocks.map(block => (
                                <li key={block.name} className='block-guide'>
                                    <header className='block-guide-header'>
                                        <strong>{block.name}</strong>
                                        <span>{block.description}</span>
                                    </header>

                                    <div className='block-example'>Example: {block.example}</div>

                                    <div className='block-guide-examples'>
                                        <div className='block-guide-example'>
                                            <span className='block-guide-label'>Block example</span>

                                            {block.imageSrc ? (
                                                <img
                                                    src={block.imageSrc}
                                                    alt={`${block.name} block`}
                                                    className='block-image'
                                                />
                                            ) : (
                                                <div className='block-image-placeholder'>
                                                    No screenshot yet - use the block name to find it in the toolbox
                                                </div>
                                            )}
                                        </div>

                                        <div className='block-guide-example'>
                                            <span className='block-guide-label'>Python example</span>
                                            <pre className='python-example'>
                                                <code>{block.pythonExample}</code>
                                            </pre>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </section>

            <section className='help-panel'>
                <h2>Try These Mini Challenges</h2>
                <ul className='help-bullets'>
                    {miniChallenges.map(challenge => (
                        <li key={challenge}>{challenge}</li>
                    ))}
                </ul>
            </section>
        </main>
    )
}