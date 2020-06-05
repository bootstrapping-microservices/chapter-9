
describe("metadata microservice", () => {

    //
    // Setup mocks.
    //

    const mockListenFn = jest.fn((port, callback) => callback());
    const mockGetFn = jest.fn();

    jest.doMock("express", () => { // Mock the Express module.
        return () => { // The Express module is a factory function that creates an Express app object.
            return { // Mock Express app object.
                listen: mockListenFn, // Mock listen function.
                get: mockGetFn, // Mock get function.
                use: () => {}, // Mock use function.
            };
        };
    });

    const mockVideosCollection = { // Mock Mongodb collection.
    };

    const mockDb = { // Mock Mongodb database.
        collection: () => {
            return mockVideosCollection;
        }
    };

    const mockMongoClient = { // Mock Mongodb client object.
        db: () => {
            return mockDb;
        }
    };
    
    jest.doMock("mongodb", () => { // Mock the Mongodb module.
        return { // Mock Mongodb module.
            MongoClient: { // Mock MongoClient.
                connect: async () => { // Mock connect function.
                    return mockMongoClient;
                }
            }
        };
    });

    jest.doMock("amqplib", () => { // Mock the amqplib (RabbitMQ) library.
        return { // Returns a mock version of the library.
            connect: async () => { // Mock function to connect to RabbitMQ.
                return { // Returns a mock "messaging connection".
                    createChannel: async () => { // Mock function to create a messaging channel.
                        return { // Returns a mock "messaging channel".
                            assertExchange: async () => {},
                            assertQueue: async () => {
                                return {
                                    queue: "my-queue", // Fake name for anonymous queue.
                                };
                            },
                            bindQueue: async () => {},
                            consume: () => {},
                        };
                    },
                };
            },
        };
    });


    //
    // Import the module we are testing.
    //

    const { startMicroservice } = require("./index"); 

    //
    // Tests go here.
    //
    
    test("microservice starts web server on startup", async () => {
        
        await startMicroservice();

        expect(mockListenFn.mock.calls.length).toEqual(1);     // Check only 1 call to 'listen'.
        expect(mockListenFn.mock.calls[0][0]).toEqual(3000);   // Check for port 3000.
    });

    test("/videos route is handled", async () => {
        
        await startMicroservice();

        expect(mockGetFn).toHaveBeenCalled();

        const videosRoute = mockGetFn.mock.calls[0][0];
        expect(videosRoute).toEqual("/videos");
    });

    test("/videos route retreives data via videos collection", async () => {

        await startMicroservice();

        const mockRequest = {};
        const mockJsonFn = jest.fn();
        const mockResponse = {
            json: mockJsonFn
        };

        const mockRecord1 = {};
        const mockRecord2 = {};

        // Mock the find function to return some mock records.
        mockVideosCollection.find = () => {
            return {
                toArray: async () => { // This is set up to follow the convention of the Mongodb library.
                    return [ mockRecord1, mockRecord2 ];
                }
            };
        };

        const videosRouteHandler = mockGetFn.mock.calls[0][1]; // Extract the /videos route handler function.
        await videosRouteHandler(mockRequest, mockResponse); // Invoke the request handler.

        expect(mockJsonFn.mock.calls.length).toEqual(1); // Expect that the json fn was called.
        expect(mockJsonFn.mock.calls[0][0]).toEqual({
            videos: [ mockRecord1, mockRecord2 ], // Expect that the mock records were retrieved via the mock database function.
        });
    });

    // ... more tests go here ...

});