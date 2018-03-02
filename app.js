// import library
var restify = require('restify');
var builder = require('botbuilder');
var tedious = require('tedious');


//const server = express();
/*server.listen(process.env.port || process.env.PORT || 3978, '::', () => {
    console.log('Server Up');
});*/



//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});



//Set Up Database.

var Connection = tedious.Connection;  
var config = {  
    userName: 'nampeungggg',  
    password: '112233aa.',  
    server: 'sql-server-fb-bot.database.windows.net',  
    options: {encrypt: true, database: 'SQL-Bot'}  
};  

var connection = new Connection(config);  
connection.on('connect', function(err) {  
});
var Request = tedious.Request;  
var TYPES = tedious.TYPES;  

// Bot Storage: Here we register the state storage for your bot. 
// Default store: volatile in-memory store - Only for prototyping!
// We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
// For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
var inMemoryStorage = new builder.MemoryBotStorage();

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector).set('storage', inMemoryStorage); // Register in memory storage;
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existing conversations will be restarted.
bot.set(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

bot.dialog('/', [
    function (session) {
        // Send a greeting and show help.
        var card = new builder.HeroCard(session)
            .title("NP Shop")
            .text("All the clothes you need")
            .images([
                 builder.CardImage.create(session, "https://image.ibb.co/kL4Ce6/online_store.png")
            ]);
        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);
        session.send("Hi... Welcome to NP Shop.");

        session.beginDialog('/help');
    },
    function (session, results) {
        // Display menu
        session.beginDialog('/menu');
    },
    function (session, results) {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

bot.dialog('/menu', [
    function (session) {
        builder.Prompts.choice(session, "What do you want to ask?", "Detail of Products|Recommendation|FAQ|(quit)");
    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.endDialog();
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });

bot.dialog('/help', [
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* menu - Returns to the menu.\n* goodbye - End this conversation.\n* help - Displays these commands.");
    }
]);

/*bot.dialog('/connectToHuman', (session)=>{
    session.send("Hold on, buddy! Connecting you to the next available agent!");
    handoff.triggerHandoff(session);
}).triggerAction({
    matches:  /^agent/i,
});*/


bot.dialog('/Detail of Products', [
    function (session) {
        session.send("What do you want to know about our products? Please tell me.")
        builder.Prompts.choice(session, "Please Choose : ", "Price|Stock|Size|Color");
    },
    function (session, results) {
        session.send("You want to know about the "+results.response.entity+"...")
        if (results.response.entity == "Price") {
            session.beginDialog('askPrice');
        }
        else if (results.response.entity == "Stock") {
            session.beginDialog('askStock');
        }
        else if (results.response.entity == "Size")
        {
            session.beginDialog('askSize');
        }
        else if (results.response.entity == "Color")
        {
            session.beginDialog('askColor');
        }
    }
]);

bot.dialog('askPrice', [
    function (session) {
        builder.Prompts.text(session,"Enter Product Name: ");
    },
    function (session,results){       
        executeAsk("SELECT DISTINCT Name, Price FROM Products WHERE Name LIKE '%"+(results.response).toLowerCase()+"%' Order By Name;", function(err,dataset,rows) {
            if(err || rows <= 0) {
                session.send("Sorry, Product not found.");
            }
            else {
            dataset.forEach(function(data){
            session.send("Name: %s\n\nPrice: %d Baht" , data.Name.capitalize(), data.Price);
            })
            if(rows==1){
                session.send("Total 1 Product");
            }
            else{
                session.send("Total %d Products",rows);
            }
        }
        session.beginDialog('askPriceAgain');
        });
    }
]);

bot.dialog('askPriceAgain',[
    function(session) {
        builder.Prompts.confirm(session, "Do you want to find again?");
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('askPrice');
        }
        else {
            session.endDialog("Back to menu...");
        }
    }
]);


bot.dialog('askStock', [
    function (session) {
        builder.Prompts.text(session,"Enter Product's Name: ");
    },
    function (session, results) {
        name = results.response
        builder.Prompts.text(session, "Enter Product's Size: ");
    },
    function (session, results) {
        size = results.response
        builder.Prompts.text(session, "Enter Product's Color: ");
    },
    function (session, results) {
        color = results.response
        executeAsk("SELECT ID, Name, Color, Picture, Quantity FROM Products WHERE Name LIKE '%"+name.toLowerCase()+"%' and Size = '"+size.toLowerCase()+"' and Color LIKE '%"+color.toLowerCase()+"%'", function(err,dataset,rows) {
            if(err || rows <= 0) {
                session.send("Sorry, Product not found.");
            }
            else {
            dataset.forEach(function(data){
                var sendpic = new builder.Message(session)
                .attachments([{
                contentType: "image/jpeg",
                contentUrl: data.Picture
            }]);
            session.send(sendpic);
            session.send("ID: %s\n\nName: %s\n\nColor: %s\n\nQuantity: %d" , data.ID,data.Name.capitalize(),data.Color.capitalize(), data.Quantity);
            })
            if(rows==1){
                session.send("Total 1 Product");
            }
            else{
                session.send("Total %d Products",rows);
            }           
        }
        session.beginDialog('askStockAgain');
        });
    }
]);

bot.dialog('askStockAgain',[
    function(session) {
        builder.Prompts.confirm(session, "Do you want to find again?");
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('askStock');
        }
        else {
            session.endDialog("Back to menu...");
        }
    }
]);

bot.dialog('askSize', [
    function (session) {
        builder.Prompts.text(session,"Enter Product's Name: ");
    },
    function (session, results) {
        var size = ""
        var lists = []
        name = results.response
        executeAsk("SELECT DISTINCT Name, Size FROM Products WHERE Name LIKE '%"+name.toLowerCase()+"%' Order By Name;",function(err,dataset,rows) {
            if(err || rows <= 0) {
                session.send("Sorry, Product not found.");
            }
            else {

            for (var i = 0; i < (rows-1); i++){
                if (dataset[i].Name == (dataset[i+1]).Name) {
                    (dataset[i+1])['Size'] = (String(dataset[i].Size)).toUpperCase()+" "+(String(dataset[i+1].Size)).toUpperCase();
                    lists.push(i);
                }
            }
            for (var i = lists.length -1; i >= 0; i--){
                dataset.splice(lists[i],1);
            }

            dataset.forEach(function(data){
                session.send("Product's Name: "+(data.Name).capitalize()+ "\n\nSize: "+data.Size);
            });
            if(rows==1){
                session.send("Total 1 Product");
            }
            else{
                session.send("Total %d Products", dataset.length);
            }
        }
        session.beginDialog('askSizeAgain');
        }); 
    },
]);
 

bot.dialog('askSizeAgain',[
    function(session) {
        builder.Prompts.confirm(session, "Do you want to find again?");
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('askSize');
        }
        else {
            session.endDialog("Back to menu...");
        }
    }
]);

bot.dialog('askColor', [
    function (session) {
        builder.Prompts.text(session,"Enter Product's Name: ");
    },
    function (session, results) {
        name = results.response
        var lists = []
        name = results.response
        executeAsk("SELECT Name, Picture, Color FROM Products WHERE Name LIKE '%"+name.toLowerCase()+"%' Order By Name, Color;",function(err,dataset,rows) {
            if(err || rows <= 0) {
                session.send("Sorry, Product not found.");
            }
            else {

            for (var i = 0; i < (rows-1); i++){
                if (dataset[i].Name == (dataset[i+1]).Name && dataset[i].Color == (dataset[i+1]).Color) {
                    lists.push(i);
                }
            }
            for (var i = lists.length -1; i >= 0; i--){
                dataset.splice(lists[i],1);
            }

            dataset.forEach(function(data){
                var sendpic = new builder.Message(session)
                .attachments([{
                    contentType: "image/jpeg",
                    contentUrl: data.Picture
                }]);
                session.send(sendpic);
                session.send("Product's Name: "+(data.Name).capitalize()+ "\n\nColor: "+data.Color.capitalize());
            });
            if(rows==1){
                session.send("Total 1 Product");
            }
            else{
                session.send("Total %d Products", dataset.length);
            }
        }
        session.beginDialog('askColorAgain');
        }); 
    },
]);

bot.dialog('askColorAgain',[
    function(session) {
        builder.Prompts.confirm(session, "Do you want to find again?");
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('askColor');
        }
        else {
            session.endDialog("Back to menu...");
        }
    }
]);



bot.dialog('/Recommendation', [
    function (session) {
        session.send("What factor are you interested? Please tell me.")
        builder.Prompts.choice(session, "Please Choose : ", "Color|Type|Color&Type");
    },
    function (session, results) {
        if (results.response.entity == "Color") {
            session.beginDialog('recColor');
        }
        else if (results.response.entity == "Type") {
            session.beginDialog('recType');
        }
        else if (results.response.entity == "Color&Type")
        {
            session.beginDialog('recColorType');
        }
    }
]);


bot.dialog('recColor', [
    function (session) {
        builder.Prompts.text(session, "Enter Color: ");
    },
    function (session, results) {
        color = results.response
        executeAsk("SELECT DISTINCT Name, Picture, Color FROM Products WHERE Color LIKE '%"+color.toLowerCase()+"%' Order By Name, Color;",function(err,dataset,rows) {
            if(err || rows <= 0) {
                session.send("Sorry, Product not found.");
            }
            else {
                dataset.forEach(function(data){
                    var sendpic = new builder.Message(session)
                    .attachments([{
                    contentType: "image/jpeg",
                    contentUrl: data.Picture
                }]);
                session.send(sendpic);
                session.send("Name: %s\n\nColor: %s" , data.Name.capitalize(), data.Color);
                })
                if(rows==1){
                    session.send("Total 1 Product");
                }
                else{
                    session.send("Total %d Products",rows);
                }
            }
            session.beginDialog('recColorAgain');
        }); 
    }
])

bot.dialog('recColorAgain',[
    function(session) {
        builder.Prompts.confirm(session, "Do you want to find again?");
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('recColor');
        }
        else {
            session.endDialog("Back to menu...");
        }
    }
]);

bot.dialog('recType', [
    function (session) {
        builder.Prompts.text(session, "Enter Type: ");
    },
    function (session, results) {
        type = results.response
        executeAsk("SELECT DISTINCT Name, Color, Picture FROM Products WHERE Type LIKE '%"+type.toLowerCase()+"%' Order By Name, Color;",function(err,dataset,rows) {
            if(err || rows <= 0) {
                session.send("Sorry, Product not found.");
            }
            else {
                dataset.forEach(function(data){
                    var sendpic = new builder.Message(session)
                    .attachments([{
                    contentType: "image/jpeg",
                    contentUrl: data.Picture
                }]);
                session.send(sendpic);
                session.send("Name: %s\n\nColor: %s" , data.Name.capitalize(), data.Color);
                })
                if(rows==1){
                    session.send("Total 1 Product");
                }
                else{
                    session.send("Total %d Products",rows);
                }
            }
            session.beginDialog('recTypeAgain');
        }); 
    }
])

bot.dialog('recTypeAgain',[
    function(session) {
        builder.Prompts.confirm(session, "Do you want to find again?");
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('recType');
        }
        else {
            session.endDialog("Back to menu...");
        }
    }
]);


