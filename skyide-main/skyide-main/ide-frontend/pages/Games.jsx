import React from 'react'
import { Link } from 'react-router-dom'
import { GAME_SHOWCASE_FIXTURES } from '../lib/gameFixtures.js'

export default function Games() {
    return (
        <main className="page games">
            <h1>Student Games Showcase</h1>
            <p className="intro">
                These featured projects were all built in the Skyscraper IDE workshops. Explore
                the ideas, remix them for your own creations, and use the support badge to see
                whether a demo is dependable for switching between Blocks and Python or better as
                an advanced Python-first project.
            </p>
            <section className="help-panel game-support-legend">
                <h2>What The Badges Mean</h2>
                <ul className="help-bullets">
                    <li>
                        <strong>Safe to switch Blocks &lt;-&gt; Python:</strong> dependable for
                        beginner and full intermediate round-trip workflows.
                    </li>
                    <li>
                        <strong>Runs in Python, switching still evolving:</strong> advanced game
                        logic should run in Python mode, but switching back to blocks is still
                        evolving.
                    </li>
                    <li>
                        <strong>Not supported in this Python environment:</strong> import
                        statements and outside libraries are still outside the current runtime.
                    </li>
                </ul>
            </section>
            <section className="game-grid">
                {GAME_SHOWCASE_FIXTURES.map((game) => (
                    <article key={game.name} className="game-card">
                        <div className="game-card-meta">
                            <span className={`game-status-badge is-${game.supportLevel}`}>{game.supportLabel}</span>
                        </div>
                        <h2>{game.name}</h2>
                        <p>{game.blurb}</p>
                        <p className="tech"><strong>Learning level:</strong> {game.learningLevel || 'Beginner'}</p>
                        <p className="tech"><strong>Built with:</strong> {game.tech}</p>
                        <div className="game-card-actions">
                            <Link className="cta secondary" to={`/editor?template=${game.id}`}>
                                Open in Editor
                            </Link>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    )
}
