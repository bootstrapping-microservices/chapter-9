const express = require("express");
const mongodb = require("mongodb");
const amqp = require('amqplib');
const bodyParser = require("body-parser");

//
// Connect to the database.
//
function connectDb(dbHost, dbName) {
    return mongodb.MongoClient.connect(dbHost, { useUnifiedTopology: true }) 
        .then(client => {
            const db = client.db(dbName);
            return {                // Return an object that represents the database connection.
                db: db,             // To access the database...
                close: () => {      // and later close the connection to it.
                    return client.close();
                },
            };
        });
}

//
// Connect to the RabbitMQ server.
//
function connectRabbit(rabbitHost) {

    // console.log(`Connecting to RabbitMQ server at ${rabbitHost}.`);

    return amqp.connect(rabbitHost) // Connect to the RabbitMQ server.
        .then(messagingConnection => {
            // console.log("Connected to RabbitMQ.");

            return messagingConnection.createChannel(); // Create a RabbitMQ messaging channel.
        });
}

//
// Define your HTTP route handlers here.
//
function setupHandlers(microservice) {

    const videosCollection = microservice.db.collection("videos");

    //
    // HTTP GET API to retrieve list of videos from the database.
    //
    microservice.app.get("/videos", (req, res) => {
        return videosCollection.find() // Returns a promise so we can await the result in the test.
            .toArray() // In a real application this should be paginated.
            .then(videos => {
                res.json({
                    videos: videos
                });
            })
            .catch(err => {
                console.error("Failed to get videos collection from database!");
                console.error(err && err.stack || err);
                res.sendStatus(500);
            });
    });

    //
    // HTTP GET API to retreive details for a particular video.
    //
    microservice.app.get("/video", (req, res) => {
        const videoId = new mongodb.ObjectID(req.query.id);
        return videosCollection.findOne({ _id: videoId }) // Returns a promise so we can await the result in the test.
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
    
	//
	// Handler forcoming RabbitMQ messages.
	//
    function consumeVideoUploadedMessage(msg) { 
        console.log("Received a 'viewed-uploaded' message");

        const parsedMsg = JSON.parse(msg.content.toString()); // Parse the JSON message.

        const videoMetadata = {
            _id: new mongodb.ObjectID(parsedMsg.video.id),
            name: parsedMsg.video.name,
        };
        
        return videosCollection.insertOne(videoMetadata) // Record the metadata for the video.
            .then(() => {
                console.log("Acknowledging message was handled.");                
                microservice.messageChannel.ack(msg); // If there is no error, acknowledge the message.
            });
    };

	// Add other handlers here.

    return microservice.messageChannel.assertExchange("video-uploaded", "fanout") // Assert that we have a "video-uploaded" exchange.
        .then(() => {
            return microservice.messageChannel.assertQueue("", {}); // Create an anonyous queue.
        })
        .then(response => {
            const queueName = response.queue;
            // console.log(`Created queue ${queueName}, binding it to "video-uploaded" exchange.`);
            return microservice.messageChannel.bindQueue(queueName, "video-uploaded", "") // Bind the queue to the exchange.
                .then(() => {
                    return microservice.messageChannel.consume(queueName, consumeVideoUploadedMessage); // Start receiving messages from the anonymous queue.
                });
        });
}

//
// Starts the Express HTTP server.
//
function startHttpServer(dbConn, messageChannel) {
    return new Promise(resolve => { // Wrap in a promise so we can be notified when the server has started.
        const app = express();
        const microservice = { // Create an object to represent our microservice.
            app: app,
            db: dbConn.db,
			messageChannel: messageChannel,
        };
		app.use(bodyParser.json()); // Enable JSON body for HTTP requests.
        setupHandlers(microservice);

        const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
        const server = app.listen(port, () => {
            microservice.close = () => { // Create a function that can be used to close our server and database.
                return new Promise(resolve => {
                    server.close(() => { // Close the Express server.
            resolve();
        });
                })
                .then(() => {
                    return dbConn.close(); // Close the database.
                });
            };
            resolve(microservice);
        });
    });
}

//
// Collect code here that executes when the microservice starts.
//
function startMicroservice(dbHost, dbName, rabbitHost) {
    return connectDb(dbHost, dbName)        	// Connect to the database...
        .then(dbConn => {                   	// then...
			return connectRabbit(rabbitHost)    // connect to RabbitMQ...
				.then(messageChannel => {		// then...
            		return startHttpServer(		// start the HTTP server.
						dbConn, 
						messageChannel
					);	
				});
        });
}

//
// Application entry point.
//
function main() {
    if (!process.env.DBHOST) {
        throw new Error("Please specify the databse host using environment variable DBHOST.");
    }
    
    const DBHOST = process.env.DBHOST;

    if (!process.env.DBNAME) {
        throw new Error("Please specify the databse name using environment variable DBNAME.");
    }
    
    const DBNAME = process.env.DBNAME;
        
	if (!process.env.RABBIT) {
	    throw new Error("Please specify the name of the RabbitMQ host using environment variable RABBIT");
	}
	
	const RABBIT = process.env.RABBIT;

    return startMicroservice(DBHOST, DBNAME, RABBIT);
}

if (require.main === module) {
    // Only start the microservice normally if this script is the "main" module.
	main()
	    .then(() => console.log("Microservice online."))
	    .catch(err => {
	        console.error("Microservice failed to start.");
	        console.error(err && err.stack || err);
	    });
}
else {
    // Otherwise we are running under test
    module.exports = {
        startMicroservice,
    };
}

