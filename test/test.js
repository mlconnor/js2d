const js2d = require('../index.js')
const fs = require('fs')
const assert = require('assert')
import('mocha')

const obj = JSON.parse(fs.readFileSync('./test/awsrek_sample.json', { encoding: 'utf8' }))

const columns = [
  "VideoMetadata.Codec",
  "VideoMetadata.FrameHeight",
  "VideoMetadata.FrameWidth",
  "Labels.*.Timestamp",
  "Labels.*.Label.Name",
  "Labels.*.Label.Confidence",
  "Labels.*.Label.Instances.*.BoundingBox.Width",
  "Labels.*.Label.Instances.*.BoundingBox.Height",
  "Labels.*.Label.Instances.*.BoundingBox.Top",
  "Labels.*.Label.Instances.*.BoundingBox.Left",
]

/*
for ( var i = 0; i < 100; i++ ) {
var startTime = performance.now()
var res = js2d.make2d(columns, obj)
var endTime = performance.now()
console.log("performance time", endTime - startTime, "milliseconds")
}
*/

const firstFourRows = [["h264",360,640,0,"Boat",59.81174087524414,0.16477584838867188,0.18891093134880066,0.807238757610321,0.3536725640296936],["h264",360,640,0,"Bus",93.9477767944336,0.19102247059345245,0.1379556506872177,0.4492671489715576,0.010075467638671398],["h264",360,640,0,"Bus",93.9477767944336,0.12909945845603943,0.21337026357650757,0.515156626701355,0.7728689312934875],["h264",360,640,0,"Car",95.27998352050781,0.1210596114397049,0.18334537744522095,0.8137429356575012,0.5639166831970215]]
const firstFourObjRows = [{"Codec":"h264","FrameHeight":360,"FrameWidth":640,"Timestamp":0,"Name":"Boat","Confidence":"59.81174087524414","Width":"0.16477584838867188","Height":"0.18891093134880066","Top":"0.807238757610321","Left":"0.3536725640296936"},{"Codec":"h264","FrameHeight":360,"FrameWidth":640,"Timestamp":0,"Name":"Bus","Confidence":"93.9477767944336","Width":"0.19102247059345245","Height":"0.1379556506872177","Top":"0.4492671489715576","Left":"0.010075467638671398"},{"Codec":"h264","FrameHeight":360,"FrameWidth":640,"Timestamp":0,"Name":"Bus","Confidence":"93.9477767944336","Width":"0.12909945845603943","Height":"0.21337026357650757","Top":"0.515156626701355","Left":"0.7728689312934875"},{"Codec":"h264","FrameHeight":360,"FrameWidth":640,"Timestamp":0,"Name":"Car","Confidence":"95.27998352050781","Width":"0.1210596114397049","Height":"0.18334537744522095","Top":"0.8137429356575012","Left":"0.5639166831970215"}]

describe('js2d', () => {
  describe('#make2d(array)', ()=> {
    it('should return an array of arrays with expected values', ()=> {
      var result = js2d.make2d(columns, obj)
      assert.deepEqual(result.slice(0,4), firstFourRows)
    })
  }),
  describe('#make2d(string)', ()=> {
    it('should return an array of arrays with expected values', ()=> {
      var result = js2d.make2d(columns.join('|'), obj)
      assert.deepEqual(result.slice(0,4), firstFourRows)
    })
  }),
  describe('#make2d(obj)', ()=> {
    it('should return an array of arrays with expected values', ()=> {
      var columnsObject = {}
      columns.forEach(v => columnsObject[v.split(".").pop()] = v)
      var result = js2d.make2d(columnsObject, obj)
      assert.deepEqual(result.slice(0,4), firstFourObjRows)
    })
  }),
  describe('#make2d(obj) array root', ()=> {
    it('should handle an array at the root', ()=> {
      var obj = [
        {"fname":"Michael","lname":"Connor","address":[
          {"type":"home","addrLine1":"123 Main St","city":"Atlanta","state":"GA"},
          {"type":"work","addrLine1":"321 Peachtree Rd NE","city":"Atlanta","state":"GA"}
        ]},
        {"fname":"Lawrence","lname":"Michael"},
        {"fname":"Bill","lname":"Smith","address":[
          {"type":"home","addrLine1":"876 20th St","city":"Atlanta","state":"GA"}
        ]}
      ]
      var expected = [["Michael","Connor","home","123 Main St","Atlanta","GA"],["Michael","Connor","work","321 Peachtree Rd NE","Atlanta","GA"],["Bill","Smith","home","876 20th St","Atlanta","GA"]]
      var result = js2d.make2d(["*.fname","*.lname","*.address.*.type","*.address.*.addrLine1","*.address.*.city","*.address.*.state"], obj)
      assert.deepEqual(result, expected)
    })
  }),
  describe('#make2d(string)', ()=> {
    it('should handle a string spec for columns', ()=> {
      var result = js2d.make2d(columns.join("|"), obj)
      assert.deepEqual(result.slice(0,4), firstFourRows)
    })
  })

})
