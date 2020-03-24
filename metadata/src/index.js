const express = require("express");
const mongodb = require("mongodb");
const amqp = require('amqplib');
const bodyParser = require("body-parser");

if (!process.env.DBHOST) {
    throw new Error("Please specify the databse host using environment variable DBHOST.");
}

if (!process.env.DBNAME) {
    throw new Error("Please specify the name of the database using environment variable DBNAME");
}

if (!process.env.RABBIT) {
    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
}

const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;
const RABBIT = process.env.RABBIT;

//
// Connect to the database.
//
function connectDb() {
    return mongodb.MongoClient.connect(DBHOST) 
        .then(client => {
            return client.db(DBNAME);
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
// Setup event handlers.
//
function setupHandlers(app, db, messageChannel) {

    const videosCollection = db.collection("videos");

    //
    // HTTP GET API to retrieve list of videos from the database.
    //
    app.get("/videos", (req, res) => {
        videosCollection.find() // Retreive video list from database.
            .toArray() // In a real application this should be paginated.
            .then(videos => {
                res.json({ videos });
            })
            .catch(err => {
                console.error("Failed to get videos collection.");
                console.error(err);
                res.sendStatus(500);
            });
    });

    //
    // HTTP GET API to retreive details for a particular video.
    //
    app.get("/video", (req, res) => {
        const videoId = new mongodb.ObjectID(req.query.id);
        videosCollection.findOne({ _id: videoId }) // Retreive details of video from database.
            .then(video => {
                if (!video) {
                    res.sendStatus(404); // Video with the requested ID doesn't exist!
                }
                else {
                    res.json({ video });
                }
            })
            .catch(err => {
                console.error(`Failed to get video ${videoId}.`);
                console.error(err);
                res.sendStatus(500);
            });
    });
    
    function consumeVideoUploadedMessage(msg) { // Handler for coming messages.
        console.log("Received a 'viewed-uploaded' message");

        const parsedMsg = JSON.parse(msg.content.toString()); // Parse the JSON message.

        const videoMetadata = {
            _id: new mongodb.ObjectID(parsedMsg.video.id),
            name: parsedMsg.video.name,
        };
        
        return videosCollection.insertOne(videoMetadata) // Record the metadata for the video.
            .then(() => {
                console.log("Acknowledging message was handled.");                
                messageChannel.ack(msg); // If there is no error, acknowledge the message.
            });
    };

    return messageChannel.assertExchange("video-uploaded", "fanout") // Assert that we have a "video-uploaded" exchange.
        .then(() => {
            return messageChannel.assertQueue("", {}); // Create an anonyous queue.
        })
        .then(response => {
            const queueName = response.queue;
            console.log(`Created queue ${queueName}, binding it to "video-uploaded" exchange.`);
            return messageChannel.bindQueue(queueName, "video-uploaded", "") // Bind the queue to the exchange.
                .then(() => {
                    return messageChannel.consume(queueName, consumeVideoUploadedMessage); // Start receiving messages from the anonymous queue.
                });
        });
}

//
// Start the HTTP server.
//
function startHttpServer(db, messageChannel) {
    return new Promise(resolve => { // Wrap in a promise so we can be notified when the server has started.
        const app = express();
        app.use(bodyParser.json()); // Enable JSON body for HTTP requests.
        setupHandlers(app, db, messageChannel);

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
    return connectDb()                                          // Connect to the database...
        .then(db => {                                           // then...
            return connectRabbit()                              // connect to RabbitMQ...
                .then(messageChannel => {                       // then...
                    return startHttpServer(db, messageChannel); // start the HTTP server.
                });
        });
}

main()
    .then(() => console.log("Microservice online."))
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });