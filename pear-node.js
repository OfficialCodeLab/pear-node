/*======================================================================*\
    Pear Node Server
    Author: CodeLab (http://www.codelab.io)
    Version: 1.0
\*======================================================================*/
console.log("======================================================================\n" +
    "Pear Node Server\n" +
    "Author: CodeLab (http://www.codelab.io)\n" +
    "Version: 1.0\n" +
    "======================================================================\n")
/*======================================================================*\
    Require Section
\*======================================================================*/
var path = require('path');
var EmailTemplates = require('swig-email-templates');
var nodemailer = require('nodemailer');
var firebase = require("firebase");
var express = require("express");
var templates = new EmailTemplates({
  root: path.join(__dirname, "templates")
});



/*======================================================================*\
    Initialize Section
\*======================================================================*/
// Set up Express.js app
var app = express();

// Set up nodemailer transporter with an account
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'pearmailserver@gmail.com',
        pass: 'P34rl1f3'
    }
});

//nodemailer.createTransport('smtps://user%40gmail.com:pass@smtp.gmail.com');    ||NEW METHOD||

/*======================================================================*\
    Set up firebase and database reference as variables
\*======================================================================*/
firebase.initializeApp({
    serviceAccount: "credentials/pear-server-d23d792fe506.json",
    databaseURL: "https://pear-server.firebaseio.com"
});

var db = firebase.database();
var ref = db.ref("restricted_access/secret_document");

/*======================================================================*\
    Once ref has been initialized and has a value, run this code once
\*======================================================================*/
ref.once("value", function() {
    console.log("Firebase: Connected to database successfully!\n")
});


/*======================================================================*\
    If the child of a user changes, run this code.
\*======================================================================*/
firebase.database().ref('users').on('child_changed', function(snapshot) {
    var user = snapshot.val();
    if (user.accountType === "vendor" && user.vendorRequest === true) {
        firebase.database().ref('users/' + snapshot.key).update({
            vendorRequest: false
        });
        if (user.email) {
            var vendorWelcome = {
                name : user.name
            };
            templates.render('registeredVendor.html', vendorWelcome, function(err, html, text) {

                var mailOptions = {
                    from: 'info@pear.life', // sender address
                    replyTo: 'info@pear.life', //Reply to address
                    to: user.email, // list of receivers
                    subject: 'Pear - You are now a registered vendor', // Subject line
                    html: html, // html body
                    text: text  //Text equivalent
                };

                // send mail with defined transport object
                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message sent: ' + info.response);
                });
            });

        }
    }
});

/*======================================================================*\
    If a new message request is created, run this.
\*======================================================================*/
firebase.database().ref('messages').on('child_added', function(snapshot) {
    var message = snapshot.val();
    
    var mailOptions = {
        from: message.from, // sender address
        replyTo: message.from, //Reply to address
        to: message.to, // list of receivers
        subject: message.subject, // Subject line
        html: message.html // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
        firebase.database().ref('messages/' + snapshot.key).remove();
    });
        
});

/*======================================================================*\
    Launch Web Server
\*======================================================================*/
app.get('/', function(req, res) {
    res.send('Hello World');
})

var server = app.listen(8081, function() {

    var host = server.address().address;
    var port = server.address().port;

    console.log("Web Server listening at localhost:" + port + "\n");

})
