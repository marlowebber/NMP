!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.decomp=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = {
    decomp: polygonDecomp,
    quickDecomp: polygonQuickDecomp,
    isSimple: polygonIsSimple,
    removeCollinearPoints: polygonRemoveCollinearPoints,
    makeCCW: polygonMakeCCW
};

/**
 * Compute the intersection between two lines.
 * @static
 * @method lineInt
 * @param  {Array}  l1          Line vector 1
 * @param  {Array}  l2          Line vector 2
 * @param  {Number} precision   Precision to use when checking if the lines are parallel
 * @return {Array}              The intersection point.
 */
function lineInt(l1,l2,precision){
    precision = precision || 0;
    var i = [0,0]; // point
    var a1, b1, c1, a2, b2, c2, det; // scalars
    a1 = l1[1][1] - l1[0][1];
    b1 = l1[0][0] - l1[1][0];
    c1 = a1 * l1[0][0] + b1 * l1[0][1];
    a2 = l2[1][1] - l2[0][1];
    b2 = l2[0][0] - l2[1][0];
    c2 = a2 * l2[0][0] + b2 * l2[0][1];
    det = a1 * b2 - a2*b1;
    if (!scalar_eq(det, 0, precision)) { // lines are not parallel
        i[0] = (b2 * c1 - b1 * c2) / det;
        i[1] = (a1 * c2 - a2 * c1) / det;
    }
    return i;
}

/**
 * Checks if two line segments intersects.
 * @method segmentsIntersect
 * @param {Array} p1 The start vertex of the first line segment.
 * @param {Array} p2 The end vertex of the first line segment.
 * @param {Array} q1 The start vertex of the second line segment.
 * @param {Array} q2 The end vertex of the second line segment.
 * @return {Boolean} True if the two line segments intersect
 */
function lineSegmentsIntersect(p1, p2, q1, q2){
	var dx = p2[0] - p1[0];
	var dy = p2[1] - p1[1];
	var da = q2[0] - q1[0];
	var db = q2[1] - q1[1];

	// segments are parallel
	if((da*dy - db*dx) === 0){
		return false;
	}

	var s = (dx * (q1[1] - p1[1]) + dy * (p1[0] - q1[0])) / (da * dy - db * dx);
	var t = (da * (p1[1] - q1[1]) + db * (q1[0] - p1[0])) / (db * dx - da * dy);

	return (s>=0 && s<=1 && t>=0 && t<=1);
}

/**
 * Get the area of a triangle spanned by the three given points. Note that the area will be negative if the points are not given in counter-clockwise order.
 * @static
 * @method area
 * @param  {Array} a
 * @param  {Array} b
 * @param  {Array} c
 * @return {Number}
 */
function triangleArea(a,b,c){
    return (((b[0] - a[0])*(c[1] - a[1]))-((c[0] - a[0])*(b[1] - a[1])));
}

function isLeft(a,b,c){
    return triangleArea(a,b,c) > 0;
}

function isLeftOn(a,b,c) {
    return triangleArea(a, b, c) >= 0;
}

function isRight(a,b,c) {
    return triangleArea(a, b, c) < 0;
}

function isRightOn(a,b,c) {
    return triangleArea(a, b, c) <= 0;
}

var tmpPoint1 = [],
    tmpPoint2 = [];

/**
 * Check if three points are collinear
 * @method collinear
 * @param  {Array} a
 * @param  {Array} b
 * @param  {Array} c
 * @param  {Number} [thresholdAngle=0] Threshold angle to use when comparing the vectors. The function will return true if the angle between the resulting vectors is less than this value. Use zero for max precision.
 * @return {Boolean}
 */
