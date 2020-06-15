"use strict";

const inProduction = process.env.NODE_ENV === "production";
if (inProduction) {
    throw new Error("Don't run DB FIXTURE API in production!!");
}

const express = require('express');
const Fixtures = require('node-mongodb-fixtures');
const path = require('path');
const{ MongoClient } = require('mongodb');
const globby = require("globby");

const app = express();

const fixturesDirectory = process.env.FIXTURES_DIR || "fixtures";
const port = process.env.PORT || 3555;
const databaseHost = process.env.DBHOST || "mongodb://localhost:27017";
console.log("Using DBHOST " + databaseHost);

//
// Connect to the database.
//
async function connectDatabase() {
    return await MongoClient.connect(databaseHost, { useNewUrlParser: true });
}

//
// Start the HTTP server.
//
function startServer() {
    return new Promise((resolve, reject) => {
        var server = app.listen(port, err => {
            if (err) {
                reject(err);
                return;
            }

            const addrInfo = server.address();
            const host = addrInfo.address;
            const port = addrInfo.port;
            console.log("DB fixture REST API listening at http://%s:%s", host, port);
            console.log("Please put your database fixtures in the 'fixtures' sub-directory.")
            console.log("Use the following endpoints to load and unload your database fixtures:");
            console.log(`HTTP GET http://localhost:${port}/load-fixture?db=<db-name>&fix=<your-fixture-name>`);
            console.log(`HTTP GET http://localhost:${port}/unload-fixture?db=<db-name>&fix=<your-fixture-name>`);
            console.log(`HTTP GET http://localhost:${port}/drop-collection?db=<db-name>&col=<collection-name>`);
            console.log(`HTTP GET http://localhost:${port}/drop-database?db=<db-name>`);
            console.log(`HTTP GET http://localhost:${port}/get-collection?db=<db-name>&col=<collection-name>`);
			resolve(server);
        });
    });
}

//
// Load a fixture to the database.
//
async function loadFixture (databaseName, fixtureName) {
    const fixtures = new Fixtures({
        dir: path.join(fixturesDirectory, fixtureName),
        mute: false,
    });

    await fixtures.connect(databaseHost + "/" + databaseName);
    await fixtures.unload();
    await fixtures.load();
    await fixtures.disconnect();
}

//
// Unload a fixture from the database.
//
async function unloadFixture(databaseName, fixtureName) {
    const fixtures = new Fixtures({
        dir: path.join(fixturesDirectory, fixtureName),
        mute: false,
    });

    await fixtures.connect(databaseHost + "/" + databaseName);
    await fixtures.unload();
    await fixtures.disconnect();
}

//
// Determine if a particular named collection already exists.
//
// Source: https://stackoverflow.com/questions/21023982/how-to-check-if-a-collection-exists-in-mongodb-native-nodejs-driver
//
async function collectionExists(client, databaseName, collectionName) {
    const db = client.db(databaseName);
    const collectionNames = await db.listCollections().toArray();
    return collectionNames.some(collection => collection.name === collectionName);
}

//
// Drop a collection if it exists.
//
async function dropCollection(client, databaseName, collectionName) {
    const collectionAlreadyExists = await collectionExists(client, databaseName, collectionName);
    if (collectionAlreadyExists) {
        const db = client.db(databaseName);
        await db.dropCollection(collectionName);
        console.log("Dropped collection: " + collectionName);
    }
    else {
        console.log("Collection doesn't exist: " + collectionName);
    }
}

