require('./init');
const csv = require('fast-csv');
const async = require('async');
const request = require('request');
const URI = require('urijs');
const config = require('./config');
const winston = require('winston');
const uuid5 = require('uuid/v5');

getLocations('PqlFzhuPcF1', (mcsdData) => {
  const namespace = config.getConf('UUID:namespace');
  const mohTopId = uuid5('PqlFzhuPcF1', `${namespace}000`);
  filterLocations(mcsdData, mohTopId, 0, 4, 0, (mcsdData) => {
    csv
      .fromPath('/home/ashaban/Desktop/MEval MFL September HFR.csv', {
        headers: true,
      })
      .on('data', (data) => {
        var id = data['id']
        var found = false
        async.eachSeries(mcsdData.entry, (entry, nxt) => {
          winston.error(entry.id)
          if (entry.id === id) {
            found = true
          }
          nxt()
        }, () => {
          if (found === false) {
            //winston.error('missed')
          } else {
            //winston.error('found')
          }
        })
      }).on('end', () => {
        console.log('Done')
      })
  })
})

function getLocations(database, callback) {
  let url = URI(config.getConf('mCSD:url')).segment(database).segment('fhir').segment('Location') + '?_count=10000'
    .toString();
  const options = {
    url,
  };
  request.get(options, (err, res, body) => {
    body = JSON.parse(body);
    return callback(body)
  });
}

function filterLocations(mcsd, topOrgId, totalLevels, levelNumber, buildings, callback) {
  // holds all entities for a maximum of x Levels defined by the variable totalLevels i.e all entities at level 1,2 and 3
  const mcsdTotalLevels = {};
  // holds all entities for just one level,specified by variable levelNumber i.e all entities at level 1 or at level 2
  const mcsdlevelNumber = {};
  // holds buildings only
  const mcsdBuildings = {};
  mcsdTotalLevels.entry = [];
  mcsdlevelNumber.entry = [];
  mcsdBuildings.entry = [];
  if (!mcsd.hasOwnProperty('entry') || mcsd.entry.length == 0 || !topOrgId) {
    return callback(mcsdTotalLevels, mcsdlevelNumber, mcsdBuildings);
  }
  const entry = mcsd.entry.find(entry => entry.resource.id == topOrgId);
  if (!entry) {
    return callback(mcsdTotalLevels, mcsdlevelNumber, mcsdBuildings);
  }
  if (levelNumber == 1) {
    mcsdlevelNumber.entry = mcsdlevelNumber.entry.concat(entry);
  }
  if (totalLevels) {
    mcsdTotalLevels.entry = mcsdTotalLevels.entry.concat(entry);
  }
  const building = entry.resource.physicalType.coding.find(coding => coding.code == 'building');

  if (building) {
    mcsdBuildings.entry = mcsdBuildings.entry.concat(entry);
  }

  function filter(id, callback) {
    const res = mcsd.entry.filter((entry) => {
      if (entry.resource.hasOwnProperty('partOf')) {
        return entry.resource.partOf.reference.endsWith(id);
      }
    });
    return callback(res);
  }

  let totalLoops = 0;
  if (totalLevels >= levelNumber && totalLevels >= buildings) {
    totalLoops = totalLevels;
  } else if (levelNumber >= totalLevels && levelNumber >= buildings) {
    totalLoops = levelNumber;
  } else if (buildings >= totalLevels && buildings >= levelNumber) {
    totalLoops = buildings;
  }

  let tmpArr = [];
  tmpArr.push(entry);
  totalLoops = Array.from(new Array(totalLoops - 1), (val, index) => index + 1);
  async.eachSeries(totalLoops, (loop, nxtLoop) => {
    let totalElements = 0;
    const promises = [];
    tmpArr.forEach((arr) => {
      promises.push(new Promise((resolve, reject) => {
        filter(arr.resource.id, (res) => {
          tmpArr = tmpArr.concat(res);
          if (totalLevels) {
            mcsdTotalLevels.entry = mcsdTotalLevels.entry.concat(res);
          }
          if (levelNumber == loop + 1) {
            mcsdlevelNumber.entry = mcsdlevelNumber.entry.concat(res);
          }
          const promises1 = [];
          for (var k in res) {
            promises1.push(new Promise((resolve1, reject1) => {
              var building = res[k].resource.physicalType.coding.find((coding) => {
                if (building) {
                  mcsdBuildings.entry = mcsdBuildings.entry.concat(entry);
                }
              });
              resolve1();
            }));
          }
          Promise.all(promises1).then(() => {
            totalElements++;
            resolve();
          }).catch((err) => {
            winston.error(err);
          });
        });
      }));
    });
    Promise.all(promises).then(() => {
      tmpArr.splice(0, totalElements);
      return nxtLoop();
    }).catch((err) => {
      winston.error(err);
    });
  }, () => {
    callback(mcsdTotalLevels, mcsdlevelNumber, mcsdBuildings);
  });
}