function collinear(a,b,c,thresholdAngle) {
    if(!thresholdAngle){
        return triangleArea(a, b, c) === 0;
    } else {
        var ab = tmpPoint1,
            bc = tmpPoint2;

        ab[0] = b[0]-a[0];
        ab[1] = b[1]-a[1];
        bc[0] = c[0]-b[0];
        bc[1] = c[1]-b[1];

        var dot = ab[0]*bc[0] + ab[1]*bc[1],
            magA = Math.sqrt(ab[0]*ab[0] + ab[1]*ab[1]),
            magB = Math.sqrt(bc[0]*bc[0] + bc[1]*bc[1]),
            angle = Math.acos(dot/(magA*magB));
        return angle < thresholdAngle;
    }
}

function sqdist(a,b){
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    return dx * dx + dy * dy;
}

/**
 * Get a vertex at position i. It does not matter if i is out of bounds, this function will just cycle.
 * @method at
 * @param  {Number} i
 * @return {Array}
 */
function polygonAt(polygon, i){
    var s = polygon.length;
    return polygon[i < 0 ? i % s + s : i % s];
}

/**
 * Clear the polygon data
 * @method clear
 * @return {Array}
 */
function polygonClear(polygon){
    polygon.length = 0;
}

/**
 * Append points "from" to "to"-1 from an other polygon "poly" onto this one.
 * @method append
 * @param {Polygon} poly The polygon to get points from.
 * @param {Number}  from The vertex index in "poly".
 * @param {Number}  to The end vertex index in "poly". Note that this vertex is NOT included when appending.
 * @return {Array}
 */
function polygonAppend(polygon, poly, from, to){
    for(var i=from; i<to; i++){
        polygon.push(poly[i]);
    }
}

/**
 * Make sure that the polygon vertices are ordered counter-clockwise.
 * @method makeCCW
 */
function polygonMakeCCW(polygon){
    var br = 0,
        v = polygon;

    // find bottom right point
    for (var i = 1; i < polygon.length; ++i) {
        if (v[i][1] < v[br][1] || (v[i][1] === v[br][1] && v[i][0] > v[br][0])) {
            br = i;
        }
    }

    // reverse poly if clockwise
    if (!isLeft(polygonAt(polygon, br - 1), polygonAt(polygon, br), polygonAt(polygon, br + 1))) {
        polygonReverse(polygon);
    }
}

/**
 * Reverse the vertices in the polygon
 * @method reverse
 */
function polygonReverse(polygon){
    var tmp = [];
    var N = polygon.length;
    for(var i=0; i!==N; i++){
        tmp.push(polygon.pop());
    }
    for(var i=0; i!==N; i++){
		polygon[i] = tmp[i];
    }
}

/**
 * Check if a point in the polygon is a reflex point
 * @method isReflex
 * @param  {Number}  i
 * @return {Boolean}
 */
function polygonIsReflex(polygon, i){
    return isRight(polygonAt(polygon, i - 1), polygonAt(polygon, i), polygonAt(polygon, i + 1));
}

var tmpLine1=[],
    tmpLine2=[];

/**
 * Check if two vertices in the polygon can see each other
 * @method canSee
 * @param  {Number} a Vertex index 1
 * @param  {Number} b Vertex index 2
 * @return {Boolean}
 */
function polygonCanSee(polygon, a,b) {
    var p, dist, l1=tmpLine1, l2=tmpLine2;

    if (isLeftOn(polygonAt(polygon, a + 1), polygonAt(polygon, a), polygonAt(polygon, b)) && isRightOn(polygonAt(polygon, a - 1), polygonAt(polygon, a), polygonAt(polygon, b))) {
        return false;
    }
    dist = sqdist(polygonAt(polygon, a), polygonAt(polygon, b));
    for (var i = 0; i !== polygon.length; ++i) { // for each edge
        if ((i + 1) % polygon.length === a || i === a){ // ignore incident edges
            continue;
        }
        if (isLeftOn(polygonAt(polygon, a), polygonAt(polygon, b), polygonAt(polygon, i + 1)) && isRightOn(polygonAt(polygon, a), polygonAt(polygon, b), polygonAt(polygon, i))) { // if diag intersects an edge
            l1[0] = polygonAt(polygon, a);
            l1[1] = polygonAt(polygon, b);
            l2[0] = polygonAt(polygon, i);
            l2[1] = polygonAt(polygon, i + 1);
            p = lineInt(l1,l2);
            if (sqdist(polygonAt(polygon, a), p) < dist) { // if edge is blocking visibility to b
                return false;
            }
        }
    }

    return true;
}

