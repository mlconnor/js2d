const debugging = false
const log = (...args) => {
  if ( debugging ) {
    console.log.apply(console, args)
  }
}

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

  /**
   * splits are fragments of a column specifier 
   * that represent an iteratable object. columnSplits
   * are the list of splits contained in an array that
   * maps to columns. each split will typically have
   * a path in the last index that maps to a property
   * where the earlier array elements will map to iterables
   */
  var columnSplits = []
  /**
   * Loopers contains a discrete list of all of the iterable
   * splits. You may have 5 columns that all refer back to the
   * same array so we boil that down to a single set that all
   * columns would draw from.
   */
  var loopers = []

  for ( var i = 0; i < columns.length; i++ ) {
    //console.log(columns[i])
    var column = columns[i]
    var lastStarLocation = 0
    var splits = splitIterators(column)
    columnSplits.push(splits)

    var onlyIterables = splits.filter(split => split.length > 0 && isColumnDefIterable(split[split.length - 1]))
    //console.log("only stars", onlyStars)
    onlyIterables.forEach((iterableSplit, splitIndex) => {
      /* check to see if an existing looper matches */
      if ( splitIndex < loopers.length ) {
        // check to see if they match
        if ( ! arrayEquals(iterableSplit, loopers[splitIndex] )) {
          throw "loops don't match " + JSON.stringify(iterableSplit) + " != " + JSON.stringify(loopers[splitIndex])
        }
      } else {
        loopers.push(iterableSplit)
      }
    })
  }

  /**
   * For each looper, we need an actual iterable
   * object that allows us to go through the 
   * data so we create that here
   */
  var iterators = []
  //log("loopers", loopers)
  for ( var loopIndex = 0; loopIndex < loopers.length; loopIndex++ ) {
    var looper = loopers[loopIndex]
    var iterator = null
    var looperFilter = looper[looper.length - 1]
    //log("filter",looperFilter)
    var iterableFilter = buildFilter(looperFilter)

    /* is there a way to get rid of the simple iterator? */
    if ( loopIndex == 0 ) {
      iterator = {
        path: looper,
        iterator: simpleIterator(obj, looper, iterableFilter)
      }
    } else {
      iterator = {
        path: looper,
        iterator: nestedIterator(iterators[loopIndex - 1].iterator, looper, iterableFilter)
      }
    }
    iterators.push(iterator)
  }

  var deepestIterator = null;
  /* in case we dont have any iterators. this happens when someone just lists a bunch of properties off the root */
  if ( iterators.length == 0 ) {
    first = true
    deepestIterator = {
      path: [],
      iterator: {
        next() {
          var result = first ? { value: [null, obj], done: false} : { value: [null, undefined], done: true };
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

  /* we are going to iterate until we run out of stuff to iterate on */
  while (true) {
    var it = deepestIterator.iterator.next()
    if ( it.done ) break;

    var row = []
    for ( var columnIndex = 0; columnIndex < columns.length; columnIndex++ ) {
      var splits = columnSplits[columnIndex]
      var lastPath = splits[splits.length - 1]
      var baseObject = obj
      /* the splits represent all of the iterables that need to
         be processed before we can call the final getValue. the
         cool thing is that we only need the final iterable bc
         iterables are nested and will call the earlier iteraables
         as needed */
      if ( splits.length > 1 ) {
        //itObjectPath = splits[splits.length - 2].join(".")
        var itObjectSplits = splits[splits.length - 2]
        var it = iterators.find(it => arrayEquals(it.path, itObjectSplits))
        var baseObjectAndKey = it.iterator.current().value
        baseObject = baseObjectAndKey[1] // 0 - key, 1 - value

        if ( typeof baseObject == 'undefined' ) {
          var debugStr = "";
          iterators.forEach(i => {
            debugStr += JSON.stringify(i.it)
          })
          throw "unable to find base object in path " + itObjectSplits.join(".") + " for column " + columns[columnIndex] + " it=" + debugStr
        }
      }
      var colValue = getValue(lastPath, baseObject)
      /*log("col-" + columnIndex, columns[columnIndex],
                  "\n  path: '" + lastPath.join(".") + "'" +
                  "\n  iteratorPath: " + itObjectPath +
                  "\n  baseObject: " + JSON.stringify(baseObject).substring(0,800) +
                  "\n  value: " + colValue +
                  "\n")*/
      //log("pushing col " + columnIndex + " as val " + colValue)
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
function nestedIterator(parent, path, filter) {
  var myIterator = null
  var current = undefined
  var adjustedPath = path.slice(0,-1)

  const iterator = {
    next() {
      while (true) {
        /* don't have an iterator so try to get one from the parent */
        if ( myIterator == null ) {

          var itFromParent = parent.next();
          //log('no iterator found, pulling from parent', itFromParent, "with path", adjustedPath)
          if ( itFromParent.done ) {
            return {"value": undefined, done: true}
          }
          var myCollection = getValue(adjustedPath, itFromParent.value[1]) /* 0 - key, 1 - value */
          //log("parent value based on path", adjustedPath, myCollection)
          if ( typeof myCollection != 'undefined' ) {
            //log("filter here", path.slice(-1))
            myIterator = getIterator(myCollection, filter)
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

/**
 * This function will create a javascript
 * function that can be passed into a collection
 * filter
 */
const starFilter = ()=> { return true }

function buildFilter(definition) {
  log("building filter", definition)
  if ( definition == '*') {
    return starFilter
  }
  var match = definition.match(/\s*{\s*([^}]+)}\s*/)
  if ( ! match ) {
    throw "invalid filter '" + definition + "'"
  }
  var expression = match[1].trim()
  var finalExpression = "log('Type=' + val.Type); return " + expression
  //log('final_expression', finalExpression)
  var filter = new Function("val","key", finalExpression)
  return filter
}

function simpleIterator(obj, path, filter) {
  var value = getValue(path.slice(0,-1), obj)
  var iterator = getIterator(value, filter)
  var current = undefined

  const wrapper = {
    next() {
      //log(iterator)
      current = iterator.next()
      return current
    },
    current() {
      return current
    }
  }
  return wrapper
}

/**
 * tells us whether or not this
 * column is iterable. a column is iterable
 * if it is just a star or if it has a
 * filter using {}
 */
function isColumnDefIterable(def) {
  var normalized = def.trim()
  return normalized == '*' || (normalized.indexOf("{") == 0 && normalized.indexOf("}") == normalized.length - 1)
}

/**
 * Returns an appropriate iterator for a value
 * whether its an array or an object.
 * If you pass in {a:1,b:2} it would return an 
 * iterator with next() returning { value: [ 'a', 1 ], done: false }
 * where ["a","b"] would return an iterator that
 * produces value: [ 0, 'a' ], done: false }
 */
function getIterator(val, filter) {
  if ( val == null || typeof val == 'undefined' ) { throw "cant pass empty to getIterator" } 
  if ( Array.isArray(val) ) {
    //log("building array iterable")
    if ( filter ) {
      var result = val.filter(filter)
      return result.entries()
    } else {
      return val.entries()
    }
  } else {
    var objectEntries = Object.entries(val)
    if ( ! filter ) {
      return objectEntries.values()
    }
    var results = []
    objectEntries.filter(entry => {
      if ( filter(entry[1], entry[0]) ) {
        results.push(entry)
      }
    })
    return results.values()
  }
}

function getValue(pathEls, obj) {
  var current = obj
  //log('getVal', pathEls, obj)
  for ( var pathElIndex = 0; pathElIndex < pathEls.length; pathElIndex++ ) {
    var pathEl = pathEls[pathElIndex]
    var match = pathEl.match(/([^$\{]+)(?:{(.+)})?/)

    if ( ( ! match ) || ( ! match[0]) ) {
      log("warning: compilation issue for getValue(), columndef=" + pathEls[pathElIndex] + " from " + pathEls.join())
      return undefined
    }

    var pathEl = match[1]
    var indexBy = match[2]

    log("pathEl", pathEl, "indexBy", indexBy)
    //log("pathEl", pathEl, JSON.stringify(current).substring(0,100) + "isArray", Array.isArray(current))
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
          //log("assigning array", JSON.stringify(current).substring(0,100))
        }
      }
    } else if ( typeof current == 'undefined' ) {
      throw "path elemenent '" + pathEls.slice(0, pathElIndex) + "' was undefined"
    } else { /* obj */
      if ( pathEl in current ) {
        //current = current[pathEl]
        log("processing object")
        var val = current[pathEl]
        if ( indexBy ) {
          /* TOOD: check to see this is array */
          log("handling indexBy")
          var indexedObj = {}
          val.forEach(value => {
            var keyVal = value[indexBy]
            if ( keyVal ) {
              indexedObj[keyVal] = value
            }
          })
          log("indexeding complete", indexedObj)
          current = indexedObj
        } else {
          current = val
        }
        log("returning", current, "from path", pathEl)
        
      } else {
        //throw "couldn't find key in obj " + pathEl + " -> " + JSON.stringify(current).substring(0,200)
        return undefined
      }
    }
  }
  return current
}

/**
 * Takes a column definition
 * and breaks it into pieces that
 * end with star. So foo.*.bar.*.baz
 * would be ?
 */
function splitIterators(str) {
  var splits = str.split('.')
  var trailing = []
  var finalSplits = []
  //log("split str", splits)
  for ( var i = 0; i < splits.length; i++ ) {
    var split = splits[i].trim()
    if ( isColumnDefIterable(split) ) {
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
