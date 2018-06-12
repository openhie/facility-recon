getParents:function(reference,mcsdEntry,source,details,callback){
      const parents = []
      function getPar(parents,mcsdEntry,reference,callback){
        winston.error(reference)
        var splParent = reference.split("/")
        reference = splParent[(splParent.length-1)]
        mcsd.entry.forEach((entry)=>{
          if(entry.)
        })
        if(reference == null || reference == false || reference == undefined){
          winston.error("Error " + reference)
          winston.error(JSON.stringify(mcsdEntry))
          return callback(parents)
        }
        var splParent = reference.split("/")
        reference = splParent[(splParent.length-1)]
        if(source == "MOH")
          var url = URI(config.getConf("mCSDMOH:url")).segment('Location')
        else if(source == "DATIM")
          var url = URI(config.getConf("mCSDDATIM:url")).segment('Location')
        var options = {
          url: url + '?_id=' + reference.toString()
        }

        request.get(options, (err, res, body) => {
          try{
            body = JSON.parse(body)
          }catch(e){
            winston.error(e.message)
          }

          if(body.total == 0){
            var options = {
              url: url + '?identifier=' + reference.toString()
            }
            request.get(options,(err,res,body)=>{
              body = JSON.parse(body)
              if(body.total == 1){
                var identifier = null
                if(body.entry[0].resource.hasOwnProperty('identifier') && Object.keys(body.entry[0].resource.identifier).length > 0)
                  identifier = body.entry[0].resource.identifier[0].value
                if(details == "all")
                  parents.push({text:body.entry[0].resource.name,id:body.entry[0].resource.id})
                else if(details == "id")
                  parents.push(body.entry[0].resource.id)
                else if(details == "names")
                  parents.push(body.entry[0].resource.name)
                else
                  winston.error("parent details (either id,names or all) to be returned not specified")
              }
              if(body.total == 1 && Object.keys(body.entry).length>0 && 
                body.entry[0].resource.hasOwnProperty("partOf") && 
                body.entry[0].resource.partOf.reference != false &&
                body.entry[0].resource.partOf.reference != null &&
                body.entry[0].resource.partOf.reference != undefined){
                reference = body.entry[0].resource.partOf.reference
                getPar(parents,body.entry[0],reference,(parents)=>{
                  return callback(parents)
                })
              }
              else{
                return callback(parents)
              }
            })
          }

          else if(body.total == 1){
            var identifier = null
            if(body.entry[0].resource.hasOwnProperty('identifier') && Object.keys(body.entry[0].resource.identifier).length > 0)
              identifier = body.entry[0].resource.identifier[0].value
            if(details == "all")
              parents.push({text:body.entry[0].resource.name,id:body.entry[0].resource.id})
            else if(details == "id")
              parents.push(body.entry[0].resource.id)
            else if(details == "names")
              parents.push(body.entry[0].resource.name)
            else
              winston.error("parent details (either id,names or all) to be returned not specified")
            if(body.entry[0].resource.hasOwnProperty("partOf") && 
              body.entry[0].resource.partOf.reference != false &&
              body.entry[0].resource.partOf.reference != null &&
              body.entry[0].resource.partOf.reference != undefined){
              reference = body.entry[0].resource.partOf.reference
              getPar(parents,body.entry[0],reference,(parents)=>{
                return callback(parents)
              })
            }
            else{
              return callback(parents)
            }
          }
        })
      }

      getPar(parents,mcsdEntry,reference,(parents)=>{
        return callback(parents)
      })
      
      
    },