'use strict';

//Conversion functions
angular.module("serialChromeApp", []).controller("MainCtrl", function($scope){
	/* Interprets an ArrayBuffer as UTF-8 encoded string data. */

	var ab2str = function(buf) {
  		var bufView = new Uint8Array(buf);
  		var encodedString = String.fromCharCode.apply(null, bufView);
  		return decodeURIComponent(escape(encodedString));
	};

	/* Conversionverts a string to UTF-8 encoding in a Uint8Array; returns the array buffer. */
	var str2ab = function(str) {
  		var encodedString = unescape(encodeURIComponent(str));
  		var bytes = new Uint8Array(encodedString.length);
  		for (var i = 0; i < encodedString.length; ++i) {
    		bytes[i] = encodedString.charCodeAt(i);
  		}
  		console.log(bytes);
  		console.log(bytes.buffer);
  		return bytes.buffer;
	};
	//Device path for USB printer
	const DEVICE_PATH = "/dev/tty.usbserial";
	const serial = chrome.serial;
	const characterSetting = "\x1BK8\r";
	const underlineCharsOn = "\x1BUU";
	const underlineCharsOff = "\x1BUu";
	const startString = "\x1BM991\r";
	const setTab = "\x1B8472175"
	const setTabDefault = "\x1B8472100"
	const tab = "\x09";
	const titleFont = "\x1BK6\r"
	const newLine = "\x0A"

	//Boolean for printer
	$scope.connected = 'false';
	$scope.readLicenses = [];

	var test = {
		licenseNumber: "34",
		cardNumber: "1",
		year: "2015"
	};

	$scope.readLicenses.push(test);
	$scope.license;


	var SerialConnection = function(){
		this.connectionId = -1;
		this.lineBuffer = "";
		this.boundOnReceive = this.onReceive.bind(this);
		this.boundOnReceiveError = this.onReceiveError.bind(this);
		this.onConnect = new chrome.Event();
		this.onReadLine = new chrome.Event();
		this.onError = new chrome.Event();
	};


	//Serial connection prototype / constructor and methods.
	SerialConnection.prototype.onConnectComplete = function(connectionInfo){
		if(!connectionInfo){
			console.log("Connection failed");
			return
		}
		this.connectionId = connectionInfo.connectionId;
		chrome.serial.onReceive.addListener(this.boundOnReceive);
		chrome.serial.onReceiveError.addListener(this.boundOnReceiveError);
		this.onConnect.dispatch();
	};

	SerialConnection.prototype.onReceive = function(receiveInfo){
		if(receiveInfo.connectionId !== this.connectionId){
			return;
		}

		this.lineBuffer += ab2str(receiveInfo.data);

  		var index;
  		while ((index = this.lineBuffer.indexOf('\n')) >= 0) {
    		var line = this.lineBuffer.substr(0, index + 1);

    		//Adding creating data for angularjs table
    		var lNumber = line.slice(line.search("L")+3, line.search("C")-2);
    		var cNumber = line.slice(line.search("C")+3, line.search("Y")-2);
    		var lYear = line.slice(line.search("Y")+3,line.search("Y")+7);

    		$scope.license = {
				licenseNumber: lNumber,
				cardNumber: cNumber,
				year: lYear
			};

			$scope.$apply(function (){
				$scope.readLicenses.push($scope.license);
			});
    		
    		this.onReadLine.dispatch(line);

    		this.lineBuffer = this.lineBuffer.substr(index + 1);
  		}
	};

	SerialConnection.prototype.getStatus = function(){
		chrome.serial.getInfo(this.connectionId, function(connectionInfo){
			console.log(connectionInfo);
		});
	}

	SerialConnection.prototype.onReceiveError = function(errorInfo){
		if(errorInfo.connectionId === this.connectionId){
			this.onError.dispatch(errorInfo.error);
		}
	};

	SerialConnection.prototype.connect = function(path){
		$scope.connected = 'true';
		serial.connect(path, {bitrate:115200, stopBits:"two"}, this.onConnectComplete.bind(this))

	};

	SerialConnection.prototype.send = function(msg){
		if (this.connectionId < 0) {
			console.log("Invalid connection");
    		throw 'Invalid connection';
  		}
  		serial.send(this.connectionId, str2ab(msg), function(sendInfo) {
  			console.log(sendInfo);
  		});
	};

	SerialConnection.prototype.disconnect == function(){
		if(this.connectionId < 0){
			throw 'Invalid conncetion';
		}

		serial.disconnect(this.connectionId, function() {});
	};

	//Actually starting the connection process

	//constructing new serialConnection object
	var connection = new SerialConnection();

	//adding listeners to functiong to call other code
	connection.onConnect.addListener(function(){
		console.log('connected to ' + DEVICE_PATH);
		console.log($scope.connected);
		connection.send(characterSetting);
	});

	//Reads from card reader and prints data
	connection.onReadLine.addListener(function(line){
		console.log('read line: ' + line);
		//extracts various parts of the card informatino and prints
		if(line.slice(1,2) !== 'E'){
			/*connection.send(titleFont);
			connection.send(underlineCharsOn);
			connection.send("License Information"+"\r");
			connection.send(newLine);
			connection.send(newLine);
			connection.send(characterSetting);
			var licenseNumber = "License Number: " + line.slice(line.search("L")+3, line.search("C")-2);
			var cardNumber = "Card Number: " + line.slice(line.search("C")+3, line.search("Y")-2);
			var year = "Year " + line.slice(line.search("Y")+3,line.search("Y")+7);
			var licenseData = licenseNumber + "\n" + cardNumber + "\n" + year + "\r";
			document.getElementById("cardReaderData").value = line;
			*/
			
			console.log($scope.readLicenses);


			//connection.send(licenseData);
		}
		else{
			connection.send(line + "\r" + "\r");
		}
		
	});

	connection.onError.addListener(function(error){
		console.log('Error ' + error);
	});

	$scope.connectPrinter = function(){
		connection.connect(DEVICE_PATH);
	}
	

	//Fucntions for the buttons
	$scope.printText = function(){
		var dataToPrint;
		dataToPrint = document.getElementById("textToPrint").value;
		dataToPrint = dataToPrint + '\r';
		connection.getStatus();
		connection.send(dataToPrint);
	};

	$scope.enableCardReader = function(){
		connection.send(startString);
	}
});




