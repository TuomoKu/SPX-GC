
// Utility for converting GDD TemplateDefinition to SPX TemplateDefinition
// TODO: Converter is not implemented yet, just a dummy function

module.exports = {

  convertGddtoSpx: function (gddDef) {
    
    let spxDef = {};
    try {
      console.log('converting GDD to SPXGCTemplateDefinition!');
      spxDef.description  = gddDef.description;
      spxDef.playserver   = "OVERLAY",
      spxDef.playchannel  = "1",
      spxDef.playlayer    = "14",
      spxDef.webplayout   = "14",
      spxDef.steps        = "999",
      spxDef.out          = "manual",
      spxDef.uicolor      = "3",
      spxDef.dataformat   = "json",

      spxDef.DataFields  = [];
      spxDef.DataFields.push(
                {
                  ftype: "instruction",
                  value: "Converted template",
                }
      );


      return spxDef;
    } catch (error) {
      logger.error('convertGddtoSpx: ' + error);
    };

  } // convertGddtoSpx
} // end of module.exports