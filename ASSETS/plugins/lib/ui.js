
// UI elements for plugins
// 
// Usage:
// import * as UI from "../spxgc_lib/ui.js";
// 

const style = {
	red: 'bg_red',
	blue: 'bg_blue',
	green: 'bg_green',
	grey: 'bg_grey15',
	gray: 'bg_grey15',
	black: 'bg_black',
	white: 'bg_white',
	orange: 'bg_orange',
	yellow: 'bg_yellow'
}

export function button (options) {
	// A normal SPX-GC button 
	let root = document.createElement('div');
	let left = document.createElement('div');
	let righ = document.createElement('div');
	let butn = document.createElement('button'); 
	
	root.style.display = 'flex';
	root.style.marginBottom = '0.1em';
	left.style.flex = '1';
	left.classList = 'spxTableHead';
	left.innerHTML = options.description || 'Plugin Description missing';
	righ.style.flex = '1';
	butn.innerHTML = options.caption || 'Click';
	butn.classList = 'btn wide ripple';
	butn.classList.add(style[options.color]);
	butn.id="btn";
	root.appendChild(left);
	root.appendChild(righ);
	righ.appendChild(butn);
	return root
}

export function selectbutton (options) {
	// TODO: A SPX-GC button with dropdown selection 
	// This will become in use for media playback
	// plugins and for OBS Scene Switcher.
	// An updated lib will become available
	// with future plugins.
}

