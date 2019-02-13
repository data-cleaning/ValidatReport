HTMLWidgets.widget({

  name: 'validationDashboard',

  type: 'output',

  factory: function(el, width, height) {
    console.log("factory");
    
    return {

      renderValue: function(x) {

        console.log("renderValue: ", "#"+el.id, x.data, x.report);
        
        // Transform R data format (Object of arrays) into javascript data format (array of objects):
        var newData = [];
        var keys = Object.keys(x.data);
        if (keys.length === 0) return;
        var cnt = x.data[keys[0]].length;
        for (var i=0; i<cnt; i++) {
          var o = {};
          for (var key of keys) o[key] = x.data[key][i];
          newData.push(o);
        }
        
        new validationDashboard({container: "#"+el.id, data: newData, report: x.report, idcol: "ID"});

      },

      resize: function(width, height) {
        
        console.log("resize", width, height);

      }

    };
  }
});