/**
 * Copy the polygon from vertex i to vertex j.
 * @method copy
 * @param  {Number} i
 * @param  {Number} j
 * @param  {Polygon} [targetPoly]   Optional target polygon to save in.
 * @return {Polygon}                The resulting copy.
 */
function polygonCopy(polygon, i,j,targetPoly){
    var p = targetPoly || [];
    polygonClear(p);
    if (i < j) {
        // Insert all vertices from i to j
        for(var k=i; k<=j; k++){
            p.push(polygon[k]);
        }

    } else {

        // Insert vertices 0 to j
        for(var k=0; k<=j; k++){
            p.push(polygon[k]);
        }

        // Insert vertices i to end
        for(var k=i; k<polygon.length; k++){
            p.push(polygon[k]);
        }
    }

    return p;
}

/**
 * Decomposes the polygon into convex pieces. Returns a list of edges [[p1,p2],[p2,p3],...] that cuts the polygon.
 * Note that this algorithm has complexity O(N^4) and will be very slow for polygons with many vertices.
 * @method getCutEdges
 * @return {Array}
 */
function polygonGetCutEdges(polygon) {
    var min=[], tmp1=[], tmp2=[], tmpPoly = [];
    var nDiags = Number.MAX_VALUE;

    for (var i = 0; i < polygon.length; ++i) {
        if (polygonIsReflex(polygon, i)) {
            for (var j = 0; j < polygon.length; ++j) {
                if (polygonCanSee(polygon, i, j)) {
                    tmp1 = polygonGetCutEdges(polygonCopy(polygon, i, j, tmpPoly));
                    tmp2 = polygonGetCutEdges(polygonCopy(polygon, j, i, tmpPoly));

                    for(var k=0; k<tmp2.length; k++){
                        tmp1.push(tmp2[k]);
                    }

                    if (tmp1.length < nDiags) {
                        min = tmp1;
                        nDiags = tmp1.length;
                        min.push([polygonAt(polygon, i), polygonAt(polygon, j)]);
                    }
                }
            }
        }
    }

    return min;
}

/**
 * Decomposes the polygon into one or more convex sub-Polygons.
 * @method decomp
 * @return {Array} An array or Polygon objects.
 */
function polygonDecomp(polygon){
    var edges = polygonGetCutEdges(polygon);
    if(edges.length > 0){
        return polygonSlice(polygon, edges);
    } else {
        return [polygon];
    }
}

/**
 * Slices the polygon given one or more cut edges. If given one, this function will return two polygons (false on failure). If many, an array of polygons.
 * @method slice
 * @param {Array} cutEdges A list of edges, as returned by .getCutEdges()
 * @return {Array}
 */
function polygonSlice(polygon, cutEdges){
    if(cutEdges.length === 0){
		return [polygon];
    }
    if(cutEdges instanceof Array && cutEdges.length && cutEdges[0] instanceof Array && cutEdges[0].length===2 && cutEdges[0][0] instanceof Array){

        var polys = [polygon];

        for(var i=0; i<cutEdges.length; i++){
            var cutEdge = cutEdges[i];
            // Cut all polys
            for(var j=0; j<polys.length; j++){
                var poly = polys[j];
                var result = polygonSlice(poly, cutEdge);
                if(result){
                    // Found poly! Cut and quit
                    polys.splice(j,1);
                    polys.push(result[0],result[1]);
                    break;
                }
            }
        }

        return polys;
    } else {

        // Was given one edge
        var cutEdge = cutEdges;
        var i = polygon.indexOf(cutEdge[0]);
        var j = polygon.indexOf(cutEdge[1]);

        if(i !== -1 && j !== -1){
            return [polygonCopy(polygon, i,j),
                    polygonCopy(polygon, j,i)];
        } else {
            return false;
        }
    }
}

/**
 * Checks that the line segments of this polygon do not intersect each other.
 * @method isSimple
 * @param  {Array} path An array of vertices e.g. [[0,0],[0,1],...]
 * @return {Boolean}
 * @todo Should it check all segments with all others?
 */
function polygonIsSimple(polygon){
    var path = polygon, i;
    // Check
    for(i=0; i<path.length-1; i++){
        for(var j=0; j<i-1; j++){
            if(lineSegmentsIntersect(path[i], path[i+1], path[j], path[j+1] )){
                return false;
            }
        }
    }

    // Check the segment between the last and the first point to all others
    for(i=1; i<path.length-2; i++){
        if(lineSegmentsIntersect(path[0], path[path.length-1], path[i], path[i+1] )){
            return false;
        }
    }

    return true;
}

function getIntersectionPoint(p1, p2, q1, q2, delta){
	delta = delta || 0;
	var a1 = p2[1] - p1[1];
	var b1 = p1[0] - p2[0];
	var c1 = (a1 * p1[0]) + (b1 * p1[1]);
	var a2 = q2[1] - q1[1];
	var b2 = q1[0] - q2[0];
	var c2 = (a2 * q1[0]) + (b2 * q1[1]);
	var det = (a1 * b2) - (a2 * b1);

	if(!scalar_eq(det,0,delta)){
		return [((b2 * c1) - (b1 * c2)) / det, ((a1 * c2) - (a2 * c1)) / det];
	} else {
		return [0,0];
    }
}

/**
 * Quickly decompose the Polygon into convex sub-polygons.
 * @method quickDecomp
 * @param  {Array} result
 * @param  {Array} [reflexVertices]
 * @param  {Array} [steinerPoints]
 * @param  {Number} [delta]
 * @param  {Number} [maxlevel]
 * @param  {Number} [level]
 * @return {Array}
 */
