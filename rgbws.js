var http = require('http').createServer(handler); //require http server, and create server with function handler()
var fs = require('fs'); //require filesystem module
var io = require('socket.io')(http) //require socket.io module and pass the http object (server)
var Gpio = require('pigpio').Gpio //include pigpio to interact with the GPIO
var schedule = require('node-schedule');
var moment = require('moment'); // require

// using BCM numbering: https://pinout.xyz/
ledRed = new Gpio(17, {mode: Gpio.OUTPUT}), //use GPIO pin 4 as output for RED
ledGreen = new Gpio(27, {mode: Gpio.OUTPUT}), //use GPIO pin 17 as output for GREEN
ledBlue = new Gpio(22, {mode: Gpio.OUTPUT}), //use GPIO pin 27 as output for BLUE
redRGB = 0, //set starting value of RED variable to off (0 for common cathode)
greenRGB = 0, //set starting value of GREEN variable to off (0 for common cathode)
blueRGB = 0; //set starting value of BLUE variable to off (0 for common cathode)

//RESET RGB LED
ledRed.digitalWrite(0); // Turn RED LED off
ledGreen.digitalWrite(0); // Turn GREEN LED off
ledBlue.digitalWrite(0); // Turn BLUE LED off

// set up wake up job
var wakeupRule = new schedule.RecurrenceRule();
wakeupRule.hour = 7;
wakeupRule.minute = 30;
// wakeupRule.second = 1; // use this for testing

wakeupColor = {r: 0 , g: 251, b: 255}

var wakeupJob = schedule.scheduleJob(wakeupRule, wakeup);

// bedtime

var bedtimeRule = new schedule.RecurrenceRule();
bedtimeRule.hour = 21;
bedtimeRule.minute = 0;

bedtimeColor = { r: 4, g: 0, b: 0 }

var bedtimeJob = schedule.scheduleJob(bedtimeRule, bedtime);

http.listen(8080); //listen to port 8080

function handler (req, res) { //what to do on requests to port 8080
  fs.readFile(__dirname + '/public/index.html', function(err, data) { //read file index.html in public folder
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'}); //display 404 on error
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'text/html'}); //write HTML
    res.write(data); //write data from index.html
    return res.end();
  });
}

function changeColor(r, g, b) {
  ledRed.pwmWrite(r); //set RED LED to specified value
  ledGreen.pwmWrite(g); //set GREEN LED to specified value
  ledBlue.pwmWrite(b); //set BLUE LED to specified value
}

function wakeup() {
  changeColor(wakeupColor.r, wakeupColor.g, wakeupColor.b)
}

function bedtime() {
  changeColor(bedtimeColor.r, bedtimeColor.g, bedtimeColor.b)
}

io.sockets.on('connection', function (socket) {// Web Socket Connection
  socket.on('rgbLed', function(data) { //get light switch status from client
    // console.log(data); //output data from WebSocket connection to console
    changeColor(data.red, data.green, data.blue)    
  });

  socket.on('wakeupTime', function (time) {
    console.log(time)

    var d = new moment(time, ['h:m a', 'H:m'])

    wakeupRule.hour = d.format('H');
    wakeupRule.minute = d.format('m');

    wakeupJob.reschedule(wakeupRule, wakeup);
  });

  socket.on('wakeupColor', function (data) {
    wakeupColor = {
      r: data.red,
      g: data.blue,
      b: data.green
    }
  });

  socket.on('swatch', function (rgbObject) {
    console.log(rgbObject);
    changeColor(rgbObject.r, rgbObject.g, rgbObject.b);
  });

});

process.on('SIGINT', function () { //on ctrl+c
  ledRed.digitalWrite(0); // Turn RED LED off
  ledGreen.digitalWrite(0); // Turn GREEN LED off
  ledBlue.digitalWrite(0); // Turn BLUE LED off
  process.exit(); //exit completely
}); 
