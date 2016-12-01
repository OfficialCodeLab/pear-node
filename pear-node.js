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
var admin = require("firebase-admin");
var rek = require('rekuire');
var express = require("express");
var schedule = require('node-schedule');
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

var serviceAccount = rek("credentials/pear-server-d23d792fe506.json");

//console.log(serviceAccount)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pear-server.firebaseio.com"
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = admin.database();
var ref = db.ref("restricted_access/secret_document");


/*======================================================================*\
    Once ref has been initialized and has a value, run this code once
\*======================================================================*/

ref.once("value", function(snapshot) {
  console.log("Connected to Firebase successfully!");
});

/*======================================================================*\
    If the child of a user changes, run this code.
\*======================================================================*/
admin.database().ref('users').on('child_changed', function(snapshot) {
    var user = snapshot.val();
    if (user.accountType === "vendor" && user.vendorRequest === true) {
        admin.database().ref('users/' + snapshot.key).update({
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
                        console.log("VENDOR REGISTRATION ERROR");
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
admin.database().ref('messages').on('child_added', function(snapshot) {
    console.log("New message request");
    var message = snapshot.val();
    admin.database().ref('users/' + message.senderId).once('value').then(function(_snapshot) {
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
                    console.log("MESSAGE REQUEST ERROR");
                    return console.log(error);
                }
                console.log('Message sent: ' + info.response);
                admin.database().ref('messages/' + snapshot.key).remove();
            });
        });
      
    });
        
});

/*======================================================================*\
    If a new vendor account is created, run this.
\*======================================================================*/
admin.database().ref('vendorLogins').on('child_added', function(snapshot) {
    var login = snapshot.val();
    if(login.passTemp){
        var userDetails = {
            password: login.passTemp,            
            id: login.vendorID
        };

        admin.database().ref('vendorLogins/' + snapshot.key).update({
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
                    console.log("VENDOR DOESN'T HAVE EMAIL");
                    return console.log(error);
                }
                console.log('Message sent: ' + info.response);
            });
        });
        templates.render('accountCreationBcc.html', userDetails, function(err, html, text) {
            var mailOptions2 = {
                from: "noreply@pear.life", // sender address
                replyTo: "noreply@pear.life", //Reply to address
                to: "bruce@pear.life, ineke@pear.life, info@pear.life", // list of receivers
                subject: "Pear - Vendor Account Created", // Subject line
                html: html, // html body
                text: text  //Text equivalent
            };

            // send mail with defined transport object
            transporter.sendMail(mailOptions2, function(error, info) {
                if (error) {
                    console.log("SOMETHING WENT WRONG!");
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
admin.database().ref('guests').on('child_added', function(snapshot) {
    var guest = snapshot.val();
    if(guest.mustEmail){
        admin.database().ref('weddings/' + guest.wedding).once('value').then(function(_snapshot) {
            admin.database().ref('users/' + _snapshot.val().user).once('value').then(function(__snapshot) {
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
                            admin.database().ref('guests/' + snapshot.key).update({
                                mustEmail: null
                            });
                            return console.log(error);
                        }
                        admin.database().ref('guests/' + snapshot.key).update({
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
    If a cat-item is deleted, removed favourites from users
\*======================================================================*/
admin.database().ref('catItems').on('child_removed', function(snapshot) {
    var item = snapshot.val();                  //the deleted item
    var favouritedBy = item.favouritedBy;       //list of users who favourited the item
    var fkey = snapshot.key;                    //key of the deleted item
    //Iterate through all users
    for (var key in favouritedBy){
        if (favouritedBy.hasOwnProperty(key)) {
            //Get the user
            admin.database().ref('users/' + key).once('value').then(function(_snapshot) {
                var _user = _snapshot.val();
                var favourites = _user.favourites;
                delete favourites[fkey];        //Delete favourite key-value pair
                admin.database().ref('users/' + key).update({
                    favourites: favourites
                });
            });
        }
    }
});

/*======================================================================*\
    Scheduled tasks - This breaks server, leave out for now
\*======================================================================*/
// var rule = new schedule.RecurrenceRule();
// rule.hour = 24;
// var topVendors = ['ChipFarm', '-KJeGkIxhbuJ0ur-cdXy', 'weddingstuffs'];
 
// var j = schedule.scheduleJob(rule, function(){
//   console.log("Vendor selection underway...");
//   admin.database().ref('topVendors/topvendor').once('value').then(function(snapshot) {
//     let top = snapshot.val();
//     let currentTopVendor;
//     let vendors = top.vendors;
//     for (var a in vendors){
//         currentTopVendor = a;
//         break;
//     } 
//     let newIndex = Math.floor(Math.random() * 3);
//     let newTop = topVendors[newIndex];
//     console.log("NEW VENDOR OF THE DAY: " + newTop + "!!!");
//     admin.database().ref('topVendors/topvendor').update({
//         'vendors' : {
//             [newTop]: true
//         }
//     });
//   });
// });


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
