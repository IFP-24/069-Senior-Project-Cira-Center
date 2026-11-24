import { getGameTemplateOptions, getGameWorkspaceFixture } from './gameFixtures.js'

const STORAGE_PREFIX = 'skyide:editor';
const MAX_HISTORY = 20;

export const GAME_TEMPLATES = [
    { id: 'blank', label: 'Blank' },
    { id: 'move', label: 'Move Demo' },
    { id: 'collision', label: 'Collision Demo' },
    { id: 'collector', label: 'Collector Demo' },
    ...getGameTemplateOptions(),
];

export const PYTHON_LEARNING_STAGES = [
    {
        id: 'beginner',
        title: 'Stage 1 · Beginner',
        shortLabel: 'Beginner',
        status: 'Safe to switch Blocks <-> Python',
        conversionStatus: 'supported',
        summary: 'Students learn direct, visible cause-and-effect code with flat variables, direct event handlers, simple if logic, and simple movement/collision rules.',
        concepts: [
            'flat variables',
            'direct event handlers',
            'simple if / else',
            'simple movement and collisions',
            'visible cause-and-effect game rules',
        ],
        games: ['collector', 'dodge game', 'reaction game', 'simple pong'],
        goal: 'A student can switch between blocks and Python without changing game behavior.',
    },
    {
        id: 'intermediate',
        title: 'Stage 2 · Intermediate',
        shortLabel: 'Intermediate',
        status: 'Safe to switch Blocks <-> Python',
        conversionStatus: 'supported',
        summary: 'Students learn repeated behavior, richer state over time, and light code organization with loops, boolean logic, zero-argument helpers, timed events, and simple one-dimensional list reads/writes.',
        concepts: [
            'loops',
            'for range loops',
            'boolean logic',
            'zero-argument helpers',
            'timed events',
            'simple one-dimensional list reads/writes',
            'modest stateful games',
        ],
        games: ['breakout', 'snake', 'simple shooter', 'maze chase', 'basic platformer rules'],
        goal: 'Students can keep switching between blocks and Python while building repeated behavior and more stateful arcade rules.',
    },
    {
        id: 'advanced',
        title: 'Stage 3 · Advanced',
        shortLabel: 'Advanced',
        status: 'Runs in Python, switching still evolving',
        conversionStatus: 'evolving',
        summary: 'Advanced code is defined more by structure than by flashy visuals: parameterized helpers, return values, board/grid logic, multiple interacting systems, reusable abstractions, and dynamic data/state models can run in Python mode today.',
        concepts: [
            'parameterized helpers',
            'return values',
            'board/grid logic',
            'multiple interacting systems',
            'reusable abstractions',
            'dynamic data/state models',
        ],
        games: ['advanced snake', 'full tetris', 'grid/tile games', 'inventory systems', 'wave managers'],
        goal: 'Let advanced Python games run while the dependable round-trip subset grows more carefully and students learn that advanced structure is different from simple event scripting.',
    },
];

const PYTHON_RUNTIME_SCOPE_STAGE = {
    id: 'unsupported-runtime',
    title: 'Outside Current Python Scope',
    shortLabel: 'Outside Current Python Scope',
    status: 'Not supported yet',
    conversionStatus: 'blocked',
    summary: 'Import statements and outside libraries are outside the current Python runtime and round-trip scope.',
    concepts: ['import statements', 'outside libraries', 'third-party modules'],
    games: ['library-backed prototypes', 'external-engine experiments'],
    goal: 'Keep the editor educational instead of pretending to support arbitrary Python libraries.',
};

const TEMPLATE_XML = {
    blank: `<xml xmlns="https://developers.google.com/blockly/xml"></xml>`,
    move: `
<xml xmlns="https://developers.google.com/blockly/xml">
	<block type="game_create_sprite" x="24" y="24">
		<field name="NAME">hero</field>
		<value name="X"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
		<value name="Y"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
	</block>
	<block type="game_on_tick" x="24" y="136">
		<statement name="DO">
			<block type="game_change_x">
				<field name="NAME">hero</field>
				<value name="DX"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
			</block>
		</statement>
	</block>
</xml>`,
    collision: `
<xml xmlns="https://developers.google.com/blockly/xml">
	<block type="game_create_sprite" x="24" y="24">
		<field name="NAME">hero</field>
		<value name="X"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
		<value name="Y"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
	</block>
	<block type="game_create_sprite" x="24" y="124">
		<field name="NAME">enemy</field>
		<value name="X"><shadow type="math_number"><field name="NUM">10</field></shadow></value>
		<value name="Y"><shadow type="math_number"><field name="NUM">2</field></shadow></value>
	</block>
	<block type="game_on_tick" x="24" y="240">
		<statement name="DO">
			<block type="game_change_x">
				<field name="NAME">hero</field>
				<value name="DX"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
				<next>
					<block type="controls_if">
						<value name="IF0">
							<block type="game_touching">
								<field name="A">hero</field>
								<field name="B">enemy</field>
							</block>
						</value>
						<statement name="DO0">
							<block type="game_delete_sprite">
								<field name="NAME">enemy</field>
							</block>
						</statement>
					</block>
				</next>
			</block>
		</statement>
	</block>
</xml>`,
    collector: `
<xml xmlns="https://developers.google.com/blockly/xml">
	<block type="game_create_sprite" x="24" y="24">
		<field name="NAME">hero</field>
		<value name="X"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
		<value name="Y"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
	</block>
	<block type="game_create_sprite" x="24" y="120">
		<field name="NAME">coin</field>
		<value name="X"><shadow type="math_number"><field name="NUM">11</field></shadow></value>
		<value name="Y"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
	</block>
	<block type="game_on_tick" x="24" y="220">
		<statement name="DO">
			<block type="controls_if">
				<value name="IF0">
					<block type="game_is_key_pressed"><field name="KEY">ArrowRight</field></block>
				</value>
				<statement name="DO0">
					<block type="game_change_x">
						<field name="NAME">hero</field>
						<value name="DX"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
					</block>
				</statement>
				<next>
					<block type="controls_if">
						<value name="IF0">
							<block type="game_touching">
								<field name="A">hero</field>
								<field name="B">coin</field>
							</block>
						</value>
						<statement name="DO0">
							<block type="game_delete_sprite">
								<field name="NAME">coin</field>
							</block>
						</statement>
					</block>
				</next>
			</block>
		</statement>
	</block>
</xml>`,
};

