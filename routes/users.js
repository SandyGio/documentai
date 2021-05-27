var express = require('express');
var router = express.Router();
var fs = require('fs');
// var app = express();

const bodyParser = require('body-parser');

// app.use(express.bodyParser({limit: '50mb'}))

router.use(bodyParser.urlencoded({
  extended:true
}));

router.use(bodyParser.json());

router.post("/", async function(req, res){
  const obj = req.body; // req.body = [Object: null prototype] { title: 'product' }
  // obj.url.replace("//", "/")
   // { title: 'product' }
  // const {Storage} = require('@google-cloud/storage');

  // const storage = new Storage();

  // const bucketName = 'piep';
  // var filename = obj.url;

  const projectId = 'pertamina-piep';
  const location = 'us'; // Format is 'us' or 'eu'
  // const gcsInputUri = 'gs://piep/source/Algeria/EMK Unit Daily Production & Injection Reports Section Missing/EMK Unit Daily Production & Injection Reports 27-03-2018 anomali.pdf';
  const gcsInputUri = 'gs://piep/'+obj.url;
  console.log(gcsInputUri);
  // console.log("this is gcsUri"+gcsInputUri);
  
  const {
    DocumentUnderstandingServiceClient,
  } = require('@google-cloud/documentai').v1beta2;
  const client = new DocumentUnderstandingServiceClient();

  async function parseTable() {
    // Configure the request for processing the PDF
    // console.log("this is buffer data ", Buffer.from(data).toString('base64'));
    const parent = `projects/${projectId}/locations/${location}`;
    const request = {
      parent,
      inputConfig: {
        gcsSource: {
          uri: gcsInputUri,
        },
        // contents: Buffer.from(data).toString('base64'),
        mimeType: 'application/pdf',
      },
      tableExtractionParams: {
        enabled: true,
        tableBoundHints: [
          {
            boundingBox: {
              normalizedVertices: [
                {x: 0, y: 0},
                {x: 1, y: 0},
                {x: 1, y: 1},
                {x: 0, y: 1},
              ],
            },
          },
        ],
      },
    };

    // Recognizes text entities in the PDF document
    const [result] = await client.processDocument(request);

    // Get all of the document text as one big string
    const {text} = result;
    // console.log(result);

    const http = require('http');

    const data = result

    const options = {
        hostname: 'localhost',
        path: '/EMK_Anomaly_Pdf/updated_pdf.php',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
    }

    const req = http.request(options, res => {
        console.log(res);
        console.log(`statusCode: ${res.statusCode}`)
      
        res.on('data', d => {
          process.stdout.write(d)
        })
    })
      
    req.on('error', error => {
      console.error("this is error", error)
    })
      
    req.write(JSON.stringify(data))
    req.end()
  }

  await parseTable();

  res.send("HELLO MASUK SINI");
})

router.get('/', function(req, res, next){
  res.render("user");
})

module.exports = router;