function polygonQuickDecomp(polygon, result,reflexVertices,steinerPoints,delta,maxlevel,level){
    maxlevel = maxlevel || 100;
    level = level || 0;
    delta = delta || 25;
    result = typeof(result)!=="undefined" ? result : [];
    reflexVertices = reflexVertices || [];
    steinerPoints = steinerPoints || [];

    var upperInt=[0,0], lowerInt=[0,0], p=[0,0]; // Points
    var upperDist=0, lowerDist=0, d=0, closestDist=0; // scalars
    var upperIndex=0, lowerIndex=0, closestIndex=0; // Integers
    var lowerPoly=[], upperPoly=[]; // polygons
    var poly = polygon,
        v = polygon;

    if(v.length < 3){
		return result;
    }

    level++;
    if(level > maxlevel){
        console.warn("quickDecomp: max level ("+maxlevel+") reached.");
        return result;
    }

    for (var i = 0; i < polygon.length; ++i) {
        if (polygonIsReflex(poly, i)) {
            reflexVertices.push(poly[i]);
            upperDist = lowerDist = Number.MAX_VALUE;


            for (var j = 0; j < polygon.length; ++j) {
                if (isLeft(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j)) && isRightOn(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j - 1))) { // if line intersects with an edge
                    p = getIntersectionPoint(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j), polygonAt(poly, j - 1)); // find the point of intersection
                    if (isRight(polygonAt(poly, i + 1), polygonAt(poly, i), p)) { // make sure it's inside the poly
                        d = sqdist(poly[i], p);
                        if (d < lowerDist) { // keep only the closest intersection
                            lowerDist = d;
                            lowerInt = p;
                            lowerIndex = j;
                        }
                    }
                }
                if (isLeft(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j + 1)) && isRightOn(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j))) {
                    p = getIntersectionPoint(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j), polygonAt(poly, j + 1));
                    if (isLeft(polygonAt(poly, i - 1), polygonAt(poly, i), p)) {
                        d = sqdist(poly[i], p);
                        if (d < upperDist) {
                            upperDist = d;
                            upperInt = p;
                            upperIndex = j;
                        }
                    }
                }
            }

            // if there are no vertices to connect to, choose a point in the middle
            if (lowerIndex === (upperIndex + 1) % polygon.length) {
                //console.log("Case 1: Vertex("+i+"), lowerIndex("+lowerIndex+"), upperIndex("+upperIndex+"), poly.size("+polygon.length+")");
                p[0] = (lowerInt[0] + upperInt[0]) / 2;
                p[1] = (lowerInt[1] + upperInt[1]) / 2;
                steinerPoints.push(p);

                if (i < upperIndex) {
                    //lowerPoly.insert(lowerPoly.end(), poly.begin() + i, poly.begin() + upperIndex + 1);
                    polygonAppend(lowerPoly, poly, i, upperIndex+1);
                    lowerPoly.push(p);
                    upperPoly.push(p);
                    if (lowerIndex !== 0){
                        //upperPoly.insert(upperPoly.end(), poly.begin() + lowerIndex, poly.end());
                        polygonAppend(upperPoly, poly,lowerIndex,poly.length);
                    }
                    //upperPoly.insert(upperPoly.end(), poly.begin(), poly.begin() + i + 1);
                    polygonAppend(upperPoly, poly,0,i+1);
                } else {
                    if (i !== 0){
                        //lowerPoly.insert(lowerPoly.end(), poly.begin() + i, poly.end());
                        polygonAppend(lowerPoly, poly,i,poly.length);
                    }
                    //lowerPoly.insert(lowerPoly.end(), poly.begin(), poly.begin() + upperIndex + 1);
                    polygonAppend(lowerPoly, poly,0,upperIndex+1);
                    lowerPoly.push(p);
                    upperPoly.push(p);
                    //upperPoly.insert(upperPoly.end(), poly.begin() + lowerIndex, poly.begin() + i + 1);
                    polygonAppend(upperPoly, poly,lowerIndex,i+1);
                }
            } else {
                // connect to the closest point within the triangle
                //console.log("Case 2: Vertex("+i+"), closestIndex("+closestIndex+"), poly.size("+polygon.length+")\n");

                if (lowerIndex > upperIndex) {
                    upperIndex += polygon.length;
                }
                closestDist = Number.MAX_VALUE;

                if(upperIndex < lowerIndex){
                    return result;
                }

                for (var j = lowerIndex; j <= upperIndex; ++j) {
                    if (isLeftOn(polygonAt(poly, i - 1), polygonAt(poly, i), polygonAt(poly, j)) && isRightOn(polygonAt(poly, i + 1), polygonAt(poly, i), polygonAt(poly, j))) {
                        d = sqdist(polygonAt(poly, i), polygonAt(poly, j));
                        if (d < closestDist) {
                            closestDist = d;
                            closestIndex = j % polygon.length;
                        }
                    }
                }

                if (i < closestIndex) {
                    polygonAppend(lowerPoly, poly,i,closestIndex+1);
                    if (closestIndex !== 0){
                        polygonAppend(upperPoly, poly,closestIndex,v.length);
                    }
                    polygonAppend(upperPoly, poly,0,i+1);
                } else {
                    if (i !== 0){
                        polygonAppend(lowerPoly, poly,i,v.length);
                    }
                    polygonAppend(lowerPoly, poly,0,closestIndex+1);
                    polygonAppend(upperPoly, poly,closestIndex,i+1);
                }
            }

            // solve smallest poly first
            if (lowerPoly.length < upperPoly.length) {
                polygonQuickDecomp(lowerPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
                polygonQuickDecomp(upperPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
            } else {
                polygonQuickDecomp(upperPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
                polygonQuickDecomp(lowerPoly,result,reflexVertices,steinerPoints,delta,maxlevel,level);
            }

            return result;
        }
    }
    result.push(polygon);

    return result;
}