async function main() {

    const client = await connectDatabase();

    app.get("/is-alive", (req, res) => {
        res.json({
            ok: true,
        });
    });

    function verifyQueryParam(req, res, paramName, msg) {
        const param = req.query[paramName];
        if (!param) {
            res.status(400).send(msg);
        }
        return param;
    }

    app.get("/load-fixture", (req, res) => {
        const databaseName = verifyQueryParam(req, res, "db", "Query parameter 'db' specifies database name."); 
        const fixtureName = verifyQueryParam(req, res, "fix", "Query parameter 'fix' specifies name of fixture to load into database."); 
        if (!databaseName || !fixtureName) {
            return;
        }

        loadFixture(databaseName, fixtureName)
            .then(() => {
                console.log("Loaded database fixture: " + fixtureName + " to database " + databaseName);
                res.sendStatus(200);
            })
            .catch(err => {
                const msg = "Failed to load database fixture " + fixtureName + " to database " + databaseName;
                console.error(msg);
                console.error(err && err.stack || err);
                res.status(400).send(msg);
            });
    });

    app.get("/unload-fixture", (req, res) => {
        const databaseName = verifyQueryParam(req, res, "db", "Query parameter 'db' specifies database name."); 
        const fixtureName = verifyQueryParam(req, res, "fix", "Query parameter 'fix' specifies name of fixture to load into database."); 
        if (!databaseName || !fixtureName) {
            return;
        }

        unloadFixture(databaseName, fixtureName)
            .then(() => {
                console.log("Unloaded database fixture: " + fixtureName + " from database " + databaseName);
                res.sendStatus(200);
            })
            .catch(err => {
                const msg = "Failed to unload database fixture " + fixtureName + " from database " + databaseName;
                console.error(msg);
                console.error(err && err.stack || err);
                res.status(400).send(msg);
            });
    });
    
    app.get("/drop-collection", (req, res) => {
        const databaseName = verifyQueryParam(req, res, "db", "Query parameter 'db' specifies database name."); 
        const collectionName = verifyQueryParam(req, res, "col", "Query parameter 'col' specifies name of collection to drop."); 
        if (!databaseName || !collectionName) {
            return;
        }

        dropCollection(client, databaseName, collectionName)
            .then(() => {
                res.sendStatus(200);
            })
            .catch(err => {
                const msg = "Failed to drop collection " + collectionName + " from database " + databaseName;
                console.error(msg);
                console.error(err && err.stack || err);
                res.status(400).send(msg);
            });
    });

    app.get("/drop-database", (req, res) => {
        const databaseName = verifyQueryParam(req, res, "db", "Query parameter 'db' specifies database name."); 
        if (!databaseName) {
            return;
        }

        dropDatabase(client, databaseName, collectionName)
            .then(() => {
                res.sendStatus(200);
            })
            .catch(err => {
                const msg = "Failed to drop database " + databaseName;
                console.error(msg);
                console.error(err && err.stack || err);
                res.status(400).send(msg);
            });
    });

    app.get("/get-collection", (req, res) => {
        const databaseName = verifyQueryParam(req, res, "db", "Query parameter 'db' specifies database name."); 
        const collectionName = verifyQueryParam(req, res, "col", "Query parameter 'col' specifies name of collection to drop."); 
        if (!databaseName || !collectionName) {
            return;
        }

        const db = client.db(databaseName);
        db.collection(collectionName) //TODO: helper function?
            .find()
            .toArray()
            .then(documents => {
                res.json(documents);
            })
            .catch(err => {
                const msg = "Failed to get collection " + collectionName + " from database " + databaseName;
                console.error(msg);
                console.error(err && err.stack || err);
                res.status(400).send(msg);
            });
    });
    
    app.get("/get-fixtures", (req, res) => {

        globby([fixturesDirectory + "/**/*.js", fixturesDirectory + "/**/*.json"])
            .then(fixtureFilePaths => {

                const fixtureNames = fixtureFilePaths.map(fixtureFilePath => path.basename(path.dirname(fixtureFilePath)));
                res.json(fixtureNames);
            })
            .catch(err => {
                const msg = "Failed to list fixtures in directory" + fixturesDirectory;
                console.error(msg);
                console.error(err && err.stack || err);
                res.status(500).send(msg);
            });
    });

    await startServer();
}

main()
    .catch(err => {
        console.error("DB fixture REST API failed to start.");
        console.error(err && err.stack || err);
    });


