const express = require("express");
const fs = require("fs");

//
// Setup event handlers.
//
function setupHandlers(app) {
    app.get("/video", (req, res) => { // Route for streaming video.
        
        const videoPath = "./videos/SampleVideo_1280x720_1mb.mp4";
        fs.stat(videoPath, (err, stats) => {
            if (err) {
                console.error("An error occurred ");
                res.sendStatus(500);
                return;
            }
    
            res.writeHead(200, {
                "Content-Length": stats.size,
                "Content-Type": "video/mp4",
            });
    
            fs.createReadStream(videoPath).pipe(res);
        });
    });
}

//
// Start the HTTP server.
//
function startHttpServer() {
    return new Promise((resolve, reject) => { // Wrap in a promise so we can be notified when the server has started.
        const app = express();
        setupHandlers(app);
        
        const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
        app.listen(port, () => {
            resolve();
        });
    });
}

//
// Application entry point.
//
function main() {
    return startHttpServer();
}

main()
    .then(() => console.log("Microservice online."))
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });