const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const net = require('net');
const Gt06 = require('gt06');
const { Buffer } = require('buffer');
const path = require('path');
const querystring = require('querystring');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const axios = require('axios');

const SOCKET_IO_PORT = 3010;
//const GPS_TRACKER_PORT = 5210; 
const GPS_TRACKER_PORT = 10000; 


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', (socket) => {
    console.log('A web client connected');
});

const gpsServer = net.createServer((client) => {
    console.log('GPS tracker connected');
    const gt06 = new Gt06();
    

    client.on('data', (data) => {
        try {
            gt06.parse(data);

            if (gt06.expectsResponse) {
                client.write(gt06.responseMsg);
            }

            gt06.msgBuffer.forEach(msg => {
                console.log('Parsed GPS data:', msg);
                io.emit('gps_location_update', msg);

                if (msg.lat > 0 || msg.lat != undefined){
                    
                    axios.get('https://obx-system.obxsolution.com/gps-tracker/'+msg.imei+'/'+msg.lat+'/'+msg.lon+'/'+msg.speed+'/'+msg.course)
                      .then((response) => {
                        console.log('Response:', response.data);
                      })
                      .catch((error) => {
                        console.error('Error:', error.message);
                      }); 

                }
                
            });


            gt06.clearMsgBuffer();

        } catch (e) {
            console.error('Error parsing GT06 data:', e.message);
        }
    });

    client.on('end', () => {
        console.log('GPS tracker disconnected');
    });

    client.on('error', (err) => {
        console.error('TCP error:', err.message);
    });
});

gpsServer.listen(GPS_TRACKER_PORT, () => {
    console.log(`GPS TCP server listening on port ${GPS_TRACKER_PORT}`);
});

server.listen(SOCKET_IO_PORT, () => {
    console.log(`Socket.IO server listening on port ${SOCKET_IO_PORT}`);
});
