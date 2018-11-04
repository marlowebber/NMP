

//no chemistry yet, just aim for stratification by melting point.




var plutoMass = 13.09; 					//13090000000000000000000; // kilograms
var earthMass =   5972;					//5972000000000000000000000; // kilograms
var jupiterMass = 317.8 * earthMass;
var brownDwarfMass = 13 * jupiterMass;

var earthDensity = 5.51; // grams per cubic cm... earth is the densest planet in the solar system
var saturnDensity = 0.687; // grams per cubic cm.. saturn is the least dense planet in the solar system

var plutoDistance = 5900000000; //kilometers


var elements = { // temperatures in K
	1:{ name:'hydrogen', number:1,	color:'#fff', electronegativity:2.2,	rarity:0.75, 				slope:1, start:1,	 solid:0, melting:13.9,		boiling:20.3},
	2:{ name:'helium', 		number:2,color:'#fff', electronegativity:'nil',	rarity:0.23,				slope:1, start:0.1,  solid:0, melting:1.7,		boiling:4.2},
	3:{ name:'lithium',		number:3,color:'#ddd', electronegativity:0.98,	rarity:0.0000006,			slope:1, start:0.01, solid:0, melting:453.7, 	boiling:1603},
	4:{ name:'beryllium', 	number:4,color:'#ddd', electronegativity:1.57,	rarity:0.0000001, 			slope:1, start:0.01, solid:0, melting:1560,  	boiling:2742},
	5:{ name:'boron', 		number:5,color:'#ddd', electronegativity:2.04,	rarity:0.0000001, 			slope:1, start:0.01, solid:0, melting:2349, 	boiling:4200},
	6:{ name:'carbon', 		number:6,color:'#000', electronegativity:2.55,	rarity:0.05, 				slope:1, start:0.01, solid:0, melting:3800, 	boiling:4300},
	7:{ name:'nitrogen', 	number:7,color:'#ddd', electronegativity:3.04,	rarity:0.01, 				slope:1, start:0.01, solid:0, melting:63.2, 	boiling:77.4},
	8:{ name:'oxygen', 		number:8,color:'#ddd', electronegativity:3.44,	rarity:0.1, 				slope:1, start:0.01, solid:0, melting:54.4, 	boiling:90.2},
	9:{ name:'fluorine', 	number:9,color:'#cf1', electronegativity:3.98,	rarity:0.000004, 			slope:1, start:0.01, solid:0, melting:53.5, 	boiling:85},
	10:{ name:'neon', 		number:10,color:'#fff', electronegativity:'nil',	rarity:0.013, 				slope:1, start:0.01, solid:0, melting:24.6, 	boiling:27.1},
	11:{ name:'sodium', 	number:11,color:'#bbb', electronegativity:0.93,	rarity:0.0002, 				slope:1, start:0.01, solid:0, melting:370.9, 	boiling:1156},
	12:{ name:'magnesium', 	number:12,color:'#898', electronegativity:1.31,	rarity:0.006, 				slope:1, start:0.01, solid:0, melting:923, 		boiling:1363},
	13:{ name:'aluminium', 	number:13,color:'#aaa', electronegativity:1.61,	rarity:0.0005, 				slope:1, start:0.01, solid:0, melting:933.5, 	boiling:2743},
	14:{ name:'silicon', 	number:14,color:'#111', electronegativity:1.9,	rarity:0.007, 				slope:1, start:0.01, solid:0, melting:1687, 	boiling:3538},
	15:{ name:'phosphorus', number:15,color:'#co3', electronegativity:2.19,	rarity:0.00007, 			slope:1, start:0.01, solid:0, melting:317.3, 	boiling:550},
	16:{ name:'sulfur', 	number:16,color:'#fe0', electronegativity:2.58,			rarity:0.005, 				slope:1, start:0.01, solid:0, melting:368.4, 	boiling:717},
	17:{ name:'chlorine', 	number:17,color:'#7e0', electronegativity:3.16,			rarity:0.00001, 			slope:1, start:0.01, solid:0, melting:171.6, 	boiling:239.1},
	18:{ name:'argon', 		number:18,color:'#def', electronegativity:'nil',			rarity:0.002, 				slope:1, start:0.01, solid:0, melting:83.8, 	boiling:87.3},
	19:{ name:'potassium', 	number:19,color:'#bbb', electronegativity:0.82,			rarity:0.00003, 			slope:1, start:0.01, solid:0, melting:336.7,	boiling:1032},
	20:{ name:'calcium', 	number:20,color:'#ccc', electronegativity:1,				rarity:0.0007, 				slope:1, start:0.01, solid:0, melting:1115, 	boiling:1757},
	22:{ name:'titanium', 	number:22,color:'#ddd', electronegativity:1.54,			rarity:0.00003, 			slope:1, start:0.01, solid:0, melting:1941, 	boiling:3560},
	26:{ name:'iron', 		number:26,color:'#999', electronegativity:1.83,			rarity:0.011, 				slope:1, start:0.01, solid:0, melting:1811, 	boiling:3134},
	27:{ name:'cobalt', 	number:27,color:'#38f', electronegativity:1.88,			rarity:0.00003, 			slope:1, start:0.01, solid:0, melting:1768, 	boiling:3200},
	28:{ name:'nickel', 	number:28,color:'#333', electronegativity:1.91,			rarity:0.0006, 				slope:1, start:0.01, solid:0, melting:1728, 	boiling:3003},
	29:{ name:'copper', 	number:29,color:'#d70', electronegativity:1.9,			rarity:0.000006, 			slope:1, start:0.01, solid:0, melting:1357.8,	boiling:2835},
	30:{ name:'zinc', 		number:30,color:'#bbb', electronegativity:1.65,			rarity:0.00003, 			slope:1, start:0.01, solid:0, melting:692.7, 	boiling:1180},
}

