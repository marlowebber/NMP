/*
NO MAN'S PIE
A space game by Marlo Webber
*/
/*
OPTIMISATION
- don't draw stuff that isn't going to be on the screen
- assign things to new variable instead of using lots of method calls... for example .length calls
- ignore physics calcs under a certain threshold


stuff to add:

- ship crashes!
    - partially done, ship modules are hidden on crash instead of destroyed. working on that now.
    - this is sort of experiencing some problems.

- HUD
    - done, added trajectory, forward marker, warp speed indicator

- time warp
    - done, had to skirt physics engine due to drag bug

- trajectories
    - done but inaccurate, inaccuracy gets worse as ship mass changes. not sure why this is.

- insert object into orbit function
   - exists but doesn't work, don't know why

- planet and moon terrain
    - auto generates random mountains and separates them into convex hulls. really want to expand on this. want to add geographic features, seas, flora and fauna, biomes, etc.
    
- tiny little human
    - want to implement with matter.js constraints to hold his limbs on.

- buildings on planets and moons
    - extend existing modular ship functionality, this allows cool space stations and shit. have created two building ships but haven't started coding building functionality yet. no spaceports yet.

- spaceport hangar build screen
    - build screen is functional and can create and fly new ships. need save and load function. need to create more content.

- color fill / render prettyness
    - works. carson liked it. added gradients for light sources. working on illuminating stokes only to imitate light reflecting off surfaces, will look great.

- asteroids
   - there is a ship 'asteroid' but i haven't tried it yet. can use ship crash functionality to break apart asteroids.

- clouds
  - clouds exist in game but don't have shape or color or functionality

- stars
- if referring to sun, i am not sure if this should be simulated as a real physical object. the engine has trouble with objects any larger than the current planet size. however, i could decrease the size scale of planets and ships correspondingly.
- if referring to other stars, we are not ready yet.
- if referring to a background skybox image, i feel that using black only emphasises the hugeness and emptiness of space.

- save and load
    - going to use JSON for this. haven't started, super important though.

- hyperspace jump to other systems
    - this should wait until we actually have one complete system, as well as the automatic planet generator.

- heat mechanics
     - haven't started, this will be awesome though, need to include a blackbody color thingy. 

- NPC ships
     - this is really hard and I am struggling. i have managed to get one AI ship to fishtail around enough to not fall into the planet, but it can't even go in a straight line let alone do anything.

- combat
    - haven't started, implemented most of a gun, but the AI is still too stupid to fight and we don't have explosions yet.

- explosions
    - i am planning to create explosive weapons as soon as the lighting module is complete. it will also be good for crash effects.
*/
//program code!
// global variables
//controls. i don't know why this has to go here, but it does.
var left = false;
var right = false;
var up = false;
var down = false;
var plus = false;
var minus = false;
var b = false;
var h = false;
var p = false;
var mode = "pause"; // used to implement a toggle on the B key
//var trigger = false;
var f = false;
var s = false;
var r = false;
var d = false;
var flylock = false;
var tateLock = false;
var controlScale = 0.1;
//var controlAngle = 0;

// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Composites = Matter.Composites,
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

//collision groups
var defaultCategory = 0x0001,
    redCategory = 0x0002,
    greenCategory = 0x0004,
    blueCategory = 0x0008;



var inheritsFrom = function(child, parent) { // not used any more.
    child.prototype = Object.create(parent.prototype);
};

function componentToHex(c) { // required for rgbtohex(), comes from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) { //alert( hexToRgb("#0033ff").g ); // "51";
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function remove(arrOriginal, elementToRemove) {
    return arrOriginal.filter(function(el) {
        return el !== elementToRemove
    });
}

function contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
}

function roundN(x, n) {
    return Math.ceil(x / n) * n;
}

function addRadians(angle1, angle2) { // adds two angles in radians, returns result in radians
    var angle = angle1 + angle2;
    if (angle > 2 * Math.PI) { //normalize
        angle -= 2 * Math.PI;
    }
    if (angle < 0) {
        angle += 2 * Math.PI;
    }
    return angle;
}

function subtractRadians(angle1, angle2) { // subtracts two angles in radians, returns result in radians
    var angle = angle1 - angle2;
    if (angle > 2 * Math.PI) { //normalize
        angle -= 2 * Math.PI;
    }
    if (angle < 0) {
        angle += 2 * Math.PI;
    }
    return angle;
}


function transformToView(vertex, centerScreenObject, zoomFactor, offset) { // repositions the vertex from game system coordinates to the actual pixel locations that get drawn on the screen. also performs camera zoom.
    vertex = Matter.Vector.sub(vertex, centerScreenObject.position);
    vertex = Matter.Vector.mult(vertex, zoomFactor);
    return vertex = Matter.Vector.add(vertex, offset);
}

function transformToGame(vertex, centerScreenObject, zoomFactor, offset) { // repositions the vertex from view coordinates to game system coordinates. used for mouse clicking. inverse of transformToView().
    vertex = Matter.Vector.sub(vertex, game.offset);
    vertex = Matter.Vector.div(vertex, game.zoomFactorBuild);
return vertex = Matter.Vector.add(vertex, centerScreenObject.position);
}


function getMousePosition(event) {
    var bRect = game.canvas.getBoundingClientRect();
    mouseX = (event.clientX - bRect.left) * (game.canvas.width / bRect.width);
    mouseY = (event.clientY - bRect.top) * (game.canvas.height / bRect.height);
    return {
        x: mouseX,
        y: mouseY
    };
}

function mouseDownListener(event) { // mouse down listener is added to canvas. eveything else is added to window.
    game.canvas.removeEventListener("mousedown", mouseDownListener, false);
    window.addEventListener("mouseup", mouseUpListener, false);
    var mousePos = getMousePosition(event);
    var hits = game.checkHits(mousePos);
    if (hits.length > 0) {
        //start dragging
        var punani = true;
        for (var i = hits.length - 1; i >= 0; i--) {
            var hit = hits[i];
            if (hit == game.prevHit) {
                game.dragging = game.prevHit;
                var punani = false;
                break;
            } else {
                game.panning = mousePos;
                window.addEventListener("mousemove", mouseMoveListener, false);
            }
        }

        if (punani) {
            game.dragging = hits[0];
        }

        window.addEventListener("mousemove", mouseMoveListener, false);
    } else { //don't do anything

    }

}

function mouseUpListener(event) {
    game.canvas.addEventListener("mousedown", mouseDownListener, false);
    window.removeEventListener("mouseup", mouseUpListener, false);
    window.removeEventListener("mousemove", mouseMoveListener, false);
    game.panning = null;
    game.prevHit = game.dragging;
    game.dragging = null;
    game.addLock = false;
}

function mouseMoveListener(event) {
    if (game.panning != null) {}

    if (game.dragging != null && mode == "build") {
        var mousePos = getMousePosition(event);
        mousePos = transformToGame(mousePos, game.buildViewCamera, game.zoomFactorBuild, game.offset); //transformToGame(vertex, centerScreenObject, zoomFactor, offset)
        modulePosition = mousePos;
        modulePosition.x = roundN(modulePosition.x, game.grid);
        modulePosition.y = roundN(modulePosition.y, game.grid);
        Matter.Body.setPosition(game.dragging.body, modulePosition);
    }
}

// create person
function createPerson(x, y) {
    var headOptions = {
        friction: 1,
        frictionAir: .05
    };
    var chestOptions = {
        friction: 1,
        frictionAir: .05
    };
    var armOptions = {
        friction: 1,
        frictionAir: .03
    };
    var legOptions = {
        friction: 1,
        frictionAir: .03
    };
    var head = Bodies.circle(x, y - 70, 30, headOptions);
    var chest = Bodies.rectangle(x, y, 60, 80, chestOptions); //40,120
    var rightUpperArm = Bodies.rectangle(x + 40, y - 20, 20, 40, armOptions);
    var rightLowerArm = Bodies.rectangle(x + 40, y + 20, 20, 60, armOptions);
    var leftUpperArm = Bodies.rectangle(x - 40, y - 20, 20, 40, armOptions);
    var leftLowerArm = Bodies.rectangle(x - 40, y + 20, 20, 60, armOptions);
    var leftUpperLeg = Bodies.rectangle(x - 20, y + 60, 20, 40, legOptions);
    var rightUpperLeg = Bodies.rectangle(x + 20, y + 60, 20, 40, legOptions);
    var leftLowerLeg = Bodies.rectangle(x - 20, y + 100, 20, 60, legOptions);
    var rightLowerLeg = Bodies.rectangle(x + 20, y + 100, 20, 60, legOptions);


    var legTorso = Body.create({
        parts: [chest, leftUpperLeg, rightUpperLeg]
    });

    var chestToRightUpperArm = Constraint.create({
        bodyA: legTorso,
        pointA: {
            x: 25,
            y: -40
        },
        pointB: {
            x: -5,
            y: -10
        },
        bodyB: rightUpperArm,
        stiffness: .2,
    });
    var chestToLeftUpperArm = Constraint.create({
        bodyA: legTorso,
        pointA: {
            x: -25,
            y: -40
        },
        pointB: {
            x: 5,
            y: -10
        },
        bodyB: leftUpperArm,
        stiffness: .2,
    });

    var upperToLowerRightArm = Constraint.create({
        bodyA: rightUpperArm,
        bodyB: rightLowerArm,
        pointA: {
            x: 0,
            y: 15
        },
        pointB: {
            x: 0,
            y: -20
        },
        stiffness: .2
    });

    var upperToLowerLeftArm = Constraint.create({
        bodyA: leftUpperArm,
        bodyB: leftLowerArm,
        pointA: {
            x: 0,
            y: 15
        },
        pointB: {
            x: 0,
            y: -20
        },
        stiffness: .2
    });

    var upperToLowerLeftLeg = Constraint.create({
        bodyA: legTorso,
        bodyB: leftLowerLeg,
        pointA: {
            x: -20,
            y: 60
        },
        pointB: {
            x: 0,
            y: -25
        },
        stiffness: .2
    });

    var upperToLowerRightLeg = Constraint.create({
        bodyA: legTorso,
        bodyB: rightLowerLeg,
        pointA: {
            x: 20,
            y: 60
        },
        pointB: {
            x: 0,
            y: -25
        },
        stiffness: .2
    });

    var headContraint = Constraint.create({
        bodyA: head,
        pointA: {
            x: 0,
            y: 20
        },
        pointB: {
            x: 0,
            y: -50
        },
        bodyB: legTorso,
        stiffness: .3
    });


    var person = Composite.create({
        bodies: [legTorso, head, leftLowerArm, leftUpperArm, rightLowerArm, rightUpperArm, leftLowerLeg, rightLowerLeg],
        constraints: [upperToLowerLeftArm, upperToLowerRightArm, chestToLeftUpperArm, chestToRightUpperArm, headContraint, upperToLowerLeftLeg, upperToLowerRightLeg]
    });
    return person;
}


function VisualObject() {
    var newVisualObject = {}
    newVisualObject.body = {}
    newVisualObject.body.visible = true; // whether the thing gets rendered along with everything else. this is used artistically - atmosphere.visible is set to false so that it can be rendered first, and all other bodies are drawn over the top of it. it is also used to make engine flares appear and disappear.
    newVisualObject.body.brightness = 0; // how much light the object emits, 0 by default
    newVisualObject.body.emissionColor = '#ffffff'; //what color light the object gives out
    newVisualObject.name = "";
    newVisualObject.offsetVector = Matter.Vector.create(0, 0); // right now this is only used for module effects but ut should be used for everthing.
    return newVisualObject;
}

function PhysicalObject() {
    var newPhysicalObject = VisualObject();
    newPhysicalObject.temperature = 0;
    newPhysicalObject.physicsObject = true;
    return newPhysicalObject;
}

function Atmosphere(planet, height) {
    var newAtmosphere = PhysicalObject();
    //  Matter.Body.setStatic(newAtmosphere.body, true);
    newAtmosphere.physicsObject = false;
    newAtmosphere.atmosphere = true;
    newAtmosphere.height = 100;
    newAtmosphere.body = Matter.Body.create({
        parts: [Bodies.polygon(planet.body.position.x, planet.body.position.y, 360, (planet.radius + height))]
    });
    newAtmosphere.body.visible = false;
    newAtmosphere.thickness = 0.2;
    newAtmosphere.chemistry = 'none';
    newAtmosphere.body.collisionFilter.group = 10;
    newAtmosphere.body.collisionFilter.category = blueCategory;
    newAtmosphere.body.collisionFilter.mask = blueCategory;
    newAtmosphere.belongsTo = planet;
    return newAtmosphere;
}

function backgroundStar() { // parallax background stars

    var newStar = {};
    newStar.color = '#FFF';
    newStar.position = Matter.Vector.create(Math.random() * 1400, Math.random() * 700);
    newStar.size = Math.random()*2;
    newStar.distance = Math.random();

    return newStar;

}

function Planet(x, y, radius, mass, roughness, degrees) {
    var newPlanet = PhysicalObject();
    newPlanet.initialPosition = Matter.Vector.create(x, y);
    newPlanet.radius = radius;
    newPlanet.roughness = roughness;
    newPlanet.body = Bodies.polygon(x, y, degrees, radius, {
        mass: mass
    });
    newPlanet.body.visible = false;
    Matter.Body.setStatic(newPlanet.body, true);
    newPlanet.physicsObject = false; // should gravity equations apply to this? no, it is on rails
    newPlanet.atmosphere;
    newPlanet.railsHeight = 0;
    newPlanet.railsVelocity = 0;
    newPlanet.railsTarget;
    var randomisedVertices = newPlanet.body.vertices; // fuck up the surface a bit for looks
    for (var i = randomisedVertices.length - 1; i >= 0; i--) {
        var vertex = randomisedVertices[i];
        vertex.x += roughness * radius * (Math.random() - 0.5);
        vertex.y += roughness * radius * (Math.random() - 0.5);
    }
    newPlanet.body = Matter.Bodies.fromVertices(x, y, randomisedVertices, {
        density: 2380
    });
    newPlanet.body.physicsObject = false;
    return newPlanet;
} // extends PhysicalObject

