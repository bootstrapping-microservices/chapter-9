const express = require("express");
const mongodb = require("mongodb");
const amqp = require('amqplib');
 const http = require("http");

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const RABBIT = process.env.RABBIT;

//
//  Write a Node.js stream to a HTTP POST request.
//
function streamToHttpPost(inputStream, uploadHost, uploadRoute, headers) {
    return new Promise((resolve, reject) => { // Wrapthe stream in a promise so that we can wait for it to complete.
        const forwardRequest = http.request( // Forward the request to the video storage microservice.
            {
                host: uploadHost,
                path: uploadRoute,
                method: 'POST',
                headers: headers,
            }
        );
        
        inputStream.on("error", reject);
        inputStream.pipe(forwardRequest)
            .on("error", reject)
            .on("end", resolve)
            .on("finish", resolve)
            .on("close", resolve);
    });
}

//
// Connect to the RabbitMQ server.
//
function connectRabbit() {

    console.log(`Connecting to RabbitMQ server at ${RABBIT}.`);

    return amqp.connect(RABBIT) // Connect to the RabbitMQ server.
        .then(messagingConnection => {
            console.log("Connected to RabbitMQ.");

            return messagingConnection.createChannel(); // Create a RabbitMQ messaging channel.
        });
}

//
// Broadcast the "video-uploaded" message.
//
function broadcastVideoUploadedMessage(messageChannel, videoMetadata) {
    console.log(`Publishing message on "video-uploaded" exchange.`);
        
    const msg = { video: videoMetadata };
    const jsonMsg = JSON.stringify(msg);
    messageChannel.publish("video-uploaded", "", Buffer.from(jsonMsg)); // Publish message to the "video-uploaded" exchange.
}


//
// Setup event handlers.
//
function setupHandlers(app, messageChannel) {

    //
    // Route for uploading videos.
    //
    app.post("/upload", (req, res) => {
        const fileName = req.headers["file-name"];
        const videoId = new mongodb.ObjectId(); // Create a new unique ID for the video.
        const newHeaders = Object.assign({}, req.headers, { id: videoId });
        streamToHttpPost(req, `video-storage`, `/upload`, newHeaders)
            .then(() => {
                res.sendStatus(200);
            })
            .then(() => {
                // Broadcast message to the world.
                broadcastVideoUploadedMessage(messageChannel, { id: videoId, name: fileName });
            })
            .catch(err => {
                console.error(`Failed to capture uploaded file ${fileName}.`);
                console.error(err);
                console.error(err.stack);
            });
    });
}

//
// Start the HTTP server.
//
function startHttpServer(messageChannel) {
    return new Promise(resolve => { // Wrap in a promise so we can be notified when the server has started.
        const app = express();
        setupHandlers(app, messageChannel);

        const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
        app.listen(port, () => {
            resolve(); // HTTP server is listening, resolve the promise.
        });
    });
}

//
// Application entry point.
//
function main() {
    return connectRabbit()                              // Connect to RabbitMQ...
        .then(messageChannel => {                       // then...
            return startHttpServer(messageChannel);     // start the HTTP server.
        });
}

main()
    .then(() => console.log("Microservice online."))
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });