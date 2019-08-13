/* eslint-disable consistent-return */
require('../init');
const winston = require('winston');
const express = require('express');
const formidable = require('formidable')
const async = require('async');
const router = express.Router();
const mcsd = require('../mcsd')();
const config = require('../config');

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
      mcsd.getLocationChildren('', sourceLimitOrgId, (mcsdData) => {
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