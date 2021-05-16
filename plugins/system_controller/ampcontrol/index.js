'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var Gpio = require("onoff").Gpio;
var io = require('socket.io-client');
var sleep = require('sleep');
var socket = io.connect("http://localhost:3000");

// Event string consts
const SYSTEM_STARTUP = "systemStartup";
const SYSTEM_SHUTDOWN = "systemShutdown";
const MUSIC_PLAY = "musicPlay";
const MUSIC_PAUSE = "musicPause";
const MUSIC_STOP = "musicStop";

const events = [SYSTEM_STARTUP, SYSTEM_SHUTDOWN, MUSIC_PLAY, MUSIC_PAUSE, MUSIC_STOP];

module.exports = ampcontrol;
function ampcontrol(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;
	self.GPIOs = [];
	self.piBoard = self.getPiBoardInfo();

}



ampcontrol.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

	self.log(`Detected ${self.piBoard.name}`);
	self.log(`40 GPIOs: ${self.piBoard.fullGPIO}`);
	self.log("Initialized");

    return libQ.resolve();
}

// Volumio is shutting down
ampcontrol.prototype.onVolumioShutdown = function() {
	var self = this;

	self.handleEvent(SYSTEM_SHUTDOWN);

	return libQ.resolve();
};



ampcontrol.prototype.onStart = function() {
    var self = this;
	var defer=libQ.defer();

	// read and parse status once
	socket.emit("getState", "");
	socket.once("pushState", self.statusChanged.bind(self));

	// listen to every subsequent status report from Volumio
	// status is pushed after every playback action, so we will be
	// notified if the status changes
	socket.on("pushState", self.statusChanged.bind(self));

	// Create pin objects
	self.createGPIOs()
		.then (function(result) {
			self.log("GPIOs created");
			self.handleEvent(SYSTEM_STARTUP);

			defer.resolve();
		});

    return defer.promise;
};

ampcontrol.prototype.onStop = function() {
    var self = this;
    var defer=libQ.defer();

	self.clearGPIOs()
		.then (function(result) {
			self.log("GPIOs destroyed");
			defer.resolve();
		});

    return libQ.resolve();
};

ampcontrol.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};

ampcontrol.prototype.onInstall = function () {
	var self = this;
};

ampcontrol.prototype.onUninstall = function () {
	var self = this;
};

// Configuration Methods -----------------------------------------------------------------------------

ampcontrol.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;

    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {


            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};

ampcontrol.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

ampcontrol.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

ampcontrol.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

ampcontrol.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};

ampcontrol.prototype.getAdditionalConf = function (type, controller, data) {
	var self = this;
};

ampcontrol.prototype.setAdditionalConf = function () {
	var self = this;
};

// Create GPIO objects for future events
GPIOControl.prototype.createGPIOs = function() {
	var self = this;

	self.log("Creating GPIOs");
//17 amp power
//22 left spkr
//23 right spkr
	// startup
	var gpio = new Gpio(17, "out");
	gpio.e = SYSTEM_STARTUP;
	gpio.state = true;
	gpio.pin = 17;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(22, "out");
	gpio.e = SYSTEM_STARTUP;
	gpio.state = true;
	gpio.pin = 22;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(23, "out");
	gpio.e = SYSTEM_STARTUP;
	gpio.state = true;
	gpio.pin = 23;
	self.GPIOs.push(gpio);

	// startup
	var gpio = new Gpio(17, "out");
	gpio.e = SYSTEM_STARTUP;
	gpio.state = false;
	gpio.pin = 17;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(22, "out");
	gpio.e = SYSTEM_STARTUP;
	gpio.state = true;
	gpio.pin = 22;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(23, "out");
	gpio.e = SYSTEM_STARTUP;
	gpio.state = true;
	gpio.pin = 23;
	self.GPIOs.push(gpio);

	// shutdown
	var gpio = new Gpio(17, "out");
	gpio.e = SYSTEM_SHUTDOWN;
	gpio.state = true;
	gpio.pin = 17;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(22, "out");
	gpio.e = SYSTEM_SHUTDOWN;
	gpio.state = true;
	gpio.pin = 22;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(23, "out");
	gpio.e = SYSTEM_SHUTDOWN;
	gpio.state = true;
	gpio.pin = 23;
	self.GPIOs.push(gpio);

	// play
	var gpio = new Gpio(17, "out");
	gpio.e = MUSIC_PLAY;
	gpio.state = false;
	gpio.pin = 17;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(22, "out");
	gpio.e = MUSIC_PLAY;
	gpio.state = false;
	gpio.pin = 22;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(23, "out");
	gpio.e = MUSIC_PLAY;
	gpio.state = false;
	gpio.pin = 23;
	self.GPIOs.push(gpio);

	// stop
	var gpio = new Gpio(17, "out");
	gpio.e = MUSIC_STOP;
	gpio.state = false;
	gpio.pin = 17;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(22, "out");
	gpio.e = MUSIC_STOP;
	gpio.state = true;
	gpio.pin = 22;
	self.GPIOs.push(gpio);
	var gpio = new Gpio(23, "out");
	gpio.e = MUSIC_STOP;
	gpio.state = true;
	gpio.pin = 23;
	self.GPIOs.push(gpio);

	return libQ.resolve();
};


// Release our GPIO objects
ampcontrol.prototype.clearGPIOs = function () {
	var self = this;

	self.GPIOs.forEach(function(gpio) {
		self.log("Destroying GPIO " + gpio.pin);
		gpio.unexport();
	});

	self.GPIOs = [];

	return libQ.resolve();
};


// Playing status has changed
// (might not always be a play or pause action)
ampcontrol.prototype.statusChanged = function(state) {
	var self = this;

	if (state.status == "play")
		self.handleEvent(MUSIC_PLAY);
	else if (state.status == "pause")
		self.handleEvent(MUSIC_PAUSE);
	else if (state.status == "stop")
		self.handleEvent(MUSIC_STOP);
}

// An event has happened so do something about it
ampcontrol.prototype.handleEvent = function(e) {
	var self = this;

	self.GPIOs.forEach(function(gpio) {
		if (gpio.e == e){
			self.log(`Turning GPIO ${gpio.pin} ${self.boolToString(gpio.state)} (${e})`);
			gpio.writeSync(gpio.state);
			if (e == SYSTEM_SHUTDOWN)
				sleep.sleep(5);
		}
	});
}

// Output to log
ampcontrol.prototype.log = function(s) {
	var self = this;
	self.logger.info("[ampcontrol] " + s);
}

// Function for printing booleans
ampcontrol.prototype.boolToString = function(value){
	var self = this;
	return value ? self.getI18nString("ON") : self.getI18nString("OFF");
}

// A method to get some language strings used by the plugin
ampcontrol.prototype.load18nStrings = function() {
    var self = this;

    try {
        var language_code = this.commandRouter.sharedVars.get('language_code');
        self.i18nStrings = fs.readJsonSync(__dirname + '/i18n/strings_' + language_code + ".json");
    }
    catch (e) {
        self.i18nStrings = fs.readJsonSync(__dirname + '/i18n/strings_en.json');
    }

    self.i18nStringsDefaults = fs.readJsonSync(__dirname + '/i18n/strings_en.json');
};

// Retrieve a string
ampcontrol.prototype.getI18nString = function (key) {
    var self = this;

    if (self.i18nStrings[key] !== undefined)
        return self.i18nStrings[key];
    else
        return self.i18nStringsDefaults[key];
};

// Retrieves information about the Pi hardware
// Ignores the compute module for now
ampcontrol.prototype.getPiBoardInfo = function(){
	var self = this;
	var regex = "(?:Pi)" +
		"(?:\\s(\\d+))?" +
		"(?:\\s(Zero)(?:\\s(W))?)?" +
		"(?:\\sModel\\s(?:([AB])(?:\\s(Plus))?))?" +
		"(?:\\sRev\\s(\\d+)(?:\\.(\\d+))?)?";
	var re = new RegExp(regex, "gi"); // global and case insensitive
	var boardName = self.getPiBoard(); // Returns Pi 1 as a defualt
	var groups = re.exec(boardName);
	var pi = new Object();;

	// Regex groups
	// ============
	// 0 - Full text matched
	// 1 - Board number: 0, 1, 2, 3
	// 2 - Zero: Zero
	// 3 - Zero W: W
	// 4 - Model: A, B
	// 5 - Model plus: +
	// 6 - PCB major revision: int
	// 7 - PCB minor revision: int

	// Have we found a valid Pi match
	if (groups[0]){
		pi.name = boardName; // Full board name
		pi.isZero = groups[2] == "Zero" // null, Zero
		pi.isZeroW = groups[3] == "W"; // null, W
		pi.model = groups[4]; // null, A, B
		pi.isModelPlus = groups[5] == "Plus"; // null, plus
		pi.revisionMajor = groups[6]; // null, digit
		pi.revisionMinor = groups[7]; // null, digit
		pi.boardNumber = 1; // Set to Pi 1 (default - not model number found)

		if (pi.isZero) // We found a Pi Zero
			pi.boardNumber = 0;
		else if (groups[1])	// We have Pi with a model number; i.e. 2, 3
			pi.boardNumber = Number(groups[1].trim());

		// Do we have 40 GPIOs or not?
		if ((pi.boardNumber == 1)  && !pi.isModelPlus)
			pi.fullGPIO = false;
		else
			pi.fullGPIO = true;
	}
	else{
		// This should never happen
		pi.name = "Unknown";
		pi.fullGPIO = false;
	}

	// Return pi object
	return pi;
}

// Try to get the hardware board we're running on currently (default is Pi 1)
// Pi names
//
// https://elinux.org/RPi_HardwareHistory
// Raspberry Pi Zero Rev1.3, Raspberry Pi Model B Rev 1, Raspberry Pi 2 Model B Rev 1.0
ampcontrol.prototype.getPiBoard = function(){
	var self = this;
	var board;
	try {
		board = execSync("cat /proc/device-tree/model").toString();
	}
	catch(e){
		self.log("Failed to read Pi board so default to Pi 1!");
		board = "Pi Rev";
	}
	return board;
}
