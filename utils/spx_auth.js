
const logger = require('./logger.js');
const spx = require('../utils/spx_server_functions.js');


async function validateIfApiKey(req) {
    // Added in 1.3.2
    // TODO: Test carefully and write documentation
    // about user/pass/apikey, for devs also! 
    // console.log("validateIfApiKey", req.method, req.body, req.query);
    let message = '';
    if (config.general.username && !config.general.apikey) {
      message = 'Warning! When username is configured in SPX, apikey is required then also.'
      logger.warn(message);
      return [false, message];
    }


    if (!config.general.apikey || config.general.apikey=='') {
      message = 'No api key SPX in config, allow all.'
      logger.verbose(message);
      return [true, message];
    }

    let KEY = req.method=='POST' ? (req.body?.apikey || null) : (req.query?.apikey || null);
    if ( !KEY ) {
      message = 'API key configured in SPX, but apikey missing from the ' + req.method + ' API request. Access denied.'
      logger.warn(message);
      return [false, message];
    }

    if ( KEY==config.general.apikey) {
      message = 'API key matches. Access allowed.'
      logger.verbose(message);
      return [true, message];
    } else {
      message = 'API key does not match. Access denied.'
      logger.warn(message);
      return [false, message];
    }

} // validateIfApiKey utility


async function CheckAPIKey(req,res,next) {
  // Improved in 1.3.2
  // Middleware to check API key in each API endpoint
  var apiChecked = await validateIfApiKey(req);

  // console.log("Api Checked with in CheckAPIKey", apiChecked);

  if ( apiChecked[0]===true ) {
    // console.log("CheckAPIKey YEAH");
    next();
    return true;
  } else {
    // console.log("CheckAPIKey NOPE");
    let dataOut = {};
    dataOut.error = apiChecked[1]
    res.status(200).json(dataOut);
    return false;
  }
} // CheckAPIKey


async function CheckLogin(req,res,next) {
    // Middleware to check auth in each router.
    // require ..... username
    // returns ..... true / false

    let USER = req.body.username || '';
    let PASS = req.body.password || '';
    let AllowedUser = config.general.username || '';
    
    // let apiChecked = await validateIfApiKey(req);
    // if ( apiChecked[0]===true ) {
    //   next();
    //   return;
    // } else {
    //   return;
    // }

    // See if auth is used (if user in config is present)
    if (!AllowedUser){
      logger.verbose('CheckLogin: No username in config, authorize "default" user...');
      req.session.user = 'default'; 
      next();
      return;
    }

    // See if only user is present in config: ask for auth policy
    if (AllowedUser && !config.general.password || AllowedUser && config.general.password==''){
      logger.verbose('CheckLogin: No password in config, prompt for auth policy...');
      res.render('view-authpolicy', { layout: false, user: AllowedUser});
      return;
    }


    if (req.session.user && req.session.user==AllowedUser) {
      // correct user in session
      logger.verbose('CheckLogin: User "' + req.session.user + '" authorized ok.'); 
      next();
      return;
    }

    if (USER==AllowedUser) {
        if (spx.hashcompare(PASS,config.general.password))           {
          logger.info('CheckLogin: User "' + USER + '" logged in.');
          req.session.user = USER;
          next();
          return;
        }
    }
    logger.verbose('CheckLogin: Not authenticated (or wrong user/pass), redirect to login');
    res.redirect('/login');
    // res.status(403);
    // res.render('view-login', { layout: false });
  } // CheckLogin


function Logout(req,res,next) {
  // logout user
  logger.info('CheckLogin: User "' + req.session.user + '" logged out.');
  req.session.user = '';
  res.redirect('/');
}

module.exports = {
  CheckAPIKey,
  CheckLogin,
  Logout
} 