export const PYTHON_COMPATIBILITY_GUIDE = {
    intro:
        'Python mode can run advanced games beyond the dependable round-trip subset. If you plan to keep switching into blocks, stay inside the guaranteed subset below.',
    productPromise: [
        'Beginner and Intermediate concepts are the guaranteed round-trip path between blocks and Python.',
        'Advanced Python game logic can still run in Python mode, even when switching back to blocks is still evolving.',
        'Import statements and outside libraries are the main advanced patterns that are not supported right now.',
    ],
    writePythonThisWay: [
        'Start with top-level setup code for variables, HUD, and sprite creation.',
        'Keep game state in flat variables like player_x, player_y, score_now, and enemy_alive.',
        'Use zero-argument helper functions such as def reset_player(): and def move_enemy():.',
        'Register events explicitly with supported game APIs like register_key_handler, register_key_up_handler, register_frame_handler, register_collision_handler, register_every_ticks, and register_after_ticks.',
        'Use direct key handlers for one-shot actions like jump, shoot, paddle moves, or menu actions. Use register_frame_handler for repeated updates like enemy motion, bullet travel, gravity, and timers.',
        'Write conditions in simple forms such as if x < 5:, if get_health() <= 0:, if not key_is_pressed("space"):, and if sprites_touching("player", "coin"):.',
        'Keep list usage simple: one-dimensional lists, reads like cells[i], writes like cells[i] = value, index updates like cells[i] += 1, plus append, pop, and len(cells).',
        'Test conversion early. Convert after each feature instead of building a whole Python game first.',
    ],
    compatibleTemplate: `score_now = 0
player_x = 1
player_y = 1

set_score(0)
create_sprite("player", 1, 1)

def move_right():
    player_x = player_x + 1
    set_position("player", player_x, player_y)

def on_frame():
    if get_score() >= 5:
        win_game()

register_key_handler("right", move_right)
register_frame_handler(on_frame)`,
    roundTripChecklist: [
        'Use built-in game API calls instead of custom imports or print-based debugging.',
        'Prefer flat variables over nested data structures.',
        'Prefer zero-argument helpers over parameterized helpers.',
        'Prefer direct assignments over helper return values.',
        'Prefer simple if / else, for range(...), and while loops over advanced Python expressions.',
        'Convert early and check that the generated blocks still look editable.',
    ],
    supportedApiFamilies: [
        {
            title: 'Game setup + sprites',
            examples: ['create_sprite', 'set_pixel', 'delete_sprite', 'set_position', 'move_by', 'set_sprite_color', 'set_sprite_size'],
        },
        {
            title: 'HUD + built-in metrics',
            examples: ['set_score', 'change_score', 'set_health', 'change_health', 'set_lives', 'set_timer', 'set_hud_metric_visible', 'set_hud_metric_label'],
        },
        {
            title: 'Events',
            examples: ['register_key_handler', 'register_key_up_handler', 'register_frame_handler', 'register_collision_handler', 'register_every_ticks', 'register_after_ticks'],
        },
        {
            title: 'Checks + conditions',
            examples: ['key_is_pressed', 'sprites_touching', 'sprite_touching_group', 'sprite_exists', 'get_score', 'get_health', 'get_lives'],
        },
        {
            title: 'Simple randomness + utility',
            examples: ['random_int', 'respawn_sprite_safe', 'win_game', 'game_over', 'show_sprite', 'hide_sprite'],
        },
    ],
    learningPath: PYTHON_LEARNING_STAGES,
    supportedPatterns: [
        'Top-level variable assignments with numbers, strings, booleans, and supported getter calls.',
        'Supported game API calls like create_sprite, set_pixel, move_by, set_score, set_health, register_frame_handler, and collision/HUD helpers.',
        'if / elif / else conditions that compare variables, numbers, supported getter calls, key_is_pressed, sprite_exists, sprites_touching, and sprite_touching_group.',
        'Zero-argument helper functions such as def reset_player(): ... and calls like reset_player().',
        'Simple one-dimensional lists like cells = [1, 2, 3], simple reads like value = cells[0], and simple writes/mutation like cells[0] = value, cells[0] += 1, or cells.append(x).',
        'Event handlers registered with supported APIs like register_key_handler, register_key_up_handler, register_frame_handler, and register_collision_handler.',
    ],
    pythonOnlyPatterns: [
        'Helper functions with parameters, helper return values, and calling helpers that expect arguments.',
        'Dictionaries, tuples, nested data structures, multi-dimensional lists, and collection-heavy logic.',
        'Keyword arguments for game APIs unless the importer explicitly supports that call signature.',
        'Classes, comprehensions, lambdas, recursion, and general-purpose Python features outside the dependable round-trip subset.',
    ],
    notSupportedPatterns: [
        'Import statements like import math or from module import thing.',
        'Outside libraries and third-party modules.',
        'Any Python that depends on a runtime beyond the built-in game API environment.',
    ],
    rewriteTips: [
        {
            title: 'Parameterized helper',
            before: 'def hit_brick(name):',
            after: 'Use zero-arg helpers like def hit_brick1(): and shared variables instead.',
        },
        {
            title: 'Return values',
            before: 'return next_x',
            after: 'Store the result in a variable directly, or keep that helper in Python mode only.',
        },
        {
            title: 'Getter comparisons',
            before: 'if get_health() <= 0:',
            after: 'This is supported now and should import into blocks correctly.',
        },
        {
            title: 'Data structures',
            before: 'cells = [[1, 0], [0, 1]]',
            after: 'Flatten the state into named variables, or keep the game in Python mode only.',
        },
    ],
    sideBySideExamples: [
        {
            title: 'Parameterized helper rewrite',
            pythonOnly: 'def hit_brick(name):\n    delete_sprite(name)\n\nhit_brick("brick1")',
            blockSafe: 'def hit_brick1():\n    delete_sprite("brick1")\n\nhit_brick1()',
            why: 'The importer reliably supports zero-argument helpers, but not helpers with parameters.',
        },
        {
            title: 'Return value rewrite',
            pythonOnly: 'def next_lane():\n    return player_x + 1\n\nplayer_x = next_lane()',
            blockSafe: 'next_lane = player_x + 1\nplayer_x = next_lane',
            why: 'Return values are not currently mapped into Blockly procedures.',
        },
        {
            title: 'Data structure rewrite',
            pythonOnly: 'cells = [[1, 0], [0, 1]]\nnext_x = cells[0][0]',
            blockSafe: 'cell0_x = 1\ncell0_y = 0\ncell1_x = 0\ncell1_y = 1\nnext_x = cell0_x',
            why: 'Simple one-dimensional lists and direct reads/writes are supported, but nested indexing and richer collection-heavy state still do not round-trip reliably.',
        },
        {
            title: 'Supported getter comparison',
            pythonOnly: 'if get_health() <= 0:\n    game_over()',
            blockSafe: 'if get_health() <= 0:\n    game_over()',
            why: 'Direct getter comparisons are supported now and should import cleanly.',
        },
    ],
    workflowTips: [
        'If you want block editing later, convert early and test after each feature.',
        'If the editor shows a Python -> Blocks warning, that code can still run in Python mode unless it also uses unsupported imports or outside libraries.',
        'Beginner and Intermediate are the current target for dependable round-tripping.',
        'Use the Help guide as the source of truth for what will survive Python -> Blocks import.',
    ],
};

