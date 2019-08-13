// calculation.js

/*
 * TODO
 * + suurin ja pienin nopeus numeroilla
 * + laske nopeusvektoreiden summavektori
 *   + samalla piirtofunktiossa?
 * - moderni ui, skaalaa canvas ruudun levyiseksi?
 * - käännä tuulen suunta 180.
 * /- sovita ympyrä dataan
 *   - halkaisija on (max+min)/2
 *   - vajaalla datalla halkaisija voi olla jotain muutakin. Voiko sen laskea?
 *     - keskiarvo nopeusvektoreiden pituuksista? Se pienentäisi yksittäiset suuren tai pienen nopeden aiheuttamaa virhettä
 * + muodosta testidataa
 * + tuulen arvioitu suunta ja nopeus numeroilla
 * + tuulen arvioitu suunta ja nopeus nuolena kuvaan
 * - voiko laskea virhemarginaalia?
 *   - gps:n accuracy
 *   - nopeuksien vaihtelut
 *   - interpolointijakson pituus luo virhettä
 */


var textElement = null;
var updateCounter = 0;

var prevPosition = null;
var calculatedSpeed = 0;
var calculatedHeading = 0;
var headingVectors = null;

var headingSteps = 10;
var headingSlots = 360/headingSteps;

var locationId = null;

var trackPointArray; // GPS locations for test data

var testDataFilename = "testData_20190731.xml"
var log = ""

function debug_log(str)
{
	log += str + "<br>";
	document.getElementById("log").innerHTML=log;
}

function loadXMLDoc(filename, handler) {
	var xhttp;
	if (window.XMLHttpRequest)
	{
		xhttp=new XMLHttpRequest();
	}
	else // IE 5/6
	{
		xhttp=new ActiveXObject("Microsoft.XMLHTTP");
		debug_log( "going IE way");
	}
	
	xhttp.onreadystatechange=handler;
	xhttp.open("GET",filename, true);
	xhttp.send();
}

function testDataXmlResponseHandler() {
	if (this.readyState == this.DONE || this.readyState == 4) {
		if (this.status == 200 && this.responseXML !== null ) {
			// success!
			testDataXmlReadyHandler(this.responseXML);
			return;
		}
		// something went wrong
		debug_log( "ERROR: testDataXmlResponseHandler - error: status=" + this.status );
	}
}

// This class keep one gps location
class TrackPoint {
	constructor(time, lat, lon) {
		this.time = time;
		this.lat = lat;
		this.lon = lon;
	}
}

function testDataXmlReadyHandler(xmlDoc) {
	var trackpoint_list = xmlDoc.getElementsByTagName("trkpt");
	trackPointArray = new Array();

	for (var index=0; index<trackpoint_list.length; ++index) {
		var trackPointTime = trackpoint_list[index].getElementsByTagName("time")[0].innerHTML;
		var lat = trackpoint_list[index].attributes.getNamedItem("lat").value;
		var lon = trackpoint_list[index].attributes.getNamedItem("lon").value;
		trackPointArray.push(new TrackPoint(trackPointTime, lat, lon));
	}
	debug_log( "Loaded " + trackPointArray.length + " trackPoints.");
}



function testInit() {
	// remove location request
	if (navigator.geolocation) {
		if (locationId != null) {
		navigator.geolocation.clearWatch(locationId);
			locationId = null;
		textElement.innerHTML = "Location watch stopped during test data.";
		}
	} else { 
		textElement.innerHTML = "Geolocation is not supported by this browser.";
	}

	clearData();

	// Load test data
	loadXMLDoc(testDataFilename, testDataXmlResponseHandler);
}

// Function for converting lat, lon and time to position object
function createPositionObject(lat, lon, time) {
	var position = {
		coords: {
			latitude: null,
			longitude: null,
			accuracy: 999,
			altitude: null,
			altitudeAccuracy: null,
			heading: null,
			speed: null,
		},
		timestamp: null,
	};
	
	position.coords.latitude = lat;
	position.coords.longitude = lon;
	position.timestamp = time;

	return position;
}

var testDataIndex = 0;
var currentTime = null;
var simulationSpeed = 500;
var testTimerId = null;

function testStart(startTime) {
	var time = new Date(startTime);
	var timeMilliseconds = Date.parse(startTime);

	debug_log( "Starting test at " + time.toLocaleTimeString() );
	clearData();

	// Loop to start time
	var testDataIndex = 0;
	while (Date.parse(trackPointArray[testDataIndex].time) < timeMilliseconds) {
		testDataIndex++;
	}

	// start timer for test data
	testTimerId = setInterval( function() {
		var timestamp = Date.parse(trackPointArray[testDataIndex].time);
		var lat = trackPointArray[testDataIndex].lat;
		var lon = trackPointArray[testDataIndex].lon;
		currentTime = new Date(trackPointArray[testDataIndex].time).toLocaleTimeString();
		testDataIndex++;

		showPosition( createPositionObject(lat, lon, timestamp) );
	}, simulationSpeed);
}


function clearData()
{
	updateCounter = 0;
	headingVectors = new Array( headingSlots ).fill(0);

	prevPosition = null;

	if (testTimerId != null)
		clearInterval(testTimerId);
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
	var index = Math.round(heading/headingSteps) % headingSlots;
	var speed = headingVectors[index];
	return speed;
}

function getSpeedForHeading(heading)
{
	var index = Math.round(heading/headingSteps) % headingSlots;
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

	if (navigator.geolocation) {
		if (locationId == null) {
			locationId = navigator.geolocation.watchPosition(showPosition, showError, { enableHighAccuracy: true} );
		textElement.innerHTML = "Searching location";
		}
	} else { 
		textElement.innerHTML = "Geolocation is not supported by this browser.";
	}
}


function drawLine(ctx, x1, y1, x2, y2, color, lineWidth) {
	ctx.beginPath();
	ctx.moveTo(x1,y1);
	ctx.lineTo(x2,y2);
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = color;
	ctx.closePath();
	ctx.stroke();
}

function drawCircle(ctx, x, y, radius, color) {
	ctx.beginPath();
	ctx.lineWidth = 1;
	ctx.strokeStyle = color;
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

	for (var heading=0; heading<360; heading += headingSteps) {
		var color = 'blue';
		speed = getSpeedForHeadingNoInterpolation(heading);

		if (speed == 0) { // We should use interpolation
			color = 'lightgray';	// Interpolated values with different color
			speed = getSpeedForHeading(heading);
		}
		if ((heading/headingSteps) == Math.round(getHeading()/headingSteps) % headingSlots) { // Latest heading with different color
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
			color, 2);
	}
	drawCircle(ctx, centerX, centerY, highest * scaleFactor, 'black');
	drawCircle(ctx, centerX, centerY, lowest * scaleFactor, 'black');
}


function addPrefixDigits(value, digitToAdd, targetLength) {
	while (value.length < targetLength) {
		value = digitToAdd + value;
	}
	return value;
}


function calcWindVector() {
	var c = document.getElementById("mapCanvas");
	var ctx = c.getContext("2d");

	var centerX = c.width/2;
	var centerY = c.height/2;

	// Find highest and lowest speed vectors -> draw circles for those
	var highest = maxValue(headingVectors);

	// Calculate scale factor to fill screen nicely
	var scaleFactor = centerX/(highest*1.1); // 10% marginal

	var x = 0;
	var y = 0;

	for (var heading=0; heading<360; heading += headingSteps) {
		speed = getSpeedForHeading(heading);

		var direction = toRad(heading);
		x = x + Math.sin(direction) * speed;
		y = y + Math.cos(direction) * speed;
		//console.log("Heading: " + heading + " speed:" + speed + " -> (" + x + ", " + y + ")");
	}

	var windSpeed = Math.sqrt(x*x + y*y) / (headingSlots/2);
	var alpha = toDeg( Math.atan2(y, x) );
	alpha = -alpha+90;
	alpha = (alpha+180)%360;
	//console.log("Wind: " + windSpeed + " m/s " + alpha + " degrees");

	color = 'green';
	drawLine(ctx, 
		centerX, centerY, 
		centerX + x* scaleFactor/(headingSlots/(2*4)),		// *4 is to get wind vector scaled up 4 times
		centerY - y* scaleFactor/(headingSlots/(2*4)),		// *4 is to get wind vector scaled up 4 times
		color, 5 );

	var knots = windSpeed/1852*3600;
	// Write also numbers to canvas
	var degreesStr = addPrefixDigits("" + Math.round(alpha), "0", 3);
	var text = Math.round(windSpeed*10)/10 + " m/s " + Math.round(knots*10)/10 + " kn " + degreesStr + " deg";
	ctx.font = "20px Arial";
	ctx.fillText(text, 3, c.height-3);
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
		heading = BearingBetweenCoordinates(
			prevPosition.coords.latitude, prevPosition.coords.longitude,
			position.coords.latitude, position.coords.longitude);

		// Calculate speed
		var timeDelta_ms =  position.timestamp - prevPosition.timestamp;
		if (timeDelta_ms > 0) {
			var distance = calcDistanceFrom(
				prevPosition.coords.latitude, prevPosition.coords.longitude,
				position.coords.latitude, position.coords.longitude);
			speed = distance*1000.0 / (timeDelta_ms/1000.0); // -> km/ms == m/s
	
			addSpeedAndHeading(speed, heading);
		}
	}
	prevPosition = position;
}

var speedIirFilterValue = 25; // TODO move to up

function addSpeedAndHeading(speed, heading) {
	if (speed > 0.1) {
		calculatedHeading = heading;
		calculatedSpeed = speed;

		var index = Math.round(calculatedHeading/headingSteps) % headingSlots;

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
		str += " (from gps)";
	}
	else {
		calcSpeedAndHeading(position);
		str += " (from coordinates)";
	}
	var maxSpeed = maxValue(headingVectors);
	var minSpeed = minValue(headingVectors);
	var latestSpeed = getSpeed();

	textElement.innerHTML =
		"Current speed: " + 
			Math.round(latestSpeed*3.6) + " km/h (" + 
			Math.round(latestSpeed*10)/10 + " m/s)" + 
		"<br>Heading: " + Math.round(getHeading()) + " degrees" + str +
		"<br>Max speed: " + 
			Math.round(maxSpeed*3.6) + " km/h (" + 
			Math.round(maxSpeed*10)/10 + " m/s)" + 
		"<br>Min speed: " + 
			Math.round(minSpeed*3.6) + " km/h (" + 
			Math.round(minSpeed*10)/10 + " m/s)" + 
		"<br>accuracy: " + position.coords.accuracy + " m" +
		"<br>updates: " + updateCounter;
	if (currentTime != null) {
		textElement.innerHTML = textElement.innerHTML + "<br>Simulation time: " + currentTime;
	}

	drawVectors();
	calcWindVector();
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
