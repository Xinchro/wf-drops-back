require("dotenv").config()

const rimraf = require("rimraf")
const fs = require('fs')
const fetcher = require("./src/fetcher.js")
const scraper = require("./src/scraper.js")
const { generateHTML, saveHTML } = require("./src/generateHTML.js")
const { dropGlossaryEndpoint, makeIndexEndpoint, saveArray, uploadArray, uploadToAWS } = require("./src/utils.js")

function scrape() {
  return new Promise((resolve, reject) => {
    let data = require(`${process.env.DATA_FOLDER}/stored-data.json`)
    resolve(scraper.scrapeEverything(data))
  })
}

function clearData() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(process.env.DATA_FOLDER)){
      rimraf(`${process.env.DATA_FOLDER}/*`, () => {
        console.log("Data folder cleared")
        resolve()
      })
    } else {
      try {
        fs.mkdirSync(process.env.DATA_FOLDER)
        console.log("Data folder created")
      } catch(e) {
        console.error(`Failed to make ${process.env.DATA_FOLDER} folder`)
      }
      resolve()
    }
  })

}

exports.awsHandler = function() {
  clearData()
    .then(fetcher.fetchData) // fetch html and turn the raw dom into json
    .then(scrape) // scrape the dom to extract the data
    .then(saveArray) // save all the data into json files
    .then(dropGlossaryEndpoint)
    .then((files) => {
      files.splice(0, 0, makeIndexEndpoint(files)) // create index files and add it to array
      return files
    }) // create index
    .then((files) => {
      return saveArray([files[0]]).then((response) => {
        files.splice(0, 1, response[0]) // replace malformed index entry with well-formed version
        return files
      })
    }) // save the index
    .then(uploadArray) // upload the json files
    .then(generateHTML) // generate data landing page
    .then(saveHTML) // save the landing page
    .then((response) => {
      return uploadToAWS(`${response.path}/${response.filename}`, "text/html")
    }) // upload landing page
    .catch((err) => {
      console.error("Error in handler -", err)
      throw err
    }) // general catch
}

exports.doScrape = function() {
  scrape()
}

exports.doGenerateHTML = function() {
  generateHTML()
}
