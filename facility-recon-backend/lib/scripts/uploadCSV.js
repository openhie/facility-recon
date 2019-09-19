require('../init');
const winston = require('winston');
const fs = require('fs');
const csv = require('fast-csv');
const async = require('async');
const path = require('path');
const uuid5 = require('uuid/v5');
const uuid4 = require('uuid/v4');
const mixin = require('../mixin')();
const mcsd = require('../mcsd')();
const config = require('../config');
const codesystem = require('../../terminologies/gofr-codesystem.json');

const mapping = {
  facility: 'facility',
  alt_name: 'alt_name',
  code: 'code',
  lat: 'latitude',
  long: 'longitude',
  type: 'facility_type',
  status: 'facility_status',
  ownership: 'facility_ownership',
  phone: 'phone',
  email: 'email',
  fax: 'fax',
  website: 'website',
  level1: 'level1',
  level2: 'level2',
  level3: 'level3',
  level4: null,
  level5: null,
  level6: null,
  level7: null,
};
if (!process.argv[2]) {
  winston.error('Please specify path to a CSV file');
  process.exit();
}
const csvFile = process.argv[2];

try {
  if (!fs.existsSync(csvFile)) {
    winston.error(`Cant find file ${csvFile}`);
    process.exit();
  }
} catch (err) {
  winston.error(err);
  process.exit();
}

const ext = path.extname(csvFile);
if (ext !== '.csv') {
  winston.error('File is not a CSV');
  process.exit();
}
mixin.validateCSV(csvFile, mapping, (valid, invalid) => {
  if (invalid.length > 0) {
    winston.error('Uploaded CSV is invalid, fix below comments');
    winston.error(JSON.stringify(invalid));
    process.exit();
  }
  csvTomCSD(csvFile, mapping, () => {

  });
});

function getTerminologyCodeFromName(name) {
  return codesystem.concept.find(concept => concept.display === name);
}

function buildJurisdiction(jurisdictions, bundle) {
  jurisdictions.forEach((jurisdiction) => {
    const resource = {};
    resource.resourceType = 'Location';
    resource.meta = {};
    resource.meta.profile = [];
    resource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_Location');
    resource.name = jurisdiction.name;
    resource.status = 'active';
    resource.mode = 'instance';
    resource.id = jurisdiction.uuid;
    resource.identifier = [];
    resource.identifier.push({
      system: 'https://digitalhealth.intrahealth.org/source1',
      value: jurisdiction.uuid,
    });
    if (jurisdiction.parentUUID) {
      resource.partOf = {
        display: jurisdiction.parent,
        reference: `Location/${jurisdiction.parentUUID}`,
      };
    }
    resource.physicalType = {
      coding: [{
        code: 'jdn',
        display: 'Jurisdiction',
        system: 'http://hl7.org/fhir/location-physical-type',
      }],
    };
    bundle.entry.push({
      resource,
      request: {
        method: 'PUT',
        url: `Location/${resource.id}`,
      },
    });
  });
}

function buildBuilding(building, bundle) {
  const resource = {};
  resource.resourceType = 'Location';
  resource.mode = 'instance';
  resource.meta = {};
  resource.meta.profile = [];
  resource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_Location');
  resource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_FacilityLocation');
  resource.name = building.name;
  if (building.alt_name) {
    resource.alias = [];
    resource.alias.push(building.alt_name);
  }
  resource.id = building.uuid;
  resource.identifier = [];
  resource.identifier.push({
    system: 'https://digitalhealth.intrahealth.org/code',
    value: building.id,
  });
  resource.partOf = {
    reference: `Location/${building.parentUUID}`,
  };
  resource.position = {
    longitude: building.long,
    latitude: building.lat,
  };

  resource.type = {};
  resource.type.coding = [];
  resource.type.coding.push({
    system: 'urn:ietf:rfc:3986',
    code: 'urn:ihe:iti:mcsd:2019:facility',
    display: 'Facility',
    userSelected: false,
  });
  if (building.type) {
    const typeConcept = getTerminologyCodeFromName(building.type);
    if (typeConcept) {
      resource.type.text = typeConcept.display;
      resource.type.coding.push({
        system: 'https://digitalhealth.intrahealth.org/locType',
        code: typeConcept.code,
        display: typeConcept.display,
      });
    }
  }
  if (building.status) {
    const statusConcept = getTerminologyCodeFromName(building.status);
    resource.status = statusConcept.code;
  } else {
    resource.status = 'active';
  }
  resource.telecom = [];
  if (building.phone) {
    resource.telecom.push({
      system: 'phone',
      value: building.phone,
    });
  }
  if (building.email) {
    resource.telecom.push({
      system: 'email',
      value: building.email,
    });
  }
  if (building.fax) {
    resource.telecom.push({
      system: 'fax',
      value: building.fax,
    });
  }
  if (building.website) {
    resource.telecom.push({
      system: 'website',
      value: building.website,
    });
  }
  if (building.description) {
    resource.description = building.description;
  }
  const orgUUID = uuid5(building.id, building.uuid);
  const organizationResource = {};
  organizationResource.id = orgUUID;
  organizationResource.resourceType = 'Organization';
  organizationResource.meta = {};
  organizationResource.meta.profile = [];
  organizationResource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_Organization');
  organizationResource.meta.profile.push('http://ihe.net/fhir/StructureDefinition/IHE_mCSD_FacilityOrganization');
  organizationResource.name = building.name;
  resource.managingOrganization = {
    reference: `Organization/${organizationResource.id}`,
  };
  if (building.ownership) {
    const ownershipConcept = getTerminologyCodeFromName(building.ownership);
    if (ownershipConcept) {
      organizationResource.type = {};
      organizationResource.type.text = ownershipConcept.display;
      organizationResource.type.coding = [];
      organizationResource.type.coding.push({
        system: 'https://digitalhealth.intrahealth.org/orgType',
        code: ownershipConcept.code,
        display: ownershipConcept.display,
      });
    }
  }
  resource.physicalType = {
    coding: [{
      code: 'bu',
      display: 'Building',
      system: 'http://hl7.org/fhir/location-physical-type',
    }],
  };
  bundle.entry.push({
    resource,
    request: {
      method: 'PUT',
      url: `Location/${resource.id}`,
    },
  });
  if (organizationResource) {
    bundle.entry.push({
      resource: organizationResource,
      request: {
        method: 'PUT',
        url: `Organization/${organizationResource.id}`,
      },
    });
  }
}