bot.dialog('recColorType', [
    function (session) {
        builder.Prompts.text(session, "Enter Color: ");
    },
    function (session, results) {
        color = results.response
        builder.Prompts.text(session, "Enter Type: ");
    },
    function (session, results) {
        type = results.response
        executeAsk("SELECT DISTINCT Name, Color, Picture FROM Products WHERE Type LIKE '%"+type.toLowerCase()+"%' and Color LIKE '%"+color.toLowerCase()+"%' Order By Name, Color;",function(err,dataset,rows) {
            if(err || rows <= 0) {
                session.send("Sorry, Product not found.");
            }
            else {
                dataset.forEach(function(data){
                    var sendpic = new builder.Message(session)
                    .attachments([{
                    contentType: "image/jpeg",
                    contentUrl: data.Picture
                }]);
                session.send(sendpic);
                session.send("Name: %s\n\nColor: %s" , data.Name.capitalize(), data.Color);
                })
                if(rows==1){
                    session.send("Total 1 Product");
                }
                else{
                    session.send("Total %d Products",rows);
                }
            }
            session.beginDialog('recColorTypeAgain');
        }); 
    }
])

bot.dialog('recColorTypeAgain',[
    function(session) {
        builder.Prompts.confirm(session, "Do you want to find again?");
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('recColorType');
        }
        else {
            session.endDialog("Back to menu...");
        }
    }
]);

bot.dialog('/FAQ', [
    function (session) {
        builder.Prompts.text(session,"What do you want to know?")
    },
    function (session, results) {
        var ans = false;
        if (results.response.match(/.*payment.*/g) || results.response.match(/.*Payment.*/g)
        || results.response.match(/.*pay.*/g) || results.response.match(/.*Pay.*/g)) {
            session.send("Payment Methods\n\n1. ATM Bank\n2. Internet Banking\n3. VISA Card");
            ans = true;
        }
        if (results.response.match(/.*size.*/g) || results.response.match(/.*Size.*/g)) {
            var pic = new builder.Message(session)
                    .attachments([{
                    contentType: "image/jpeg",
                    contentUrl: "https://image.ibb.co/cnNsan/size.jpg"
                }]);
            session.send(pic);
            ans = true;
        }
        if (results.response.match(/.*return.*/g) || results.response.match(/.*return.*/g)
        || results.response.match(/.*refund.*/g) || results.response.match(/.*refund.*/g)) {
            session.send("Returns & Refund\n\n Please send an email to npshop@chatbot.com\n\n1. Picture of Products\n2. Reason\n3. Order ID");
            ans = true;
        }
        if (results.response.match(/.*order.*/g) || results.response.match(/.*order.*/g)) {
            session.send("Product Order\n\nPlease send an email to npshop@chatbot.com\n\n1. Product's ID\n2. Quantity\n3. Name, Address and Mobile Phone");
            ans = true;
        }
        if (results.response.match(/.*ship.*/g) || results.response.match(/.*Ship.*/g)) {
            session.send("Shipment\n\n1. Thaipost\n2. Kerry");
            ans = true;
        }
        if (ans = false){ 
            session.send("Wait for the owner...")
        }
        session.beginDialog('FAQAgain');
    }
]);

bot.dialog('FAQAgain', [
    function(session) {
        builder.Prompts.confirm(session, "Do you other questions?");
    },
    function (session, results) {
        if (results.response) {
            session.beginDialog('/FAQ');
        }
        else {
            session.endDialog("Back to menu...");
        }
    }
])

function executeAsk(qryString, callback) {

    var request = new Request(qryString, function(err, rowCount) {
        if (err) {
            console.log('Error in request: ' + err);
        } else {
            //console.log('Rows returned: ' + rowCount);
        }
        callback(err, resultSet,rowCount);
    });

    var resultSet = [];

    request.on('row', function(columns) {
        var row = {}; 
        columns.forEach(function(column) {
            if (column.isNull) {
                row[column.metadata.colName] = null;
            } else {
                row[column.metadata.colName] = column.value;
            } 
        });
        //console.log('Row is: ' + row);
        resultSet.push(row);
    });

    connection.execSql(request);
    //console.log('resultSet: ' + resultSet);
    return resultSet;
}



String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

