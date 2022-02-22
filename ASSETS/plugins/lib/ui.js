
// UI elements for plugins
// 
// Usage:
// import * as UI from "../spxgc_lib/ui.js";
// 
// History
// XX.XX.2021 Original version added in v.1.0.xx
// 13.11.2021 selectbutton added
// 16.02.2022 overToolTip option added

// -------------------------------------------
// More UI controls may be added in the future
// -------------------------------------------

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
	// A normal SPX button 
	let root = document.createElement('div');
	let left = document.createElement('div');
	let righ = document.createElement('div');
	let butn = document.createElement('button'); 
	root.style.display = 'flex';
	root.style.marginBottom = '2px';
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

	// add hover eventListener
	root.addEventListener ("mouseover", function() {
		let toolTip = options.overToolTip || ''; 
		tip(toolTip);
	});
	return root
}



export function selectbutton (options) {
	// Dropdown + select list
	let root = document.createElement('table');
	root.classList 				= 'wide';
	root.style.margin 			= '0';
	root.style.border 			= '0';
	root.style.padding 			= '0';
	root.style.borderCollapse 	= 'collapse';
	root.style.marginTop 	    = '4px';
	root.style.marginBottom 	= '2px';
	
	let tbo1 = document.createElement('tbody');
	let t1r1 = document.createElement('tr');
	t1r1.id="t1r1";
	root.appendChild(tbo1);
	tbo1.appendChild(t1r1);
	let t1c1 = document.createElement('td');
	t1c1.id="t1c1";
	t1c1.width = '50%';

	// description
	let desc = document.createElement('span');
	desc.classList = 'spxTableHead';
	desc.innerText = options.description;
	t1c1.appendChild(desc);
	t1r1.appendChild(t1c1);


	// Start new TD and put new table in there
	let t1c2 = document.createElement('td');
	t1c2.id="t1c2";
	t1r1.appendChild(t1c2);

	let tab2 = document.createElement('table');
	tab2.classList 				= 'wide';
	tab2.style.border 			= '0';
	tab2.style.padding 			= '0';
	tab2.style.borderSpacing 	= '0';
	tab2.style.borderCollapse 	= 'separate';

	let tbo2 = document.createElement('tbody');
	let t2r1 = document.createElement('tr');
	t2r1.id="t2r1";
	tab2.appendChild(tbo2);
	tbo2.appendChild(t2r1);
	t1c2.appendChild(tab2);
	
	// td
	let t2c1 = document.createElement('td');
	t2c1.id="t2c1";
	t2c1.width="60%";
	let drop = document.createElement('select');
	drop.id = 'list'; 
	drop.classList = 'btn'; 
	drop.style.width = '99%';
	drop.style.paddingLeft="0.4em";
	drop.classList.add(style[options.color]);
	options.items.forEach((item,index) => {
		let optn 	= document.createElement('option');
		optn.text 	= item.text;
		optn.value 	= item.value;
		drop.appendChild(optn);
	});
	t2c1.appendChild(drop);
	t2r1.appendChild(t2c1);

	let t2c2 = document.createElement('td');
	t2c2.id="t2c2";
	let butn = document.createElement('button');
	butn.innerHTML = options.text || 'Click';
	butn.classList = 'wide btn ripple ' + style[options.color];
	butn.id='btn';
	t2c2.appendChild(butn);
	t2r1.appendChild(t2c2);

	// add hover eventListener
	root.addEventListener ("mouseover", function() {
		let toolTip = options.overToolTip || ''; 
		tip(toolTip);
	});


	return root
}


