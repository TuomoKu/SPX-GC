
// ================== functions alphabetical order  ==================================================


module.exports = {


  webPlayoutController: function (data){
    // We pass the data object to be processed by the web renderer
    // First dataformat sanity check.
    // THIS FORMATS JSON AND SENDS IT FORWARDS in all cases: play, stop, update...
    let TEMPLATEDATA = [];
    // console.log('Format [' + DataType + '] data.fields coming in before emit', data.fields);
    if (data.fields) {
        data.fields.forEach((item) => {
          let tempObj={};
          tempObj[item.field] = item.value;
          TEMPLATEDATA.push(tempObj);
        });
        data.fields=TEMPLATEDATA;
      }
    // console.log('data.fields going out for emit', data.fields);
    global.io.emit('SPXMessage2Client', data);
  }


} // end of exports PlayoutWEB.<functionName>
