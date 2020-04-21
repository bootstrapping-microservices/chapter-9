const express = require("express");

const app = express();

const storagePath = path.join(__dirname, "../storage");
console.log(`Storing files at ${storagePath}.`);

//
// HTTP GET route to stream a video from storage.
//
app.get("/video", (req, res) => {

    const videoId = req.query.id;
    const localFilePath = path.join(storagePath, videoId);
    res.sendFile(localFilePath);
});

//
// HTTP POST route to upload a video to storage.
//
app.post("/upload", (req, res) => {

    const videoId = req.headers.id;
    const localFilePath = path.join(storagePath, videoId);
    const fileWriteStream = fs.createWriteStream(localFilePath);
    stream.pipe(fileWriteStream)
        .on("error", err => {
            console.error("Upload failed.");
            console.error(err && err.stack || err);
        })
        .on("finish", () => {
            res.sendStatus(200);
        });
});

const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Microservice online`);
});
