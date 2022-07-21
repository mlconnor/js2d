# js2d

js2d is a small JavaScript library that gives you the ability to easily take a complex object and turn it into a 2D array, a row of rows. Most humans find it easy to work with data that looks like a spreadsheet and think it's a pain to deal with highly structured complex objects. This library makes it easy to create a spreadsheet like view of complex data.

## Background
With the rise of REST APIs, developers spend a lot of time wrangling complex objects returned as JSON. These objects are often very complex and contain 10 different dimensions. To get the data you need for a specific use case, you'll often spend hours writing code to parse through the object, looping over various parts, checking for nulls or undefined variables, etc. This practice is laborious and error prone and introduces failures into systems globally. j2sd offers a simplified approach to working with such complex objects.


## Install

````
npm install j2sd
````
## Use
The following is a real world example of a JSON response from AWS Rekognition GetLabelDetection. 
````
var js2d = require('js2d')
var columns = [
  "VideoMetadata.Codec",
  "VideoMetadata.FrameHeight",
  "VideoMetadata.FrameWidth",
  "Labels/*/Timestamp",
  "Labels/*/Label/Name",
  "Labels/*/Label/Confidence",
  "Labels/*/Label/Instances/*/BoundingBox/Width",
  "Labels/*/Label/Instances/*/BoundingBox/Height",
  "Labels/*/Label/Instances/*/BoundingBox/Top",
  "Labels/*/Label/Instances/*/BoundingBox/Left",
]
var complexObject = {
    "JobStatus": "SUCCEEDED",
    "VideoMetadata": {
        "Codec": "h264",
        "DurationMillis": 84600,
        "Format": "QuickTime / MOV",
        "FrameRate": 25.0,
        "FrameHeight": 360,
        "FrameWidth": 640,
        "ColorRange": "LIMITED"
    },
    "NextToken": "YFnyi6W34f8rDa93UGe268JW/tMAbZQIRC4k4tpceFFp+2MObIVEtkhD",
    "Labels": [
        {
            "Timestamp": 0,
            "Label": {
                "Name": "Automobile",
                "Confidence": 95.27998352050781,
                "Instances": [],
                "Parents": [
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ]
            }
        },
        {
            "Timestamp": 0,
            "Label": {
                "Name": "Boat",
                "Confidence": 59.81174087524414,
                "Instances": [
                    {
                        "BoundingBox": {
                            "Width": 0.16477584838867188,
                            "Height": 0.18891093134880066,
                            "Left": 0.3536725640296936,
                            "Top": 0.807238757610321
                        },
                        "Confidence": 68.20136260986328
                    }
                ],
                "Parents": [
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ]
            }
        },
        {
            "Timestamp": 0,
            "Label": {
                "Name": "Building",
                "Confidence": 61.4069709777832,
                "Instances": [],
                "Parents": []
            }
        },
        {
            "Timestamp": 0,
            "Label": {
                "Name": "Bus",
                "Confidence": 93.9477767944336,
                "Instances": [
                    {
                        "BoundingBox": {
                            "Width": 0.19102247059345245,
                            "Height": 0.1379556506872177,
                            "Left": 0.010075467638671398,
                            "Top": 0.4492671489715576
                        },
                        "Confidence": 97.82894897460938
                    },
                    {
                        "BoundingBox": {
                            "Width": 0.12909945845603943,
                            "Height": 0.21337026357650757,
                            "Left": 0.7728689312934875,
                            "Top": 0.515156626701355
                        },
                        "Confidence": 77.08226013183594
                    }
                ],
                "Parents": [
                    {
                        "Name": "Vehicle"
                    },
                    {
                        "Name": "Transportation"
                    }
                ]
            }
        }
      ]
    }
var results = js2d.make2d(columns, complexObj)
console.log(results)
````
the results returned are...

````
[
  ["h264",360,640,0,"Boat",59.81174087524414,0.16477584838867188,0.18891093134880066,0.807238757610321,0.3536725640296936],
  ["h264",360,640,0,"Bus",93.9477767944336,0.19102247059345245,0.1379556506872177,0.4492671489715576,0.010075467638671398],
  ["h264",360,640,0,"Bus",93.9477767944336,0.12909945845603943,0.21337026357650757,0.515156626701355,0.7728689312934875]
]
````

The previous example gives you back a 2d array. In the event that you need named columns, pass an object instead of an array of columns, and use the key to indicate the property names.

````
var columns = {
  Codec: 'VideoMetadata/Codec',
  FrameHeight: 'VideoMetadata/FrameHeight',
  FrameWidth: 'VideoMetadata/FrameWidth',
  Timestamp: 'Labels/*/Timestamp',
  Name: 'Labels/*/Label/Name',
  Confidence: 'Labels/*/Label/Confidence',
  Width: 'Labels/*/Label/Instances/*/BoundingBox/Width',
  Height: 'Labels/*/Label/Instances/*/BoundingBox/Height',
  Top: 'Labels/*/Label/Instances/*/BoundingBox/Top',
  Left: 'Labels/*/Label/Instances/*/BoundingBox/Left'
}

