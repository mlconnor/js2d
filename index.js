/**
 * Takes a list of desired columns to extrat
 * from a complex object or array and returns
 * a two dimensional array (array of arrays)
 * 
 * @param {object,array,string} definition - The list of columns that you want in return. These can be an array of columns, an object with the values as definitions, or a string which will be split (using pipes |) into column definitions 
 * @param {object, array} obj - The complex object that you are trying to extract into a 2d array of arrays
 */
exports.make2d = function(definition, obj) {

  var columns = null
  if ( Array.isArray(definition) ) {
    columns = definition
  } else if ( isObject(definition) ) {
    columns = Object.values(definition)
  } else if ( typeof definition === 'string') {
    columns = definition.split('|').map(v => v.trim())
  } else {
    throw "expected first parameter to be column definition defined as array, object, or string"
  }

  var columnSplits = []
  var loopers = []

  for ( var i = 0; i < columns.length; i++ ) {
    //console.log(columns[i])
    var column = columns[i]
    var elements = column.split("(\*)")
    var lastStarLocation = 0
    var splits = splitStar(column)
    columnSplits.push(splits)
    //console.log("splits", column, splits)

    var onlyStars = splits.filter(split => split.length > 0 && split[split.length - 1] == '*' )
    //console.log("only stars", onlyStars)
    onlyStars.forEach((splitEndingWithStar, splitIndex) => {
      // check to see if an existing looper matches
      if ( splitIndex < loopers.length ) {
        // check to see if they match
        if ( ! arrayEquals(splitEndingWithStar, loopers[splitIndex] )) {
          throw "loops don't match " + JSON.stringify(splitEndingWithStar) + " != " + JSON.stringify(loopers[splitIndex])
        }
      } else {
        loopers.push(splitEndingWithStar)
      }
    })
  }

  var iterators = []

  for ( var loopIndex = 0; loopIndex < loopers.length; loopIndex++ ) {
    var looper = loopers[loopIndex]
    var iterator = null
    if ( loopIndex == 0 ) {
      iterator = {
        path: looper.join("."),
        iterator: simpleIterator(obj, looper)
      }
    } else {
      iterator = {
        path: looper.join("."),
        iterator: nestedIterator(iterators[loopIndex - 1].iterator, looper)
      }
    }
    iterators.push(iterator)
  }

  var deepestIterator = null;
  /* in case we dont have any iterators */
  if ( iterators.length == 0 ) {
    first = true
    deepestIterator = {
      path: [],
      iterator: {
        next() {
          var result = first ? { value: obj, done: false} : { value: undefined, done: true };
          first = false
          return result
        }
      }
    }
  } else {
    deepestIterator = iterators[iterators.length - 1]
  }
  /* every time we iterate, the parents are all in alignment. we need to get the parents state */
  var rows = [];

  while (true) {
    var it = deepestIterator.iterator.next()
    if ( it.done ) break;

    var row = []
    for ( var columnIndex = 0; columnIndex < columns.length; columnIndex++ ) {
      var splits = columnSplits[columnIndex]
      var lastPath = splits[splits.length - 1]
      var baseObject = obj
      var itObjectPath = null
      if ( splits.length > 1 ) {
        itObjectPath = splits[splits.length - 2].join(".")
        var it = iterators.find(it => it.path == itObjectPath)
        baseObject = it.iterator.current().value
        if ( typeof baseObject == 'undefined' ) {
          var debugStr = "";
          iterators.forEach(i => {
            debugStr += JSON.stringify(i.it)
          })
          throw "unable to find base object in path " + itObjectPath + " for column " + columns[columnIndex] + " it=" + debugStr
        }
      }
      var colValue = getValue(lastPath, baseObject)
      /*console.log("col-" + columnIndex, columns[columnIndex],
                  "\n  path: '" + lastPath.join(".") + "'" +
                  "\n  iteratorPath: " + itObjectPath +
                  "\n  baseObject: " + JSON.stringify(baseObject).substring(0,800) +
                  "\n  value: " + colValue +
                  "\n")*/
      //console.log("pushing col " + columnIndex + " as val " + colValue)
      row.push(colValue)
    }
    rows.push(row)
  }

  if ( Array.isArray(definition) || typeof definition === 'string' ) {
    return rows
  }
  var definitionKeys = Object.keys(definition)
  var rowObjects = []
  rows.forEach((row, rowIndex)=> {
    var objRow = {}
    definitionKeys.forEach((key, index) => {
      objRow[key] = row[index]
    })
    rowObjects.push(objRow)
  })
  return rowObjects
}