var numberOfElements = Object.keys(elements).length;


//http://periodictable.com/Properties/A/UniverseAbundance.html
//https://en.wikipedia.org/wiki/Boiling_points_of_the_elements_(data_page)
//https://en.wikipedia.org/wiki/Electronegativities_of_the_elements_(data_page)



//solar system formation

//create a solar system's worth of randomized mass


var solarSystem = {};

solarSystem.radius = Math.random() * 2 * plutoDistance; // how wide the solar system is.
solarSystem.mass = Math.random() * 2 * jupiterMass;

solarSystem.chunks = [];

rollingChunkNumber = 1;
rollingPosition = {x:0, y:0};

for (var i = 0; i < 1000; i++) {

	var chunkAngle = i * ((2 * Math.PI)/1000);

	newChunk = {};

	if (Math.random() < (1-elements[rollingChunkNumber].rarity)) //generate elements according to rarity
		{ var i = 1; if (Math.random() > 0.5) {i = -1;} rollingChunkNumber += i;}

	if (rollingChunkNumber > 30 || rollingChunkNumber < 0) {rollingChunkNumber = Math.round( Math.random() * 30 )}

	newChunk.element = elements[rollingChunkNumber];

	newChunk.mass = Math.random() * (solarSystem.mass / 1000);

	rollingPosition.x += Math.random() * solarSystem.radius / 1000;
	rollingPosition.y += Math.random() * solarSystem.radius / 1000;
	
	newChunk.position = rollingPosition;

	solarSystem.chunks.push(newChunk);

}





























//render setup
var canvas = document.createElement('canvas');
var context = canvas.getContext('2d');
canvas.width = 1400;
canvas.height = 700;
var offset = {x:700,y:350};
document.body.appendChild(canvas);

window.requestAnimationFrame(render);




function render() {

window.requestAnimationFrame(render);

context.fillStyle = "#000";
context.fillRect(0,0,1400,700);


for (var i = solarSystem.chunks.length - 1; i >= 0; i--) {
	var chunk = solarSystem.chunks[i];

	renderPoint(chunk.position.x,chunk.position.y,chunk.element.color);

}

}


function renderPoint(x,y,color){
	context.strokeStyle = color;
	context.beginPath();
	context.arc(x+offset.x,y+offset.y,5,0,2*Math.PI);
	context.stroke();
}

function renderLine(pointA,pointB,color){
	context.strokeStyle = color;
	context.beginPath();
	context.moveTo(pointA.x+offset.x,pointA.y+offset.y);
	context.lineTo(pointB.x+offset.x,pointB.y+offset.y);
	context.stroke();
}