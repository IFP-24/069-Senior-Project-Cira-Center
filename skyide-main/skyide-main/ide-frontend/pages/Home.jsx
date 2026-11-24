import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
	return (
		<main className="page home">
			<section className="home-card">
				<h1>Skyscraper Games by Kids — IDE</h1>
				<p>
					Build playful city-scale experiences with a polished block editor designed for
					workshops across Philadelphia.
				</p>
				<ul className="bullets">
					<li>Blockly workspace with live preview and Python bridge</li>
					<li>Curated sprites, effects, and timeline events for the skyline canvas</li>
					<li>Save, share, and deploy creations to the Cira Centre light wall</li>
				</ul>
				<Link className="cta" to="/editor">Launch the Editor</Link>
			</section>
		</main>
	);
}