/**
 * parent: we can create values on the parent
 *         by looping through them. each of the 
 *         values will have an expression called 
 *         to get the deeper value
 * path:   the path to follow from the parent
 *         iterator
 */
function nestedIterator(parent, path) {
  var myIterator = null
  var current = undefined
  var adjustedPath = path.slice(0,-1)

  
  const iterator = {
    next() {
      while (true) {
        /* don't have an iterator so try to get one from the parent */
        if ( myIterator == null ) {

          var itFromParent = parent.next();
          //console.log('no iterator found, pulling from parent', itFromParent, "with path", adjustedPath)
          if ( itFromParent.done ) {
            return {"value": undefined, done: true}
          }
          var myCollection = getValue(adjustedPath, itFromParent.value)
          //console.log("parent value based on path", adjustedPath, myCollection)
          if ( typeof myCollection != 'undefined' ) {
            myIterator = getIterator(myCollection)
              //if ( ! myIterator ) { throw "this shouldnt happen" }
          } else {
            // maybe we'll have better luck on the next parent entry
            continue
          }
        } else {
          var itNext = myIterator.next()
          if ( itNext.done ) {
            myIterator = null
          } else {
            current = { value: itNext.value, done: false }
            return current
          }
        }
      }
    },
    current() {
      return current
    }
  }
  return iterator;
}


function simpleIterator(obj, path) {
  var value = getValue(path.slice(0,-1), obj)
  var iterator = getIterator(value)
  var current = undefined

  const wrapper = {
    next() {
      //console.log(iterator)
      current = iterator.next()
      return current
    },
    current() {
      return current
    }
  }
  return wrapper
}



function getIterator(val) {
  if ( val == null || typeof val == 'undefined' ) { throw "cant pass empty to getIterator" } 
  return Array.isArray(val) ? val.values() : Object.values(val).values()
}

function getValue(pathEls, obj) {
  var current = obj
  //console.log('getVal', pathEls, obj)
  for ( var pathElIndex = 0; pathElIndex < pathEls.length; pathElIndex++ ) {
    var pathEl = pathEls[pathElIndex]
    //console.log("pathEl", pathEl, JSON.stringify(current).substring(0,100) + "isArray", Array.isArray(current))
    if ( Array.isArray(current) ) {
      if ( current.length == 0 ) {
        return undefined
        //throw "unable to access array at index " + current
      } else {
        var index = parseInt(pathEl)
        if ( index >= current.length ) {
          return undefined
          //throw "index exceeded array bounds"
        } else {
          current = current[index]
          //console.log("assigning array", JSON.stringify(current).substring(0,100))
        }
      }
    } else if ( typeof current == 'undefined' ) {
      throw "path elemenent '" + pathEl + "' was undefined in " + obj
    } else { /* obj */
      if ( pathEl in current ) {
        current = current[pathEl]
        //console.log("returning", current, "from path", pathEl)
      } else {
        //throw "couldn't find key in obj " + pathEl + " -> " + JSON.stringify(current).substring(0,200)
        return undefined
      }
    }
  }
  return current
}

function splitStar(str) {
  var splits = str.split(/\./)
  var trailing = []
  var finalSplits = []
  //console.log("split str", splits)
  for ( var i = 0; i < splits.length; i++ ) {
    if ( splits[i] == '*' ) {
      trailing.push(splits[i])
      finalSplits.push(trailing)
      trailing = []
    } else {
      trailing.push(splits[i])
    }
  }
  if ( trailing.length > 0 ) {
    finalSplits.push(trailing)
  }
  return finalSplits
}

function arrayEquals(a, b) {
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

function isObject(a) {
  return (!!a) && (a.constructor === Object)
}
