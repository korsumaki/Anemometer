// calculation.js

var textElement = null;
var updateCounter = 0;

var prevPosition = null;
var calculatedSpeed = null;
var calculatedHeading = null;
var vectors = null;



function getLocation() {
	textElement = document.getElementById("textElement");

	updateCounter = 0;
	vectors = new Array();

	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(showPosition, showError ); // , { enableHighAccuracy: true}
		textElement.innerHTML = "Searching location";
	} else { 
		textElement.innerHTML = "Geolocation is not supported by this browser.";
	}
}


class SpeedVector {
	constructor(speed, direction) {
		this._speed = speed;
		this._direction = direction;
	}
	getSpeed() {
		return this._speed;
	}
	getDirection() {
		return this._direction;
	}
}


function drawLine(ctx, x1, y1, x2, y2) {
	ctx.moveTo(x1,y1);
	ctx.lineTo(x2,y2);
	ctx.strokeStyle = 'black';
	ctx.stroke();
}

function drawCircle(ctx, x, y, radius) {
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.stroke();
}


function toRad(v) {
	return v * (Math.PI / 180);
}

function toDeg(v) {
	return v / (Math.PI / 180);
}

function drawVectors() {
	var c = document.getElementById("mapCanvas");
	var ctx = c.getContext("2d");

	var centerX = c.width/2;
	var centerY = c.height/2;

	// Clear screen
	ctx.clearRect(0, 0, c.width, c.height);


	// Find highest and lowest speed vectors -> draw circles for those
	var highest = 0;
	var lowest = 9999;
	for (var i=0; i<vectors.length; ++i) {
		highest = Math.max(highest, vectors[i].getSpeed() );
		lowest = Math.min(lowest, vectors[i].getSpeed() );
	}

	// Calculate scale factor to fill screen nicely
	var scaleFactor = centerX/(highest*1.1); // 10% marginal

	for (var i=0; i<vectors.length; ++i) {
		var scaledDistance = vectors[i].getSpeed()*scaleFactor
		var direction = toRad( vectors[i].getDirection() );

		var x = Math.sin(direction) * scaledDistance;
		var y = Math.cos(direction) * scaledDistance;

		drawLine(ctx, 
			centerX, centerY, 
			centerX + x,
			centerY - y );
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
	
			if (calculatedSpeed > 0.1) {
				vectors.push(new SpeedVector(calculatedSpeed, calculatedHeading));
			}
		}
	}
	prevPosition = position;
}

function addSpeedAndHeading(position) {
	calculatedHeading = position.coords.heading;
	calculatedSpeed = position.coords.speed;

	if (calculatedSpeed > 0.1) {
		vectors.push(new SpeedVector(calculatedSpeed, calculatedHeading));
	}

	prevPosition = position;
}


function showPosition(position) {
	updateCounter++;

	var str = "";
	if (position.coords.speed != null && position.coords.heading != null) {
		addSpeedAndHeading(position);
		str += "<br>(from gps)";
	}
	else {
		calcSpeedAndHeading(position);
		str += "<br>(calculated from coordinates)";
	}
	textElement.innerHTML = "Speed: " + getSpeed() + " m/s" + 
		"<br>Heading: " + getHeading() + " degrees" + str +
		"<br>accuracy: " + position.coords.accuracy + " m" +
		"<br>updates: " + updateCounter +
		", vectors: " + vectors.length;
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
