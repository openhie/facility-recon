require('./init');
const winston = require('winston');
const nodemailer = require('nodemailer');
const Cryptr = require('cryptr');
const config = require('./config');
const mongo = require('./mongo')();

const cryptr = new Cryptr(config.getConf('auth:secret'));

module.exports = () => ({
  send(subject, text, to, callback) {
    mongo.getSMTP((err, smtp) => {
      if (err) {
        winston.error('An error occured while getting SMTP config');
        return;
      }
      if(!smtp) {
        winston.warn('No SMTP COnfiguration Found, Email notifications will not be sent')
        return callback()
      }
      if(!smtp.host || !smtp.username || !smtp.password) {
        winston.warn('Invalid SMTP, cant send notification emails')
        return callback()
      }
      const {
        host,
        port,
        secured,
        username,
        password,
      } = smtp;
      to = to.join(',');
      if(!to) {
        winston.warn('Missing email address of the recipient, cant send notification email')
        return callback();
      }
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: secured,
        auth: {
          user: username,
          pass: cryptr.decrypt(password),
        },
      });

      const mailOptions = {
        from: `"Facility Registry"<${username}>`,
        to,
        subject,
        text,
      };
      winston.info(`Sending email to ${to} with subject ${subject}`);
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          winston.error(error);
          return callback();
        }
        winston.info(JSON.stringify(info, 0, 2));
        return callback();
      });
    });
  },
});
