
// This is here just to host the "external" renderer for GRUDE testing purposes
// Need to have the socker-server as "?gc=" argument!

var express = require("express");
var app = express();
app.use(express.static('.'))
var path = require("path");
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'../index.html'));
});
app.listen(3333);
console.log("Server running at http://localhost:3333?gc=192.168.1.44:5656 (note the IP might be wrong)");