function ShipModule(moduleType, moduleOffset) { //moduleType here is a qualitative description of the module
    var newShipModule = PhysicalObject();
    newShipModule.type = 'none'; //what the module does
    newShipModule.moduleType = moduleType; // just records what type the module was created as
    newShipModule.broken = false; //whether the module is in a functional state or not
    //newShipModule.online = false; //whether the module is powered and such
    newShipModule.active = false; // whether the module is in use or not
    newShipModule.resourceType = 'none'; // what kind of resource the module holds
    newShipModule.resourceQuantity = 0; //  how much it holds
    newShipModule.resourceQuantityMax = 0; //how much it can hold
    newShipModule.resourceProduction = 0; //how much it creates
    newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
    newShipModule.resourceConsumption = 0; // how much of that it needs to work
    newShipModule.resourceConsumed = 0;
    newShipModule.satisfied = false; //did the module get enough stuff already
    newShipModule.belongsTo = null;
    newShipModule.attachedTo = []; //a list of other modules that this shipmodule is attached to. 
    newShipModule.cooldown = 0;
    newShipModule.destructionThreshold = 1;
    switch (moduleType) {



        //let's think up some potentially cool ship parts!
        //it'd be cool to get guns working.
        // 
 case 'bullet':
            {
                newShipModule.type = 'bullet'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'none'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body = Bodies.polygon(moduleOffset.x, moduleOffset.y, 3, 0.5, { // 50, 3105 - module offset 0,5
                    mass: 0.05
                });

                newShipModule.body.strokeColor = '#FC8'; // the capsule is red.
                newShipModule.body.fillColor = '#F64'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1; // it's hard to actually break a bullet.. this might end up setting the threshold for contact explosion
                //of course all bullets in the future will be explosive. it's more like a cannon shell.
            }
            break;


              case 'solarPanels':
            {
                newShipModule.type = 'generator'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'electricity'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 1; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 4, 10, { // 50, 3105 - module offset 0,5
                    mass: 1
                });
                newShipModule.body.strokeColor = '#139'; // the capsule is red.
                newShipModule.body.fillColor = '#35B'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;

 case 'sparHuge':
            {
                newShipModule.type = 'structure'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'none'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 5, 100, { // 50, 3105 - module offset 0,5
                    mass: 20
                });
                newShipModule.body.strokeColor = '#AAA'; // the capsule is red.
                newShipModule.body.fillColor = '#888'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;

            case 'sparMedium':
            {
                newShipModule.type = 'structure'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'none'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 2, 20, { // 50, 3105 - module offset 0,5
                    mass: 5
                });
                newShipModule.body.strokeColor = '#AAA'; // the capsule is red.
                newShipModule.body.fillColor = '#888'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;

  case 'sparSmall':
            {
                newShipModule.type = 'structure'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'none'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 1, 10, { // 50, 3105 - module offset 0,5
                    mass: 1
                });
                newShipModule.body.strokeColor = '#AAA'; // the capsule is red.
                newShipModule.body.fillColor = '#888'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;

            case 'habSmall':
            {
                newShipModule.type = 'capsule'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'crew'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'electricity'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0.1; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 4, 8, { // 50, 3105 - module offset 0,5
                    mass: 1
                });
                newShipModule.body.strokeColor = '#EEE'; // the capsule is red.
                newShipModule.body.fillColor = '#CCC'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;

        case 'cargoBaySmall':
            {
                newShipModule.type = 'cargo'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'cargo'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 100; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 4, 4, { // 50, 3105 - module offset 0,5
                    mass: 1
                });
                newShipModule.body.strokeColor = '#DDD'; // the capsule is red.
                newShipModule.body.fillColor = '#AAA'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;

              case 'cargoBayMedium':
            {
                newShipModule.type = 'cargo'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'cargo'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 100; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 8, 10, { // 50, 3105 - module offset 0,5
                    mass: 4
                });
                newShipModule.body.strokeColor = '#DDD'; // the capsule is red.
                newShipModule.body.fillColor = '#AAA'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;


        case 'generator':
            {
                newShipModule.type = 'generator'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'electricity'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 100; //  how much it holds
                newShipModule.resourceProduction = 0.1; //how much it creates
                newShipModule.resourceRequired = 'fuel'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0.001; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 2, 1, { // 50, 3105 - module offset 0,5
                    mass: 0.5
                });
                newShipModule.body.strokeColor = '#666'; // the capsule is red.
                newShipModule.body.fillColor = '#444'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;

            case 'reactor':
            {
                newShipModule.type = 'generator'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'electricity'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 100; //  how much it holds
                newShipModule.resourceProduction = 1; //how much it creates
                newShipModule.resourceRequired = 'nuclearFuel'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0.001; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 10, 5, { // 50, 3105 - module offset 0,5
                    mass: 5
                });
                newShipModule.body.strokeColor = '#666'; // the capsule is red.
                newShipModule.body.fillColor = '#444'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;


        case 'asteroidSmall':
            {
                newShipModule.type = 'asteroid'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'iron'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 100; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body = Matter.Bodies.polygon(moduleOffset.x, moduleOffset.y, 32, 20, { // 50, 3100 - ship offset 50, 3100 - module offset 0, 0
                    mass: 100
                });
                newShipModule.body.strokeColor = '#DDD'; // the capsule is red.
                newShipModule.body.fillColor = '#AAA'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
            }
            break;
        case 'gunSmall':
            {
                newShipModule.type = 'gun'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'bullets'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 500; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'bullets'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 1; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 0.5, 2, { // 50, 3102 - module offset 0,2
                    mass: 0.5
                });
                newShipModule.body.strokeColor = '#666'; // the capsule is red.
                newShipModule.body.fillColor = '#333'; // the capsule is red.

                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 2;
                var muzzleFlash = VisualObject();
                muzzleFlash.body = Bodies.trapezoid(moduleOffset.x, moduleOffset.y + 5, 1, 4, 1, { // 50, 3113 module offset 0,13 - difference between 8 and 13 is 5.. 
                    mass: 0.01
                });
                muzzleFlash.offsetVector = Matter.Vector.create(0, -2.5); // this is necessary in rendering, do not fuck with it unless you are sure you know what you're doing
                Matter.Body.setAngle(muzzleFlash.body, 0.5 * Math.PI); // unlike the engine, the bullets should face forward
                muzzleFlash.body.fillColor = '#FC8'; // the capsule is red.
                muzzleFlash.body.strokeColor = '#F64'; // the capsule is red.
                newShipModule.visualEffect = muzzleFlash;
            }
            break;

        case 'capsuleSmall':
            { // a lightweight single-person capsule operated by civilians.
                newShipModule.type = 'capsule'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'crew'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 1; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'electricity'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 1; // how much of that it needs to work
                newShipModule.body = Matter.Bodies.trapezoid(moduleOffset.x, moduleOffset.y, 3, 2, 0.5, { // 50, 3100 - ship offset 50, 3100 - module offset 0, 0
                    mass: 0.2
                });
                newShipModule.body.strokeColor = '#EEE'; // the capsule is red.
                newShipModule.body.fillColor = '#CCC'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1;
            }

            break;

            case 'commandDeck':
            { // a lightweight single-person capsule operated by civilians.
                newShipModule.type = 'capsule'; //what the module does... in the context of the game engine and module functionality.
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'crew'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 1; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'electricity'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 1; // how much of that it needs to work
                newShipModule.body = Matter.Bodies.trapezoid(moduleOffset.x, moduleOffset.y, 10, 5, 0.2, { // 50, 3100 - ship offset 50, 3100 - module offset 0, 0
                    mass: 0.2
                });
                newShipModule.body.strokeColor = '#EEE'; // the capsule is red.
                newShipModule.body.fillColor = '#CCC'; // the capsule is red.
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1;
            }

            break;

        case 'rcsBlockSmall':
            { // an RCS rocket block that works by applying force, not torque. it probably needs to be offset from the ship COM to work.
                // generatorModule.body = Bodies.rectangle(25000, 40, 10, 10, {mass: 0.5});
                newShipModule.type = 'rcsRockets'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'thrust'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 5; //how much it creates
                newShipModule.resourceRequired = 'fuel'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0.001; // how much of that it needs to work
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 1, 1, { // 50, 3102 - module offset 0,2
                    mass: 0.5
                });
                newShipModule.body.strokeColor = '#888'; // the capsule is red.
                newShipModule.body.fillColor = '#444'; // the capsule is red.
                //Matter.Body.setMass(generatorModule.body,2);
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1;
            }
            break;

        case 'fuelTankSmall':
            { // a small square red fuel tank. holds normal liquid fuel.
                //fuel tank is 20 high and 20 wide - size B
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 4, 4, { // 50, 3105 - module offset 0,5
                    mass: 1
                });
                newShipModule.type = 'fuelTank'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'fuel'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 100; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1;
                newShipModule.body.fillColor = '#811'; // the capsule is red.
                newShipModule.body.strokeColor = '#E33'; // the capsule is red.

            }
            break;

              case 'fuelTankMedium':
            { // a small square red fuel tank. holds normal liquid fuel.
                //fuel tank is 20 high and 20 wide - size B
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 8, 16, { // 50, 3105 - module offset 0,5
                    mass: 1
                });
                newShipModule.type = 'fuelTank'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'fuel'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 100; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1;
                newShipModule.body.fillColor = '#811'; // the capsule is red.
                newShipModule.body.strokeColor = '#E33'; // the capsule is red.

            }
            break;

            case 'roundTankSmall':
            { // a small square red fuel tank. holds normal liquid fuel.
                //fuel tank is 20 high and 20 wide - size B
                newShipModule.body = Bodies.polygon(moduleOffset.x, moduleOffset.y, 16, 4, { // 50, 3105 - module offset 0,5
                    mass: 1
                });
                newShipModule.type = 'fuelTank'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'fuel'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 200; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1;
                newShipModule.body.fillColor = '#811'; // the capsule is red.
                newShipModule.body.strokeColor = '#E33'; // the capsule is red.

            }
            break;



               case 'fastEngineSmall':
            { // a small liquid fuelled engine.
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 2, 4, { // 50, 3108 - module offset 0,8
                    mass: 0.5
                });
                newShipModule.type = 'engine'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'thrust'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 100; //how much it creates
                newShipModule.resourceRequired = 'fuel'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0.001; // how much of that it needs to work
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1;
                newShipModule.body.strokeColor = '#888'; // the capsule is red.
                newShipModule.body.fillColor = '#444'; // the capsule is red.
                var engineExhaust = VisualObject();
                engineExhaust.body = Bodies.trapezoid(moduleOffset.x, moduleOffset.y + 13, 1, 8, 1, { // 50, 3113 module offset 0,13 - difference between 8 and 13 is 5.. 
                    mass: 0.001
                });
                engineExhaust.offsetVector = Matter.Vector.create(0, -2.5); // this is necessary in rendering, do not fuck with it unless you are sure you know what you're doing
                Matter.Body.setAngle(engineExhaust.body, -0.5 * Math.PI);
                engineExhaust.body.fillColor = '#def'; // the capsule is red.
                engineExhaust.body.strokeColor = '#39f'; // the capsule is red.
                engineExhaust.body.collisionFilter.group = 2;
                engineExhaust.body.collisionFilter.category = redCategory;
                engineExhaust.body.collisionFilter.mask = redCategory;
                newShipModule.visualEffect = engineExhaust;
            }
            break;

        case 'engineSmall':
            { // a small liquid fuelled engine.
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 2, 2, { // 50, 3108 - module offset 0,8
                    mass: 0.5
                });
                newShipModule.type = 'engine'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'thrust'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 10; //how much it creates
                newShipModule.resourceRequired = 'fuel'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0.001; // how much of that it needs to work
                newShipModule.body.physicsObject = true;
                newShipModule.body.destructionThreshold = 1;
                newShipModule.body.strokeColor = '#888'; // the capsule is red.
                newShipModule.body.fillColor = '#444'; // the capsule is red.
                var engineExhaust = VisualObject();
                engineExhaust.body = Bodies.trapezoid(moduleOffset.x, moduleOffset.y + 5, 1, 4, 1, { // 50, 3113 module offset 0,13 - difference between 8 and 13 is 5.. 
                    mass: 0.001
                });
                engineExhaust.offsetVector = Matter.Vector.create(0, -2.5); // this is necessary in rendering, do not fuck with it unless you are sure you know what you're doing
                Matter.Body.setAngle(engineExhaust.body, -0.5 * Math.PI);
                engineExhaust.body.fillColor = '#FC8'; // the capsule is red.
                engineExhaust.body.strokeColor = '#F64'; // the capsule is red.
                engineExhaust.body.collisionFilter.group = 2;
                engineExhaust.body.collisionFilter.category = redCategory;
                engineExhaust.body.collisionFilter.mask = redCategory;
                newShipModule.visualEffect = engineExhaust;
            }
            break;
        case 'fortress':
            {
                newShipModule.body = Bodies.trapezoid(moduleOffset.x, moduleOffset.y, 150.0, 50, 0.5, { // -20000, -600 - 0,0
                    mass: 1500
                });
                newShipModule.type = 'fortress'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'none'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body.physicsObject = true;
                // moonbase.shipModules.push(trapezoidModule);
                // moonbase.shipRoot = trapezoidModule.body;
                // moonbase.compoundBody = Matter.Body.create({
                //     parts: [trapezoidModule.body]
                // });
                //moonbase.compoundBody.strokeColor = '#dedbef';
            }
            break;
        case 'landingPad':
            {
                // landing pad module is big and wide.
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 100.0, 10, { // 0,2050 - 0,0
                    mass: 2000
                });
                newShipModule.type = 'landingpad'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'none'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body.physicsObject = true;
            }
            break;
        case 'controlTower':
            {

                // control tower is tall and thin and has a thingy on top.
                newShipModule.body = Bodies.rectangle(moduleOffset.x, moduleOffset.y, 10, 50, { // 55, 2070 - 55,20
                    mass: 500
                });
                newShipModule.type = 'controlTower'; //what the module does
                newShipModule.active = false; // whether the module can be used or not
                newShipModule.resourceType = 'none'; // what kind of resource the module holds
                newShipModule.resourceQuantity = 0; //  how much it holds
                newShipModule.resourceProduction = 0; //how much it creates 
                newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
                newShipModule.resourceConsumption = 0; // how much of that it needs to work
                newShipModule.body.physicsObject = true;

            }
            break;
    }

    newShipModule.body.physicsObject = true;
    newShipModule.body.belongsTo = newShipModule;

    if (newShipModule.visualEffect != null) {
        newShipModule.visualEffect.physicsObject = false;


        newShipModule.visualEffect.body.collisionFilter.group = 2;
        newShipModule.visualEffect.body.collisionFilter.category = redCategory;
        newShipModule.visualEffect.body.collisionFilter.mask = redCategory;
    }
    // newShipModule.body.restitution = 0.5;
    return newShipModule; // shit out the newly created module
}

function Ship(shipType) {



    var newShip = {};
    // newShip.compoundBody = Bodies.polygon(0, 0, 12, 1, {
    //     mass: 1
    //});
    //newShip.shipRoot; // bridge, used to set cardinal direction

    newShip.path = [];

    newShip.destroyedModules = [];
    newShip.shipModules = [];
    newShip.controlAngle = 0;
    newShip.throttle = 0;
    newShip.trigger = false;
    newShip.maneuver = {};
    newShip.target = {};
    newShip.orbiting = null;

    newShip.railsTarget = null;
    newShip.railsHeight = 0;
    newShip.railsVelocity = 0;
    newShip.railsPhaseAngle = 0;

    newShip.team = 'none';
    switch (shipType) { // recipes to make all the different kinds of ships!

        case 'clean':
            { // just the ship object with no modules, this is used as a template to create a ship out of build mode.

            }
            break;

            case 'bullet':
            { // an electronically guided explosive shell
                var bulletModule = ShipModule('bullet',Matter.Vector.create(0,0));
                 bulletModule.belongsTo = newShip;
                newShip.shipRoot = bulletModule;
                newShip.compoundBody = Matter.Body.create({
                    parts: [bulletModule.body]
                });
                newShip.shipModules.push(bulletModule);
                newShip.compoundBody.physicsObject = true;
                newShip.compoundBody.strokeColor = '#dedbef'; // the invisible color

                newShip.compoundBody.belongsTo = newShip;

            }
            break;


        case 'camry':
            { // the most basic functional ship, as far as I know.

                var capsuleModule = ShipModule('capsuleSmall', Matter.Vector.create(0, 0));
                var rcsModule = ShipModule('rcsBlockSmall', Matter.Vector.create(0, 2));
                var fuelTankModule = ShipModule('fuelTankSmall', Matter.Vector.create(0, 5));
                var engineModule = ShipModule('engineSmall', Matter.Vector.create(0, 8));

                capsuleModule.attachedTo.push(rcsModule);

                rcsModule.attachedTo.push(capsuleModule);
                rcsModule.attachedTo.push(fuelTankModule);

                fuelTankModule.attachedTo.push(rcsModule);
                fuelTankModule.attachedTo.push(engineModule);

                engineModule.attachedTo.push(fuelTankModule);

                var gunModuleA = ShipModule('gunSmall', Matter.Vector.create(1.75, 2));
                var gunModuleB = ShipModule('gunSmall', Matter.Vector.create(-1.75, 2));

                newShip.shipModules.push(capsuleModule);
                newShip.shipModules.push(rcsModule);
                newShip.shipModules.push(fuelTankModule);
                newShip.shipModules.push(engineModule);
                newShip.shipModules.push(gunModuleA);
                newShip.shipModules.push(gunModuleB);
                newShip.shipRoot = capsuleModule.body;

                newShip.compoundBody = Matter.Body.create({
                    parts: [capsuleModule.body, rcsModule.body, fuelTankModule.body, engineModule.body, gunModuleA.body, gunModuleB.body]
                });
                //newShip.shipRoot = capsuleModule;
                newShip.compoundBody.physicsObject = true;
                newShip.compoundBody.strokeColor = '#dedbef'; // the invisible color
                //ship.compoundBody.visible = false;
            }
            break;
        case 'moonBase':
            {
                var fortress = ShipModule('fortress', Matter.Vector.create(0, 0));
                newShip.shipModules.push(fortress);
                newShip.shipRoot = fortress.body;
                newShip.compoundBody = Matter.Body.create({
                    parts: [fortress.body]
                });
                newShip.compoundBody.physicsObject = true;
                newShip.compoundBody.strokeColor = '#dedbef';
            }
            break;
        case 'spacePort':
            {

                var landingPad = ShipModule('landingPad', Matter.Vector.create(0, 0));
                var controlTower = ShipModule('controlTower', Matter.Vector.create(55, 20));
                newShip.shipModules.push(landingPad);
                newShip.shipModules.push(controlTower);
                newShip.shipRoot = controlTower.body;
                newShip.compoundBody = Matter.Body.create({
                    parts: [landingPad.body, controlTower.body]
                });
                newShip.compoundBody.physicsObject = true;
                newShip.compoundBody.strokeColor = '#dedbef';
            }
            break;

    }
    //  newShip.compoundBody.restitution = 0.5;
    return newShip;
} // a ship is not actually a physical object. the modules that it is made of are physical. the ship is just a conceptual collection of parts.

