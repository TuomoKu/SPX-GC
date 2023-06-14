
const logger = require('./logger.js');
const spx = require('../utils/spx_server_functions.js');


function CheckLogin(req,res,next) {
    // Middleware to check auth in each router.
    // require ..... username
    // returns ..... true / false
    let USER = req.body.username || '';
    let PASS = req.body.password || '';
    let AllowedUser = config.general.username || '';

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
    res.status(403);
    res.render('view-login', { layout: false });
  }


function Logout(req,res,next) {
  // logout user
  logger.info('CheckLogin: User "' + req.session.user + '" logged out.');
  req.session.user = '';
  res.redirect('/');
}

module.exports = {
  CheckLogin,
  Logout
} 


