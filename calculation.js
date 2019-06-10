// calculation.js

var x = null;
var updateCounter = 0;

var prevPosition = null;
var calculatedSpeed = null;
var calculatedHeading = null;
var vectors = null;



function getLocation() {
	x = document.getElementById("demo");

	updateCounter = 0;
	vectors = new Array();

	//vectors.push(new SpeedVector(15, 45));
	//vectors.push(new SpeedVector(8, 180));
	//vectors.push(new SpeedVector(19, 200));
	//vectors.push(new SpeedVector(3, 300));

	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(showPosition, showError);
		x.innerHTML = "Searching location";
	} else { 
		x.innerHTML = "Geolocation is not supported by this browser.";
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



function calcSpeedAndHEading(position) {
	console.log("calcSpeedAndHEading");
	if (prevPosition != null) {
		console.log("actual calculation");
		// Calculate direction
		calculatedHeading = BearingBetweenCoordinates(
			prevPosition.coords.latitude, prevPosition.coords.longitude,
			position.coords.latitude, position.coords.longitude);

		// Calculate speed
		var timeDelta_ms =  position.timestamp - prevPosition.timestamp;

		var distance = calcDistanceFrom(
			prevPosition.coords.latitude, prevPosition.coords.longitude,
			position.coords.latitude, position.coords.longitude);
		calculatedSpeed = distance*1000*1000 / timeDelta_ms; // -> km/ms == m/s

		if (calculatedSpeed > 0.01) {
			vectors.push(new SpeedVector(calculatedSpeed, calculatedHeading));
		}
	}
	prevPosition = position;
}

function showPosition(position) {
	updateCounter++;

	calcSpeedAndHEading(position);
	x.innerHTML = //"Latitude: " + position.coords.latitude + 
		//"<br>Longitude: " + position.coords.longitude +
		"<br>speed: " + position.coords.speed + " m/s" + 
		"<br>heading: " + position.coords.heading + " degrees" +
		"<br>accuracy: " + position.coords.accuracy + " m" +
		"<br><br>own speed: " + getSpeed() + " m/s" + 
		"<br>own heading: " + getHeading() + " degrees" +
		"<br>updates: " + updateCounter +
		"<br>vectors: " + vectors.length;
	drawVectors();
}

function showError(error) {
	switch(error.code) {
		case error.PERMISSION_DENIED:
			x.innerHTML = "User denied the request for Geolocation."
			break;
		case error.POSITION_UNAVAILABLE:
			x.innerHTML = "Location information is unavailable."
			break;
		case error.TIMEOUT:
			x.innerHTML = "The request to get user location timed out."
			break;
		case error.UNKNOWN_ERROR:
			x.innerHTML = "An unknown error occurred."
			break;
	}
}
