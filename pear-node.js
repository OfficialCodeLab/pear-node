var nodemailer = require('nodemailer');
 
// create reusable transporter object using the default SMTP transport 
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'pearmailserver@gmail.com',
        pass: 'P34rl1f3'
    }
});

var firebase = require("firebase");
firebase.initializeApp({
  serviceAccount: "credentials/pear-server-d23d792fe506.json",
  databaseURL: "https://pear-server.firebaseio.com"
});

var db = firebase.database();
var ref = db.ref("restricted_access/secret_document");
ref.once("value", function() {
  console.log("======================\nConnection Established\n======================");
});

firebase.database().ref('users').on('child_changed', function(snapshot) {
   var user = snapshot.val();
   if(user.accountType==="vendor" && user.vendorRequest===true){
	    if(user.email){
	   	var mailOptions = {
		    from: 'info@pear.life', // sender address 
		    to: user.email, // list of receivers 
		    subject: 'Pear - You are now a registered vendor', // Subject line 
		    html: 'Greetings from Pear!<br><br>You are now a registered vendor!<br>Good for you now go away<br><br>Regards<br>The Pear Tree.' // html body 
		};
		 
		// send mail with defined transport object 
		transporter.sendMail(mailOptions, function(error, info){
		    if(error){
		        return console.log(error);
		    }
		    console.log('Message sent: ' + info.response);
		});

	   }   		
   }
});