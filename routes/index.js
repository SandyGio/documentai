var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', async function(req, res, next) {
  // console.log(req.query.length);
  if(Object.keys(req.query).length === 0){
    var allFile=await main();
    // console.log(allFile);
    var stringfile = "";
    allFile.forEach(function(item, index){
      var encodedUri = encodeURIComponent(item);
      console.log(encodedUri);
      stringfile+="<a href='?filePath="+encodedUri+"'>"+item+"</a></br>";
    })
    res.setHeader('Content-type','text/html');
    res.send(stringfile);
  }
  else{
    res.send(req.query);
    anomaly_detect(req.query["filePath"]);
  }
});

// router.get('/:filePath', function (req, res){
//   res.send(req.params);
//   
// })


/**
 * Get list of the files from google cloud storage which is ready for anomaly detection. 
 * @param {*} bucketName 
 */
async function main(bucketName = 'piep') {
  // [START storage_list_files]
  /**
   * TODO(developer): Uncomment the following line before running the sample.
   */
  // const bucketName = 'Name of a bucket, e.g. my-bucket';

  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

    // Lists files in the bucket
    const [files] = await storage.bucket(bucketName).getFiles({ prefix : 'ready/'});

    var arrayFile=[];
    files.forEach(file => {
      // console.log(file.name);
      arrayFile.push(file.name);
    });

    return arrayFile;
  // [END storage_list_files]
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Anomaly detection proccess by calling document ai sdk for parse the pdf file into json
 * Continue sending json to the anomaly detection script in php
 */
async function anomaly_detect(filePathParam) {
  // [START documentai_parse_table]
  /**
   * TODO(developer): Uncomment these variables before running the sample.
   */
  const projectId = 'pertamina-piep';
  const location = 'us'; // Format is 'us' or 'eu'
  // const gcsInputUri = 'gs://piep/source/Algeria/EMK Unit Daily Production & Injection Reports Section Missing/EMK Unit Daily Production & Injection Reports 27-03-2018 anomali.pdf';
  const gcsInputUri = 'gs://piep/'+filePathParam;
  console.log("this is gcsUri"+gcsInputUri);
  
  const {
    DocumentUnderstandingServiceClient,
  } = require('@google-cloud/documentai').v1beta2;
  const client = new DocumentUnderstandingServiceClient();

  async function parseTable() {
    // Configure the request for processing the PDF
    const parent = `projects/${projectId}/locations/${location}`;
    const request = {
      parent,
      inputConfig: {
        gcsSource: {
          uri: gcsInputUri,
        },
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
    console.log(result);

    const http = require('http');

    const data = result

    const options = {
        hostname: 'localhost',
        path: '/EMK_Anomaly_Pdf/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
    }

    const req = http.request(options, res => {
        // console.log(res);
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
  // [END documentai_parse_table]
  await parseTable();
}

module.exports = router;
