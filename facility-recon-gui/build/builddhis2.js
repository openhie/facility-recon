const fs = require("fs-extra")
var zipper = require("zip-local")
const ora = require('ora')
const chalk = require('chalk')
const source = __dirname + "/../../facility-recon-backend/gui"
const target = __dirname + "/../../dhis2App"

const spinner = ora('building dhis2 App...')
spinner.start()
fs.remove(target + '/static', (err) => {
  fs.copy(source, target, (err) => {
    if(err) {
      console.error(err)
      console.log(chalk.red(err + '\n'))
      process.exit(1)
      spinner.stop()
    } else {
      console.log(chalk.cyan('  Done copying built files into dhis2 App folder.\n'))
      spinner.stop()
      spinner.start()
      console.log(chalk.yellow('  Zipping a dhis2 App.\n'))
      fs.remove(target + '/GOFR.zip', (err) => {
        zipper.zip(target + "/", (error, zipped) => {
          if(!error) {
            zipped.compress()
            zipped.save(target + "/GOFR.zip", (err) => {
              if(!err) {
                console.log(chalk.cyan('  dhis2 App zipped successfully !\n'))
              }
              spinner.stop()
            })
          } else {
            spinner.stop()
          }
        });
      })
    }
  })
})