class Game {
    constructor() {
        document.addEventListener('keydown', function(event) {
            if (event.keyCode == 49) {
                game.switchViewpoint(); //alert('1 was pressed');
            }
            if (event.keyCode == 37) {
                left = true; //alert('Left was pressed');
            } else if (event.keyCode == 83) {
                s = true; // alert('s is  pressed');
            } else if (event.keyCode == 39) {
                right = true; //alert('Right was pressed');
            } else if (event.keyCode == 38) {
                up = true; //alert('up was pressed');
            } else if (event.keyCode == 40) {
                down = true; //alert('down was pressed');
            } else if (event.keyCode == 107) {
                plus = true; //alert('plus sign was pressed');
            } else if (event.keyCode == 109) {
                minus = true; //alert('minus sign was pressed');
            } else if (event.keyCode == 72) {
                if (h) {
                    h = false;
                } else {
                    h = true;
                }
            } else if (event.keyCode == 66) {
                b = true;
                if (mode == "game") {
                    mode = "build";
                    Matter.Engine.clear(game.buildViewEngine);
                    game.availableModules = [];


                    //shimport!


   // shimPort(shipString, interactive) { // use json.parse // THIS ACTUALLY DROPS EVERYTHING IN AVAILABLEMODULES i.e. build mode
/*
if (interactive) {
       var shipArray = JSON.parse(prompt("Import/Export", shipString));
}
else{
*/
     // var shipArray = JSON.parse(shipString);
//  }

//document.getElementById("outputText").value = shipString;
                    var shipString = document.getElementById("outputText").value;

                    if (shipString != '') {
                        

                    game.shimPort(shipString, true);

                }

                    window.addEventListener("mousedown", mouseDownListener, false);
                } else {

                    mode = "game";

                    window.removeEventListener("mousedown", mouseDownListener, false);
                }
            } else if (event.keyCode == 80) {
                p = true;
                if (mode == "game") {

                    mode = "pause";
                } else {

                    mode = "game";
                }
            } else if (event.keyCode == 188) { // comma - warp decrease in game mode, grid decrease in build mode
                if (mode == "game") {
                    // alert('your dick is ready!');


                    if (game.warpFactor > 10) {
                        game.warpFactor -= 10;
                        game.messageLog = "warp: " + String(game.warpFactor);
                    }

                   else if (game.warpFactor > 1) {
                        game.warpFactor -= 1;
                        game.messageLog = "warp: " + String(game.warpFactor);
                    }


                }
                if (mode == "build") {
                    game.grid = 0.5 * game.grid;
                }

            } else if (event.keyCode == 190) { // period - warp increase in game mode, grid increase in build mode
                if (mode == "game") {
                    if (game.warpFactor < 10) {

                        game.warpFactor += 1;
                        game.messageLog = "warp: " + String(game.warpFactor);
                    }
                    else {
                         game.warpFactor += 10;
                        game.messageLog = "warp: " + String(game.warpFactor);
                    }
                }
                if (mode == "build") {
                    game.grid = 2 * game.grid;
                }


            } else if (event.keyCode == 32) {

                game.player.trigger = true;
            } else if (event.keyCode == 70) {
                f = true; //alert('f');


                if (mode == "build" && flylock == false) {
                    flylock = true;
                game.fly();
                mode = "game";
            }

            }
            else if (event.keyCode == 82) {
r = true;
            }

            else if (event.keyCode == 68) {

                if (mode == 'build' && game.dragging != null) {
                game.availableModules = remove(game.availableModules,game.dragging);
               Matter.Composite.remove( game.buildViewEngine.world, game.dragging.body);
                game.dragging = null;
            }




            }

        });
        document.addEventListener('keyup', function(event) {
            if (event.keyCode == 37) {
                left = false; // alert('Left is not pressed');
            } else if (event.keyCode == 83) {
                right = false; // alert('s is not pressed');
            } else if (event.keyCode == 39) {
                right = false; // alert('right is not pressed');
            } else if (event.keyCode == 38) {
                up = false; // alert('up is not pressed');
            } else if (event.keyCode == 40) {
                down = false; // alert('down is not pressed');
            } else if (event.keyCode == 107) {
                plus = false; //alert('plus sign was not pressed');
            } else if (event.keyCode == 109) {
                minus = false; //alert('minus sign was unpressed');
            } else if (event.keyCode == 72) {
                // h = false; //alert('minus sign was unpressed');
            } else if (event.keyCode == 66) {
                b = false;
                // alert('minus sign was unpressed');
                //  bLock == false;
            } else if (event.keyCode == 80) {
                p = false;
                // alert('minus sign was unpressed');
                //  bLock == false;
            } else if (event.keyCode == 32) {

                game.player.trigger = false;
            } else if (event.keyCode == 70) {
                f = false; //alert('f');
            }
            else if (event.keyCode == 82) {
r = false;
tateLock = false;
            }
        });
        this.availableModules = []; // working area for ship assembly
        this.moduleTypesList = ['capsuleSmall', 'gunSmall', 'rcsBlockSmall', 'fuelTankSmall', 'engineSmall', 'cargoBaySmall', 'generator', 'sparSmall', 'fastEngineSmall', 'solarPanels','habSmall','roundTankSmall', 'sparMedium', 'sparHuge', 'fuelTankMedium', 'reactor', 'commandDeck', 'cargoBayMedium'];
        this.addLock = false;
        this.planets = []; // all gravitating celestial objects
        this.ships = []; // all motile or active objects including ships, weapons, buildings and asteroids
/*
        this.backgroundStars = [];
        for (var i = 100; i >= 0; i--) {
           stars.push(backgroundStar());
        }
*/
        this.lightSources = []; // only stuff in here gets rendered as an actual light source, for performance reasons.
        this.activeExplosions = [];
        this.player;
        this.clickBotens = [];
        this.panning = false
        this.cameraFocusObject;
        this.zoomFactor = 0.01;
        this.zoomFactorBuild = 10;
        this.gravitationalConstant = 0.0000000000003; // magic number that makes gravity work
        this.engine = Engine.create(); // create a physics engine

        this.buildViewEngine = Engine.create(); // the build view stuff is located in here.
        this.grid = 1;

                this.clickyIndex = 0;


        // World.add(this.buildViewEngine.world, this.mouseConstraint); // not ready for this yet
        this.buildViewCamera = {position: {x:0, y:0}};
        this.engine.positionIterations = 10;
        this.warpFactor = 1;
        this.messageLog = "warp: " + String(this.warpFactor);
        this.engine.world.gravity.x = 0;
        this.engine.world.gravity.y = 0;
        this.engine.world.bounds.min.x = -1000000;
        this.engine.world.bounds.min.y = -1000000;
        this.engine.world.bounds.max.x = 1000000;
        this.engine.world.bounds.max.y = 1000000;
        this.counter = 0;
        this.viewpointItemNumber = 0;
        this.renderConstraints = false;
        this.defaultColor = '#888888';
        this.canvas = document.createElement('canvas'),
            this.context = this.canvas.getContext('2d');
        this.canvas.width = 1400;
        this.canvas.height = 700;
        document.body.appendChild(this.canvas);
        this.offset = Matter.Vector.create(this.canvas.width / 2, this.canvas.height / 2); // this defines the exact middle of the screen
        this.loadDemoSystem();
        this.generateBuildButtons();
        //setup collision handling
        this.instateAttachmentHandler(); // i sort of forgot that this only applies to buildview engine.
        //attachment handling in build view engine
        this.instateCollisionHandler();

    }

    renderBackgroundStars() {
        for (var i = this.backgroundStars.length - 1; i >= 0; i--) {
            var star = this.backgroundStars[i];

            this.context.beginPath();

            //x,y,r,startrads,endrads
            this.context.arc(star.position.x,star.position.y,star.size,0,2*Math.PI);
            this.context.strokeStyle = star.color;

            this.context.stroke();


            

        }
    }


    switchViewpoint() {
        var bodies = Composite.allBodies(this.engine.world);
        this.viewpointItemNumber += 1;
        if (this.viewpointItemNumber >= bodies.length) {
            this.viewpointItemNumber = 0;
        }
        this.cameraFocusObject = bodies[this.viewpointItemNumber];
    }

    checkHits(mousePos) {
        for (var i = this.clickBotens.length - 1; i >= 0; i--) {
            var clickBoten = this.clickBotens[i];

            //x,y,width,height

            if (mousePos.x > clickBoten.x && mousePos.x < clickBoten.x + clickBoten.width) {

                if (mousePos.y < clickBoten.y && mousePos.y > clickBoten.y + clickBoten.height) { // clickBotens have negative heights, so this has to be negative. :( would have been super easy to fix.


                    if (clickBoten.representsModule == false) {
                        if (clickBoten.moduleType == 'upButton') {



        for (var j = this.clickBotens.length - 1; j >= 0; j--) {

            var clickBoten = this.clickBotens[j];

            if (clickBoten.representsModule) {
            clickBoten.y -= 25;
        }

                    }

                        }
                        else if (clickBoten.moduleType == 'downButton') {

for (var j = this.clickBotens.length - 1; j >= 0; j--) {

            var clickBoten = this.clickBotens[j];
  if (clickBoten.representsModule) {
            clickBoten.y += 25;
        }
                    }



                        }


                    }


                    if (clickBoten.representsModule) {

                    if (this.addLock == false) {


                        this.addLock = true;
                        var newShipModule = ShipModule(clickBoten.moduleType, mousePos);

                        this.availableModules.push(newShipModule);

                        newShipModule.body.belongsTo = newShipModule;
                        Matter.World.addBody(this.buildViewEngine.world, newShipModule.body);

                        game.dragging = newShipModule;

                        window.addEventListener("mousemove", mouseMoveListener, false);


                    }

                }
                }

            }


        }



        mousePos = transformToGame(mousePos, this.buildViewCamera, this.zoomFactorBuild, this.offset);

        var hits = [];
        for (var i = this.availableModules.length - 1; i >= 0; i--) { // available modules
            var availableModule = this.availableModules[i];

            if (Matter.Vector.magnitude(Matter.Vector.sub(mousePos, availableModule.body.position)) < 5) {
                //// if() {
                //  if (mousePos.x > availableModule.body.x && mousePos.x < availableModule.body.x + availableModule.body.width) {
                //    if (mousePos.y > availableModule.body.y && mousePos.y < availableModule.body.y + availableModule.body.height) {
                hits.push(availableModule);
            }
            //  }
        }



        return hits;

    }


    trajectories() {


        for (var i = this.ships.length - 1; i >= 0; i--) {
           var ship =  this.ships[i];

        this.context.beginPath();

           for (var j = ship.path.length - 1; j >= 0; j--) {
              var targetBall = ship.path[j];

              if (j == ship.path.length -1) {
                  targetBall =transformToView(targetBall, this.cameraFocusObject, this.zoomFactor, this.offset);
            this.context.moveTo(targetBall.x, targetBall.y);

              }
              else {
                  targetBall =transformToView(targetBall, this.cameraFocusObject, this.zoomFactor, this.offset);
            this.context.lineTo(targetBall.x, targetBall.y);

              }

            

           }

        this.context.strokeStyle = '#444444';
        this.context.stroke();

        }

        var trajectoryWarp = 20;
        var targetBallPosition = Matter.Vector.create(this.player.compoundBody.position.x, this.player.compoundBody.position.y);
        var targetBallVelocity = Matter.Vector.create(this.player.compoundBody.velocity.x, this.player.compoundBody.velocity.y);
        var targetBallMass = this.player.compoundBody.mass;

        this.context.beginPath();

        //transform targetball view coordinates
        //function transformToView(vertex, centerScreenObject, zoomFactor, offset){
        var transformedBallZero = transformToView(targetBallPosition, this.cameraFocusObject, this.zoomFactor, this.offset);

        this.context.moveTo(transformedBallZero.x, transformedBallZero.y);

        // one way interact it like a hundred times and record the vector each time, stop if you hit something
        for (var i = 0; i < 50; i++) {

            var targetBallForce = Matter.Vector.create(0, 0);
            //oneWayInteraction(object1,object2,constant,compositeBody){
            for (var j = this.planets.length - 1; j >= 0; j--) {
                var planet = this.planets[j];

                var distance = Matter.Vector.sub(targetBallPosition, planet.body.position);
                var scalarDistance = Matter.Vector.magnitude(distance);

                var scalarForce = ((this.gravitationalConstant * (targetBallMass + planet.body.mass)) / (scalarDistance * scalarDistance)) * trajectoryWarp; //F = Gm1m2/r2,
                scalarForce = scalarForce * 300000;
                var vectorForce = Matter.Vector.create(scalarForce * Math.cos(Matter.Vector.angle(targetBallPosition, planet.body.position)), scalarForce * Math.sin(Matter.Vector.angle(targetBallPosition, planet.body.position)));
                targetBallVelocity = Matter.Vector.add(targetBallVelocity, vectorForce);

            }

            targetBallPosition = Matter.Vector.add(targetBallPosition, Matter.Vector.mult(targetBallVelocity, trajectoryWarp));

            //targetBallForce = Matter.Vector.create(0,0);

            var transformedBallN = transformToView(targetBallPosition, this.cameraFocusObject, this.zoomFactor, this.offset);

            this.context.lineTo(transformedBallN.x, transformedBallN.y);


        }

        this.context.strokeStyle = '#444444';
        this.context.stroke();

    }

    hud() {

        if (h) {


            // render trajectory
            this.trajectories();


            // print text

            //var ctx = document.getElementById('canvas').getContext('2d');
            this.context.font = "12px serif";

            var offset = this.offset;
            // get prograde angle
            var progradeAngle = this.player.compoundBody.angle;
            progradeAngle -= 0.5 * Math.PI;
            // compute indicator start point... say 200 from midscreen
            var progradeA = Matter.Vector.create((300 * Math.cos(progradeAngle)), (300 * Math.sin(progradeAngle)));
            progradeA = Matter.Vector.add(offset, progradeA);
            // compute indicator end point... say  from midscreen
            var progradeB = Matter.Vector.create((320 * Math.cos(progradeAngle)), (320 * Math.sin(progradeAngle)));
            progradeB = Matter.Vector.add(offset, progradeB);
            // render prograde indicator
            this.context.beginPath();
            this.context.moveTo(progradeA.x, progradeA.y);
            this.context.lineTo(progradeB.x, progradeB.y);
            // this.context.lineWidth = 2;
            this.context.strokeStyle = '#ff0000';
            this.context.stroke();


            // get prograde angle
            var progradeAngle = this.player.controlAngle;
            progradeAngle -= 0.5 * Math.PI;
            // compute indicator start point... say 200 from midscreen
            var progradeA = Matter.Vector.create((300 * Math.cos(progradeAngle)), (300 * Math.sin(progradeAngle)));
            progradeA = Matter.Vector.add(offset, progradeA);
            // compute indicator end point... say  from midscreen
            var progradeB = Matter.Vector.create((320 * Math.cos(progradeAngle)), (320 * Math.sin(progradeAngle)));
            progradeB = Matter.Vector.add(offset, progradeB);
            // render prograde indicator
            this.context.beginPath();
            this.context.moveTo(progradeA.x, progradeA.y);
            this.context.lineTo(progradeB.x, progradeB.y);
            // this.context.lineWidth = 2;
            this.context.strokeStyle = '#ff0000';
            this.context.stroke();


            // render the message log
            this.renderMessageLog();

            this.renderModuleQualities();

        }
    }

