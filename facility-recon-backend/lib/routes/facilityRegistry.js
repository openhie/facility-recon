/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
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

router.post('/addService', (req, res) => {
  winston.info('Received a request to add a new service');
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    mcsd.addService(fields, (error) => {
      if (error) {
        res.status(400).send(error);
      } else {
        winston.info('New Jurisdiction added successfully');
        res.status(200).send();
      }
    });
  });
});
router.post('/addJurisdiction', (req, res) => {
  winston.info('Received a request to add a new Jurisdiction');
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    const defaultDB = config.getConf('hapi:defaultDBName');
    fields.database = defaultDB;
    mcsd.addJurisdiction(fields, (error, id) => {
      if (error) {
        winston.error(error);
        res.status(500).send(error);
        return;
      }
      const requestsDB = config.getConf('hapi:requestsDBName');
      fields.database = requestsDB;
      fields.id = id;
      mcsd.addJurisdiction(fields, (error) => {
        if (error) {
          winston.error(error);
          res.status(500).send(error);
        } else {
          winston.info('New Jurisdiction added successfully');
          res.status(200).send();
        }
      });
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

router.post('/changeBuildingRequestStatus', (req, res) => {
  winston.info('Received a request to change building request status');
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    const {
      id,
      status,
      requestType,
    } = fields;
    mcsd.changeBuildingRequestStatus({
      id,
      status,
      requestType,
    }, (error) => {
      if (error) {
        winston.error('An error has occured while changing request status');
        res.status(500).send(error);
      } else {
        winston.info('Building Request Status Changed Successfully');
        res.status(200).send();
      }
    });
  });
});

router.get('/getLocationNames', (req, res) => {
  const {
    ids,
  } = req.query;
  const names = [];
  async.each(
    ids,
    (id, nxtId) => {
      mcsd.getLocationByID('', id, false, (location) => {
        if (location && location.entry && location.entry.length > 0) {
          names.push({
            id: location.entry[0].resource.id,
            name: location.entry[0].resource.name,
          });
          return nxtId();
        }
        return nxtId();
      });
    },
    () => {
      res.status(200).json(names);
    },
  );
});

router.get('/getServices', (req, res) => {
  winston.info('Received a request to get list of service offered by facilities');
  const {
    id,
    getResource,
  } = req.query;
  const filters = {
    id,
  };

  function getResourceLocationNames(resource, callback) {
    if (!resource || !resource.location || !Array.isArray(resource.location)) {
      return callback(resource);
    }
    async.eachOf(
      resource.location,
      (id, index, nxtId) => {
        mcsd.getLocationByID('', id.reference, false, (location) => {
          if (location && location.entry && location.entry.length > 0) {
            resource.location[index].name = location.entry[0].resource.name;
            return nxtId();
          }
          return nxtId();
        });
      },
      () => {
        callback(resource);
      },
    );
  }

  mcsd.getServices(filters, (mcsdServices) => {
    if (getResource) {
      if (mcsdServices && mcsdServices.entry && mcsdServices.entry.length > 0) {
        getResourceLocationNames(mcsdServices.entry[0].resource, () => res.status(200).json(mcsdServices));
      } else {
        res.status(200).json(mcsdServices);
      }
      return;
    }
    const services = [];
    async.each(mcsdServices.entry, (service, nxtService) => {
      const srv = {};
      srv.id = service.resource.id;
      srv.name = service.resource.name;
      const ident = service.resource.identifier && service.resource.identifier.find(
        identifier => identifier.system === 'https://digitalhealth.intrahealth.org/code',
      );
      if (ident) {
        srv.code = ident.value;
      }
      if (!service.resource.location) {
        srv.locations = 0;
      } else {
        srv.locations = service.resource.location.length;
      }
      srv.type = [];
      if (service.resource.type) {
        service.resource.type.forEach((type) => {
          srv.type.push(type.text);
        });
      }
      if (service.resource.active) {
        srv.active = 'Yes';
      } else {
        srv.active = 'No';
      }
      services.push(srv);
      return nxtService();
    });
    res.status(200).json(services);
  });
});

router.get('/getBuildings', (req, res) => {
  winston.info('Received a request to get list of buildings');
  const {
    jurisdiction,
    action,
    requestType,
    requestCategory,
    requestedUser,
  } = req.query;
  let database;
  if (action === 'request' && requestCategory === 'requestsList') {
    database = config.getConf('hapi:requestsDBName');
  }
  const filters = {
    parent: jurisdiction,
    database,
    action,
    requestType,
  };
  mcsd.getBuildings(filters, (err, buildings) => {
    if (err) {
      res.status(500).send(err);
    } else {
      winston.info('Returning a list of facilities');
      const buildingsTable = [];
      async.each(buildings, (building, nxtBuilding) => {
        let requestExtension;
        if (action === 'request'
          && (requestCategory === 'requestsList' || requestedUser)
          && (!building.resource.extension || !Array.isArray(building.resource.extension))) {
          return nxtBuilding();
        }
        if (action === 'request' && requestType === 'add' && requestCategory === 'requestsList') {
          requestExtension = mixin.getLatestFacilityRequest(building.resource.extension, 'add', requestedUser);
          if (!requestExtension) {
            return nxtBuilding();
          }
        }
        if (action === 'request' && requestType === 'update' && requestCategory === 'requestsList') {
          requestExtension = mixin.getLatestFacilityRequest(building.resource.extension, 'update', requestedUser);
          if (!requestExtension) {
            return nxtBuilding();
          }
        }
        const row = {};
        row.id = building.resource.id;
        row.name = building.resource.name;
        if (building.resource.alias) {
          row.alt_name = building.resource.alias;
        }
        let code;
        if (building.resource.identifier) {
          code = building.resource.identifier.find(
            identifier => identifier.system === 'https://digitalhealth.intrahealth.org/code',
          );
        }
        if (code) {
          row.code = code.value;
        }
        if (building.resource.type) {
          row.type = {};
          building.resource.type.forEach((type) => {
            const coding = type.coding.find(
              coding => coding.system === 'https://digitalhealth.intrahealth.org/locType',
            );
            if (coding) {
              row.type.code = coding.code;
              row.type.text = coding.display;
            }
          });
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
        if (action === 'request' && requestExtension) {
          const status = requestExtension.find(ext => ext.url === 'status');
          row.requestStatus = mixin.toTitleCaseSpace(status.valueString);
        }
        row.parent = {};
        async.series({
          getParent: (callback) => {
            if (building.resource.partOf) {
              row.parent.id = building.resource.partOf.reference.split('/').pop();
              row.parent.name = building.resource.partOf.display;
              mcsd.getLocationByID(database, row.parent.id, false, (parDt) => {
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
            if (
              building.resource.managingOrganization
              && building.resource.managingOrganization.reference
            ) {
              const orgId = building.resource.managingOrganization.reference.split('/').pop();
              mcsd.getOrganizationByID({
                id: orgId,
                database,
              }, (orgDt) => {
                if (orgDt.entry && orgDt.entry.length > 0) {
                  if (orgDt.entry[0].resource.type) {
                    orgDt.entry[0].resource.type.forEach((type) => {
                      const coding = type.coding.find(
                        coding => coding.system === 'https://digitalhealth.intrahealth.org/orgType',
                      );
                      if (coding) {
                        row.ownership.code = coding.code;
                        row.ownership.text = coding.display;
                      }
                    });
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
    return res.status(401).send();
  }
  mcsd.getCodeSystem({
    codeSystemURI,
  },
  (codeSystem) => {
    let codeSystemResource = [];
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
    includeBuilding,
  } = req.query;
  if (!sourceLimitOrgId) {
    sourceLimitOrgId = topOrgId;
  }
  if (includeBuilding && typeof includeBuilding === 'string') {
    includeBuilding = JSON.parse(includeBuilding);
  }
  winston.info('Fetching FR Locations');
  async.parallel({
    locationChildren(callback) {
      mcsd.getLocationChildren({
        parent: sourceLimitOrgId,
      },
      (mcsdData) => {
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
  },
  (error, response) => {
    winston.info('Creating FR Tree');
    mcsd.createTree(response.locationChildren, sourceLimitOrgId, includeBuilding, (tree) => {
      if (sourceLimitOrgId !== topOrgId && response.parentDetails.entry) {
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
