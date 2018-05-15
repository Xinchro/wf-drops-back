const fs = require("fs")
const utils = require("./utils")
const templateURI = "./src/templates/base.html"
const liTemplateURI = "./src/templates/li.html"

function generateHTML() {
  return new Promise((res, rej) => {
    // generate the JSON listing HTML file
    getTemplate(templateURI)
    .then((response) => {
      res(fillTemplate(response))
    }, rej)
  })
}

function getFileNames() {
  // get the file names in directory
  return new Promise((resolve, reject)=> {
    fs.readdir(process.env.DATA_FOLDER, function(err, items) {
      if(err) {
        console.error("Failed to list JSON directory")
        reject("Failed to list JSON directory")
      }

      resolve(items)
    })
  })
}

function getTemplate(uri) {
  // get an html template
  return new Promise((resolve, reject) => {
    fs.readFile(uri, function (err, template) {
      if(err) {
        console.error("Failed to read template")
        reject("Failed to read template")
      }

      resolve(template.toString())
    })
  })
}

function fillTemplate(template) {
  // get the file names of all generated files
  return getFileNames()
  .then((list) => {
    // fill template variables
    return new Promise((resolve, reject) => {
      try {
        getTemplate(liTemplateURI, globalReject)
        .then((liTemplate) => {
          // replace all the template variables
          let rendered = template
          .replace('#list#', () => {
            let li = ""

            // loop through filename list
            list.map((name) => {
              switch(name.toLowerCase().replace(".json", "")) {
                // names to ignore
                case (name.match(/\.html/) || {}).input:
                case "glossary":
                case "stored-data":
                  break
                default:
                  // add to rendered list
                  li += liTemplate
                  .replace(/#url#/g,`https://data.warframedrops.info/${name}`)
                  .replace(/#name#/g,`${name.replace(".json", "")}`)
              }
            })

            return li
          })
          .replace('#lastgen#', getCurrentDate())

          return rendered
        }, globalReject).then((rendered) => resolve(rendered))
      } catch(err) {
        console.error(err)
        reject("Failed to fill template")
      }
    })
  })
}

function getCurrentDate() {
  let localDate = new Date()

  // current time in UTC, returned as ISO
  let date = new Date(Date.UTC(
    localDate.getUTCFullYear(),//year
    localDate.getUTCMonth(),//month
    localDate.getUTCDate(),//day
    localDate.getUTCHours(),//hour
    localDate.getUTCMinutes(),//minute
    localDate.getUTCSeconds(),//second
    localDate.getUTCMilliseconds()//millisecond
  )).toISOString()

  return date
}

function saveHTML(html) {
  // export generated HTML file
  return new Promise((res, rej) => {
    utils.saveFileSync(`${process.env.DATA_FOLDER}`, "index.html", html, false)
    .then(() => {
      console.log("JSON listing generated and saved!")
      res({
        path: process.env.DATA_FOLDER,
        filename: "index.html",
        data: html,
        message: "JSON listing generated and saved!"
      })
    }, rej)
  })
}

function globalReject(message) {
  console.error(message)
}

exports.generateHTML = generateHTML
exports.saveHTML = saveHTML
