require("dotenv").config()

const fs = require("fs")
const AWS = require("aws-sdk")
const path = require('path')

AWS.config.loadFromPath("./config.json")

function saveFile(path, fileName, data, stringify) {
  return new Promise((resolve, reject) => {
    if(stringify) data = JSON.stringify(data, null, 2)
    fs.writeFile(`${path}/${fileName}`, data, function(err) {
      if(err) {
        console.error(`Failed to save ${fileName}!`, err)
        reject(err)
      }
      console.log(`File ${fileName} was saved successfully!`)
      resolve({
        path: path,
        filename: fileName,
        message: `File ${fileName} was saved successfully!`
      })
    })
  })
}

function saveFileSync(path, fileName, data, stringify) {
  return new Promise((res, rej) => {
    try {
      if(stringify) data = JSON.stringify(data, null, 2)
      fs.writeFileSync(`${path}/${fileName}`, data)
      console.log(`File ${fileName} was saved successfully!`)
      res()
    } catch(e) {
      console.error("Failed to save file", fileName, e)
      rej()
    }
  })
}

function uploadToAWS(fileName, contentType) {
  return new Promise((res, rej) => {
    if(process.env.NODE_ENV === "prod") {
      console.log(`Uploading ${fileName} to AWS`)

      s3 = new AWS.S3({apiVersion: '2006-03-01'})

      let uploadParams = {
        Bucket: "wf-drops-data.xinchronize.com",
        Key: '',
        Body: '',
        ContentType: contentType
      }
      let file = `${fileName}`

      let fileStream = fs.createReadStream(file)

      fileStream.on('error', function(err) {
        console.log('File error', err)
      })

      uploadParams.Body = fileStream
      uploadParams.Key = path.basename(file)

      s3.upload(uploadParams, function (err, data) {
        if (err) {
          console.log("Error uploading", err)
          rej({
            filename: fileName,
            message: `${fileName} failed to uploaded!`
          })
        } if (data) {
          res({
            filename: fileName,
            message: `${fileName} uploaded!`
          })
          console.log("Upload success", data.Location)
        }
      })
    } else {
      console.log(`Fake uploading ${fileName} to AWS`)

      res({
        filename: fileName,
        message: "yes, your file uploaded just fine"
      })
    }

  })
}

function saveArray(array) {
  return new Promise((res, rej) => {
    let promises = []

    for(element of array) {
      promises.push(saveFile(`${process.env.DATA_FOLDER}`, `${element.name}.json`, element.data, true))
    }

    return Promise.all(promises)
      .then(res)
      .catch((err) => {
        console.error(`Error saving array of files - ${err}`)
        throw `Error saving array of files - ${err}`
      })
  })
}

function uploadArray(array) {
  return new Promise((res, rej) => {
    let promises = []

    for(element of array) {
      promises.push(uploadToAWS(`${element.path}/${element.filename}`, "application/json"))
    }

    return Promise.all(promises)
      .then(res)
      .catch((err) => {
        console.error(`Error uploading array of files - ${err}`)
        throw `Error uploading array of files - ${err}`
      })
  })
}

exports.saveFile = saveFile
exports.saveFileSync = saveFileSync
exports.uploadToAWS = uploadToAWS
exports.saveArray = saveArray
exports.uploadArray = uploadArray