function csvTomCSD(filePath, headerMapping, callback) {
  const namespace = config.getConf('UUID:namespace');
  const levels = config.getConf('levels');
  const topOrgId = config.getConf('mCSD:fakeOrgId');
  const orgname = config.getConf('mCSD:fakeOrgName');
  const countryUUID = topOrgId;

  const promises = [];
  const processed = [];

  let recordCountBuilding = 0;
  let recordCountJurisdiction = 0;
  const defaultDBName = config.getConf('hapi:defaultDBName');
  const requestsDBName = config.getConf('hapi:requestsDBName');
  let saveBundleBuilding = {
    id: uuid4(),
    resourceType: 'Bundle',
    type: 'batch',
    entry: [],
  };
  let saveBundleJurisdiction = {
    id: uuid4(),
    resourceType: 'Bundle',
    type: 'batch',
    entry: [],
  };
  winston.info('Upload started ...');
  csv
    .fromPath(filePath, {
      headers: true,
    })
    .on('data', (data) => {
      const jurisdictions = [];
      if (data[headerMapping.facility] == '') {
        winston.error(`Skipped ${JSON.stringify(data)}`);
        return;
      }
      data[headerMapping.code] = data[headerMapping.code].replace(/\s/g, '-');
      levels.sort();
      levels.reverse();
      let facilityParent = null;
      let facilityParentUUID = null;
      async.eachSeries(levels, (level, nxtLevel) => {
        if (data[headerMapping[level]] != null
          && data[headerMapping[level]] != undefined
          && data[headerMapping[level]] != false
          && data[headerMapping[level]] != ''
        ) {
          let name = data[headerMapping[level]].replace(/ {1,}/g, ' ').trim();
          name = mixin.toTitleCaseSpace(name);
          const levelNumber = parseInt(level.replace('level', ''));
          let mergedParents = '';

          // merge parents of this location
          for (let k = levelNumber - 1; k >= 1; k--) {
            mergedParents += data[headerMapping[`level${k}`]];
          }
          if (levelNumber.toString().length < 2) {
            var namespaceMod = `${namespace}00${levelNumber}`;
          } else {
            var namespaceMod = `${namespace}0${levelNumber}`;
          }

          const UUID = uuid5(name + mergedParents, namespaceMod);
          const topLevels = [...new Array(levelNumber)].map(Function.call, Number);
          // removing zero as levels starts from 1
          topLevels.splice(0, 1);
          topLevels.reverse();
          let parentFound = false;
          let parentUUID = null;
          let parent = null;
          if (levelNumber == 1) {
            parent = orgname;
            parentUUID = countryUUID;
          }

          if (!facilityParent) {
            facilityParent = name;
            facilityParentUUID = UUID;
          }
          async.eachSeries(topLevels, (topLevel, nxtTopLevel) => {
            const topLevelName = `level${topLevel}`;
            if (data[headerMapping[topLevelName]] && parentFound == false) {
              let mergedGrandParents = '';
              for (let k = topLevel - 1; k >= 1; k--) {
                mergedGrandParents += data[headerMapping[`level${k}`]];
              }
              parent = data[headerMapping[topLevelName]].trim();
              if (topLevel.toString().length < 2) {
                var namespaceMod = `${namespace}00${topLevel}`;
              } else {
                var namespaceMod = `${namespace}0${topLevel}`;
              }
              parentUUID = uuid5(parent + mergedGrandParents, namespaceMod);
              parentFound = true;
            }
            nxtTopLevel();
          }, () => {
            if (!processed.includes(UUID)) {
              jurisdictions.push({
                name,
                parent,
                uuid: UUID,
                parentUUID,
              });
              processed.push(UUID);
            }
            nxtLevel();
          });
        } else {
          nxtLevel();
        }
      }, () => {
        if (!processed.includes(countryUUID)) {
          jurisdictions.push({
            name: orgname,
            parent: null,
            uuid: countryUUID,
            parentUUID: null,
          });
          processed.push(countryUUID);
        }
        recordCountBuilding += jurisdictions.length;
        buildJurisdiction(jurisdictions, saveBundleJurisdiction);
        let facilityName = data[headerMapping.facility].replace(/ {1,}/g, ' ').trim();
        facilityName = mixin.toTitleCaseSpace(facilityName);
        let altName = data[headerMapping.alt_name];
        if (altName) {
          altName = altName.replace(/ {1,}/g, ' ').trim();
          altName = mixin.toTitleCaseSpace(altName);
        }
        let type = data[headerMapping.type];
        if (type) {
          type = type.replace(/ {1,}/g, ' ').trim();
          type = mixin.toTitleCaseSpace(type);
        }
        let ownership = data[headerMapping.ownership];
        if (ownership) {
          ownership = ownership.replace(/ {1,}/g, ' ').trim();
          ownership = mixin.toTitleCaseSpace(ownership);
        }
        let status = data[headerMapping.status];
        if (status) {
          status = status.replace(/ {1,}/g, ' ').trim();
          status = mixin.toTitleCaseSpace(status);
        }
        let description = data[headerMapping.description];
        if (description) {
          description = description.replace(/ {1,}/g, ' ').trim();
          description = mixin.toTitleCaseSpace(description);
        }
        const UUID = uuid5(data[headerMapping.code], `${namespace}100`);
        if (!facilityParent || !facilityParentUUID) {
          facilityParent = orgname;
          facilityParentUUID = countryUUID;
        }
        const building = {
          uuid: UUID,
          id: data[headerMapping.code],
          name: facilityName,
          alt_name: altName,
          type,
          status,
          ownership,
          phone: data[headerMapping.phone],
          email: data[headerMapping.email],
          fax: data[headerMapping.fax],
          website: data[headerMapping.website],
          description,
          lat: data[headerMapping.lat],
          long: data[headerMapping.long],
          parent: facilityParent,
          parentUUID: facilityParentUUID,
        };
        recordCountBuilding += 1;
        buildBuilding(building, saveBundleBuilding);
        if (recordCountBuilding >= 250) {
          const tmpBundle = {
            ...saveBundleBuilding,
          };
          saveBundleBuilding = {
            id: uuid4(),
            resourceType: 'Bundle',
            type: 'batch',
            entry: [],
          };
          recordCountBuilding = 0;
          promises.push(new Promise((resolve, reject) => {
            mcsd.saveLocations(tmpBundle, defaultDBName, () => {
              resolve();
            });
          }));
        }
        if (recordCountJurisdiction >= 250) {
          const tmpBundle = {
            ...saveBundleJurisdiction,
          };
          saveBundleJurisdiction = {
            id: uuid4(),
            resourceType: 'Bundle',
            type: 'batch',
            entry: [],
          };
          recordCountJurisdiction = 0;
          promises.push(new Promise((resolve, reject) => {
            async.parallel([
              (callback) => {
                mcsd.saveLocations(tmpBundle, defaultDBName, () => callback(null, null));
              },
              (callback) => {
                mcsd.saveLocations(tmpBundle, requestsDBName, () => callback(null, null));
              },
            ], () => {
              resolve();
            });
          }));
        }
      });
    }).on('end', () => {
      async.parallel([
        (callback) => {
          mcsd.saveLocations(saveBundleBuilding, defaultDBName, () => callback(null, null));
        },
        (callback) => {
          async.parallel([
            (callback) => {
              mcsd.saveLocations(saveBundleJurisdiction, defaultDBName, () => callback(null, null));
            },
            (callback) => {
              mcsd.saveLocations(saveBundleJurisdiction, requestsDBName, () => callback(null, null));
            },
          ], () => {
            callback(null, null);
          });
        },
      ], () => {
        Promise.all(promises).then(() => {
          winston.info('Upload Done');
          process.exit();
        });
      });
    });
}