/**
 * Remove collinear points in the polygon.
 * @method removeCollinearPoints
 * @param  {Number} [precision] The threshold angle to use when determining whether two edges are collinear. Use zero for finest precision.
 * @return {Number}           The number of points removed
 */
function polygonRemoveCollinearPoints(polygon, precision){
    var num = 0;
    for(var i=polygon.length-1; polygon.length>3 && i>=0; --i){
        if(collinear(polygonAt(polygon, i-1),polygonAt(polygon, i),polygonAt(polygon, i+1),precision)){
            // Remove the middle point
            polygon.splice(i%polygon.length,1);
            num++;
        }
    }
    return num;
}

/**
 * Check if two scalars are equal
 * @static
 * @method eq
 * @param  {Number} a
 * @param  {Number} b
 * @param  {Number} [precision]
 * @return {Boolean}
 */
function scalar_eq(a,b,precision){
    precision = precision || 0;
    return Math.abs(a-b) < precision;
}

},{}]},{},[1])
(1)
});


//i don't know what this does but it fixes an issue in poly decomp https://github.com/liabru/matter-js/issues/287
+!function(a){"object"==typeof exports?module.exports=a():"function"==typeof define&&define.amd?define(a):"undefined"!=typeof window?window.decomp=a():"undefined"!=typeof global?global.decomp=a():"undefined"!=typeof self&&(self.decomp=a())}(function(){return function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);throw new Error("Cannot find module '"+g+"'")}var j=c[g]={exports:{}};b[g][0].call(j.exports,function(a){var c=b[g][1][a];return e(c?c:a)},j,j.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b){function c(){}var d=a("./Scalar");b.exports=c,c.lineInt=function(a,b,c){c=c||0;var e,f,g,h,i,j,k,l=[0,0];return e=a[1][1]-a[0][1],f=a[0][0]-a[1][0],g=e*a[0][0]+f*a[0][1],h=b[1][1]-b[0][1],i=b[0][0]-b[1][0],j=h*b[0][0]+i*b[0][1],k=e*i-h*f,d.eq(k,0,c)||(l[0]=(i*g-f*j)/k,l[1]=(e*j-h*g)/k),l},c.segmentsIntersect=function(a,b,c,d){var e=b[0]-a[0],f=b[1]-a[1],g=d[0]-c[0],h=d[1]-c[1];if(0==g*f-h*e)return!1;var i=(e*(c[1]-a[1])+f*(a[0]-c[0]))/(g*f-h*e),j=(g*(a[1]-c[1])+h*(c[0]-a[0]))/(h*e-g*f);return i>=0&&1>=i&&j>=0&&1>=j}},{"./Scalar":4}],2:[function(a,b){function c(){}b.exports=c,c.area=function(a,b,c){return(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1])},c.left=function(a,b,d){return c.area(a,b,d)>0},c.leftOn=function(a,b,d){return c.area(a,b,d)>=0},c.right=function(a,b,d){return c.area(a,b,d)<0},c.rightOn=function(a,b,d){return c.area(a,b,d)<=0};var d=[],e=[];c.collinear=function(a,b,f,g){if(g){var h=d,i=e;h[0]=b[0]-a[0],h[1]=b[1]-a[1],i[0]=f[0]-b[0],i[1]=f[1]-b[1];var j=h[0]*i[0]+h[1]*i[1],k=Math.sqrt(h[0]*h[0]+h[1]*h[1]),l=Math.sqrt(i[0]*i[0]+i[1]*i[1]),m=Math.acos(j/(k*l));return g>m}return 0==c.area(a,b,f)},c.sqdist=function(a,b){var c=b[0]-a[0],d=b[1]-a[1];return c*c+d*d}},{}],3:[function(a,b){function c(){this.vertices=[]}function d(a,b,c,d,e){e=e||0;var f=b[1]-a[1],h=a[0]-b[0],i=f*a[0]+h*a[1],j=d[1]-c[1],k=c[0]-d[0],l=j*c[0]+k*c[1],m=f*k-j*h;return g.eq(m,0,e)?[0,0]:[(k*i-h*l)/m,(f*l-j*i)/m]}var e=a("./Line"),f=a("./Point"),g=a("./Scalar");b.exports=c,c.prototype.at=function(a){var b=this.vertices,c=b.length;return b[0>a?a%c+c:a%c]},c.prototype.first=function(){return this.vertices[0]},c.prototype.last=function(){return this.vertices[this.vertices.length-1]},c.prototype.clear=function(){this.vertices.length=0},c.prototype.append=function(a,b,c){if("undefined"==typeof b)throw new Error("From is not given!");if("undefined"==typeof c)throw new Error("To is not given!");if(b>c-1)throw new Error("lol1");if(c>a.vertices.length)throw new Error("lol2");if(0>b)throw new Error("lol3");for(var d=b;c>d;d++)this.vertices.push(a.vertices[d])},c.prototype.makeCCW=function(){for(var a=0,b=this.vertices,c=1;c<this.vertices.length;++c)(b[c][1]<b[a][1]||b[c][1]==b[a][1]&&b[c][0]>b[a][0])&&(a=c);f.left(this.at(a-1),this.at(a),this.at(a+1))||this.reverse()},c.prototype.reverse=function(){for(var a=[],b=0,c=this.vertices.length;b!==c;b++)a.push(this.vertices.pop());this.vertices=a},c.prototype.isReflex=function(a){return f.right(this.at(a-1),this.at(a),this.at(a+1))};var h=[],i=[];c.prototype.canSee=function(a,b){var c,d,g=h,j=i;if(f.leftOn(this.at(a+1),this.at(a),this.at(b))&&f.rightOn(this.at(a-1),this.at(a),this.at(b)))return!1;d=f.sqdist(this.at(a),this.at(b));for(var k=0;k!==this.vertices.length;++k)if((k+1)%this.vertices.length!==a&&k!==a&&f.leftOn(this.at(a),this.at(b),this.at(k+1))&&f.rightOn(this.at(a),this.at(b),this.at(k))&&(g[0]=this.at(a),g[1]=this.at(b),j[0]=this.at(k),j[1]=this.at(k+1),c=e.lineInt(g,j),f.sqdist(this.at(a),c)<d))return!1;return!0},c.prototype.copy=function(a,b,d){var e=d||new c;if(e.clear(),b>a)for(var f=a;b>=f;f++)e.vertices.push(this.vertices[f]);else{for(var f=0;b>=f;f++)e.vertices.push(this.vertices[f]);for(var f=a;f<this.vertices.length;f++)e.vertices.push(this.vertices[f])}return e},c.prototype.getCutEdges=function(){for(var a=[],b=[],d=[],e=new c,f=Number.MAX_VALUE,g=0;g<this.vertices.length;++g)if(this.isReflex(g))for(var h=0;h<this.vertices.length;++h)if(this.canSee(g,h)){b=this.copy(g,h,e).getCutEdges(),d=this.copy(h,g,e).getCutEdges();for(var i=0;i<d.length;i++)b.push(d[i]);b.length<f&&(a=b,f=b.length,a.push([this.at(g),this.at(h)]))}return a},c.prototype.decomp=function(){var a=this.getCutEdges();return a.length>0?this.slice(a):[this]},c.prototype.slice=function(a){if(0==a.length)return[this];if(a instanceof Array&&a.length&&a[0]instanceof Array&&2==a[0].length&&a[0][0]instanceof Array){for(var b=[this],c=0;c<a.length;c++)for(var d=a[c],e=0;e<b.length;e++){var f=b[e],g=f.slice(d);if(g){b.splice(e,1),b.push(g[0],g[1]);break}}return b}var d=a,c=this.vertices.indexOf(d[0]),e=this.vertices.indexOf(d[1]);return-1!=c&&-1!=e?[this.copy(c,e),this.copy(e,c)]:!1},c.prototype.isSimple=function(){for(var a=this.vertices,b=0;b<a.length-1;b++)for(var c=0;b-1>c;c++)if(e.segmentsIntersect(a[b],a[b+1],a[c],a[c+1]))return!1;for(var b=1;b<a.length-2;b++)if(e.segmentsIntersect(a[0],a[a.length-1],a[b],a[b+1]))return!1;return!0},c.prototype.quickDecomp=function(a,b,e,g,h,i){h=h||100,i=i||0,g=g||25,a="undefined"!=typeof a?a:[],b=b||[],e=e||[];var j=[0,0],k=[0,0],l=[0,0],m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=new c,u=new c,v=this,w=this.vertices;if(w.length<3)return a;if(i++,i>h)return console.warn("quickDecomp: max level ("+h+") reached."),a;for(var x=0;x<this.vertices.length;++x)if(v.isReflex(x)){b.push(v.vertices[x]),m=n=Number.MAX_VALUE;for(var y=0;y<this.vertices.length;++y)f.left(v.at(x-1),v.at(x),v.at(y))&&f.rightOn(v.at(x-1),v.at(x),v.at(y-1))&&(l=d(v.at(x-1),v.at(x),v.at(y),v.at(y-1)),f.right(v.at(x+1),v.at(x),l)&&(o=f.sqdist(v.vertices[x],l),n>o&&(n=o,k=l,r=y))),f.left(v.at(x+1),v.at(x),v.at(y+1))&&f.rightOn(v.at(x+1),v.at(x),v.at(y))&&(l=d(v.at(x+1),v.at(x),v.at(y),v.at(y+1)),f.left(v.at(x-1),v.at(x),l)&&(o=f.sqdist(v.vertices[x],l),m>o&&(m=o,j=l,q=y)));if(r==(q+1)%this.vertices.length)l[0]=(k[0]+j[0])/2,l[1]=(k[1]+j[1])/2,e.push(l),q>x?(t.append(v,x,q+1),t.vertices.push(l),u.vertices.push(l),0!=r&&u.append(v,r,v.vertices.length),u.append(v,0,x+1)):(0!=x&&t.append(v,x,v.vertices.length),t.append(v,0,q+1),t.vertices.push(l),u.vertices.push(l),u.append(v,r,x+1));else{if(r>q&&(q+=this.vertices.length),p=Number.MAX_VALUE,r>q)return a;for(var y=r;q>=y;++y)f.leftOn(v.at(x-1),v.at(x),v.at(y))&&f.rightOn(v.at(x+1),v.at(x),v.at(y))&&(o=f.sqdist(v.at(x),v.at(y)),p>o&&(p=o,s=y%this.vertices.length));s>x?(t.append(v,x,s+1),0!=s&&u.append(v,s,w.length),u.append(v,0,x+1)):(0!=x&&t.append(v,x,w.length),t.append(v,0,s+1),u.append(v,s,x+1))}return t.vertices.length<u.vertices.length?(t.quickDecomp(a,b,e,g,h,i),u.quickDecomp(a,b,e,g,h,i)):(u.quickDecomp(a,b,e,g,h,i),t.quickDecomp(a,b,e,g,h,i)),a}return a.push(this),a},c.prototype.removeCollinearPoints=function(a){for(var b=0,c=this.vertices.length-1;this.vertices.length>3&&c>=0;--c)f.collinear(this.at(c-1),this.at(c),this.at(c+1),a)&&(this.vertices.splice(c%this.vertices.length,1),c--,b++);return b}},{"./Line":1,"./Point":2,"./Scalar":4}],4:[function(a,b){function c(){}b.exports=c,c.eq=function(a,b,c){return c=c||0,Math.abs(a-b)<c}},{}],5:[function(a,b){b.exports={Polygon:a("./Polygon"),Point:a("./Point")}},{"./Point":2,"./Polygon":3}]},{},[5])(5)});
