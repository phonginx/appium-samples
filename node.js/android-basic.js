'use strict';

var wd = require('wd');
var Promise = require('bluebird'); // jshint ignore:line
var fs = require('fs');
var request = require('request');

var filepath = 'outputs/';
fs.mkdir(filepath, function(ignored) {});

var apiToken = 'xyz'; // your API token from https://appetize.io/docs#request-api-token
var deviceType = 'nexus5'; // nexus5, nexus7, nexus9
var publicKey = '509eq0debke2bgjp3xazvnwqkm'; // replace with your own publicKey after uploading through website or API
var osVersion = '7.0'; // 4.4, 5.1, 6.0, 7.0 supported
var proxy = 'intercept'; // false for no proxy, or specify your own with http://proxy-example.com:port
var params = {
    hello: 'world',
    userId: 123
}; // optional data to pass to app at launch

var driver = wd.remote('https://' + apiToken + '@appium.appetize.io/wd/hub', 'promiseChain');


console.log('starting session');
driver.init({
    device: deviceType,
    publicKey: publicKey,
    osVersion: osVersion,
    proxy: proxy,
    params: params
}).delay(5000)
.then(takeScreenshot)
.then(function() {
    console.log('tapping element');
    return driver.elementByXPath('//android.widget.TextView[@text="My lists"]').tap().delay(2000);
})
.then(takeScreenshot)
.then(function() {
    console.log('ending session');
    return driver.quit();
})
.then(function() {
    var timeStamp = Date.now();

    if (proxy == 'intercept') {
        downloadFile('https://api.appetize.io/v1/networkCapture/appiumId/' + driver.sessionID,
            filepath + 'appetize-' + deviceType + '-' + osVersion + '-' + publicKey + '-har-' + timeStamp + '.har',
            'networkCapture');
    }

    downloadFile('https://api.appetize.io/v1/debugLog/appiumId/' + driver.sessionID,
        filepath + 'appetize-' + deviceType + '-' + osVersion + '-' + publicKey + '-debugLog-' + timeStamp + '.txt',
        'debugLog');

    downloadFile('https://api.appetize.io/v1/screenRecording/appiumId/' + driver.sessionID,
        filepath + 'appetize-' + deviceType + '-' + osVersion + '-' + publicKey + '-screenRecording-' + timeStamp + '.mp4',
        'screenRecording');
})
.catch(function(error) {
    console.log('Error');
    console.log(error);
});

function takeScreenshot() {
    console.log('take screenshot');
    return driver.takeScreenshot()
    .then(function(data) {
            // write file
            var filename = 'appetize-' + deviceType + '-' + osVersion + '-' + publicKey + '-screenshot-' + Date.now() + '.png';
            console.log('writing file to ' + filename);
            fs.writeFileSync(filepath + filename, data, 'base64');
        });
}

function downloadFile(url, filename, type) {
    console.log('Downloading ' + type + ' file: ' + url);

    request({
        url: url,
        encoding: type === 'screenRecording' ? null : undefined
    }, function(err, response, body) {
        if (err) throw err;

        if (response.statusCode !== 200) {
            console.log('File download failed with ' + response.statusCode);
            return;
        }

        if (type === 'networkCapture') {
            var har = JSON.parse(body);
            console.log('HAR has ' + har.log.entries.length + ' entries');
        }
        else if (type === 'debugLog') {
            console.log('Debug log has ' + body.split('\n').length + ' lines');
        }

        console.log('Writing ' + type + ' to ' + filename);
        fs.writeFileSync(filename, body);
    });
}
