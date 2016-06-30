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
                    replyTo: 'noreply@pear.life', //Reply to address
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
    firebase.database().ref('users/' + message.senderId).once('value').then(function(_snapshot) {
        var customMessage = {
            senderName: _snapshot.val().name,
            receiverName: message.receiverName,
            messageText: message.html
        };
        templates.render('messageRequest.html', customMessage, function(err, html, text) {
            var mailOptions = {
                from: message.from, // sender address
                replyTo: message.from, //Reply to address
                to: message.to || "courtney@codelab.io", // list of receivers
                subject: message.subject, // Subject line
                html: html, // html body
                text: text  //Text equivalent
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
      
    });
        
});

/*======================================================================*\
    If a new vendor account is created, run this.
\*======================================================================*/
firebase.database().ref('vendorLogins').on('child_added', function(snapshot) {
    var login = snapshot.val();
    if(login.passTemp){
        var userDetails = {
            password: login.passTemp
        };
        firebase.database().ref('vendorLogins/' + snapshot.key).update({
            passTemp: null
        });
        templates.render('accountCreation.html', userDetails, function(err, html, text) {
            var mailOptions = {
                from: "noreply@pear.life", // sender address
                replyTo: "noreply@pear.life", //Reply to address
                to: login.email, // list of receivers
                subject: "Pear - Vendor Account Created", // Subject line
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
        
});

/*======================================================================*\
    If a new guest is created, email them
\*======================================================================*/
firebase.database().ref('guests').on('child_added', function(snapshot) {
    var guest = snapshot.val();
    if(guest.mustEmail){
        firebase.database().ref('weddings/' + guest.wedding).once('value').then(function(_snapshot) {
            firebase.database().ref('users/' + _snapshot.val().user).once('value').then(function(__snapshot) {
                var guestDetails = {
                    name: guest.name,
                    pearuser: __snapshot.val().name
                };
                templates.render('guestAdded.html', guestDetails, function(err, html, text) {
                    var mailOptions = {
                        from: "noreply@pear.life", // sender address
                        replyTo: __snapshot.val().email || "noreply@pear.life", //Reply to address
                        to: guest.email, // list of receivers
                        subject: "Pear - Added To Wedding Guest List", // Subject line
                        html: html, // html body
                        text: text  //Text equivalent
                    };

                    // send mail with defined transport object
                    transporter.sendMail(mailOptions, function(error, info) {
                        if (error) {
                            return console.log(error);
                        }
                        firebase.database().ref('guests/' + snapshot.key).update({
                            mustEmail: null
                        });
                        console.log('Message sent: ' + info.response);
                    });
                }); 
                

            });
        });       
    }
        
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
