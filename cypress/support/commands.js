// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('loadFixture',  (databaseName, fixtureName) => {
    cy.unloadFixture(databaseName, fixtureName);

    const dbFixturesUrl = Cypress.config("dbFixturesUrl");    
    cy.request("GET", dbFixturesUrl + "/load-fixture?db=" + databaseName + "&fix=" + fixtureName)
        .then(response => {
            expect(response.status).to.eql(200);
        });
});

Cypress.Commands.add('unloadFixture',  (databaseName, fixtureName) => {
    const dbFixturesUrl = Cypress.config("dbFixturesUrl");    
    cy.request("GET", dbFixturesUrl + "/unload-fixture?db=" + databaseName + "&fix=" + fixtureName)
        .then(response => {
            expect(response.status).to.eql(200);
        });
});

Cypress.Commands.add('dropDatabase', databaseName => {
    const dbFixturesUrl = Cypress.config("dbFixturesUrl");    
    cy.request("GET", dbFixturesUrl + "/drop-database?db=" + databaseName)
        .then(response => {
            expect(response.status).to.eql(200);
        });
});

Cypress.Commands.add('dropCollection', (databaseName, collectionName) => {
    const dbFixturesUrl = Cypress.config("dbFixturesUrl");    
    cy.request("GET", dbFixturesUrl + "/drop-collection?db=" + databaseName + "&col=" + collectionName)
        .then(response => {
            expect(response.status).to.eql(200);
        });
});

Cypress.Commands.add('getCollection', (databaseName, collectionName) => {
    const dbFixturesUrl = Cypress.config("dbFixturesUrl");    
    cy.request("GET", dbFixturesUrl + "/get-collection?db=" + databaseName + "&col=" + collectionName)
        .then(response => {
            expect(response.status).to.eql(200);
            return response.body;
        });
});