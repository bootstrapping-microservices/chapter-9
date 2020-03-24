const express = require("express");
const azure = require('azure-storage');

const app = express();

if (!process.env.STORAGE_ACCOUNT_NAME) {
    throw new Error("Please specify the name of an Azure storage account in environment variable STORAGE_ACCOUNT_NAME.");
}

const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
console.log(`Serving videos from Azure storage account ${STORAGE_ACCOUNT_NAME}.`);

if (!process.env.STORAGE_ACCESS_KEY) {
    throw new Error("Please specify the access key to an Azure storage account in environment variable STORAGE_ACCESS_KEY.");
}

const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;
const AZURE_STORAGE_CONTAINER_NAME = "videos";

//
// Create the Blob service API to communicate with Azure storage.
//
function createBlobService() {
    const blobService = azure.createBlobService(STORAGE_ACCOUNT_NAME, STORAGE_ACCESS_KEY);
    // Uncomment next line for extra debug logging.
    //blobService.logger.level = azure.Logger.LogLevels.DEBUG; 
    return blobService;
}

//
// Upload a Node.js stream to Azure storage.
//
function uploadStreamToAzure(incomingStream, mimeType, azureFilePath, blobService) {
    console.log("Uploading stream to Azure storage as " + azureFilePath);
    return new Promise((resolve, reject) => {
        const azureStream = blobService.createWriteStreamToBlockBlob(AZURE_STORAGE_CONTAINER_NAME, azureFilePath, 
            {
                contentSettings: {
                    contentType : mimeType,
                }
            }
        );
        azureStream.on("error", reject);
        incomingStream.pipe(azureStream)
            .on("error", reject)
            .on("end", resolve)
            .on("finish", resolve)
            .on("close", resolve);
    });
}

//
// Stream a video from a Azure storage.
//
function streamVideoFromAzure(blobService, videoId, res) {
    return new Promise((resolve, reject) => {
        blobService.getBlobProperties(AZURE_STORAGE_CONTAINER_NAME, videoId, (err, properties) => {
            if (err) {
                reject(err);
                return;
            }

            res.writeHead(200, {
                "Content-Length": properties.contentLength,
                "Content-Type": "video/mp4",
            });

            blobService.getBlobToStream(AZURE_STORAGE_CONTAINER_NAME, videoId, res, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    })
}

//
// HTTP GET route to stream a video from Azure storage.
//
app.get("/video", (req, res) => {

    const videoId = req.query.id;
    console.log(`Streaming video ${videoId}.`);
    
    const blobService = createBlobService();
    streamVideoFromAzure(blobService, videoId, res)
        .catch(err => {
            console.error(`Error occurred getting video ${AZURE_STORAGE_CONTAINER_NAME}/${videoId} to stream.`);
            console.error(err && err.stack || err);
            res.sendStatus(500);
        });
});

//
// HTTP POST route to upload a video to Azure storage.
//
app.post("/upload", (req, res) => {

    const videoId = req.headers.id;
    const mimeType = req.headers["content-type"];

    const blobService = createBlobService();
    uploadStreamToAzure(req, mimeType, videoId, blobService)
        .then(() => {
            res.sendStatus(200);
        })
        .catch(err => {
            console.error(`Upload to Azure failed for video ${videoId}.`);
            console.error(err);
            res.sendStatus(500);
        });    
});

const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Microservice online`);
});