export const ROUNDTRIP_MUST_GUARANTEES = {
    title: 'Must Guarantee',
    items: [
        'Blocks -> Python -> Blocks preserves behavior for beginner game projects.',
        'Python -> Blocks -> Python preserves behavior for the documented supported subset.',
        'Core beginner constructs round-trip cleanly: variables, assignment, arithmetic, if / else, for range(...), while, and zero-argument helper functions.',
        'Core game APIs round-trip cleanly: sprite create/delete/move, score/health/lives/timer HUD, key handlers, key-up handlers, frame handlers, collision handlers, and timed handlers.',
        'Unsupported Python does not partially convert silently.',
        'Error messages say what is unsupported and how to rewrite it.',
        'Generated Python stays readable enough for a student to continue editing.',
        'Blocks produced from Python stay editable and do not collapse into broken ast_* leftovers.',
    ],
};

export const ROUNDTRIP_SUPPORT_LEVELS = [
    {
        title: 'Guaranteed round-trip subset',
        description:
            'These patterns are the promise of the editor today: Beginner and Intermediate projects should survive switching between Blocks and Python without semantic drift.',
        examples: [
            'variables, assignment, arithmetic',
            'if / else, for range(...), while',
            'zero-argument helper functions',
            'simple one-dimensional lists, indexed reads/writes, append/pop, and len(list)',
            'key, key-up, frame, collision, and timed handlers',
            'sprite create/delete/move and score/health/lives/timer HUD',
        ],
    },
    {
        title: 'Supported but still evolving',
        description:
            'These patterns are more advanced structurally. They can run in Python mode today, and some may convert well, but switching back to blocks is still evolving and not yet a hard guarantee.',
        examples: [
            'parameterized helpers and helper return values',
            'board/grid logic and nested collection state',
            'group-heavy or scene-heavy game systems',
            'more complex mixed Python + event-heavy game scripts',
        ],
    },
    {
        title: 'Not supported in this Python environment',
        description:
            'These patterns are outside the current Python runtime and importer scope and should not be expected to run or round-trip here yet.',
        examples: [
            'imports and third-party modules',
            'outside libraries',
            'general-purpose Python environments beyond the built-in game API runtime',
        ],
    },
];

export const BLOCK_ROUNDTRIP_GUIDE = {
    intro:
        'Blocks mode should also stay teachable when you switch into Python. Build your workspace with the same beginner/intermediate learning subset in mind.',
    buildBlocksThisWay: [
        'Create sprites, HUD state, and top-level variables first before adding behavior.',
        'Use event blocks like when key pressed, when key released, every frame, on collide, every n ticks, and after n ticks as the main structure of the game.',
        'Keep logic inside clear if / else, repeat, for-range, and while blocks instead of deeply nesting many disconnected statements.',
        'Use flat variables like player_x, score_now, enemy_alive, and bullet_live so the generated Python stays readable.',
        'Prefer built-in game blocks over custom shims or workarounds when the same behavior exists directly in the toolbox.',
        'After each major feature, switch to Python once and make sure the generated code still looks like something a student could keep editing.',
    ],
    roundTripChecklist: [
        'Use supported event blocks instead of depending on manual duplicated logic everywhere.',
        'Prefer simple control flow over very deep nesting.',
        'Use beginner/intermediate math, logic, variables, and list blocks when possible.',
        'Keep list usage one-dimensional and simple if you want students to continue in Python.',
        'Check the generated Python before the project gets too large.',
    ],
    starterPatternSteps: [
        'Create the player and goal sprites.',
        'Add one event block for movement or repeated updates.',
        'Add one collision or score rule.',
        'Add one win or lose rule.',
        'Then switch to Python and keep building from the generated code.',
    ],
    supportedBlockFamilies: [
        {
            title: 'Game events',
            examples: ['every frame', 'when key pressed', 'when key released', 'on collide', 'every n ticks'],
        },
        {
            title: 'Core game actions',
            examples: ['create sprite', 'set position', 'move by', 'delete sprite', 'show/hide sprite'],
        },
        {
            title: 'Game state',
            examples: ['set score', 'change score', 'set health', 'set HUD metric visible', 'win game / game over'],
        },
        {
            title: 'Logic and loops',
            examples: ['if / else', 'repeat', 'for range', 'while', 'comparisons and boolean logic'],
        },
        {
            title: 'Simple lists',
            examples: ['create list', 'get item', 'set item', 'append', 'pop', 'length'],
        },
    ],
};

const STAGE_LOOKUP = Object.fromEntries(PYTHON_LEARNING_STAGES.map(stage => [stage.id, stage]));
const BEGINNER_STAGE = STAGE_LOOKUP['beginner'];
const INTERMEDIATE_STAGE = STAGE_LOOKUP['intermediate'];
const ADVANCED_STAGE = STAGE_LOOKUP['advanced'];

const GAME_BLOCK_DOCS = {
    game_create_sprite: {
        title: 'Create Sprite',
        description: 'Creates a named sprite at a fixed grid position.',
        recipe: 'Use once per sprite at game start. Hide it instead of deleting it if you want a reusable template/prefab-like sprite.',
    },
    game_set_pixel: {
        title: 'Set Pixel',
        description: 'Lights one grid cell directly without creating or naming a sprite.',
        recipe: 'Use for drawing, cursors, and quick prototypes. Use color "off" to clear a cell.',
    },
    game_set_xy: {
        title: 'Set Position',
        description: 'Teleports a sprite to an exact x/y coordinate.',
        recipe: 'Useful for wrap-around and reset-to-start behaviors.',
    },
    game_set_color: {
        title: 'Set Sprite Color',
        description: 'Sets a sprite color so player, enemies, and targets stay visually distinct.',
        recipe: 'Use once after create_sprite or dynamically during gameplay for state feedback.',
    },
    game_set_size: {
        title: 'Set Sprite Size',
        description: 'Sets sprite width and height in grid cells.',
        recipe: 'Use for larger enemies, goals, and collision zones.',
    },
    game_hide_sprite: {
        title: 'Hide Sprite',
        description: 'Keeps a sprite in memory but removes it from view.',
        recipe: 'Use this for template/prefab-style sprites that you plan to clone later.',
    },
    game_spawn_sprite: {
        title: 'Spawn Sprite',
        description: 'Creates a brand-new 1x1 sprite with a unique generated name.',
        recipe: 'Use for bullets, particles, and pickups when you want a fresh sprite. Use clone instead when you want to copy a hidden template/prefab sprite.',
    },
    game_clone_sprite: {
        title: 'Clone Sprite',
        description: 'Copies an existing sprite into a new named instance.',
        recipe: 'Create and style a sprite once, hide it instead of deleting it, then use clone whenever you want copies with the same size, color, and settings.',
    },
    game_for_each_in_group: {
        title: 'For Each Sprite In Group',
        description: 'Loops through the sprite names currently stored in a group.',
        recipe: 'The loop variable is the sprite name text for the current group member. Use that variable anywhere a sprite name is expected.',
    },
    game_group_count: {
        title: 'Group Count',
        description: 'Returns number of sprites in a group/list.',
        recipe: 'Use for win checks and wave completion logic.',
    },
    game_set_velocity: {
        title: 'Set Velocity',
        description: 'Sets per-sprite motion velocity.',
        recipe: 'Use for smooth movement and projectile motion.',
    },
    game_set_acceleration: {
        title: 'Set Acceleration',
        description: 'Sets acceleration used by the physics integrator.',
        recipe: 'Use for gravity-like pull, thrust, and easing.',
    },
    game_jump: {
        title: 'Jump',
        description: 'Applies jump impulse when sprite is grounded.',
        recipe: 'Use in platformer controls on key press.',
    },
    game_change_x: {
        title: 'Change X',
        description: 'Moves sprite horizontally by a delta each tick.',
        recipe: 'Combine with key pressed blocks for left/right controls.',
    },
    game_change_y: {
        title: 'Change Y',
        description: 'Moves sprite vertically by a delta each tick.',
        recipe: 'Use for gravity, jumping, and up/down movement.',
    },
    game_touching: {
        title: 'Touching?',
        description: 'Checks if two sprites overlap.',
        recipe: 'Use inside an if block to handle hits or pickups.',
    },
    game_sprite_exists: {
        title: 'Sprite Exists?',
        description: 'Checks whether a sprite currently exists in the world.',
        recipe: 'Use before touching or movement checks to avoid stale references.',
    },
    game_touching_edge: {
        title: 'Touching Edge?',
        description: 'Checks whether a sprite is at any edge of the grid.',
        recipe: 'Use for bounce, clamp, wrap, or fail-state logic.',
    },
    game_delete_sprite: {
        title: 'Delete Sprite',
        description: 'Removes a sprite from the scene.',
        recipe: 'Great for collecting coins and removing hit enemies.',
    },
    game_on_key: {
        title: 'On Key Press',
        description: 'Runs once each time the key is pressed.',
        recipe: 'Use for actions like shooting or quick jumps.',
    },
    game_set_speed: {
        title: 'Set Game Speed',
        description: 'Sets simulation speed in ticks per second.',
        recipe: 'Lower for grid games like snake, higher for faster arcade play.',
    },
    game_change_speed: {
        title: 'Change Game Speed',
        description: 'Adjusts simulation speed by a delta.',
        recipe: 'Increase difficulty over time by gradually speeding up.',
    },
    game_get_speed: {
        title: 'Game Speed',
        description: 'Reads current simulation speed.',
        recipe: 'Use in HUD text or difficulty logic.',
    },
    game_random_int: {
        title: 'Random Integer',
        description: 'Generates a random integer within inclusive bounds.',
        recipe: 'Use for random spawn positions and simple AI choices.',
    },
    game_set_random_seed: {
        title: 'Set Random Seed',
        description: 'Makes random outcomes reproducible across runs.',
        recipe: 'Set once at startup when you need deterministic tests.',
    },
    game_respawn_safe: {
        title: 'Respawn Safe',
        description: 'Respawns a sprite in an unoccupied cell, optionally away from another sprite.',
        recipe: 'Use for coin/enemy respawns that should avoid player overlap.',
    },
    game_set_score: {
        title: 'Set Score',
        description: 'Sets built-in game score state.',
        recipe: 'Initialize score at game start or reset.',
    },
    game_change_score: {
        title: 'Change Score',
        description: 'Adds or subtracts from built-in score.',
        recipe: 'Use on pickups, hits, or timer bonuses.',
    },
    game_get_score: {
        title: 'Score',
        description: 'Reads built-in game score.',
        recipe: 'Display score or gate win conditions.',
    },
    game_game_over: {
        title: 'Game Over',
        description: 'Marks game as lost.',
        recipe: 'Trigger on enemy collision or health depletion.',
    },
    game_win_game: {
        title: 'Win Game',
        description: 'Marks game as won.',
        recipe: 'Trigger after goals or score thresholds are met.',
    },
    game_is_game_over: {
        title: 'Game Over?',
        description: 'Checks if game-over state is active.',
        recipe: 'Prevent extra updates after losing.',
    },
    game_is_game_won: {
        title: 'Game Won?',
        description: 'Checks if win state is active.',
        recipe: 'Stop timers and movement after win.',
    },
    game_set_hud_text: {
        title: 'Set HUD Text',
        description: 'Sets a free-form HUD label string.',
        recipe: 'Use for mission prompts, wave labels, and contextual instructions.',
    },
    game_set_hud_metric_label: {
        title: 'Set HUD Metric Label',
        description: 'Overrides the visible label for a built-in HUD metric.',
        recipe: 'Use for custom scoreboard labels like Player, CPU, Team A, or Team B.',
    },
    game_on_scene: {
        title: 'On Scene Load',
        description: 'Runs when a named scene is loaded.',
        recipe: 'Use for menu/init logic and level setup transitions.',
    },
    game_load_scene: {
        title: 'Load Scene',
        description: 'Switches to a named scene and runs its handler.',
        recipe: 'Call after buttons, level complete, or game over menus.',
    },
    game_pause: {
        title: 'Pause Game',
        description: 'Pauses simulation updates and keeps render active.',
        recipe: 'Use for pause menus and step-by-step debugging.',
    },
    game_on_key_up: {
        title: 'On Key Up',
        description: 'Runs when a key is released.',
        recipe: 'Use for release-based controls and charge mechanics.',
    },
    game_on_mouse_click: {
        title: 'On Mouse Click',
        description: 'Runs when preview canvas is clicked.',
        recipe: 'Use for aiming, selections, and click-to-move controls.',
    },
};

export function getDocForBlockType(blockType) {
    return GAME_BLOCK_DOCS[blockType] || null;
}

function getSpriteNames(workspace) {
    const names = new Set();
    for (const block of workspace.getAllBlocks(false)) {
        if (block.type !== 'game_create_sprite') continue;
        const name = String(block.getFieldValue('NAME') || '').trim();
        if (name) names.add(name);
    }
    return names;
}

export function lintWorkspace(workspace) {
    const findings = [];
    const allBlocks = workspace.getAllBlocks(false);
    const spriteNames = getSpriteNames(workspace);
    const creationCounts = new Map();

    for (const block of allBlocks) {
        block.setWarningText(null);
    }

    for (const block of allBlocks) {
        if (block.type === 'game_create_sprite') {
            const name = String(block.getFieldValue('NAME') || '').trim();
            if (!name) {
                findings.push({
                    severity: 'error',
                    message: 'Sprite creation block has an empty name.',
                    blockId: block.id,
                });
                block.setWarningText('Sprite name is empty.');
            }
            creationCounts.set(name, (creationCounts.get(name) || 0) + 1);
        }
    }

    for (const [name, count] of creationCounts.entries()) {
        if (!name || count <= 1) continue;
        findings.push({
            severity: 'warn',
            message: `Sprite "${name}" is created ${count} times. Later creations overwrite earlier ones.`,
        });
    }

    const namedFieldSpecs = [
        ['game_set_color', ['NAME']],
        ['game_set_size', ['NAME']],
        ['game_show_sprite', ['NAME']],
        ['game_hide_sprite', ['NAME']],
        ['game_set_opacity', ['NAME']],
        ['game_set_rotation', ['NAME']],
        ['game_set_scale', ['NAME']],
        ['game_set_z_index', ['NAME']],
        ['game_set_image', ['NAME']],
        ['game_set_spritesheet', ['NAME']],
        ['game_define_animation', ['NAME']],
        ['game_play_animation', ['NAME']],
        ['game_stop_animation', ['NAME']],
        ['game_delete_sprite', ['NAME']],
        ['game_respawn_safe', ['NAME']],
        ['game_get_x', ['NAME']],
        ['game_get_y', ['NAME']],
        ['game_set_xy', ['NAME']],
        ['game_set_position', ['NAME']],
        ['game_move_by', ['NAME']],
        ['game_change_x', ['NAME']],
        ['game_change_y', ['NAME']],
        ['game_set_velocity', ['NAME']],
        ['game_change_velocity_x', ['NAME']],
        ['game_change_velocity_y', ['NAME']],
        ['game_get_velocity_x', ['NAME']],
        ['game_get_velocity_y', ['NAME']],
        ['game_set_acceleration', ['NAME']],
        ['game_set_gravity', ['NAME']],
        ['game_set_friction', ['NAME']],
        ['game_set_jump_power', ['NAME']],
        ['game_jump', ['NAME']],
        ['game_clone_sprite', ['SOURCE']],
        ['game_add_to_group', ['NAME']],
        ['game_remove_from_group', ['NAME']],
        ['game_touching', ['A', 'B']],
        ['game_touching_group', ['NAME']],
        ['game_for_each_in_group', []],
        ['game_set_collision_layer', ['NAME']],
        ['game_set_collision_mask', ['NAME']],
        ['game_set_collision_response', ['NAME']],
        ['game_colliding', ['A', 'B']],
        ['game_move_toward', ['NAME', 'TARGET']],
        ['game_distance_to', ['A', 'B']],
        ['game_keep_in_bounds', ['NAME']],
        ['game_on_collide_stay', ['A', 'B']],
        ['game_on_collide_exit', ['A', 'B']],
        ['game_on_collide', ['A', 'B']],
        ['game_on_collide_group', ['NAME']],
        ['game_sprite_exists', ['NAME']],
        ['game_touching_edge', ['NAME']],
    ];

    for (const [type, fields] of namedFieldSpecs) {
        for (const block of allBlocks.filter(b => b.type === type)) {
            for (const fieldName of fields) {
                const name = String(block.getFieldValue(fieldName) || '').trim();
                if (!name) {
                    findings.push({
                        severity: 'error',
                        message: `${type} has an empty sprite reference.`,
                        blockId: block.id,
                    });
                    block.setWarningText('Sprite reference is empty.');
                    continue;
                }
                if (!spriteNames.has(name)) {
                    findings.push({
                        severity: 'error',
                        message: `${type} references unknown sprite "${name}".`,
                        blockId: block.id,
                    });
                    block.setWarningText(`Unknown sprite: ${name}`);
                }
            }
        }
    }

    for (const block of allBlocks) {
        const eventTypes = new Set(['game_on_tick', 'game_every_n_ticks', 'game_after_n_ticks', 'game_on_key', 'game_on_key_up', 'game_on_collide', 'game_on_collide_group', 'game_on_collide_stay', 'game_on_collide_exit', 'game_on_mouse_click', 'game_on_touch_start', 'game_on_scene']);
        if (!eventTypes.has(block.type)) continue;
        if (block.getInputTargetBlock('DO')) continue;
        block.setWarningText('This event block has no body.');
        findings.push({
            severity: 'warn',
            message: `${block.type} has no statements attached.`,
            blockId: block.id,
        });
    }

    return findings;
}

export function applyTemplate(Blockly, workspace, templateId) {
    const fixtureWorkspace = getGameWorkspaceFixture(templateId);
    if (fixtureWorkspace) {
        workspace.clear();
        Blockly.serialization.workspaces.load(fixtureWorkspace, workspace);
        return;
    }
    const xml = TEMPLATE_XML[templateId] || TEMPLATE_XML.blank;
    const dom = Blockly.utils.xml.textToDom(xml);
    Blockly.Xml.clearWorkspaceAndLoadFromXml(dom, workspace);
}

function storageKey(projectName) {
    return `${STORAGE_PREFIX}:${projectName || 'draft'}`;
}

export function loadHistory(projectName) {
    try {
        const raw = localStorage.getItem(storageKey(projectName));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveHistory(projectName, history) {
    try {
        localStorage.setItem(storageKey(projectName), JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch {
        // ignore local storage errors
    }
}

export function addHistorySnapshot(projectName, snapshot, reason = 'autosave') {
    const history = loadHistory(projectName);
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        reason,
        snapshot,
    };
    const next = [entry, ...history].slice(0, MAX_HISTORY);
    saveHistory(projectName, next);
    return next;
}

export function hashWorkspaceSnapshot(snapshot) {
    const text = JSON.stringify(snapshot || {});
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
    }
    return String(hash);
}

export function detectPythonCompatibilityIssues(code) {
    if (!code) return [];
    const lines = code.split('\n');
    const findings = [];
    const pushFinding = (severity, details) => {
        findings.push({ severity, ...details });
    };
    const helperSignatures = new Map(
        lines
            .map(line => String(line || '').trim().match(/^def\s+([A-Za-z_]\w*)\(([^)]*)\)\s*:/))
            .filter(Boolean)
            .map(match => {
                const params = match[2].trim()
                    ? match[2].split(',').map(part => part.trim()).filter(Boolean)
                    : [];
                return [match[1], params.length];
            })
    );
    const zeroArgHelpers = new Set(
        Array.from(helperSignatures.entries())
            .filter(([, count]) => count === 0)
            .map(([name]) => name)
    );

    const supportedCalls = new Set([
        'set_sprite_color',
        'set_sprite_size',
        'show_sprite',
        'hide_sprite',
        'set_sprite_opacity',
        'set_sprite_rotation',
        'set_sprite_scale',
        'set_sprite_z_index',
        'set_sprite_image',
        'set_sprite_sheet',
        'define_sprite_animation',
        'play_sprite_animation',
        'stop_sprite_animation',
        'delete_sprite',
        'set_position',
        'move_by',
        'spawn_sprite',
        'clone_sprite',
        'add_to_group',
        'remove_from_group',
        'delete_group',
        'group_count',
        'sprite_touching_group',
        'get_group_members',
        'random_group_member',
        'sprites_colliding',
        'set_collision_layer',
        'set_collision_mask',
        'set_collision_response',
        'register_collision_handler',
        'register_group_collision_handler',
        'register_collision_stay_handler',
        'register_collision_exit_handler',
        'set_velocity',
        'change_velocity_x',
        'change_velocity_y',
        'get_velocity_x',
        'get_velocity_y',
        'set_acceleration',
        'set_gravity',
        'set_friction',
        'set_jump_power',
        'jump_sprite',
        'keep_in_bounds',
        'move_toward',
        'distance_between',
        'chance',
        'create_sprite',
        'set_pixel',
        'setPixel',
        'register_frame_handler',
        'register_every_ticks',
        'register_after_ticks',
        'register_key_handler',
        'key_is_pressed',
        'sprites_touching',
        'sprite_touching_edge',
        'sprite_exists',
        'set_game_speed',
        'change_game_speed',
        'get_game_speed',
        'set_score',
        'change_score',
        'get_score',
        'set_stat',
        'get_stat',
        'set_hud_text',
        'set_lives',
        'change_lives',
        'get_lives',
        'set_timer',
        'change_timer',
        'get_timer',
        'set_health',
        'change_health',
        'get_health',
        'show_score_overlay',
        'show_status_overlay',
        'set_hud_metric_visible',
        'set_hud_metric_label',
        'set_hud_order',
        'set_hud_inline_overlay',
        'set_game_over_text',
        'set_win_text',
        'game_over',
        'win_game',
        'is_game_over',
        'is_game_won',
        'register_scene',
        'load_scene',
        'restart_scene',
        'pause_game',
        'resume_game',
        'is_game_paused',
        'get_current_scene',
        'register_key_up_handler',
        'register_mouse_click_handler',
        'register_touch_start_handler',
        'get_mouse_x',
        'get_mouse_y',
        'is_mouse_down',
        'get_touch_x',
        'get_touch_y',
        'is_touch_down',
        'gamepad_button_pressed',
        'get_gamepad_axis',
        'random_int',
        'respawn_sprite_safe',
        'set_random_seed',
    ]);

    for (let idx = 0; idx < lines.length; idx++) {
        const raw = lines[idx] || '';
        const trimmed = raw.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const defMatch = trimmed.match(/^def\s+([A-Za-z_]\w*)\(([^)]*)\)\s*:/);
        if (defMatch && defMatch[2].trim()) {
            pushFinding('error', {
                stageId: 'advanced',
                line: idx + 1,
                message: 'Function may not import into blocks.',
                reason: 'Python -> Blocks currently imports only zero-argument helper functions.',
                suggestion: 'Use def helper(): with shared variables, or keep this helper in Python mode only.',
                source: trimmed,
            });
        }

        if (/^return\b/.test(trimmed)) {
            pushFinding('error', {
                stageId: 'advanced',
                line: idx + 1,
                message: 'Return values may not import into blocks.',
                reason: 'Helper return values are not currently mapped into Blockly procedures.',
                suggestion: 'Assign directly into shared variables, or keep this function in Python mode only.',
                source: trimmed,
            });
        }

        if (/^(import|from)\b/.test(trimmed)) {
            pushFinding('error', {
                stageId: 'unsupported-runtime',
                line: idx + 1,
                message: 'Import may not convert into blocks.',
                reason: 'Python -> Blocks only supports the built-in game API subset, not external modules.',
                suggestion: 'Remove the import for block conversion, or keep this project in Python mode only.',
                source: trimmed,
            });
        }

        if (/^print\(/.test(trimmed)) {
            pushFinding('error', {
                stageId: 'advanced',
                line: idx + 1,
                message: 'print() may not convert into blocks.',
                reason: 'print() is not mapped to a Blockly block in the current importer.',
                suggestion: 'Use HUD text, score, or stay in Python mode for debugging output.',
                source: trimmed,
            });
        }

        if (/^[A-Za-z_]\w*\s*=\s*\[\s*\[/.test(trimmed) || /^[A-Za-z_]\w*\s*=\s*\{/.test(trimmed) || /^[A-Za-z_]\w*\s*=\s*\([^)]*,[^)]*\)\s*$/.test(trimmed)) {
            pushFinding('error', {
                stageId: 'advanced',
                line: idx + 1,
                message: 'Collection literal may not import into blocks.',
                reason: 'Dictionaries, tuples, and nested collection-heavy state are not part of the reliable Python -> Blocks subset.',
                suggestion: 'Use simple one-dimensional lists only, or flatten the state into named variables.',
                source: trimmed,
            });
        }

        const hasIndexingExpression = /\b[A-Za-z_]\w*\s*\[[^\]]+\]/.test(trimmed)
        const hasSimpleRead = /^\s*[A-Za-z_]\w*\s*=\s*[A-Za-z_]\w*\s*\[[^\]]+\]\s*$/.test(trimmed)
        const hasSimpleWrite = /^\s*[A-Za-z_]\w*\s*\[[^\]]+\]\s*=/.test(trimmed)
        const hasSimpleAugAssign = /^\s*[A-Za-z_]\w*\s*\[[^\]]+\]\s*[+\-*\/%]=/.test(trimmed)
        const hasSliceIndexing = /\b[A-Za-z_]\w*\s*\[[^\]]*:[^\]]*\]/.test(trimmed)
        const hasNestedIndexing = /\b[A-Za-z_]\w*\s*\[[^\]]+\]\s*\[/.test(trimmed)

        if (hasIndexingExpression && (hasSliceIndexing || hasNestedIndexing || (!hasSimpleRead && !hasSimpleWrite && !hasSimpleAugAssign))) {
            pushFinding('error', {
                stageId: 'advanced',
                line: idx + 1,
                message: 'Indexing expression may not import into blocks.',
                reason: 'Only simple one-dimensional list reads and writes are part of the reliable importer subset right now.',
                suggestion: 'Use simple list reads/writes like value = cells[i], cells[i] = value, or cells[i] += 1, or flatten more complex collection logic.',
                source: trimmed,
            });
        }

        if (/\b[A-Za-z_]\w*\.append\(/.test(trimmed) || /\b[A-Za-z_]\w*\.pop\(/.test(trimmed) || /\b[A-Za-z_]\w*\.pop\(\s*\)\s*$/.test(trimmed)) {
            // Supported simple one-dimensional list mutation.
            continue;
        }

        const literalColor = /^set_sprite_color\(\s*["'][^"']+["']\s*,\s*["'][^"']+["']\s*\)\s*$/;
        if (/^set_sprite_color\(/.test(trimmed) && !literalColor.test(trimmed)) {
            pushFinding('error', {
                stageId: 'beginner',
                line: idx + 1,
                message: 'Line may not import into blocks.',
                reason: 'set_sprite_color currently expects literal sprite name and literal color string.',
                suggestion: 'Use set_sprite_color("player", "#39c5ff") style literals.',
                source: trimmed,
            });
        }

        const literalPixelColor = /^(?:set_pixel|setPixel)\(\s*[^,]+\s*,\s*[^,]+\s*,\s*["'][^"']+["']\s*\)\s*$/;
        if (/^(?:set_pixel|setPixel)\(/.test(trimmed) && !literalPixelColor.test(trimmed)) {
            pushFinding('error', {
                stageId: 'beginner',
                line: idx + 1,
                message: 'Line may not import into blocks.',
                reason: 'set_pixel currently expects a literal color string in its third argument.',
                suggestion: 'Use set_pixel(x, y, "#ffd54f") or set_pixel(x, y, "off").',
                source: trimmed,
            });
        }

        if (/^set_random_seed\(\s*["']/.test(trimmed)) {
            pushFinding('error', {
                stageId: 'intermediate',
                line: idx + 1,
                message: 'Line may not import into blocks.',
                reason: 'set_random_seed currently imports numeric/variable seeds only.',
                suggestion: 'Use a number: set_random_seed(12345).',
                source: trimmed,
            });
        }

        if (/^respawn_sprite_safe\(.+=/.test(trimmed)) {
            pushFinding('error', {
                stageId: 'intermediate',
                line: idx + 1,
                message: 'Line may not import into blocks.',
                reason: 'Keyword arguments are not imported for respawn_sprite_safe yet.',
                suggestion: 'Use positional form: respawn_sprite_safe("coin", "player", 3).',
                source: trimmed,
            });
        }

        if (/^(if|elif|else|for|while|def|return|pass|import|from|print)\b/.test(trimmed)) continue;
        const callMatch = trimmed.match(/^([A-Za-z_]\w*)\s*\(/);
        if (callMatch && helperSignatures.has(callMatch[1]) && helperSignatures.get(callMatch[1]) > 0) {
            pushFinding('error', {
                stageId: 'advanced',
                line: idx + 1,
                message: 'Helper call may not import into blocks.',
                reason: 'Calls to helper functions with parameters are not currently mapped into Blockly procedures.',
                suggestion: 'Use zero-argument helpers with shared variables, or keep this call in Python mode only.',
                source: trimmed,
            });
            continue;
        }
        if (callMatch && !supportedCalls.has(callMatch[1]) && !zeroArgHelpers.has(callMatch[1])) {
            pushFinding('error', {
                stageId: 'advanced',
                line: idx + 1,
                message: 'Line may be ignored by Python → Blocks import.',
                reason: 'Unknown API call is not currently mapped to blocks.',
                suggestion: 'Use supported game APIs or keep this line in Python mode only.',
                source: trimmed,
            });
        }
    }

    return findings;
}

export function getBlockingPythonCompatibilityIssues(findings = []) {
    return findings.filter(finding => String(finding?.severity || '').toLowerCase() === 'error');
}

export function getPythonRuntimeBlockingIssues(findings = []) {
    return findings.filter(finding => finding?.stageId === 'unsupported-runtime');
}

export function analyzePythonLearningStage(code, findings = detectPythonCompatibilityIssues(code)) {
    const source = String(code || '');
    const blockingFindings = getBlockingPythonCompatibilityIssues(findings);
    const matchedSignals = [];
    const addSignal = label => {
        if (!matchedSignals.includes(label)) matchedSignals.push(label);
    };

    const zeroArgDefs = Array.from(source.matchAll(/^\s*def\s+([A-Za-z_]\w*)\(\s*\)\s*:/gm), match => match[1]);
    const registeredHandlerNames = new Set();
    for (const match of source.matchAll(/\bregister_frame_handler\(\s*([A-Za-z_]\w*)\s*\)/g)) registeredHandlerNames.add(match[1]);
    for (const match of source.matchAll(/\bregister_(?:key_handler|key_up_handler)\(\s*["'][^"']+["']\s*,\s*([A-Za-z_]\w*)\s*\)/g)) registeredHandlerNames.add(match[1]);
    for (const match of source.matchAll(/\bregister_(?:collision_handler|group_collision_handler|collision_stay_handler|collision_exit_handler)\([^)]*,\s*([A-Za-z_]\w*)\s*\)/g)) registeredHandlerNames.add(match[1]);
    for (const match of source.matchAll(/\bregister_(?:every_ticks|after_ticks)\(\s*[^,]+,\s*([A-Za-z_]\w*)\s*\)/g)) registeredHandlerNames.add(match[1]);
    const helperFunctionNames = zeroArgDefs.filter(name => !registeredHandlerNames.has(name) && !/^on_[A-Za-z0-9_]+$/.test(name));

    const hasSimpleAssignments = /^\s*[A-Za-z_]\w*\s*=\s*[^=\n]+$/m.test(source);
    const hasFrameHandlers = /\bregister_frame_handler\s*\(/.test(source);
    const hasInputHandlers = /\bregister_(?:key_handler|key_up_handler)\s*\(/.test(source);
    const hasCollisionHandlers =
        /\bregister_(?:collision_handler|group_collision_handler|collision_stay_handler|collision_exit_handler)\s*\(/.test(source);
    const hasDirectEventHandlers = hasFrameHandlers || hasInputHandlers || hasCollisionHandlers;
    const hasTimedEvents = /\bregister_(?:every_ticks|after_ticks)\s*\(/.test(source);
    const hasSimpleIf = /^\s*if\b.+:\s*$/m.test(source);
    const hasSimpleElse = /^\s*else\s*:\s*$/m.test(source);
    const hasMovementOrCollisions =
        /\b(?:move_by|set_position|game_over|win_game|sprites_touching|sprite_touching_group|register_collision_handler)\s*\(/.test(source);
    const hasZeroArgHelpers = helperFunctionNames.length > 0;
    const hasParameterizedHelpers = /^\s*def\s+[A-Za-z_]\w*\(\s*[^)\s][^)]*\)\s*:/m.test(source);
    const hasForRangeLoops = /^\s*for\s+[A-Za-z_]\w*\s+in\s+range\(/m.test(source);
    const hasWhileLoops = /^\s*while\b/m.test(source);
    const hasBooleanLogic = /\b(and|or|not)\b/.test(source);
    const hasSimpleLists =
        /^\s*[A-Za-z_]\w*\s*=\s*\[[^\[\]]*\]\s*$/m.test(source) ||
        /^\s*[A-Za-z_]\w*\s*=\s*[A-Za-z_]\w*\s*\[[^\]]+\]\s*$/m.test(source) ||
        /^\s*[A-Za-z_]\w*\s*\[[^\]]+\]\s*(?:=|\+=|-=|\*=|\/=|%=|\*\*=|\/\/=)\s*.+$/m.test(source) ||
        /\b[A-Za-z_]\w*\.append\(/.test(source) ||
        /\b[A-Za-z_]\w*\.pop\(/.test(source) ||
        /\blen\(\s*[A-Za-z_]\w*\s*\)/.test(source);
    const hasReturnValues = /^\s*return\b/m.test(source);
    const hasNestedCollections =
        /^\s*[A-Za-z_]\w*\s*=\s*\[\s*\[/m.test(source) ||
        /\b[A-Za-z_]\w*\s*\[[^\]]+\]\s*\[[^\]]+\]/.test(source);
    const hasBoardOrGridLogic =
        /\b(?:board|grid|tile|matrix|queue|bag|row|rows|col|cols|column|columns)\b/.test(source) ||
        hasNestedCollections;
    const hasGroupOrSceneSystems =
        /\b(?:spawn_sprite|clone_sprite|add_to_group|remove_from_group|delete_group|get_group_members|group_count|random_group_member|register_scene|load_scene|restart_scene|get_current_scene)\s*\(/.test(source);
    const hasMultipleInteractingSystems =
        [hasCollisionHandlers, hasTimedEvents, hasGroupOrSceneSystems, /\bregister_(?:mouse_click_handler|touch_start_handler)\s*\(/.test(source)]
            .filter(Boolean).length >= 2;
    const hasReusableAbstractions =
        hasParameterizedHelpers || helperFunctionNames.length >= 4;
    const hasDynamicDataStateModels = hasNestedCollections || hasGroupOrSceneSystems;

    if (hasSimpleAssignments) addSignal('flat variables');
    if (hasDirectEventHandlers) addSignal('direct event handlers');
    if (hasSimpleIf || hasSimpleElse) addSignal('simple if / else');
    if (hasMovementOrCollisions) addSignal('simple movement and collisions');
    if (hasForRangeLoops) addSignal('for range loops');
    if (hasWhileLoops) addSignal('while loops');
    if (hasForRangeLoops || hasWhileLoops) addSignal('loops');
    if (hasBooleanLogic) addSignal('boolean logic');
    if (hasZeroArgHelpers) addSignal('zero-argument helpers');
    if (hasTimedEvents) addSignal('timed events');
    if (hasSimpleLists) addSignal('simple one-dimensional list reads/writes');
    if ((hasDirectEventHandlers || hasTimedEvents) && (hasForRangeLoops || hasWhileLoops || hasSimpleLists || hasZeroArgHelpers)) {
        addSignal('modest stateful games');
    }
    if (hasParameterizedHelpers) addSignal('parameterized helpers');
    if (hasReturnValues) addSignal('return values');
    if (hasBoardOrGridLogic) addSignal('board/grid logic');
    if (hasMultipleInteractingSystems) addSignal('multiple interacting systems');
    if (hasReusableAbstractions) addSignal('reusable abstractions');
    if (hasDynamicDataStateModels) addSignal('dynamic data/state models');

    const blockedStageIds = new Set(blockingFindings.map(finding => finding.stageId).filter(Boolean));
    let stage = BEGINNER_STAGE;
    if (blockedStageIds.has(PYTHON_RUNTIME_SCOPE_STAGE.id)) {
        stage = PYTHON_RUNTIME_SCOPE_STAGE;
    } else if (blockedStageIds.has(ADVANCED_STAGE.id)) {
        stage = ADVANCED_STAGE;
    } else if (
        matchedSignals.includes('parameterized helpers') ||
        matchedSignals.includes('return values') ||
        matchedSignals.includes('board/grid logic') ||
        matchedSignals.includes('multiple interacting systems') ||
        matchedSignals.includes('reusable abstractions') ||
        matchedSignals.includes('dynamic data/state models')
    ) {
        stage = ADVANCED_STAGE;
    } else if (
        matchedSignals.includes('for range loops') ||
        matchedSignals.includes('loops') ||
        matchedSignals.includes('boolean logic') ||
        matchedSignals.includes('zero-argument helpers') ||
        matchedSignals.includes('timed events') ||
        matchedSignals.includes('simple one-dimensional list reads/writes') ||
        matchedSignals.includes('modest stateful games')
    ) {
        stage = INTERMEDIATE_STAGE;
    }

    const isBlockSafe = blockingFindings.length === 0 && stage.conversionStatus === 'supported';
    let summary = `${stage.title} describes the current structure of this code.`;
    if (stage.id === 'beginner') {
        summary = 'This code shape is safe to switch between Blocks and Python while students learn direct cause-and-effect programming.';
    } else if (stage.id === 'intermediate') {
        summary = 'This code shape is still safe to switch between Blocks and Python while students learn repeated behavior, timed rules, and modest state.';
    } else if (stage.id === 'advanced') {
        summary = 'This code shape can run in Python mode, but switching back to blocks is still evolving because the structure is more advanced.';
    } else if (stage.id === PYTHON_RUNTIME_SCOPE_STAGE.id) {
        summary = 'This code shape is outside the current Python runtime scope because it depends on imports or outside libraries.';
    }

    return {
        stage,
        isBlockSafe,
        blockingFindings,
        matchedSignals,
        summary,
        nextFocus: stage.goal,
    };
}

export function analyzeRoundTripReadiness({
    pythonCode = '',
    source = 'python',
    findings = detectPythonCompatibilityIssues(pythonCode),
} = {}) {
    const learning = analyzePythonLearningStage(pythonCode, findings)
    const blockingFindings = getBlockingPythonCompatibilityIssues(findings)
    const warningFindings = findings.filter(
        finding => String(finding?.severity || '').toLowerCase() !== 'error'
    )
    const isRoundTripSafe = blockingFindings.length === 0 && learning.isBlockSafe
    const isBlocksSource = source === 'blocks'
    const directionLabel = isBlocksSource ? 'Blocks ⇄ Python' : 'Python ⇄ Blocks'

    const summary = isRoundTripSafe
        ? isBlocksSource
            ? 'Current blocks generate Python inside the dependable Blocks ⇄ Python learning subset.'
            : 'Current Python is inside the dependable Python ⇄ Blocks learning subset.'
        : isBlocksSource
            ? 'Current blocks generate Python that may not round-trip cleanly back into blocks.'
            : 'Current Python may not round-trip cleanly back into blocks.'

    const hint = isRoundTripSafe
        ? 'Students should be able to switch modes and keep editing without losing the main program structure.'
        : isBlocksSource
            ? 'Simplify the generated Python-facing logic if you want mode switching to stay predictable.'
            : 'Rewrite the flagged Python lines if you want switching back to blocks to stay predictable.'

    return {
        ...learning,
        source,
        directionLabel,
        isRoundTripSafe,
        blockingFindings,
        warningFindings,
        summary,
        hint,
    }
}