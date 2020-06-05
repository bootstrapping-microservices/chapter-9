const express = require("express");
const path = require("path");
const request = require("request");

//
// Setup event handlers.
//
function setupHandlers(app) {
    app.set("views", path.join(__dirname, "views")); // Set directory that contains templates for views.
    app.set("view engine", "hbs"); // Use hbs as the view engine for Express.
    
    app.use(express.static("public"));

    //
    // Main web page that lists videos.
    //
    app.get("/", (req, res) => {
        request.get( // Get the list of videos from the metadata service.
            "http://metadata/videos", 
            { json: true }, 
            (err, response, body) => {
                if (err || response.statusCode !== 200) {
                    console.error("Failed to get video list.");
                    console.error(err || `Status code: ${response.statusCode}`);
                    res.sendStatus(500);
                }
                else {
                    res.render("video-list", { videos: body.videos });
                }
            }
        );
    });

    //
    // Web page to play a particular video.
    //
    app.get("/video", (req, res) => {
        const videoId = req.query.id;
        request.get( // Get details of the video from the metadata service.
            `http://metadata/video?id=${videoId}`, 
            { json: true }, 
            (err, response, body) => {
                if (err || response.statusCode !== 200) {
                    console.error(`Failed to get details for video ${videoId}.`);
                    console.error(err || `Status code: ${response.statusCode}`);
                    res.sendStatus(500);
                }
                else {
                    const metadata = body.video;
                    const video = {
                        metadata,
                        url: `/api/video?id=${videoId}`,
                    };
                    res.render("play-video", { video });
                }
            }
        );
    });

    //
    // Web page to upload a new video.
    //
    app.get("/upload", (req, res) => {
        res.render("upload-video", {});
    });

    //
    // Web page to show the users viewing history.
    //
    app.get("/history", (req, res) => {
        request.get( // Get the list of videos from the metadata service.
            "http://history/videos", 
            { json: true }, 
            (err, response, body) => {
                if (err || response.statusCode !== 200) {
                    console.error("Failed to get history.");
                    console.error(err || `Status code: ${response.statusCode}`);
                    res.sendStatus(500);
                }
                else {
                    res.render("history", { videos: body.videos });
                }
            }
        );
    });

    //
    // HTTP GET API to stream video to the user's browser.
    //
    app.get("/api/video", (req, res) => {
        request.get(`http://video-streaming/video?id=${req.query.id}`).pipe(res);
    });

    //
    // HTTP POST API to upload video from the user's browser.
    //
    app.post("/api/upload", (req, res) => {
        req.pipe(request.post(`http://video-upload/upload`, { headers: req.headers })).pipe(res);
    });
}

//
// Start the HTTP server.
//
function startHttpServer() {
    return new Promise(resolve => { // Wrap in a promise so we can be notified when the server has started.
        const app = express();
        setupHandlers(app);

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
    return startHttpServer(); // Start the HTTP server.
}

main()
    .then(() => console.log("Microservice online."))
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });