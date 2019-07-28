// Unit tests for anemometer

QUnit.test( "empty table", function( assert ) {
	clearData();
	assert.equal( getSpeedForHeading(0), 0, "table is empty" );
	assert.equal( getSpeedForHeading(45), 0, "table is empty" );
});

QUnit.test( "single values", function( assert ) {
	clearData();

	addSpeedAndHeading(15, 90);
	assert.equal( getSpeedForHeading(90), 15, "single value added to table");

	addSpeedAndHeading(12, 45);
	assert.equal( getSpeedForHeading(45), 12, "single value added to table");

	addSpeedAndHeading(1, 44);
	assert.equal( getSpeedForHeading(44), 1, "single value added to table");
	assert.equal( getSpeedForHeading(36), 1, "single value added to table");

	addSpeedAndHeading(12, 350);
	assert.equal( getSpeedForHeading(350), 12, "value at big degree slot");
});

QUnit.test( "IIR filter for multiple values", function( assert ) {
	clearData();

	addSpeedAndHeading(20, 90);
	assert.equal( getSpeedForHeading(90), 20, "value is filtered");

	addSpeedAndHeading(10, 90);
	assert.equal( getSpeedForHeading(90), 17.5, "value is filtered");

	addSpeedAndHeading(10, 90);
	assert.equal( getSpeedForHeading(90), 15.625, "value is filtered");
});

QUnit.test( "findNextSlot", function( assert ) {
	clearData();

	assert.equal( findNextSlot(8, 1, headingSlots), 8, "empty table");
	assert.equal( findNextSlot(8, -1, headingSlots), 8, "empty table");

	addSpeedAndHeading(20, 90);
	addSpeedAndHeading(30, 270);

	assert.equal( findNextSlot(8, 1, headingSlots), 9, "forward");
	assert.equal( findNextSlot(0, 1, headingSlots), 9, "forward");
	assert.equal( findNextSlot(14, 1, headingSlots), 27, "forward");

	addSpeedAndHeading(20, 290);
	addSpeedAndHeading(30, 310);

	assert.equal( findNextSlot(30, 1, headingSlots), 31, "forward");
	assert.equal( findNextSlot(30, -1, headingSlots), 29, "backward");
});

QUnit.test( "interpolate empty slots", function( assert ) {
	clearData();

	addSpeedAndHeading(20, 180);
	addSpeedAndHeading(30, 280);
	assert.equal( getSpeedForHeading(180), 20, "low end value");
	assert.equal( getSpeedForHeading(225), 25, "middle value");
	assert.equal( getSpeedForHeading(280), 30, "high end value");
	assert.equal( getSpeedForHeading(260), 28, "near high end value");

	addSpeedAndHeading(10, 290);
	addSpeedAndHeading(11, 310);
	assert.equal( getSpeedForHeading(300), 10.5, "middle value for short range");
});

QUnit.test( "vector methods", function( assert ) {
	clearData();

	addSpeedAndHeading(20, 180);
	addSpeedAndHeading(30, 280);
	assert.equal( maxValue(headingVectors), 30, "max");
	addSpeedAndHeading(32, 80);
	assert.equal( maxValue(headingVectors), 32, "max");

	assert.equal( minValue(headingVectors), 20, "minValue");
	addSpeedAndHeading(2, 10);
	assert.equal( minValue(headingVectors), 2, "minValue");

});

