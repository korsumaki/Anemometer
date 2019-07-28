// calculation.js

/*
 * TODO
 * + TDD unit testeillä
 * + taulukointi esim. 5 tai 10 asteen välein
 * - UI piirto uuden taulukon kanssa
 *   - oikeat arvot mustalla
 *   - interpoloidut arvot harmaalla
 *   - viimeisin arvo vihreällä
 */


var textElement = null;
var updateCounter = 0;

var prevPosition = null;
var calculatedSpeed = 0;
var calculatedHeading = 0;
var headingVectors = null;

var headingSteps = 10;
var headingSlots = 360/headingSteps;

function clearData()
{
	updateCounter = 0;
	headingVectors = new Array( headingSlots ).fill(0);
}

function findNextSlot(startIndex, direction, limitCount)
{
	if (limitCount == 0) // Stop recursion
	{
		return startIndex;
	}

	var index = startIndex + direction;
	if (index < 0)
	{
		index += headingSlots;
	}
	if (index >= headingSlots)
	{
		index -= headingSlots;
	}

	if (headingVectors[index] > 0)
	{
		return index;
	}
	else
	{
		return findNextSlot(index, direction, limitCount-1);
	}
}

function lerp(v0, v1, t) {
	return (1 - t) * v0 + t * v1;
}

function getSpeedForHeadingNoInterpolation(heading)
{
	var index = Math.round(heading/headingSteps);
	var speed = headingVectors[index];
	return speed;
}

function getSpeedForHeading(heading)
{
	var index = Math.round(heading/headingSteps);
	var speed = headingVectors[index];
	if (speed == 0)
	{
		var nextSlot = findNextSlot(index, 1, headingSlots);
		var prevSlot = findNextSlot(index, -1, headingSlots);

		if (prevSlot == nextSlot) {
			return headingVectors[prevSlot];	// Both directions found the same slot
		}

		// make sure all indexes are in the same round
		var p = prevSlot;
		var n = nextSlot;
		if (p > index) p -= headingSlots;
		if (n < index) n += headingSlots;

		var f = (index-p) / (n-p);
		return lerp(headingVectors[prevSlot], headingVectors[nextSlot], f);
	}
	return speed;
}


function getLocation() {
	textElement = document.getElementById("textElement");

	clearData();

	// Test data
	//addSpeedAndHeading(5, 120);
	//addSpeedAndHeading(9, 195);
	//addSpeedAndHeading(7, 30);

	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(showPosition, showError ); // , { enableHighAccuracy: true}
		textElement.innerHTML = "Searching location";
	} else { 
		textElement.innerHTML = "Geolocation is not supported by this browser.";
	}
}


function drawLine(ctx, x1, y1, x2, y2, color) {
	ctx.beginPath();
	ctx.moveTo(x1,y1);
	ctx.lineTo(x2,y2);
	ctx.lineWidth = 3;
	ctx.strokeStyle = color;
	ctx.closePath();
	ctx.stroke();
}

function drawCircle(ctx, x, y, radius) {
	ctx.beginPath();
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'black';
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.closePath();
	ctx.stroke();
}


function toRad(v) {
	return v * (Math.PI / 180);
}

function toDeg(v) {
	return v / (Math.PI / 180);
}

function maxValue(arr) {
	return arr.reduce( function(total, value) { return Math.max(total, value) } )
}

function minValue(arr) {
	return arr.reduce( function(total, value) 
	{
		if (value >0) {
			return Math.min(total, value);
		}
		else {
			return total;
		}
	}, 9999 )
}

function drawVectors() {
	var c = document.getElementById("mapCanvas");
	var ctx = c.getContext("2d");

	var centerX = c.width/2;
	var centerY = c.height/2;

	// Clear screen
	ctx.clearRect(0, 0, c.width, c.height);


	// Find highest and lowest speed vectors -> draw circles for those
	var highest = maxValue(headingVectors);
	var lowest = minValue(headingVectors);

	// Calculate scale factor to fill screen nicely
	var scaleFactor = centerX/(highest*1.1); // 10% marginal

	for (var heading=0; heading<360; heading += 10) {
		var color = 'blue';
		speed = getSpeedForHeadingNoInterpolation(heading);

		if (speed == 0) { // We should use interpolation
			color = 'gray';	// Interpolated values with different color
			speed = getSpeedForHeading(heading);
		}
		if ((heading/10) == Math.round(getHeading()/10)) { // Latest heading with different color
			color = 'red';
		}
		var scaledDistance = speed*scaleFactor

		var direction = toRad(heading);
		var x = Math.sin(direction) * scaledDistance;
		var y = Math.cos(direction) * scaledDistance;

		drawLine(ctx, 
			centerX, centerY, 
			centerX + x,
			centerY - y,
			color );
	}
	drawCircle(ctx, centerX, centerY, highest * scaleFactor);
	drawCircle(ctx, centerX, centerY, lowest * scaleFactor);
}


function getSpeed() {
	return calculatedSpeed;
}

function getHeading() {
	return calculatedHeading;
}

// Return distance in kilometers
function calcDistanceFrom(lat1, lon1, lat2, lon2) {
	var R = 6371; // km
	var dLat = toRad(lat2-lat1);
	var dLon = toRad(lon2-lon1);
	lat1 = toRad(lat1);
	lat2 = toRad(lat2);

	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c;
	return d;
}

/*
* Calculate bearing from point1 to point2
* 
* Input in Radian decimal -format
* 
* source: http://www.movable-type.co.uk/scripts/latlong.html
*/
function BearingBetweenCoordinates(lat1, lon1, lat2, lon2 ) {
	var y = Math.sin(lon2-lon1) * Math.cos(lat2);
	var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);
	var brng = toDeg(Math.atan2(y, x));

	// Result is between -180 ... + 180. To change to 0 ... 360 use "(brng+360)%360"
	brng = (brng+360)%360;

	return brng;
}



function calcSpeedAndHeading(position) {
	if (prevPosition != null && position.timestamp != null && prevPosition.timestamp != null ) {
		// Calculate direction
		calculatedHeading = BearingBetweenCoordinates(
			prevPosition.coords.latitude, prevPosition.coords.longitude,
			position.coords.latitude, position.coords.longitude);

		// Calculate speed
		var timeDelta_ms =  position.timestamp - prevPosition.timestamp;
		if (timeDelta_ms > 0) {
			var distance = calcDistanceFrom(
				prevPosition.coords.latitude, prevPosition.coords.longitude,
				position.coords.latitude, position.coords.longitude);
			calculatedSpeed = distance*1000.0 / (timeDelta_ms/1000.0); // -> km/ms == m/s
	
			addSpeedAndHeading(calculatedSpeed, calculatedHeading);
		}
	}
	prevPosition = position;
}

var speedIirFilterValue = 25; // TODO move to up

function addSpeedAndHeading(speed, heading) {
	calculatedHeading = heading;
	calculatedSpeed = speed;

	if (calculatedSpeed > 0.1) {
		var index = Math.round(calculatedHeading/headingSteps);

		var oldSpeed = headingVectors[index];
		var iirFilterSpeed = calculatedSpeed;

		if (oldSpeed > 0) // Filter only if there is previous value. Zero means that this value is not yet got.
		{
			iirFilterSpeed = ((oldSpeed * (100-speedIirFilterValue)) + (calculatedSpeed * speedIirFilterValue)) /100;
		}

		headingVectors[index] = iirFilterSpeed;
	}
}

function showPosition(position) {
	updateCounter++;

	var str = "";
	if (position.coords.speed != null && position.coords.heading != null) {
		addSpeedAndHeading(position.coords.speed, position.coords.heading);
		prevPosition = position;
		str += "<br>(from gps)";
	}
	else {
		calcSpeedAndHeading(position);
		str += "<br>(calculated from coordinates)";
	}
	textElement.innerHTML = "Speed: " + getSpeed() + " m/s" + 
		"<br>Heading: " + getHeading() + " degrees" + str +
		"<br>accuracy: " + position.coords.accuracy + " m" +
		"<br>updates: " + updateCounter;
	drawVectors();
}

function showError(error) {
	switch(error.code) {
		case error.PERMISSION_DENIED:
			textElement.innerHTML = "User denied the request for Geolocation."
			break;
		case error.POSITION_UNAVAILABLE:
			textElement.innerHTML = "Location information is unavailable."
			break;
		case error.TIMEOUT:
			textElement.innerHTML = "The request to get user location timed out."
			break;
		case error.UNKNOWN_ERROR:
			textElement.innerHTML = "An unknown error occurred."
			break;
	}
}