    renderModuleQualities() {

        /*

    newShipModule.type = 'none'; //what the module does
    newShipModule.moduleType = moduleType; // just records what type the module was created as
    newShipModule.broken = false; //whether the module can be used or not
    newShipModule.active = false; // whether the module is in use or not
    newShipModule.resourceType = 'none'; // what kind of resource the module holds
    newShipModule.resourceQuantity = 0; //  how much it holds
    newShipModule.resourceQuantityMax = 0; //how much it can hold
    newShipModule.resourceProduction = 0; //how much it creates
    newShipModule.resourceRequired = 0; // what sort of resource it needs to work
    newShipModule.resourceConsumption = 0; // how much of that it needs to work
    newShipModule.satisfied = 0; //did the module get enough stuff already
    newShipModule.belongsTo = null;
    newShipModule.attachedTo = []; //a list of other modules that this shipmodule is attached to. 
    */

        /*

                    this.context.fillStyle = '#ffffff';
                    this.context.fillText("Orbiting " + String(this.player.orbiting.name), 1300, 622);
                    */

        var x = 1300;
        var y = 604;

        var checkedResources = [];
        var actualResourceList = {};

        for (var i = this.player.shipModules.length - 1; i >= 0; i--) {
            var module = this.player.shipModules[i];


            if (contains(checkedResources, module.resourceType) == false) {
                checkedResources.push(module.resourceType);
                actualResourceList[module.resourceType] = module.resourceQuantity;



            } else {

                actualResourceList[module.resourceType] += module.resourceQuantity;
            }

        }


        for (var i = checkedResources.length - 1; i >= 0; i--) {
            var checkedResource = checkedResources[i];

            if (checkedResource == 'none') {
                continue;
            }

            this.context.fillStyle = '#ffffff';
            this.context.fillText(String(checkedResource) + ": " + String(actualResourceList[checkedResource]), x, y);

            y -= 12;
        }



    }


dock(ship1,ship2) {

// create new ship by joining lists and running it through attachment handler

/*
var velocity1 = ship1.compoundBody.velocity;
var velocity2 = ship2.compoundBody.velocity;

var position1 = ship1.compoundBody.position;
var position2 = ship2.compoundBody.position;

var angle1 = ship1.compoundBody.angle;
var angle2 = ship2.compoundBody.angle;
*/




var superString = this.shipToString([ship1,ship2]);

// 

// remove original two ships from world


// calculate center of mass and average velocity

//com = (sum of all (each mass times each distance on axis) ) / (sum of all masses)

var comX = ((ship1.compoundBody.mass * ship1.compoundBody.position.x)  +(ship2.compoundBody.mass * ship2.compoundBody.position.x) )       / (ship1.compoundBody.mass+ship2.compoundBody.mass);
var comY = ((ship1.compoundBody.mass * ship1.compoundBody.position.y)  +(ship2.compoundBody.mass * ship2.compoundBody.position.y) )       / (ship1.compoundBody.mass+ship2.compoundBody.mass);

var  com = Matter.Vector.create(comX,comY);
//i guess it'd be okay to just use the velocity of one of the bodies because they should both be comoving
//if one is on rails, use that one so you don't fuck up the rails system.



// add docked ship to world

  this.shimPlace(superString,com,ship1.compoundBody.velocity );



}







    shimPort(shipString, interactive) { // use json.parse // THIS ACTUALLY DROPS EVERYTHING IN AVAILABLEMODULES i.e. build mode
/*
if (interactive) {
       var shipArray = JSON.parse(prompt("Import/Export", shipString));
}
else{
*/
      var shipArray = JSON.parse(shipString);
//  }

document.getElementById("outputText").value = shipString;

console.log('shimport happened!');

        /*
            moduleRepresentation.position = module.body.position;
            moduleRepresentation.type = module.moduleType;
            moduleRepresentation.angle = module.body.angle;
        */

        // var newShip = Ship(clean);
        //just drop everything in available modules

        this.availableModules = [];

        for (var i = shipArray.length - 1; i >= 0; i--) {
            var parsedModule = shipArray[i];

            var newShipModule = ShipModule(parsedModule.moduleType, parsedModule.position);
           // Matter.Body.setPosition(newShipModule.body, parsedModule.position);
            Matter.Body.setAngle(newShipModule.body, parsedModule.angle);

            this.availableModules.push(newShipModule);

        }


    }



    shimPlace(shipString,position,velocity){ // turn a shipstring into a real ship and place it in the world. also generate attachments and stuff.


      var shipArray = JSON.parse(shipString);
      var newShip = Ship('clean');
      Matter.Engine.clear(this.buildViewEngine);

      var moduleBodies = [];
        for (var i = shipArray.length - 1; i >= 0; i--) {
            var parsedModule = shipArray[i];
            var newShipModule = ShipModule(parsedModule.moduleType, parsedModule.position);
            if (newShipModule.type == 'capsule') {
                newShip.shipRoot = newShipModule.body;
            }
            newShipModule.belongsTo = newShip;
            newShipModule.body.belongsTo = newShipModule;
           // Matter.Body.setPosition(newShipModule.body, parsedModule.position);
            Matter.Body.setAngle(newShipModule.body, parsedModule.angle);
            newShip.shipModules.push(newShipModule);
            Matter.Body.scale(newShipModule.body, 1.1, 1.1);
            Matter.World.addBody(this.buildViewEngine.world, newShipModule.body);
        }

        Matter.Engine.update(this.buildViewEngine);


        for (var i = newShip.shipModules.length - 1; i >= 0; i--) {

            var module = newShip.shipModules[i];
            Matter.Body.scale(module.body, 1 / 1.1, 1 / 1.1);
            Matter.Composite.remove(this.buildViewEngine.world,module.body);
             moduleBodies.push(module.body);


        }



            newShip.compoundBody = Matter.Body.create({
            parts: moduleBodies
        });

        //this.player.shipRoot = capsuleModule;
        newShip.compoundBody.physicsObject = true;
       newShip.compoundBody.strokeColor = '#dedbef'; // the invisible color
    newShip.compoundBody.belongsTo = newShip; // no

        Matter.World.add(this.engine.world, newShip.compoundBody);
        this.ships.push(newShip);

        for (var i = newShip.shipModules.length - 1; i >= 0; i--) {
            if (newShip.shipModules[i].visualEffect != null) {
                var visualEffectBody = newShip.shipModules[i].visualEffect.body;

                Matter.World.add(this.engine.world, visualEffectBody);
            }
        }

        Matter.Body.setPosition(newShip.compoundBody, position);
        Matter.Body.setVelocity(newShip.compoundBody, velocity);
       // Matter.Body.setAngle(this.player.compoundBody, playerAngle);

       return newShip;
    }

    shipToString(ships) { // turns all the ships in that array into one big ass shipstring


        var shipRepresentation = [];

        for (var j = 0; j < ships.length-1; j++) {
            var ship = ships[j];

        for (var i = ship.shipModules.length - 1; i >= 0; i--) {
            var module = ship.shipModules[i];

            var moduleRepresentation = {};
            moduleRepresentation.position = module.body.position;
            moduleRepresentation.moduleType = module.moduleType;
            moduleRepresentation.angle = module.body.angle;

            shipRepresentation.push(moduleRepresentation);

        }
}

       return String(JSON.stringify(shipRepresentation));
    }


    fly() {




        var shipRepresentation = [];

        for (var i = this.availableModules.length - 1; i >= 0; i--) {
            var module = this.availableModules[i];

            var moduleRepresentation = {};
            moduleRepresentation.position = module.body.position;
            moduleRepresentation.moduleType = module.moduleType;
            moduleRepresentation.angle = module.body.angle;

            shipRepresentation.push(moduleRepresentation);

        }


        var shipString = String(JSON.stringify(shipRepresentation));

        //var shimPort = prompt("Import/Export", shipString);


        //provides the build mode ship as a stringified JSON object, then replaces it with whatever is in the string box. allows users to import and export.
        this.shimPort(shipString, true);

        //takes your game mode ship and replaces it with your build mode ship
        //everything in availableModules goes in, for now.
        var playerPosition = this.player.compoundBody.position;
        var playerVelocity = this.player.compoundBody.velocity;
        var playerAngle = this.player.compoundBody.angle;

        //clear player ship
        Matter.Composite.remove(this.engine.world, this.player.compoundBody);
        this.player.shipModules = [];
        for (var i = this.availableModules.length - 1; i >= 0; i--) {
            var module = this.availableModules[i];
            if (module.type == 'capsule') {
                this.player.shipRoot = module.body;
            }
            Matter.Body.scale(module.body, 1.1, 1.1);
        }

        //   var jsonModules = JSON.stringify(this.availableModules);
        //  alert(String(jsonModules));


        //




        var moduleBodies = [];
        Matter.Engine.update(this.buildViewEngine);
        for (var i = this.availableModules.length - 1; i >= 0; i--) {

            //scale modules back down
            Matter.Body.scale(module.body, 1 / 1.1, 1 / 1.1);
            var module = this.availableModules[i];
            var relativePosition = Matter.Vector.sub(module.body.position, this.player.shipRoot.position); // this makes everything relative to the shiproot and also sets the shiproot to 0,0.
            Matter.Body.setPosition(module.body, relativePosition);
            this.player.shipModules.push(module);
            moduleBodies.push(module.body);

            Matter.Composite.remove(this.buildViewEngine.world, module.body); // remove module bodies from the buildviewengine world
        }

        this.player.compoundBody = Matter.Body.create({
            parts: moduleBodies
        });

        //this.player.shipRoot = capsuleModule;
        this.player.compoundBody.physicsObject = true;
        this.player.compoundBody.strokeColor = '#dedbef'; // the invisible color
        this.player.compoundBody.belongsTo = this.player;
        Matter.World.add(this.engine.world, this.player.compoundBody);

        for (var i = this.player.shipModules.length - 1; i >= 0; i--) {
            if (this.player.shipModules[i].visualEffect != null) {
                var visualEffectBody = this.player.shipModules[i].visualEffect.body;

                Matter.World.add(this.engine.world, visualEffectBody);
            }
        }

        Matter.Body.setPosition(this.player.compoundBody, playerPosition);
        Matter.Body.setVelocity(this.player.compoundBody, playerVelocity);
        Matter.Body.setAngle(this.player.compoundBody, playerAngle);
        this.cameraFocusObject = this.player.compoundBody;
        this.availableModules = [];
    }

    renderMessageLog() {
        if (this.player.orbiting.name != null) {
            this.context.fillStyle = '#ffffff';
            this.context.fillText("Orbiting " + String(this.player.orbiting.name), 1300, 622);
        } else {
            this.context.fillStyle = '#ffffff';
            this.context.fillText("Orbit unknown", 1300, 622);
        }

        this.context.fillStyle = '#ffffff';
        this.context.fillText(this.messageLog, 1300, 650);
    }

    renderLightSources() {
        // just paint fireworks as gradients over the top for now
        for (var i = this.lightSources.length - 1; i >= 0; i--) {
            var lightSource = this.lightSources[i].visualEffect;

            // transform light source coordinates to view
            // transformToView(vertex, centerScreenObject, zoomFactor, offset) 
            var transformedXY = transformToView(lightSource.body.position, this.cameraFocusObject, this.zoomFactor, this.offset);

            //this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
            this.context.globalCompositeOperation = 'lighten';
            this.lightfieldgradient = this.context.createRadialGradient(transformedXY.x, transformedXY.y, 0, transformedXY.x, transformedXY.y, 25 * this.zoomFactor);
            //var gradient=this.context.createRadialGradient(50,50,50,50,50,200);



           // var rGBColor1 = hexToRgb(lightSource.body.fillStyle);

    // average reds
   // var averageRed = String(rGBColor1.r);

    // average greens
   // var averageGreen = String(rGBColor1.g);

    //average blues
   /// var averageBlue = String(rGBColor1.b);

          //  var hexColor = 'rgba(' + String(rGBColor1.r)+','+String(rGBColor1.g) + ',' + String(rGBColor1.b)+',0.3)';

            this.lightfieldgradient.addColorStop(0, 'rgba(255,165,0,0.3)');
            this.lightfieldgradient.addColorStop(1, 'rgba(0,0,0,0.0)');
            this.context.fillStyle = this.lightfieldgradient;
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.globalCompositeOperation = 'source-over';
        }
    }

    render() {
        var bodies = Composite.allBodies(this.engine.world); // render bodies. it is done this way because eveyrthing in the physics engine will be rendered.
        for (var i = 0; i < bodies.length; i += 1) {
            if (bodies[i].visible != false) { // let's make it exclusive instead of inclusive, so it still works if visible is undefined.
                renderObject(this.lightSources, bodies[i], this.cameraFocusObject, this.zoomFactor, this.context, this.canvas, 'body', this.offset); //renderObject(body, centerScreenBody, zoomFactor, context, canvas)
            }
        }

        var constraints = Composite.allConstraints(this.engine.world); // render constraints
        for (var i = 0; i < constraints.length; i += 1) {
            renderObject(this.lightSources, constraints[i], this.cameraFocusObject, this.zoomFactor, this.context, this.canvas, 'constraint'); //renderObject(body, centerScreenBody, zoomFactor, context, canvas)
        }
        this.hud(); // now is a good time for that
    }

    orbitalInsertion(object, target, constant, height) { // this does not work at all and I don't know why
        var velocity = 1;
        var positionVector = Matter.Vector.add(target.position, Matter.Vector.create(0, height));
        var velocityVector = Matter.Vector.sub(target.velocity, Matter.Vector.create(velocity, 0));
        Matter.Body.setPosition(object, positionVector);
        Matter.Body.setVelocity(object, velocityVector);
    }

    oneWayInteraction(object1, object2, constant, compositeBody, modifier, powah) {

        if (modifier < 0){
 var hello = 5;
        }

        if (object1.physicsObject) { // only do physics on physical objects
            if (object2 == null) { // ignore nulls and undefined
                console.log(object2); // this is actually pretty stupid
                return;
            }

            var distance = Matter.Vector.sub(object1.position, object2.position);
            var scalarDistance = Matter.Vector.magnitude(distance);
            var force = (constant * object1.mass * object2.mass) / (Math.pow(scalarDistance,powah)); //F = Gm1m2/r2,
            if (force != Infinity) {

                force = force * modifier;
                force = Matter.Vector.neg(Matter.Vector.mult(distance, force))

                Matter.Body.applyForce(compositeBody, object1.position, force);


                return force;
            }
        }
    }

    keyboardControls() {
        //keyboard controls are inputs by the player. this syncs up global control flags with actual game mechanics.


        if (s) {
            /*
            if (mode == "build") {
                var jsonShip = JSON.stringify();
            }
            */
        }

        if (r) {
            if (mode == "build") {
                if (tateLock == false) {
               Matter.Body.setAngle( game.dragging.body,   ( addRadians(game.dragging.body.angle, (0.5*Math.PI)/6  )    ) );
               tateLock = true;
           }
            }
        }

        if (f) {

            
        }

        if (left) {
            if (mode == "build") {
                this.buildViewCamera.position.x -=5/this.zoomFactorBuild;
            }

            if (mode == "game") {
                this.player.controlAngle -= 0.01;
                if (this.player.controlAngle < 0) {
                    this.player.controlAngle = 2 * Math.PI;
                }
            }
        }
        if (right) {
            if (mode == "build") {
                this.buildViewCamera.position.x +=5/this.zoomFactorBuild;
            }
            if (mode == "game") {
                this.player.controlAngle += 0.01;
                if (this.player.controlAngle > 2 * Math.PI) {
                    this.player.controlAngle = 0;
                }
            }
        }
        if (up) {
            if (mode == "build") {
                this.buildViewCamera.position.y -=5/this.zoomFactorBuild;
            }
            if (mode == "game") {

                this.player.throttle = 1;
            }
        } else {
            this.player.throttle = 0;
        }

        if (down) {
            if (mode == "build") {
                this.buildViewCamera.position.y +=5/this.zoomFactorBuild;
            }

        }
        if (plus) {

            if (mode == "game") {
                if (this.zoomFactor < 100) {
                    this.zoomFactor += (this.zoomFactor / 10);
                }
            }
            if (mode == "build") {
                if (this.zoomFactorBuild < 100) {
                    this.zoomFactorBuild += (this.zoomFactorBuild / 10);
                }
            }
        }
        if (minus) {
            if (mode == "game") {
                if (this.zoomFactor > 0.001) {
                    this.zoomFactor -= (this.zoomFactor / 10);
                }
            }
            if (mode == "build") {
                if (this.zoomFactorBuild > 0.001) {
                    this.zoomFactorBuild -= (this.zoomFactorBuild / 10);
                }
            }

        }

    }

