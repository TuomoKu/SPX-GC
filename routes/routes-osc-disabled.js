
var express = require("express");
const router = express.Router();

router.get('/', function (req, res) {
  let functionsDoc = {
      "sections" : [

        {
          "section"   :     "osc disabled",
          "info"      :     "See config.json to enable OSC.",
          "endpoint"  :     "/osc",
          "commands": [
            {
              "vers"    :     "v1.3.0",
              "param"   :     "",
              "info"    :     "See config.json to enable OSC."
            },

          ]
        },

      ]
    }
    res.render('view-api-osc', { layout: false, functionList:functionsDoc });
});

module.exports = router;


