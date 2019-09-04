/* eslint-disable consistent-return */
require('../init');
const winston = require('winston');
const express = require('express');
const formidable = require('formidable');
const async = require('async');

const router = express.Router();
const mcsd = require('../mcsd')();
const config = require('../config');
const mixin = require('../mixin')();

const topOrgId = config.getConf('mCSD:fakeOrgId');

router.post('/addJurisdiction', (req, res) => {
  winston.info('Received a request to add a new Jurisdiction');
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    mcsd.addJurisdiction(fields, (error) => {
      if (error) {
        res.status(400).send(error);
      } else {
        winston.info('New Jurisdiction added successfully');
        res.status(200).send();
      }
    });
  });
});

router.post('/addBuilding', (req, res) => {
  winston.info('Received a request to add a new Building');
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    mcsd.addBuilding(fields, (error) => {
      if (error) {
        res.status(500).send(error);
      } else {
        winston.info('New Building added successfully');
        res.status(200).send();
      }
    });
  });
});

router.get('/getBuildings', (req, res) => {
  winston.info('Received a request to get list of buildings');
  const {
    jurisdiction,
  } = req.query;
  const filters = {
    parent: jurisdiction,
  };
  mcsd.getBuildings(filters, (err, buildings) => {
    if (err) {
      res.status(500).send(err);
    } else {
      winston.info('Returning a list of facilities');
      const buildingsTable = [];
      async.each(buildings, (building, nxtBuilding) => {
        const row = {};
        row.id = building.resource.id;
        row.name = building.resource.name;
        if (building.resource.alias) {
          row.alt_name = building.resource.alias;
        }
        let code;
        if (building.resource.identifier) {
          code = building.resource.identifier.find(identifier => identifier.system === 'https://digitalhealth.intrahealth.org/code');
        }
        if (code) {
          row.code = code.value;
        }
        if (building.resource.type) {
          row.type = {};
          const type = building.resource.type.find(type => type.coding && type.coding.find(coding => coding.system === 'https://digitalhealth.intrahealth.org/locType'));
          if (type) {
            row.type.code = type.coding[0].code;
            row.type.text = type.text;
          }
        }
        if (building.resource.status) {
          row.status = {};
          const {
            status,
          } = building.resource;
          if (status === 'active') {
            row.status.text = 'Functional';
            row.status.code = status;
          } else if (status === 'inactive') {
            row.status.text = 'Not Functional';
            row.status.code = status;
          } else if (status === 'suspended') {
            row.status.text = 'Suspended';
            row.status.code = status;
          }
        }
        if (building.resource.position) {
          if (building.resource.position.latitude) {
            row.lat = building.resource.position.latitude;
          }
          if (building.resource.position.longitude) {
            row.long = building.resource.position.longitude;
          }
        }
        const phone = building.resource.telecom && building.resource.telecom.find(telecom => telecom.system === 'phone');
        if (phone) {
          row.phone = phone.value;
        }
        const email = building.resource.telecom && building.resource.telecom.find(telecom => telecom.system === 'email');
        if (email) {
          row.email = email.value;
        }
        const fax = building.resource.telecom && building.resource.telecom.find(telecom => telecom.system === 'fax');
        if (fax) {
          row.fax = fax.value;
        }
        const website = building.resource.telecom && building.resource.telecom.find(telecom => telecom.system === 'url');
        if (website) {
          row.website = website.value;
        }
        row.description = building.resource.description;
        row.parent = {};
        async.series({
          getParent: (callback) => {
            if (building.resource.partOf) {
              row.parent.id = building.resource.partOf.reference.split('/').pop();
              row.parent.name = building.resource.partOf.display;
              mcsd.getLocationByID('', row.parent.id, false, (parDt) => {
                if (parDt.entry && parDt.entry.length > 0) {
                  row.parent.name = parDt.entry[0].resource.name;
                }
                return callback(null);
              });
            } else {
              return callback(null);
            }
          },
          getOrgType: (callback) => {
            row.ownership = {};
            if (building.resource.managingOrganization && building.resource.managingOrganization.reference) {
              const orgId = building.resource.managingOrganization.reference.split('/').pop();
              mcsd.getOrganizationByID({
                id: orgId,
              }, (orgDt) => {
                if (orgDt.entry && orgDt.entry.length > 0) {
                  if (orgDt.entry[0].resource.type) {
                    const type = orgDt.entry[0].resource.type.find(type => type.coding && type.coding.find(coding => coding.system === 'https://digitalhealth.intrahealth.org/orgType'));
                    if (type) {
                      row.ownership.code = type.coding[0].code;
                      row.ownership.text = type.text;
                    }
                    return callback(null);
                  }
                  return callback(null);
                }
                return callback(null);
              });
            } else {
              return callback(null);
            }
          },
        }, () => {
          buildingsTable.push(row);
          return nxtBuilding();
        });
      }, () => {
        res.status(200).send(buildingsTable);
      });
    }
  });
});

router.post('/addCodeSystem', (req, res) => {
  winston.info('Received a request to add code system');
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    mcsd.addCodeSystem(fields, (error) => {
      if (error) {
        res.status(500).send(error);
      } else {
        winston.info('New code system added successfully');
        res.status(200).send();
      }
    });
  });
});

router.get('/getCodeSystem', (req, res) => {
  winston.info('Received a request to get code system');
  const {
    codeSystemType,
  } = req.query;
  const codeSyst = mixin.getCodesysteURI(codeSystemType);
  let codeSystemURI;
  if (codeSyst) {
    codeSystemURI = codeSyst.uri;
  } else {
    winston.warn(`Codesystem URI ${codeSystemType} was not found on the configuration`);
  }
  mcsd.getCodeSystem({
    codeSystemURI,
  }, (codeSystem) => {
    let codeSystemResource = {};
    if (codeSystem.entry.length > 0 && codeSystem.entry[0].resource.concept) {
      codeSystemResource = codeSystem.entry[0].resource.concept;
    }
    res.status(200).send(codeSystemResource);
  });
});

router.get('/getTree', (req, res) => {
  winston.info('Received a request to get location tree');
  let {
    sourceLimitOrgId,
  } = req.query;
  if (!sourceLimitOrgId) {
    sourceLimitOrgId = topOrgId;
  }
  winston.info('Fetching FR Locations');
  async.parallel({
    locationChildren(callback) {
      mcsd.getLocationChildren({
        sourceLimitOrgId,
      }, (mcsdData) => {
        winston.info('Done Fetching FR Locations');
        return callback(false, mcsdData);
      });
    },
    parentDetails(callback) {
      if (sourceLimitOrgId === topOrgId) {
        return callback(false, false);
      }
      mcsd.getLocationByID('', sourceLimitOrgId, false, details => callback(false, details));
    },
  }, (error, response) => {
    winston.info('Creating FR Tree');
    mcsd.createTree(response.locationChildren, sourceLimitOrgId, (tree) => {
      if (sourceLimitOrgId !== topOrgId) {
        tree = {
          text: response.parentDetails.entry[0].resource.name,
          id: sourceLimitOrgId,
          children: tree,
        };
      }
      winston.info('Done Creating FR Tree');
      res.status(200).json(tree);
    });
  });
});

module.exports = router;
