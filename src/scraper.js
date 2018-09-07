require("dotenv").config()

const utils = require("./utils")

/**
  Calls all the scraping functions in the proper sequence and returns the data as an array

  @param {object} data - the entire dom as a JSON hierarchy
  @return {array} - the all the sections as an array
*/
function scrapeEverything(data) {
  // set our working data to the body tag, found in the dom
  const dataSet = getBody(getHTML(data.dom))

  return [
    scrapeGlossary(dataSet),
    ...scrapeSections(dataSet)
  ]
}

/**
  Gets the HTML element as a JSON object heirarchy

  @param {object} dom - the entire HTML document as a JSON object hierarchy
  @return {object} - the HTML element in the provided JSON dom hierarchy
*/
function getHTML(dom) {
  // check if dom empty
  if(dom.length === 0) throw "dom is empty"

  // loop through dom to find the html tag
  return dom.find((element, index) => {
    if(
      element.type === "tag"
      && element.name === "html"
    ) {
      console.log(`Found HTML tag at dom index ${index}`)
      // found the correct element
      return true
    } else {
      // failed to find HTML tag
      throw "Failed to find HTML tag"
    }
  })

}

/**
  Gets the body element as a JSON object heirarchy

  @param {object} html - the HTML element as a JSON object hierarchy
  @return {object} - the body element in the provided JSON dom hierarchy
*/
function getBody(html) {
  // throw if children empty
  if(html.children.length === 0) throw "html has 0 children"

  // loop through children to find the body tag
  return html.children.find((element, index) => {
    if(
      element.type === "tag"
      && element.name === "body"
    ) {
      console.log(`Found body tag at html children index ${index}`)
      // foudn the correct element
      return true
    } else {
      // failed to find body tag
      throw "Failed to find body tag"
    }
  })
}

/**
  Scrapes for the glossary element(s) and returns them

  @param {object} data - the JSON hierarchy
  @return {array} the glossary section(s)
*/
function scrapeGlossary(data) {
  let glossary = data.children[4]
  return htmlListToJson(glossary, "glossary")
}

/**
  Finds and gets the table sections as an array

  @param {object} data - the JSON hierarchy
  @return {array} the table sections as an array
*/
function scrapeSections(data) {
  console.log("Scraping sections...")

  let sections = []

  data.children.forEach((element, index) => {
    if(element.attribs && element.attribs.id) { // check if we have an id (we're dealing with a table's header)
      const child = data.children[index+1] // set child as next element
      if(
        child.type === "tag" // child is a tag
        && child.name === "table" // child is a table
      ) {
        sections.push(htmlTableToJson(child, element.attribs.id)) // scrape child and add to sections
      }
    }
  })

  if(sections.length < 1) throw "Less than 1 section scraped"

  return sections
}

/**
  Gets the glossary list at the top of the page

  @param {object} list - the JSON dom hierarchy of the list
  @param {string} listName - the name of the list ('glossary')
  @return {object} the glossary object
*/
function htmlListToJson(list, listName) {
  if(list.name != "ul") {
    return console.log("Error reading list to convert")
  }
  if(!listName) {
    return console.log("Error - no filename to scrape to")
  }

  let data = { glossaryList: [] }

  list.children.forEach((child) => {
    data.glossaryList.push({
      type: child.raw,
      href: child.children[0].attribs.href,
      text: child.children[0].children[0].data
    })
  })

  return {
    name: listName,
    data: data
  }
}

/**
  Turns an HTML table(from dom hierarchy) into a properly structured(useful) JSON object

  @param {object} table - the table JSON dom hierarchy
  @param tableName - the name to give the table
  @return {object} the table's object
*/
function htmlTableToJson(table, tableName) {
  if(table.name != "table") {
    return console.log("Error reading table to convert")
  }
  if(!tableName) {
    return console.log("Error - no filename to scrape to")
  }

  let data = { sections: [] }

  let title = true


  let currentSection, currentSubSection, currentSubSubSection
  table.children.forEach((row, index) => {
    if(row.children[0].attribs) {
      if(row.children[0].attribs.class === "blank-row") {
        title = true
        return
      }
    }
    if(row.children[0].name === "th") {
      // title(section) or subtitle(subsection) (1 column)
      if(title) {
        if(row.children.length === 1) {
          //new section
          data.sections.push({
            section: row.children[0].children[0].data,
            subSections: []
          })
        } else if(row.children.length === 2) {
           //new section with secondary title
          data.sections.push({
            section: row.children[0].children[0].data,
            secondaryTitle: row.children[1].children[0].data,
            subSections: []
          })
        }

        // set current section to last in list
        currentSection = data.sections[data.sections.length-1]
        currentSubSection = null
        title = false
      } else {
        if(row.children[0].name === "th") {
          //new subsection
          currentSection.subSections.push({
            subSection: row.children[0].children[0].data,
            items: []
          })
        } else {
          //new subsection without title
          currentSection.subSections.push({
            items: []
          })
        }

        // set current subsection to last in list
        currentSubSection = currentSection.subSections[currentSection.subSections.length-1]
      }
    } else {
      // item (2 columns)
      // [0] is name
      // [1] is drop rate

      // checks if this is a subsection style table
      if(currentSubSection) {
        // subsection

        // check for blank cell (bounties)
        if(row.children[0].children) {
          // check if the item has 2 or 3 columns
          if(row.children.length === 2) {
            currentSubSection.items.push({
              name: row.children[0].children[0].data,
              droprate: row.children[1].children[0].data
            })
            currentSubSection = currentSection.subSections[currentSection.subSections.length-1]
          } else if(row.children.length === 3) {
            currentSubSection.items.push({
              name: row.children[0].children[0].data,
              itemchance: row.children[1].children[0].data,
              droprate: row.children[2].children[0].data
            })
          } else {
            console.error("Irregular number of columns in item")
          }
        } else {
          // bounties (blank first cell)

          // if current subSection doesn't have a subSubSection, make one
          if(!currentSubSection.subSubSections) {
            currentSubSection.subSubSections = []
            currentSubSubSection = null
          }

          if(row.children.length === 2) {
            // title
            currentSubSection.subSubSections.push({
              subSubSection: row.children[1].children[0].data,
              items: []
            })
            currentSubSubSection = currentSubSection.subSubSections[currentSubSection.subSubSections.length - 1]
          } else if(row.children.length === 3) {
            // item
            currentSubSubSection.items.push({
              name: row.children[1].children[0].data,
              droprate: row.children[2].children[0].data
            })
          } else {
            console.error("Bounty column error")
          }
        }
      } else {
        // section

        // if there is no items array, creates items array in topmost section and removes the subsection element
        if(!currentSection.items) {
          currentSection.items = []
          delete currentSection.subSections
        }


        // check if the item has 2 or 3 columns
        if(row.children.length === 2) {
          currentSection.items.push({
            name: row.children[0].children[0].data,
            droprate: row.children[1].children[0].data
          })
        } else
        if(row.children.length === 3) {
          if(row.children[0].children === undefined || row.children[0].children[0] === "") {
            currentSection.items.push({
              name: row.children[1].children[0].data,
              droprate: row.children[2].children[0].data,
            })
          } else {
            currentSection.items.push({
              name: row.children[0].children[0].data,
              itemchance: row.children[1].children[0].data,
              droprate: row.children[2].children[0].data
            })
          }
        } else {
          console.error("Irregular number of columns in item")
        }
      }
    }
  })

  return {
    name: tableName,
    data: data
  }
}

exports.scrapeEverything = scrapeEverything
exports.scrapeGlossary = scrapeGlossary
