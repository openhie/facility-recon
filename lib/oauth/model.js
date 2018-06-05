'use strict'

const config = require('../config')
const crypto = require('crypto')
const mongoose = require('mongoose')
const Schema = mongoose.Schema


//DB connection
var user = config.getConf('mongodb:user')
var password = config.getConf('mongodb:password')
var host = config.getConf('mongodb:host')
var port = config.getConf('mongodb:port')
var database = config.getConf('mongodb:database')
var url = `mongodb://${user}:${password}@${host}:${port}/${database}`
mongoose.connect(url)


/**
 * Schema definitions.
 */

mongoose.model('OAuthTokens', new Schema({
  accessToken: { type: String },
  accessTokenExpiresOn: { type: Date },
  client : { type: Object },  // `client` and `user` are required in multiple places, for example `getAccessToken()`
  clientId: { type: String },
  refreshToken: { type: String },
  refreshTokenExpiresOn: { type: Date },
  user : { type: Object },
  userId: { type: String },
}))

mongoose.model('OAuthClients', new Schema({
  clientId: { type: String },
  clientSecret: { type: String },
  redirectUris: { type: Array }
}))

mongoose.model('OAuthUsers', new Schema({
  email: { type: String, default: '' },
  orgunit: {type: String},
  firstname: { type: String },
  lastname: { type: String },
  password: { type: String },
  username: { type: String }
}))

const OAuthTokensModel = mongoose.model('OAuthTokens')
const OAuthClientsModel = mongoose.model('OAuthClients')
const OAuthUsersModel = mongoose.model('OAuthUsers')


module.exports = function(){
  return {
    /**
     * Get access token.
     */
    getAccessToken: function(bearerToken,callback) {
      OAuthTokensModel.findOne({ accessToken: bearerToken },(err,data)=>{
        if(data !== null){
          var token = {
            user:{ 'id':data._id },
            expires:data.accessTokenExpiresOn
          }
        }
        else {
          var user = null
        }
        return callback(false,token)
      })
    },

    /**
     * Get client.
     */

    getClient: function(clientId, clientSecret, callback) {
      const client = {
        clientId,
        clientSecret,
        grants: null,
        redirectUris: null
      }

      callback(false, client)
    },

    grantTypeAllowed: function(clientID, grantType, callback) {
      callback(false, true);
    },

    /**
     * Get refresh token.
     */

    getRefreshToken: function(refreshToken) {
      return OAuthTokensModel.findOne({ refreshToken: refreshToken }).lean()
    },

    /**
     * Get user.
     */

    getUser: function(username, password, callback) {
      var passwordhashed = crypto.createHmac('sha256', password).update('GOFR').digest('hex')
      OAuthUsersModel.findOne({ username: username,password:passwordhashed},(err,data)=>{
        if(data !== null){
          var user = { 'id':data._id }
        }
        else {
          var user = null
        }
        return callback(false,user)
      })
    },

    /**
     * Save token.
     */

    saveAccessToken: function(accessToken, clientID, expires, user, callback){
      var token = new OAuthTokensModel({
        accessToken: accessToken,
        accessTokenExpiresOn: expires,
        clientId: clientID,
        user : user
      })
      
      token.save(function(err,data){
        callback(err)
      })

    },

    saveUsers: function(firstname, lastname, username, password, email, orgunit, callback) {
      if(password == undefined 
        || password == null 
        || password == '' 
        || username == undefined 
        || username == null
        || username == ''
        ) {
        return callback("username and password must be defined")
      }

      this.getUser(username,password,(err,user)=>{
        if(user != null)
          return callback("User with username " + username + " Exists")

        var passwordhashed = crypto.createHmac('sha256', password).update('GOFR').digest('hex')
        var user = new OAuthUsersModel({
          firstname: firstname,
          lastname: lastname,
          username : username,
          password: passwordhashed,
          orgunit: orgunit,
          email: email
        })
        user.save((err)=>{
          callback(err)
        })
      })
    }
  }
}