var results = js2d.make2d(columns, complexObj)
console.log(results)
````
and the result would be...
````
[
    {"Codec":"h264","FrameHeight":360,"FrameWidth":640,"Timestamp":0,"Name":"Boat","Confidence":59.81174087524414,"Width":0.16477584838867188,"Height":0.18891093134880066,"Top":0.807238757610321,"Left":0.3536725640296936},
    {"Codec":"h264","FrameHeight":360,"FrameWidth":640,"Timestamp":0,"Name":"Bus","Confidence":93.9477767944336,"Width":0.19102247059345245,"Height":0.1379556506872177,"Top":0.4492671489715576,"Left":0.010075467638671398},
    {"Codec":"h264","FrameHeight":360,"FrameWidth":640,"Timestamp":0,"Name":"Bus","Confidence":93.9477767944336,"Width":0.12909945845603943,"Height":0.21337026357650757,"Top":0.515156626701355,"Left":0.7728689312934875}
]
````
## Alernatives
There are a few alternatives that I've tried. jq and jmespath and I have some thoughts on each. The fundamental different between js2d and jq or jmespath is that js2d is trying to make it simplier for you to loop through and process a documnt, whereas jq and jmespath are actually trying to give you the ability to transform the document into an entirely different document that better suits your needs. My take is that 95% of the time we spend processing through JSON documents is just an attempt to pull out key fields to cram them into a table, or visualize them in a certain way... we aren't trying to necessarily transform anything. Jq and jmespath also give you the ability to do sorting, filtering etc. Developers are really good at that and it's pretty easy to do if you have the data in a simple format. My assumption is that once you get the data into a spreadsheet like format, you can rock-and-roll and do your thing around sorting and filtering without the help of a complex library.

### jq
[Jq](https://stedolan.github.io/jq/) is a complex object transformation tool that is quite useful. The downside is that it is so powerful that it has a steep learning curve and it take a while to figure it all out. You can find thousands of Stackoverflow threads ([5704 at the time of this writing](https://stackoverflow.com/questions/tagged/jq)) for people asking how to use this tool. The goal of js2d is to make life simpler, not add another complex tool for you and your dev team to figure out. Another issue with jq is that it doesn't have good support in the browser. Pure Javascript implements like [jqjs](https://github.com/mwh/jqjs) are not feature complete and the projects are no longer maintained.

### jmespath
When I first found jmespath I got really excited. It's much simpler that jq but it also has one serious shortcoming that I couldn't get past. When you query multiple levels into the document, [you can't access the parent](https://github.com/jmespath/jmespath.js/issues/22). There is a [fork of jmespath for JavaScript](https://github.com/daz-is/jmespath.js) that allows you to access the parent node but that doesn't give you the ability to dive deeper into the document as far as I can tell.

## The Column Specification

The philosophy behind js2d is that instead of you trying to figure out how to process a complex document, you should just tell the library what you want and let it figure out how to deliver it to you. So with that in mind, you pass in an array of columns that you want in the results and the library figures out how to deliver that to you. Let's take another look at the example we used above and how we defined the columns.
````
var columns = [
  "VideoMetadata/Codec",
  "VideoMetadata/FrameHeight",
  "VideoMetadata/FrameWidth",
  "Labels/*/Timestamp",
  "Labels/*/Label/Name",
  "Labels/*/Label/Confidence",
  "Labels/*/Label/Instances/*/BoundingBox/Width",
  "Labels/*/Label/Instances/*/BoundingBox/Height",
  "Labels/*/Label/Instances/*/BoundingBox/Top",
  "Labels/*/Label/Instances/*/BoundingBox/Left"
]
````
What we are really asking for here is a list of the properties from the Label Instances (e.g. Width, Height). Along the way, there are certain properties that we also need such as Label Confidence etc. So we specify that we want items in the collection by use of *. The column definition below is saying that we want to go into the Labels array, get all Labels (*), then go into the Instance array, find all of those (*), go into the BoundingBox and get the Height property.

````
Labels/*/Label/Instances/*/BoundingBox/Height
````
The first three columns(e.g. VideoMetadata/Codec) are off the root of the document and aren't part of any collection. Because of that, you just use dotted notation to tell js2d what you want.

You will see that there is some repitition in the the rows. The VideoMetadata.Codec property is "unnecessarily" repeated in each row but that's ok... the goal here is to keep it simple.

### Speed

This library is incredibly fast because there is no bloat, no dependencies (Mocha only for dev not prod). js2d only visits the branches of the document that you reference in the columns. Processing the AWS Rekognition sample file in test/awsrek_sample.json which is 889k with the ten sample columns given take between 2-3ms. Further performance improvements could also be made to get that value down but I suspect the bulk of that time is simply memory alloction and data stuffing.