    autoControls() {


        



        //auto controls are done by machine
        for (var i = this.ships.length - 1; i >= 0; i--) {
            var ship = this.ships[i];


            //team fights!
            //find closest enemy
            var closestEnemy = null;
            var closestEnemyDistance = 10000000000000000000000;

             for (var j = this.ships.length - 1; j >= 0; j--) {
            var ship2 = this.ships[j];

            if (ship2.team != ship.team) {

                var ship2Distance = Matter.Vector.magnitude(Matter.Vector.sub(ship2.compoundBody.position,ship.compoundBody.position));
                if (ship2Distance < closestEnemyDistance) {closestEnemy = ship2}

            }
    }

    if (closestEnemy != null) {ship.target = closestEnemy}

        


            if (ship.maneuver != null) { // not sure where this belongs in relation to ai routines. will write ai routines first, integrate this later.
                switch (ship.maneuver.type) {
                    case 'attack':
                        { // at the moment, this just accelerates the ship toward the target.
                            var targetAngle = Matter.Vector.angle(ship.compoundBody.position, ship.target.compoundBody.position);
                            targetAngle = addRadians(targetAngle, 0.5 * Math.PI);
                            ship.controlAngle = targetAngle;
                            var difference = subtractRadians(ship.compoundBody.angle, targetAngle)

                            if (difference < 0.1 * Math.PI) {
                                ship.throttle = 1;
                            } else {
                                ship.throttle = 0;
                            }


                             if (Math.abs(difference) < (0.01 * Math.PI) && Math.abs(ship.compoundBody.angularVelocity) < 0.01) {
                                ship.trigger = 1;
                            } else {
                                ship.trigger = 0;
                            }


                        }
                        break;
                    case 'circularize':
                        {

                            //point tangent to the planet
                            //accelerate until you aren't falling anymore


                        }
                        break;
                }
            }




            //turn all the modules on and off and shit
            for (var k = ship.shipModules.length - 1; k >= 0; k--) {
                var module = ship.shipModules[k];
            
            if (module.type == 'engine') {
                if (ship.throttle > 0) {
                module.active = true;
            }
            else {
                module.active = false;
            }
            }
       

             if (module.type == 'capsule') {
                module.active = true; // i guess we always want these to be on.
            }
            if (module.type == 'rcsRockets') {



                var poopDicks = Math.abs(subtractRadians(ship.controlAngle,ship.compoundBody.angle));
                var poopTits = Math.abs(subtractRadians(ship.compoundBody.angle,ship.controlAngle));
                var finalSolution = 0;

                if (poopDicks > poopTits) {
                    finalSolution = poopTits;
                }
                else {
                    finalSolution = poopDicks;
                }

                if (Math.abs(finalSolution) > 0.005) {

                module.active = true; // i guess we always want these to be on.
            }
            else {

                module.active = false; // i guess we always want these to be on.

            }


            }


   if (module.type == 'gun') {
            if (ship.trigger && module.cooldown == 0) {
                module.active = true; // i guess we always want these to be on.
            }
            else {
                module.active = false; // i guess we always want these to be on.
            }

            }




            if (module.online == false) { // if the module doesn't have enough shit, don't use it.
                module.active = false;
            }


        }


        }
    }

    resourceConsumption() {

/*
    newShipModule.type = 'none'; //what the module does
    newShipModule.moduleType = moduleType; // just records what type the module was created as
    newShipModule.broken = false; //whether the module is in a functional state or not
    newShipModule.online = false; //whether the module is powered and such
    newShipModule.active = false; // whether the module is in use or not
    newShipModule.resourceType = 'none'; // what kind of resource the module holds
    newShipModule.resourceQuantity = 0; //  how much it holds
    newShipModule.resourceQuantityMax = 0; //how much it can hold
    newShipModule.resourceProduction = 0; //how much it creates
    newShipModule.resourceRequired = 'none'; // what sort of resource it needs to work
    newShipModule.resourceConsumption = 0; // how much of that it needs to work
    newShipModule.resourceConsumed = 0; // how much it got this turn
   // newShipModule.satisfied = false; //did the module get enough stuff already. we probably don't need this.
    newShipModule.belongsTo = null;
    newShipModule.attachedTo = []; //a list of other modules that this shipmodule is attached to. 
    */


    for (var i = this.ships.length - 1; i >= 0; i--) {
        var ship = this.ships[i];
        for (var j = ship.shipModules.length - 1; j >= 0; j--) {
            var module1 = ship.shipModules[j];
            if (module1.resourceRequired == 'none') {
                continue;
            }
            var resourceAvailable = 0;
            module1.resourceConsumed = 0;
            for (var k = ship.shipModules.length - 1; k >= 0; k--) {
                var module2 = ship.shipModules[k];

                if (module1.resourceConsumed >= module1.resourceConsumption) {
                    break; // when you're done, you're done.
                }

                if (module1.resourceRequired == module2.resourceType) {
                    resourceAvailable += module2.resourceQuantity
                    if (module1.resourceConsumption > module2.resourceQuantity) {
                        if (module1.active) {
                            module1.resourceConsumed += module2.resourceQuantity;
                            module2.resourceQuantity -= module2.resourceQuantity;
                        }
                    }
                    if (module1.resourceConsumption < module2.resourceQuantity) {
                        if (module1.active) {
                            module1.resourceConsumed += module1.resourceConsumption;
                            module2.resourceQuantity -= module1.resourceConsumption;
                        }
                    }
                }
            }
            if (resourceAvailable > module1.resourceConsumption) {
                module1.online = true;
            } else {
                module1.online = false;
            }
        }
    }
}

    moduleFunctions() {



            //here

            for (var i = this.ships.length - 1; i >= 0; i--) {
                var ship = this.ships[i];

                for (var j = ship.shipModules.length - 1; j >= 0; j--) {
                    var module1 = ship.shipModules[j];
                    var moduleBody = module1.body;

                    if (module1.type == 'capsule' && module1.active) {
                        // i think the trajectory feeler stuff should only be calculated for the ship root. even if a ship has multiple capsules, you would only need one trajectory.
                    }

                    if (module1.type == 'bullet') {
                     

                       
                      }

                    if (module1.type == 'rcsRockets' && module1.active) {
                        var angle = Matter.Vector.angle(moduleBody.position, ship.compoundBody.position);
                        var route1 = subtractRadians(ship.controlAngle, ship.compoundBody.angle);
                        var route2 = subtractRadians(ship.compoundBody.angle, ship.controlAngle);
                        var smlDistance = 0;

                        if (route1 < route2) {
                            angle -= (0.5 * Math.PI);
                            smlDistance = route1;
                        } else {
                            angle += (0.5 * Math.PI);
                            smlDistance = route2;
                        }

                        if (smlDistance > 1) {
                            smlDistance = 1;
                        }

                        var magnitude = 0.00001 * smlDistance; //subtractRadians(ship.compoundBody.angle,ship.controlAngle);
                        var xComponent = magnitude * Math.cos(angle);
                        var yComponent = magnitude * Math.sin(angle);
                        var vector = Matter.Vector.create(xComponent, yComponent);
                        Matter.Body.applyForce(ship.compoundBody, module1.body.position, vector);
                        var correctionMagnitude = (ship.compoundBody.angularVelocity * 0.00005 * (((subtractRadians(ship.controlAngle, ship.compoundBody.angle)) / 2 * Math.PI)));

                        var xComponentCorrection = correctionMagnitude * Math.cos(angle);
                        var yComponentCorrection = correctionMagnitude * Math.sin(angle);
                        var vectorCorrection = Matter.Vector.create(xComponentCorrection, yComponentCorrection);
                        Matter.Body.applyForce(ship.compoundBody, module1.body.position, vectorCorrection);

                    }
                    if (module1.type == 'engine') {


                        if (module1.active) {
                        module1.visualEffect.body.visible = true;
                        if (contains(this.lightSources, module1) == false) {
                            this.lightSources.push(module1);
                        } else { //make sure there is no engine effect.
                            module1.visualEffect.body.visible = false;
                            var module1index = 0;
                            this.lightSources = remove(this.lightSources, module1);
                        }
                        if (module1.visualEffect != null) {
                            var finalModuleAngle = addRadians(module1.body.angle, ship.compoundBody.angle);
                            finalModuleAngle = addRadians(finalModuleAngle, Math.PI);
                            var visualPosition = Matter.Vector.add(module1.body.position, module1.visualEffect.offsetVector);
                            var finalModulePosition = Matter.Vector.rotateAbout(visualPosition, finalModuleAngle, module1.body.position);
                            Matter.Body.setPosition(module1.visualEffect.body, finalModulePosition);
                            Matter.Body.setAngle(module1.visualEffect.body, finalModuleAngle);
                        }
                        var angle = addRadians(moduleBody.angle, ship.compoundBody.angle);
                        angle -= 0.5 * Math.PI; // don't know why this is necessary but it is
                        var xComponent = this.warpFactor * 0.000001 * ship.throttle * module1.resourceProduction * Math.cos(angle);
                        var yComponent = this.warpFactor * 0.000001 * ship.throttle * module1.resourceProduction * Math.sin(angle);
                        var vector = Matter.Vector.create(xComponent, yComponent);
                        Matter.Body.applyForce(ship.compoundBody, moduleBody.position, vector);
                    }
                    else{

                        module1.visualEffect.body.visible = false;
                    }



                    }
                    if (module1.type == 'gun') {

                          var finalModuleAngle = addRadians(module1.body.angle, ship.compoundBody.angle);
                        finalModuleAngle = addRadians(finalModuleAngle,-0.5* Math.PI);
                        // var visualPosition = Matter.Vector.add(module1.body.position,ship.compoundBody.position);
                        var visualPosition = Matter.Vector.add(module1.body.position, module1.visualEffect.offsetVector);
                        var finalModulePosition = Matter.Vector.rotateAbout(visualPosition, finalModuleAngle, module1.body.position);

                        if (module1.cooldown > 0) {
                            module1.cooldown -= 1;
                        } 

                        if (module1.active) {
                        // this snippet aligns the visual object to where it is actually produced on the module
                      
                        Matter.Body.setPosition(module1.visualEffect.body, finalModulePosition);
                        Matter.Body.setAngle(module1.visualEffect.body, finalModuleAngle);
                        
                        // eject a supersonic piece of red hot metal
                       
                            
                            module1.visualEffect.body.visible = true; // visualEffect should be a muzzle flash
                            
                            var xComponent = 5 * Math.cos(finalModuleAngle);
                            var yComponent = 5 * Math.sin(finalModuleAngle);
                            // still need to add ship angular velocity to this
                            var velocity = Matter.Vector.create(xComponent, yComponent);
                            velocity = Matter.Vector.add(ship.compoundBody.velocity, velocity);
                            //  Matter.Body.setVelocity(module1.visualEffect.body,velocity);
                            // add bullet!


                            var bullet = Ship('bullet'); // the cool thing about using a proper ship  for a bullet is that you can easily create weapons with actions, such as explosive or guided shells.
                            this.ships.push(bullet);


                            Matter.Body.setPosition(bullet.compoundBody, finalModulePosition);
                            Matter.Body.setVelocity(bullet.compoundBody, velocity);
                           Matter.World.add(this.engine.world, bullet.compoundBody);


                            module1.cooldown = 10;
                        }
                    

                    
                        if (module1.cooldown < 9) {
                        module1.visualEffect.body.visible = false;
                    
                        }
                        else {
                            Matter.Body.setPosition(module1.visualEffect.body, finalModulePosition);
                             finalModuleAngle = addRadians(finalModuleAngle,0.5* Math.PI);
                        Matter.Body.setAngle(module1.visualEffect.body, finalModuleAngle);
                        }
                }

            }
        }
    }


    rails() {

        // seeing as we can't do accurate maneuvering and station keeping yet, i'm going to try to put a ship on rails.
        for (var i = this.ships.length - 1; i >= 0; i--) {
           var ship = this.ships[i];
        if (ship.railsTarget != null) {
               // var railsXComponent = ship.railsHeight * Math.cos((ship.railsVelocity * this.warpFactor) + Matter.Vector.angle(ship.railsTarget.body.position, ship.compoundBody.position));
                //var railsYComponent = ship.railsHeight * Math.sin((ship.railsVelocity * this.warpFactor) + Matter.Vector.angle(ship.railsTarget.body.position, ship.compoundBody.position));


var railsXComponent = ship.railsHeight * Math.cos(ship.railsPhaseAngle);
var railsYComponent = ship.railsHeight * Math.sin(ship.railsPhaseAngle);

ship.railsPhaseAngle = addRadians(ship.railsPhaseAngle,ship.railsVelocity*this.warpFactor);


                Matter.Body.setPosition(ship.compoundBody, Matter.Vector.create(railsXComponent, railsYComponent));

            }

        }



        //planetary motion is done by clockwork instead of gravity, for better performance and avoidance of n-body disasters. still acts real fruity... moon runs away from you..
        for (var i = this.planets.length - 1; i >= 0; i--) {
            var planet = this.planets[i];

            if (planet.railsTarget != null) {
                var railsXComponent = planet.railsHeight * Math.cos((0.0001) + Matter.Vector.angle(planet.railsTarget.body.position, planet.body.position));
                var railsYComponent = planet.railsHeight * Math.sin((0.0001) + Matter.Vector.angle(planet.railsTarget.body.position, planet.body.position));

                Matter.Body.setPosition(planet.body, Matter.Vector.create(railsXComponent, railsYComponent));

            }
        }
    }

    generateClouds(planet, medianCloudHeight) {
        //how to make clouds?
        // go a circle around the planet using trig
        var angle = 0;
        var x = 0;
        var y = 0;
        var clouds = [];
        var newCloud = {};
        var cloudDice = 0.5;

        for (var i = 0; i < 360; i++) {
            if (i % 3 > 0) { // skip every second cloud, saves on performance
                continue;
            }

            angle = (i * (Math.PI / 180)); // degrees to radians
            angle = angle + (0.05 * (Math.random() - 0.5));
            var randomisedHeight = medianCloudHeight + (planet.atmosphere.height * 0.25 * (Math.random() - 0.5));
            x = randomisedHeight * Math.cos(angle);
            y = randomisedHeight * Math.sin(angle);

            // roll a dice, if you get more than a certain number, you should make a cloud
            cloudDice += (Math.random() - 0.5) * 0.3;
            // cloudDice = cloudDice / 2;

            if (cloudDice > 1) {
                cloudDice = 1;
            }

            if (cloudDice < 0) {
                cloudDice = 0;
            }

            if (cloudDice > 0.9) {
                var cloudBonus = 1 + ((cloudDice - 0.9) * 10);
                var radius = 5 + (cloudBonus * 40 * (((Math.random() - 0.5))));
                var points = Math.round(radius / 2);
                //var heightVariationX = x * Math.random();
                // put a circle there and randomise it a little bit
                var cloud = Matter.Bodies.polygon(x + planet.body.position.x, y + planet.body.position.y, points, radius, { // 50, 3100 - ship offset 50, 3100 - module offset 0, 0
                    density: 0.1
                });

                // var randomisedVertices = cloud.vertices;
                cloud.relativePosition = Matter.Vector.sub({
                    x: x,
                    y: y
                }, planet.body.position);

                Matter.Body.setStatic(cloud, true);
                cloud.physicsObject = false; // should gravity equations apply to this? no, it is on rails

                for (var j = 0; j < cloud.vertices.length; j++) {
                    var vertex = cloud.vertices[j];


                    var randomisationVector = Matter.Vector.create(15 * (Math.random() - 0.5), (15 * Math.random() - 0.5));

                    vertex.x += randomisationVector.x;
                    vertex.y += randomisationVector.y;


                }

                cloud.physicsObject = false;
                cloud.collisionFilter.group = 3;
                cloud.category = redCategory;
                cloud.mask = redCategory;

                cloud.fillStyle = 'aaaaee';
                cloud.strokeStyle = 'eeeeee';


                cloud.isACloud = true;

                clouds.push(cloud);
            }


        }

        planet.clouds = clouds;

    }
    renderClouds() {

        for (var i = this.planets.length - 1; i >= 0; i--) {
            var planet = this.planets[i];
            if (planet.clouds != null) {
                if (planet.clouds.length > 0) {
                    for (var i = planet.clouds.length - 1; i >= 0; i--) {
                        var cloud = planet.clouds[i];

                        renderObject(this.lightSources, cloud, this.cameraFocusObject, this.zoomFactor, this.context, this.canvas, 'cloud', this.offset);
                    }
                }
            }
        }


    }

    atmospheres() {



        for (var i = this.planets.length - 1; i >= 0; i--) {
            var planet = this.planets[i];

            if (planet.atmosphere != null) {

                // pin the atmosphere to the planet.
                Matter.Body.setPosition(planet.atmosphere.body, planet.body.position);
                Matter.Body.setVelocity(planet.atmosphere.body, planet.body.velocity);

                // pin the planet to the aether.

                Matter.Body.setPosition(planet.body, planet.initialPosition);
                Matter.Body.setVelocity(planet.body, Matter.Vector.create(0, 0));


                //pin clouds to the planet.
                if (planet.clouds != null) {
                    for (var j = planet.clouds.length - 1; j >= 0; j--) {
                        var cloud = planet.clouds[j];

                        if (cloud.relativePosition == null) {
                            continue;
                        }

                        Matter.Body.setPosition(cloud, Matter.Vector.add(planet.body.position, cloud.relativePosition));
                        Matter.Body.setVelocity(cloud, planet.body.velocity);


                    }
                }

                var transformedAtmosphereOrigin = transformToView(planet.atmosphere.body.position, this.player.compoundBody, this.zoomFactor, this.offset);
                var transformedAtmosphereSurface = transformToView(Matter.Vector.add(planet.atmosphere.body.position, Matter.Vector.create(planet.radius, 0)), this.player.compoundBody, this.zoomFactor, this.offset);
                var transformedAtmosphereBoundary = transformToView(Matter.Vector.add(planet.atmosphere.body.position, Matter.Vector.create((planet.radius + planet.atmosphere.height), 0)), this.player.compoundBody, this.zoomFactor, this.offset);
                var transformedAtmosphereSurface = Matter.Vector.sub(transformedAtmosphereSurface, transformedAtmosphereOrigin);
                var transformedAtmosphereBoundary = Matter.Vector.sub(transformedAtmosphereBoundary, transformedAtmosphereOrigin);

                this.context.beginPath();
                var gradient = this.context.createRadialGradient(transformedAtmosphereOrigin.x, transformedAtmosphereOrigin.y, transformedAtmosphereSurface.x, transformedAtmosphereOrigin.x, transformedAtmosphereOrigin.y, transformedAtmosphereBoundary.x);


                gradient.addColorStop(0, planet.atmosphere.body.fillColor);
                gradient.addColorStop(1, 'black');

                this.context.arc(transformedAtmosphereOrigin.x, transformedAtmosphereOrigin.y, transformedAtmosphereBoundary.x, 0, 2 * Math.PI);

                this.context.fillStyle = gradient;
                this.context.fill();

            }




        }




        for (var i = this.engine.world.bodies.length - 1; i >= 0; i--) {
            var object1Body = this.engine.world.bodies[i];

            for (var j = object1Body.parts.length - 1; j >= 0; j--) {
                var object1BodyPart = object1Body.parts[j];

                for (var k = this.planets.length - 1; k >= 0; k--) {
                    var object2 = this.planets[k];

                    if (object2.atmosphere == null) {
                        continue;
                    }

                    if (object1BodyPart != object2.body) {

                        var realHeight = Matter.Vector.magnitude(Matter.Vector.sub(object1BodyPart.position, object2.body.position));
                        if ((realHeight) < (object2.radius + object2.atmosphere.height)) { //check if distance between centers is equal or less than atmosphere height
                            object1BodyPart.frictionAir = 0.025 - (0.025 * ((realHeight - object2.radius) / (object2.atmosphere.height)));
                        } else {
                            object1BodyPart.frictionAir = 0;
                        }

                    }
                }
            }
        }
    }

    gravity(multiplier) {

        //gravitate ships to planets only - super rapid performance, no cool n-body effects.
        for (var i = this.ships.length - 1; i >= 0; i--) {
            var ship = this.ships[i];


            //this is for trajectory paths
            ship.path.push(ship.compoundBody.position);
            ship.path = ship.path.slice(0, 50);


            var strongestPull = 0;
            var strongestPuller = null;
            for (var j = this.planets.length - 1; j >= 0; j--) {
                var planet = this.planets[j];

                var pull = this.oneWayInteraction(ship.compoundBody, planet.body, this.gravitationalConstant, ship.compoundBody, multiplier,2);



                pull = Matter.Vector.magnitude(pull);

                if (pull > strongestPull) {
                    strongestPull = pull;
                    strongestPuller = planet;
                }
            }

            ship.orbiting = strongestPuller;
        }
    }

    explosions() {

        for (var i = this.activeExplosions.length - 1; i >= 0; i--) {
            var explosion = this.activeExplosions[i];


            //explosion.position = transformToView(explosion.position,this.cameraFocusObject,this.zoomFactor,this.offset); //(vertex, centerScreenObject, zoomFactor, offset)
            this.context.beginPath();
            var gradient = this.context.createRadialGradient(explosion.position.x, explosion.position.y, 0, explosion.position.x, explosion.position.y, 50*this.zoomFactor);


            gradient.addColorStop(0, 'orange');
            gradient.addColorStop(1, 'rgba(0,0,0,0.0)');

            this.context.arc(explosion.position.x, explosion.position.y, 50*this.zoomFactor, 0, 2 * Math.PI);

            this.context.fillStyle = gradient;
            this.context.fill();




            //perform physics

            for (var j = this.ships.length - 1; j >= 0; j--) {
              var ship =  this.ships[j];


//0.0000000000003
             // this.oneWayInteraction(ship.compoundBody,explosion,0.3,ship.compoundBody,-10000000,4); //  oneWayInteraction(object1, object2, constant, compositeBody, modifier) {

                //silly because this is not a mass based gravitational attraction.



            var distance = Matter.Vector.sub(ship.compoundBody.position, explosion.position);
            var scalarDistance = Matter.Vector.magnitude(distance);
            var force = 0;
            if (scalarDistance < 50) {

                 force = -0.0000025*(1/(scalarDistance/50));

            }
       
        

                force = Matter.Vector.neg(Matter.Vector.mult(distance, force))

                Matter.Body.applyForce(ship.compoundBody, ship.compoundBody.position, force);



        }



           // explosion.counter -= 1;

        }


                this.activeExplosions = remove(this.activeExplosions,explosion);
            

    }




    recursiveList(module, destroyedModules, list) {
        // var list = []; don't put this here or it will blank out every recursion, hand it an empty list instead
        // for every module connected to the broken module, make a deep list of all the other modules it is connected to
        for (var i = 0; i < module.attachedTo.length; i++) {

            var subModule = module.attachedTo[i];

            if (contains(destroyedModules, subModule)) {
                continue;
            }

            if (contains(list, subModule) == false) {

                list.push(subModule);
                this.recursiveList(subModule, destroyedModules, list); // i think this modifies list in place?

            }


        }
        // return list;
    }


    instateAttachmentHandler() {

        // figure out which modules are touching and attach them to each other
        Matter.Events.on(this.buildViewEngine, 'collisionStart', function(event) {

            //    if (mode == "build") {

            var pairs = event.pairs;
            // do something with the pairs that have started collision
            for (var i = pairs.length - 1; i >= 0; i--) {
                var pair = pairs[i];
                pair.bodyA.belongsTo.attachedTo.push(pair.bodyB.belongsTo); // basically if anything is touching when you leave build view, attach it together.
                pair.bodyB.belongsTo.attachedTo.push(pair.bodyA.belongsTo);

                //    }

            }

        });

    }

    instateCollisionHandler() {

        //collision pairs
        //Events.on(engine, "collisionStart", callback)
        Matter.Events.on(this.engine, 'collisionStart', function(event) {

            var pairs = event.pairs;
            // do something with the pairs that have started collision
            for (var i = pairs.length - 1; i >= 0; i--) {
                var pair = pairs[i];
                if (pair.bodyA.destructionThreshold != null) {
                    //check collision speed... difference between vectors
                    var bodyDifference = Matter.Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
                    var parentDifference = Matter.Vector.sub(pair.collision.parentA.velocity, pair.collision.parentB.velocity);
                    var absoluteDifference = Matter.Vector.magnitude(Matter.Vector.sub(parentDifference, bodyDifference));


                    //if both are docking ports, dock the ships together! hahahahahahahaha


                    // if (Matter.Vector.magnitude(difference) > 1) { // destruction speed threshold
                    if (pair.bodyA.physicsObject && absoluteDifference > pair.bodyA.destructionThreshold * 0.25) {

                        // destroy body A
                        var ship = pair.bodyA.parent.belongsTo;
                        var module = pair.bodyA.belongsTo;

                        ship.destroyedModules.push(module);

                        var newExplosion = {};
                        newExplosion.position = module.body.position;
                      //  newExplosion.counter = 5;
                        newExplosion.mass = 10;
                        game.activeExplosions.push(newExplosion);

                    }
                }

                if (pair.bodyB.destructionThreshold != null) {

                    //check collision speed... difference between vectors
                    var bodyDifference = Matter.Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
                    var parentDifference = Matter.Vector.sub(pair.collision.parentA.velocity, pair.collision.parentB.velocity);
                    var absoluteDifference = Matter.Vector.magnitude(Matter.Vector.sub(parentDifference, bodyDifference));

                    if (pair.bodyB.physicsObject && absoluteDifference > pair.bodyB.destructionThreshold * 0.25) {
                        // destroy body B

                        var ship = pair.bodyB.parent.belongsTo;
                        var module = pair.bodyB.belongsTo;


                        ship.destroyedModules.push(module);
                        var newExplosion = {};
                        newExplosion.position = module.body.position;
                        newExplosion.counter = 5;
                        newExplosion.mass = 10;
                        game.activeExplosions.push(newExplosion);
                    }




                }

            }



        });

    }

    regenerateAttachments(list) { // given the list, figures out what is still attached to what. returns the list, with all modules having updated attachments.


        //clear the build view engine
        //    Matter.Engine.clear(this.buildViewEngine);

        //put the list in build view engine
        for (var i = list.length - 1; i >= 0; i--) {
            var module = list[i];
            Matter.World.addBody(this.buildViewEngine, module.body);
            Matter.Body.scale(module.body, 1.1, 1.1);
            module.attachedTo = [];
        }

        //instate attachment generator collision handler // actually this is already done in buildviewengine.
        //scale the modules


        Matter.Engine.update(this.buildViewEngine); // this actually does all of that stuff



        //detect and record collision that represent attachment
        //unscale modules

        for (var i = list.length - 1; i >= 0; i--) {

            var module = list[i];
            Matter.Body.scale(module.body, 1 / 1.1, 1 / 1.1);
            Matter.Composite.remove(this.buildViewEngine.world, module.body, false);
        }



        //apply attachments to list
        //remove modules from build view engine
        //clear the build view engine



        return list;

    }


    breakApart(ship, destroyedModules) { // breaks the ship at module. ship is separated into a number of other ships depending on what was attached to module. original ship is removed from world and replaced.

        //this is a cop out solution that might look good

        //remove ship from world

        var initialVelocity = ship.compoundBody.velocity;

        Matter.Composite.remove(this.engine.world, ship.compoundBody);
        this.ships = remove(this.ships, ship);

        for (var i = ship.shipModules.length - 1; i >= 0; i--) {
            var module = ship.shipModules[i];
            if (module.visualEffect != null) {

                Matter.Composite.remove(this.engine.world, module.visualEffect.body);
            }
        }

        //create new ship from each ship module
        for (var i = ship.shipModules.length - 1; i >= 0; i--) {
            var module = ship.shipModules[i];

            if (contains(destroyedModules, module)) {
                continue;
            }

            var newShip = Ship('clean');

            newShip.compoundBody = Matter.Body.create({
                parts: [module.body]
            });

            newShip.shipModules = [module];
           // Matter.Body.setDensity(newShip.compoundBody, 1);
            newShip.compoundBody.physicsObject = true;
           //// newShip.compoundBody.strokeStyle = '#dedbef';
          //  newShip.compoundBody.fillStyle = '#dedbef';
           // newShip.compoundBody.visible = false;

            this.ships.push(newShip);
            Matter.World.add(this.engine.world, newShip.compoundBody);
            Matter.Body.setVelocity(newShip.compoundBody, initialVelocity);
        }
    }


    crashes() {

        for (var i = this.ships.length - 1; i >= 0; i--) {
            var ship = this.ships[i];

            if (ship.destroyedModules.length > 0) {
                this.breakApart(ship, ship.destroyedModules);

            }

            ship.destroyedModules = [];
        }
    }


    loop() {

        this.counter += 1; // increment frame counter

        this.rails();

        if (this.warpFactor > 1) {
            this.gravity(this.warpFactor); //gravitate bodies to bodies, composites to composites, and bodies to bodie... i.e. update velocity

            for (var i = this.ships.length - 1; i >= 0; i--) {
                var ship = this.ships[i];
                var warpedDelta = Matter.Vector.mult(ship.compoundBody.velocity, (this.warpFactor))
                warpedDelta = Matter.Vector.add(ship.compoundBody.position, warpedDelta);
                Matter.Body.setPosition(ship.compoundBody, warpedDelta);
            }

            Engine.update(this.engine);
        } else {
            this.gravity(1); //gravitate bodies to bodies, composites to composites, and bodies to bodies
            Engine.update(this.engine);
        }
        //this.hud();

        this.crashes(); //tally up all the broken modules and do all destructibility in one step. something that is happening now is that multiple modules are being destructed in each step and spawning many copies of the ship fragments over the top of each other.

        this.keyboardControls(); // take keyboard input
        this.autoControls(); //controls happen afterwards... because this was the easiest way to stop the exhaust effects from lagging

        this.resourceConsumption();
        this.moduleFunctions();

        //clear canvas.. do this now so you can render stuff over the atmospheres.
        this.context.fillStyle = '#000000'; // draw blank canvas
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.atmospheres(); // see..


        this.render(); // renders the game view

        this.renderClouds();

        this.explosions();
        this.renderLightSources();
        this.lightSources = [];

    }

    loadDemoSystem() {

        var bluePlanet = Planet(0, 0, 2000, 30000000000, 0.01, 360); // create new planet
        bluePlanet.body.strokeColor = '#dedbef';
        bluePlanet.name = 'bluePlanet';
        //Matter.Body.setMass(bluePlanet.body,30000000000);
        bluePlanet.atmosphere = Atmosphere(bluePlanet, 100); // give planet an atmosphere
        //Matter.Body.setMass(bluePlanet.atmosphere,10000);

        bluePlanet.atmosphere.body.fillColor = '#0044bb';
        bluePlanet.atmosphere.body.strokeColor = '#0066dd';


        this.generateClouds(bluePlanet, 2050);


        var greyPlanet = new Planet(-20000, 0, 500, 30000000, 0.03, 180); // create new planet
        greyPlanet.body.strokeColor = '#dedbef';
      //  greyPlanet.railsVelocity = 500;
       // greyPlanet.railsHeight = 20000;
       // greyPlanet.railsTarget = bluePlanet;
        greyPlanet.name = "greyPlanet";

        this.planets.push(bluePlanet);

        this.planets.push(greyPlanet);

        World.addBody(this.engine.world, bluePlanet.body); // add all of the bodies to the world
        World.addBody(this.engine.world, bluePlanet.atmosphere.body); // add all of the bodies to the world

        World.addBody(this.engine.world, greyPlanet.body); // add all of the bodies to the world

/*
        this.player = Ship('camry');
        this.ships.push(this.player);
        this.cameraFocusObject = this.player.compoundBody;
        this.player.compoundBody.belongsTo = this.player;
        Matter.Body.setPosition(this.player.compoundBody, Matter.Vector.create(0, 3100));
        World.addBody(this.engine.world, this.player.compoundBody);
        for (var i = this.player.shipModules.length - 1; i >= 0; i--) {


            this.player.shipModules[i].body.belongsTo = this.player.shipModules[i];
            this.player.shipModules[i].belongsTo = this.player;

            if (this.player.shipModules[i].visualEffect != null) {
                var visualEffectBody = this.player.shipModules[i].visualEffect.body;

                World.addBody(this.engine.world, visualEffectBody);
            }
        }
*/


   var jsonCamry2 = JSON.stringify([{"position":{"x":0,"y":-11},"moduleType":"gunSmall","angle":0},{"position":{"x":1.5,"y":0.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-1.5,"y":0.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":0,"y":2},"moduleType":"engineSmall","angle":0},{"position":{"x":0,"y":-2},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":0,"y":-6},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":0,"y":0.5},"moduleType":"generator","angle":0},{"position":{"x":0,"y":-8.875},"moduleType":"capsuleSmall","angle":0}]);
   var biggassfreightbitchh =  JSON.stringify( [{"position":{"x":1,"y":-18.5},"moduleType":"generator","angle":0},{"position":{"x":-5,"y":-18.5},"moduleType":"generator","angle":0},{"position":{"x":2.5,"y":9.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-6.5,"y":9.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":1,"y":11},"moduleType":"engineSmall","angle":0},{"position":{"x":-1,"y":11},"moduleType":"engineSmall","angle":0},{"position":{"x":-3,"y":11},"moduleType":"engineSmall","angle":0},{"position":{"x":-5,"y":11},"moduleType":"engineSmall","angle":0},{"position":{"x":2.5,"y":-17.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":0,"y":8},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":-4,"y":8},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":0,"y":4},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":-4,"y":4},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":-6.5,"y":-17.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":0,"y":0},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":-4,"y":0},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":0,"y":-4},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":-4,"y":-4},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":0,"y":-8},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":-4,"y":-8},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":0,"y":-12},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":-4,"y":-12},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":0,"y":-16},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":-4,"y":-16},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":-2,"y":-19},"moduleType":"capsuleSmall","angle":0}]);
   var wheelapartments = JSON.stringify([{"position":{"x":62,"y":87},"moduleType":"solarPanels","angle":2.0943951023931953},{"position":{"x":35.5,"y":113.5},"moduleType":"solarPanels","angle":2.6179938779914944},{"position":{"x":62,"y":14},"moduleType":"solarPanels","angle":1.0471975511965976},{"position":{"x":-37.5,"y":114},"moduleType":"solarPanels","angle":3.6651914291880927},{"position":{"x":-63.5,"y":87},"moduleType":"solarPanels","angle":1.0471975511965976},{"position":{"x":-1,"y":-11},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":-62.5,"y":50.5},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":-64,"y":14},"moduleType":"solarPanels","angle":2.0943951023931953},{"position":{"x":67,"y":50.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-69,"y":50.5},"moduleType":"rcsBlockSmall","angle":6.2831853071795845},{"position":{"x":60.5,"y":50.5},"moduleType":"cargoBaySmall","angle":0},{"position":{"x":-1,"y":119.5},"moduleType":"engineSmall","angle":0},{"position":{"x":-1,"y":112.5},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":-1,"y":-18},"moduleType":"capsuleSmall","angle":0},{"position":{"x":-37.5,"y":-12.5},"moduleType":"solarPanels","angle":2.6179938779914944},{"position":{"x":35.5,"y":-12.5},"moduleType":"solarPanels","angle":0.5235987755982988},{"position":{"x":-9,"y":116.5},"moduleType":"habSmall","angle":1.5707963267948963},{"position":{"x":-1,"y":116.5},"moduleType":"habSmall","angle":1.5707963267948963},{"position":{"x":-18,"y":114},"moduleType":"sparSmall","angle":1.8325957145940457},{"position":{"x":-27,"y":112},"moduleType":"habSmall","angle":2.0943951023931953},{"position":{"x":-34,"y":108},"moduleType":"habSmall","angle":2.0943951023931953},{"position":{"x":-41,"y":104},"moduleType":"habSmall","angle":2.0943951023931953},{"position":{"x":-47.5,"y":97.5},"moduleType":"sparSmall","angle":2.356194490192345},{"position":{"x":-53.5,"y":90.5},"moduleType":"habSmall","angle":2.6179938779914944},{"position":{"x":-57.5,"y":83.5},"moduleType":"habSmall","angle":2.6179938779914944},{"position":{"x":-61.5,"y":76.5},"moduleType":"habSmall","angle":2.6179938779914944},{"position":{"x":-64,"y":67.5},"moduleType":"sparSmall","angle":2.879793265790644},{"position":{"x":-66.5,"y":58.5},"moduleType":"habSmall","angle":0},{"position":{"x":-66.5,"y":50.5},"moduleType":"habSmall","angle":0},{"position":{"x":-66.5,"y":42.5},"moduleType":"habSmall","angle":0},{"position":{"x":-64,"y":33.5},"moduleType":"sparSmall","angle":0.2617993877991494},{"position":{"x":7,"y":116.5},"moduleType":"habSmall","angle":1.5707963267948963},{"position":{"x":16,"y":113.5},"moduleType":"sparSmall","angle":1.308996938995747},{"position":{"x":25,"y":111.5},"moduleType":"habSmall","angle":1.0471975511965976},{"position":{"x":32,"y":107.5},"moduleType":"habSmall","angle":1.0471975511965976},{"position":{"x":39,"y":103.5},"moduleType":"habSmall","angle":1.0471975511965976},{"position":{"x":45.5,"y":97},"moduleType":"sparSmall","angle":0.7853981633974483},{"position":{"x":52,"y":90.5},"moduleType":"habSmall","angle":0.5235987755982988},{"position":{"x":56,"y":83.5},"moduleType":"habSmall","angle":0.5235987755982988},{"position":{"x":60,"y":76.5},"moduleType":"habSmall","angle":0.5235987755982988},{"position":{"x":62,"y":67.5},"moduleType":"sparSmall","angle":0.2617993877991494},{"position":{"x":64.5,"y":58.5},"moduleType":"habSmall","angle":0},{"position":{"x":64.5,"y":50.5},"moduleType":"habSmall","angle":0},{"position":{"x":64.5,"y":42.5},"moduleType":"habSmall","angle":0},{"position":{"x":60,"y":24.5},"moduleType":"habSmall","angle":2.6179938779914944},{"position":{"x":56,"y":17.5},"moduleType":"habSmall","angle":2.6179938779914944},{"position":{"x":52,"y":10.5},"moduleType":"habSmall","angle":2.6179938779914944},{"position":{"x":62,"y":33.5},"moduleType":"sparSmall","angle":2.879793265790644},{"position":{"x":-62,"y":24.5},"moduleType":"habSmall","angle":0.5235987755982988},{"position":{"x":-58,"y":17.5},"moduleType":"habSmall","angle":0.5235987755982988},{"position":{"x":-54,"y":10.5},"moduleType":"habSmall","angle":0.5235987755982988},{"position":{"x":45.5,"y":4},"moduleType":"sparSmall","angle":2.356194490192345},{"position":{"x":-47.5,"y":4},"moduleType":"sparSmall","angle":0.7853981633974483},{"position":{"x":39,"y":-2.5},"moduleType":"habSmall","angle":2.0943951023931953},{"position":{"x":32,"y":-6.5},"moduleType":"habSmall","angle":2.0943951023931953},{"position":{"x":-41,"y":-2.5},"moduleType":"habSmall","angle":1.0471975511965976},{"position":{"x":-34,"y":-6.5},"moduleType":"habSmall","angle":1.0471975511965976},{"position":{"x":-27,"y":-10.5},"moduleType":"habSmall","angle":4.188790204786391},{"position":{"x":25,"y":-10.5},"moduleType":"habSmall","angle":2.0943951023931953},{"position":{"x":16,"y":-12.5},"moduleType":"sparSmall","angle":1.8325957145940457},{"position":{"x":-18,"y":-12.5},"moduleType":"sparSmall","angle":1.3089969389957448},{"position":{"x":-9,"y":-15},"moduleType":"habSmall","angle":4.71238898038469},{"position":{"x":7,"y":-15},"moduleType":"habSmall","angle":1.5707963267948963},{"position":{"x":-1,"y":-15},"moduleType":"habSmall","angle":1.5707963267948963}]);
   var roundInterceptor = JSON.stringify([{"position":{"x":-1.625,"y":-7},"moduleType":"gunSmall","angle":0},{"position":{"x":2.875,"y":1},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-6.125,"y":1},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-1.625,"y":7},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-1.625,"y":-3.5},"moduleType":"generator","angle":0},{"position":{"x":-1.625,"y":1},"moduleType":"roundTankSmall","angle":0},{"position":{"x":-1.625,"y":-4.875},"moduleType":"capsuleSmall","angle":0}]);
   var fedCruiser = JSON.stringify([{"position":{"x":1.5,"y":-9.75},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-9.5,"y":-9.75},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-4,"y":-9.75},"moduleType":"sparSmall","angle":1.5707963267948963},{"position":{"x":1.5,"y":18.25},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-9.5,"y":18.25},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-2.5,"y":19.25},"moduleType":"generator","angle":0},{"position":{"x":-5.5,"y":19.25},"moduleType":"generator","angle":0},{"position":{"x":-1.5,"y":-21.25},"moduleType":"gunSmall","angle":0},{"position":{"x":-6.5,"y":-21.25},"moduleType":"gunSmall","angle":0},{"position":{"x":-1.5,"y":-15.25},"moduleType":"sparSmall","angle":0},{"position":{"x":-4,"y":-14.25},"moduleType":"habSmall","angle":0},{"position":{"x":-6.5,"y":-15.25},"moduleType":"sparSmall","angle":3.1415926535897936},{"position":{"x":-4,"y":-4.25},"moduleType":"cargoBayMedium","angle":0},{"position":{"x":-4,"y":1.25},"moduleType":"sparSmall","angle":1.5707963267948963},{"position":{"x":-4,"y":18.25},"moduleType":"sparSmall","angle":1.5707963267948963},{"position":{"x":-4,"y":9.75},"moduleType":"fuelTankMedium","angle":0},{"position":{"x":-4,"y":23.75},"moduleType":"sparSmall","angle":3.1415926535897936},{"position":{"x":-2.5,"y":21.75},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-0.5,"y":20.75},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-5.5,"y":21.75},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-7.5,"y":20.75},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-4,"y":-19},"moduleType":"capsuleSmall","angle":0}]);
   var feendix = JSON.stringify([{"position":{"x":-2.5,"y":-16.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-5.5,"y":-16.5},"moduleType":"rcsBlockSmall","angle":0},{"position":{"x":-1.5,"y":-17},"moduleType":"gunSmall","angle":0},{"position":{"x":-6.5,"y":-17},"moduleType":"gunSmall","angle":0},{"position":{"x":-4,"y":-16.5},"moduleType":"generator","angle":0},{"position":{"x":-0.5,"y":-10},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-2.5,"y":-10},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-5.5,"y":-10},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-7.5,"y":-10},"moduleType":"fastEngineSmall","angle":0},{"position":{"x":-6.5,"y":-14},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":-1.5,"y":-14},"moduleType":"fuelTankSmall","angle":0},{"position":{"x":-4,"y":-11},"moduleType":"sparSmall","angle":0},{"position":{"x":-4,"y":-18},"moduleType":"capsuleSmall","angle":0}])

        var playerPosition = Matter.Vector.create(0, 3100);
        var playerVelocity = Matter.Vector.create(1.5, 0);

/*
for (var i = 0; i < 6; i++) {

    var npcposition = Matter.Vector.create(-3000 + (Math.random()*5000), 3000 + (Math.random()*5000));
     var npcvelocity = Matter.Vector.create(0, 0);


    var npcType = roundInterceptor;
    var typeRandom = Math.random();

    if (typeRandom > 0.5) {npcType = feendix}
    if (typeRandom > 0.8) {npcType = fedCruiser;

          

    }

         var nPC = this.shimPlace(npcType,npcposition,npcvelocity);
    nPC.team = 'blue';

if (typeRandom > 0.8) {
nPC.railsTarget = bluePlanet;
    nPC.railsHeight = Matter.Vector.magnitude(nPC.compoundBody.position);
    nPC.railsVelocity = -0.0003;
    nPC.railsPhaseAngle = 2 * Math.random() *Math.PI;
}

}

for (var i = 0; i < 6; i++) {

    var npcposition = Matter.Vector.create(3000 + (Math.random()*5000), 3000 + (Math.random()*5000));
     var npcvelocity = Matter.Vector.create(0, 0);


    var npcType = roundInterceptor;
    var typeRandom = Math.random();

    if (typeRandom > 0.5) {npcType = feendix}
    if (typeRandom > 0.8) {npcType = fedCruiser;

          

    }

         var nPC = this.shimPlace(npcType,npcposition,npcvelocity);
    nPC.team = 'red';
      nPC.maneuver = {};
     nPC.maneuver.type = 'attack';

if (typeRandom > 0.8) {
nPC.railsTarget = bluePlanet;
    nPC.railsHeight = Matter.Vector.magnitude(nPC.compoundBody.position);
    nPC.railsVelocity = -0.0003;
    nPC.railsPhaseAngle = 2 * Math.random() *Math.PI;
}

}

*/




        var npcposition = Matter.Vector.create(200, 4000);
       // var npcvelocity = Matter.Vector.create(1.5, 0);
var npcvelocity = Matter.Vector.create(0, 0);

  var npcposition2 = Matter.Vector.create(-200, -4000);
       // var npcvelocity = Matter.Vector.create(1.5, 0);
var npcvelocity2 = Matter.Vector.create(0, 0);

 var npcposition3 = Matter.Vector.create(-500, 4500);
       // var npcvelocity = Matter.Vector.create(1.5, 0);
var npcvelocity3 = Matter.Vector.create(0, 0);

 var npcposition4 = Matter.Vector.create(-300, -4500);
       // var npcvelocity = Matter.Vector.create(1.5, 0);
var npcvelocity4 = Matter.Vector.create(0, 0);

    var nPC1 = this.shimPlace(wheelapartments,npcposition,npcvelocity);

    nPC1.railsTarget = bluePlanet;
    nPC1.railsHeight = 5000;
    nPC1.railsVelocity = -0.0003;
    nPC1.railsPhaseAngle = 1.5*Math.PI;


    var nPC2 = this.shimPlace(roundInterceptor,npcposition2,npcvelocity2);
    nPC2.target = nPC1;
    nPC2.maneuver = {};
     nPC2.maneuver.type = 'attack';

     var nPC4 = this.shimPlace(fedCruiser,npcposition4,npcvelocity4);

  //  nPC4.maneuver = {};
   //  nPC4.maneuver.type = 'attack';


    nPC4.railsTarget = bluePlanet;
    nPC4.railsHeight = 4300;
    nPC4.railsVelocity = -0.0003;
    nPC4.railsPhaseAngle = 1.2*Math.PI;



     var nPC3 = this.shimPlace(wheelapartments,npcposition3,npcvelocity3);

    nPC3.railsTarget = bluePlanet;
    nPC3.railsHeight = 5000;
    nPC3.railsVelocity = -0.0003;
    nPC3.railsPhaseAngle = 1.0*Math.PI;


    this.player = this.shimPlace(feendix,playerPosition,playerVelocity);
        this.cameraFocusObject = this.player.compoundBody;
/*
        var nPC1 = Ship('camry');
        this.ships.push(nPC1);
        //this.cameraFocusObject = this.player.compoundBody;
        nPC1.target = this.player;
        nPC1.maneuver = {
            type: 'attack'
        };
        nPC1.compoundBody.belongsTo = nPC1;
        Matter.Body.setPosition(nPC1.compoundBody, Matter.Vector.create(200, 3100));

        Matter.Body.setVelocity(nPC1.compoundBody, Matter.Vector.create(1, 0));
        World.addBody(this.engine.world, nPC1.compoundBody);
        for (var i = nPC1.shipModules.length - 1; i >= 0; i--) {


            nPC1.shipModules[i].belongsTo = nPC1;

            nPC1.shipModules[i].body.belongsTo = nPC1.shipModules[i];



            if (nPC1.shipModules[i].visualEffect != null) {
                var visualEffectBody = nPC1.shipModules[i].visualEffect.body;

                World.addBody(this.engine.world, visualEffectBody);
            }
        }
*/

        var spacePort = Ship('spacePort');
        this.ships.push(spacePort);
        Matter.Body.setPosition(spacePort.compoundBody, Matter.Vector.create(0, 2050));
        World.addBody(this.engine.world, spacePort.compoundBody); // add all of the bodies to the world

        //create a moonbase
        // the moonbase is a huge trapezoidal fortress and will be heavily defended as soon as we can do that
        var moonBase = Ship('moonBase');
        this.ships.push(moonBase);
        Matter.Body.setPosition(moonBase.compoundBody, Matter.Vector.create(-20000, -600));
        World.addBody(this.engine.world, moonBase.compoundBody); // add all of the bodies to the world

        Matter.Body.setVelocity(this.player.compoundBody, Matter.Vector.create(1, 0));

    }

    buildLoop() {



    }


    renderBuildButtons() {
        // render the list of available modules on the left hand side of the screen
        // var x = 100;
        // var y = 100;


        //make also some buttons for clicking up and down


        //just make the updown buttons regenerate clickBoten x and y.... 







        for (var i = 0; i < this.clickBotens.length; i++) {
            var clickBoten = this.clickBotens[i];
            this.context.beginPath();
            this.context.fillStyle = '#bbbbbb';


            this.context.fillRect(clickBoten.x, clickBoten.y, clickBoten.width, clickBoten.height);
            // this.context.stroke();

            var moduleType = clickBoten.moduleType;
            this.context.fillStyle = '#888888';
            this.context.fillText(String(moduleType), clickBoten.x, clickBoten.y);

            //y+=50;
        }
    }

    generateBuildButtons() {



 var upButton = {};

            upButton.representsModule = false;
            upButton.moduleType = 'upButton';
            upButton.x = 50;
            upButton.y = 100;
            upButton.width = 20;
            upButton.height = -20;

            this.clickBotens.push(upButton);


             var downButton = {};

            downButton.representsModule = false;
            downButton.moduleType = 'downButton';
            downButton.x = 50;
            downButton.y = 150;
            downButton.width = 20;
            downButton.height = -20;

            this.clickBotens.push(downButton);



        // render the list of available modules on the left hand side of the screen
        var x = 100;
        var y = 100;


        for (var i = 0; i < this.moduleTypesList.length; i++) {

            var ax, by, cx, dy;

            ax = x + 5;
            by = y;
            cx = 75;
            dy = -25;

            var moduleType = this.moduleTypesList[i];


            var clickBoten = {};
            clickBoten.representsModule = true;
            clickBoten.moduleType = moduleType;
            clickBoten.x = ax;
            clickBoten.y = by;
            clickBoten.width = cx;
            clickBoten.height = dy;

            this.clickBotens.push(clickBoten);

            y += 50;

        }

    }



    renderBuild() {

        // clear screen
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = '#eeeeee'; // draw blank canvas
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);


        this.renderBuildButtons();


        //   var xDrawOffset = 300;
        //  var yDrawOffset = 300;

        for (var i = Matter.Composite.allBodies(this.buildViewEngine.world).length - 1; i >= 0; i--) {
            var module = Matter.Composite.allBodies(this.buildViewEngine.world)[i];
            // Matter.Body.setPosition(module.body, Matter.Vector.create(xDrawOffset,yDrawOffset));
            //this should still work even though the module is not added to the world.
            renderObject(this.lightSources, module, this.buildViewCamera, this.zoomFactorBuild, this.context, this.canvas, 'body', this.offset); //renderObject(body, centerScreenBody, zoomFactor, context, canvas)
            /*

            if (xDrawOffset > 400) {
xDrawOffset = 100;
yDrawOffset += 100;
            }
            else{
                xDrawOffset += 100
            }
       */
        }
        /*
            // render the construction area in the middle of the screen... this is the same as game render except we might want to crop it a little bit.
               var bodies = Composite.allBodies(this.buildViewEngine.world); // render bodies. it is done this way because eveyrthing in the physics engine will be rendered.
                for (var i = 0; i < bodies.length; i += 1) {
                    if (bodies[i].visible != false) { // let's make it exclusive instead of inclusive, so it still works if visible is undefined.
                        renderObject(this.lightSources, bodies[i], this.cameraFocusObject, this.zoomFactor, this.context, this.canvas, 'body', this.offset); //renderObject(body, centerScreenBody, zoomFactor, context, canvas)
                    }
                }

                var constraints = Composite.allConstraints(this.buildViewEngine.world); // render constraints
                for (var i = 0; i < constraints.length; i += 1) {
                    renderObject(this.lightSources, constraints[i], this.cameraFocusObject, this.zoomFactor, this.context, this.canvas, 'constraint'); //renderObject(body, centerScreenBody, zoomFactor, context, canvas)
                }

        */
        // render save and load buttons (need save and load JSON methods)


        this.context.fillStyle = '#000000';
        this.context.fillText("Grid: " + String(this.grid), 1300, 650);

    }

    renderPause() {



        game.render(); // renders the game view
        //  this.context.fillStyle = '#000000'; // draw blank canvas
        //   this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = 'rgba(0,0,0,0.5)';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // print text

        //var ctx = document.getElementById('canvas').getContext('2d');
        this.context.font = "12px serif";


        //var num = 15;

        this.context.fillStyle = '#ffffff';

        var dickString = "vx: " + this.player.compoundBody.velocity.x.toString();
        this.context.fillText(dickString, 100, 50);

        var x = 50;
        x += 28;
        var dickString = "vy: " + this.player.compoundBody.velocity.y.toString();
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "WHERE NO MAN HAS GONE BEFORE";
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "PAUSED. PRESS P TO BEGIN.";
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "Key Controls / Instructions:";
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "Up: Accelerate forward.     Left: Steer left.     Right: Steer right.     Space: Fire weapons.";
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "+: Zoom in.     -: Zoom out.     Tab: View next ship.";
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "h: Toggle navigation HUD.     Red line: Forward.     Grey line: Ballistic trajectory.";
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "Comma: Decrease time warp.     Period: Increase time warp.";
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "b: Build menu.     p: Pause.";
        this.context.fillText(dickString, 100, x);
        x += 28;
        var dickString = "f: Import/Export and deploy ship";
        this.context.fillText(dickString, 100, x);
        x += 28;

        this.context.fillStyle = '#000000';

    }


}

var game = new Game;


(function mainloop() { // this method is actually the main loop
    flylock = false;
    window.requestAnimationFrame(mainloop); // sets up to trigger this method next time

    //if in game mode
    if (mode == "game") {
        game.loop(); // runs the game logic
    }
    // if in build mode
    else if (mode == "build") {



        game.keyboardControls();
        game.buildLoop(); // runs the build logic
        game.renderBuild(); // render the build view
        // game.renderMessageLog();
    } else if (mode == "pause") {

        //  game.buildLoop(); // runs the build logic
        game.renderPause(); // render the build view
    }

})();

function mixColors(hexColor1, hexColors) { // hexColors is an array of colors that you want to mix. colors are given as an object containing color and intensity.

    /*
    http://stackoverflow.com/questions/726549/algorithm-for-additive-color-mixing-for-rgb-values
    It depends on what you want, and it can help to see what the results are of different methods.

    If you want

    Red + Black        = Red
    Red + Green        = Yellow
    Red + Green + Blue = White
    Red + White        = White 
    Black + White      = White
    then adding with a clamp works (e.g. min(r1 + r2, 255)) This is more like the light model you've referred to.

    If you want

    Red + Black        = Dark Red
    Red + Green        = Dark Yellow
    Red + Green + Blue = Dark Gray
    Red + White        = Pink
    Black + White      = Gray
    then you'll need to average the values (e.g. (r1 + r2) / 2) This works better for lightening/darkening colors and creating gradients.





    function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    function hexToRgb(hex) { //alert( hexToRgb("#0033ff").g ); // "51";

    */

    var rGBColor1 = hexToRgb(hexColor1);



    // average reds
    var averageRed = rGBColor1.r;

    // average greens
    var averageGreen = rGBColor1.g;

    //average blues
    var averageBlue = rGBColor1.b;



    for (var i = hexColors.length - 1; i >= 0; i--) {
        var rGBColorI = hexToRgb(hexColors[i]);

        averageRed += rGBColorI.r * hexColors[i].intensity;
        averageGreen += rGBColorI.g * hexColors[i].intensity;
        averageBlue += rGBColorI.b * hexColors[i].intensity;
    }

    var nColors = hexColors.length + 1;
    averageRed = (averageRed / (nColors));
    averageGreen = (averageGreen / (nColors));
    averageBlue = (averageBlue / (nColors));

    var mixedColors = rgbToHex(averageRed, averageGreen, averageBlue);
    return mixedColors;
}

function renderObject(lightSources, body, centerScreenObject, zoomFactor, context, canvas, type, offset) { // this function renders one individual thing relative to a central body, which is shown at the screen center

    var offset = (Matter.Vector.create(700, 350));

    if (type == 'body' || type == 'cloud') {

        for (var i = body.parts.length - 1; i >= 0; i--) {
            var bodyPart = body.parts[i];
            /* this got moved up the chain
                        if (bodyPart.visible == false) {
                            continue;
                        }
            */


            /*
            // THIS PART RENDERS GRADIATED STROKES, IT RESPONDS TO ILLUMINATION AND LOOKS AWESOME
            // I HAVE NOT GOT IT TO WORK YET AND IT KIND OF MELTS COMPUTERS
            // it might be possible to implement this idea more efficiently if you used radial gradients instead of computing a gradient for every single line segment.

            var vertices = bodyPart.vertices;
            // var vertexZero = vertices[0];


            for (var i = 1; i < vertices.length; i ++) {
            var vertexA = vertices[i-1];
            var vertexB = vertices[i];


            // figure out illuminated color for vertex zero
            var lightSourcesA = []; // color for start of stroke
            var lightSourcesB = []; // color for end of stroke

            if (lightSources.length > 0) {


            for (var j = lightSources.length - 1; j >= 0; j--) {
            var lightSource = lightSources[j];

            var lightA = {}; // illumination at end A
            var lightB = {}; // illumination at end B

            var distanceA = Matter.Vector.sub(vertexA,lightSource.body.position);
            var distanceB = Matter.Vector.sub(vertexB,lightSource.body.position);

            lightA.brightness = lightSource.brightness * Matter.Vector.magnitudeSquared(distanceA); // 1/d^2 again
            lightB.brightness = lightSource.brightness * Matter.Vector.magnitudeSquared(distanceB); // 1/d^2 again

            // bail out now if brightness is too low- not worth rendering!


            lightSourcesA.push(lightA);
            lightSourcesB.push(lightB);
            }

            // do color mixing //mixColors(hexColor1,hexColors)

            if (bodyPart.strokeColor != null) {
            var colorA = mixColors(bodyPart.strokeColor, lightSourcesA); // stroke A color

            var colorB = mixColors(bodyPart.strokeColor, lightSourcesB); // stroke A color
            }
            else{
            bodyPart.strokeColor = '#888888';
            var colorA = mixColors(bodyPart.strokeColor, lightSourcesA);

            var colorB = mixColors(bodyPart.strokeColor, lightSourcesB);
            }

            }

            else {
            var colorA = bodyPart.strokeColor;

            var colorB = bodyPart.strokeColor;
            }

            // perform view transformations
            //transformToView(vertex, centerScreenObject, zoomFactor, offset){
            transformToView(vertexA, centerScreenObject, zoomFactor, offset);
            transformToView(vertexB, centerScreenObject, zoomFactor, offset);




            var gradient = context.createLinearGradient(vertexA.x,vertexA.y,vertexB.x,vertexB.y);
            //color stops


            context.strokeStyle = gradient;

            context.beginPath();
            context.moveTo(vertexA.x, vertexA.y);
            context.lineTo(vertexB.x, vertexB.y);

            context.stroke();
            }

            */

            /*
            var c=document.getElementById("myCanvas");
            var ctx=c.getContext("2d");

            var gradient=ctx.createLinearGradient(0,0,170,0);
            gradient.addColorStop("0","magenta");
            gradient.addColorStop("0.5","blue");
            gradient.addColorStop("1.0","red");

            // Fill with gradient
            ctx.strokeStyle=gradient;
            ctx.lineWidth=5;
            ctx.strokeRect(20,20,150,100);
            */




            //vertexZero = Matter.Vector.create(vertexZero.x,vertexZero.y)//so useless


            //THIS IS THE RENDER METHOD THAT ACTUALLY WORKS. DO NOT FUCK WITH IT.

            if (bodyPart.strokeColor == '#dedbef') { // don't know how to get rid of the planet's original body object, it's not physical anyway, just don't render it. the body.visible flag doesn't work anyway.
                continue;
            }



            context.beginPath();
            var vertices = bodyPart.vertices;

            var vertexZero = vertices[0];
            vertexZero = Matter.Vector.sub(vertexZero, centerScreenObject.position);
            vertexZero = Matter.Vector.mult(vertexZero, zoomFactor);
            vertexZero = Matter.Vector.add(vertexZero, offset);
            context.moveTo(vertexZero.x, vertexZero.y);
            for (var j = 1; j < vertices.length; j++) {
                var vertexJ = vertices[j];

                vertexJ = Matter.Vector.create(vertexJ.x, vertexJ.y)

                vertexJ = Matter.Vector.sub(vertexJ, centerScreenObject.position);
                vertexJ = Matter.Vector.mult(vertexJ, zoomFactor);
                vertexJ = Matter.Vector.add(vertexJ, offset);
                context.lineTo(vertexJ.x, vertexJ.y);
            }
            context.lineTo(vertexZero.x, vertexZero.y);

            context.lineWidth = bodyPart.lineWidth;

            if (bodyPart.strokeColor != null) {
                context.strokeStyle = bodyPart.strokeColor;
                context.fillStyle = bodyPart.fillColor;
            } else {

                context.strokeStyle = '#888'; // the capsule is red.
                context.fillStyle = '#000'; // only color things if they have a color.
            }


            if (body.isACloud != null) {
                context.strokeStyle = 'rgba(255,255,255,0.5)';
                context.fillStyle = 'rgba(200,200,255,0.5)';
            }

            context.fill(); // fill first so you don't draw over the strokes. it looks bad.
            context.stroke();


        }


    } else if (type == 'constraint' && this.renderConstraints) {


        if (body.render.visible) {

            context.beginPath();
            var vertexZero = body.pointA;
            vertexZero = Matter.Vector.create(vertexZero.x, vertexZero.y)

            vertexZero = Matter.Vector.sub(body.bodyA.position, vertexZero);
            vertexZero = Matter.Vector.sub(vertexZero, centerScreenObject.body.position);
            vertexZero = Matter.Vector.mult(vertexZero, zoomFactor);
            vertexZero = Matter.Vector.add(vertexZero, offset);
            context.moveTo(vertexZero.x, vertexZero.y);


            vertexJ = body.pointB;
            vertexJ = Matter.Vector.create(vertexJ.x, vertexJ.y)

            vertexJ = Matter.Vector.sub(body.bodyB.position, vertexJ);
            vertexJ = Matter.Vector.sub(vertexJ, centerScreenObject.body.position);
            vertexJ = Matter.Vector.mult(vertexJ, zoomFactor);
            vertexJ = Matter.Vector.add(vertexJ, offset);
            context.lineTo(vertexJ.x, vertexJ.y);

            context.lineWidth = body.render.lineWidth;
            context.strokeStyle = body.render.strokeColor;
            context.stroke();



        }



    }

}