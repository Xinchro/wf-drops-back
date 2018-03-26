require("dotenv").config()

const fs = require("fs")
const util = require("util")
const utils = require("./utils")
const fetch = require("node-fetch")
const request = require("request")
const htmlparser = require("htmlparser")

function getWarframeHTML(url) {
  console.log("Getting data...")
  return fetchHTML(url)
}

function fetchHTML(url) {
  return fetch(url)
  .then(function(res) {
    return res.text()
  }).then(function(body) {
    return body
  })
}

function htmlToJson(body) {
  console.log("Converting HTML to JSON...")

  let rawHtml = body

  let handler = new htmlparser.DefaultHandler(function (error, dom) {
    if(error) {
      console.log("Error while parsing html", error)
    } else {
      return dom
    }
  })

  let parser = new htmlparser.Parser(handler)
  parser.parseComplete(rawHtml)

  return new Promise((resolve, reject) => {
    resolve(handler)
  })
}

function saveToJson(json) {
  console.log("Stringifying and saving JSON...")
  
  let obj = json
  
  utils.saveFileSync(`${process.env.DATA_FOLDER}`, "stored-data.json", obj, true)
}

function fetchData() {
  return getWarframeHTML(process.env.DATA_URL)
  .then(htmlToJson)
  .then(saveToJson)
}

exports.fetchData = fetchData
