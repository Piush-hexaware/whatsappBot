const bodyParser = require('body-parser')
const extName = require('ext-name');
const fetch = require('node-fetch');
const express = require('express');
const config = require('./config.js');
const Twilio = require('twilio');
const urlUtil = require('url');
const path = require('path');
const fs = require('fs');
const app = express()
const PUBLIC_DIR = './public';
app.use(express.static('public'))
app.set('view engine', 'ejs');

const { twilioPhoneNumber, twilioAccountSid, twilioAuthToken } = config;
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
let twilioClient;

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(path.resolve(PUBLIC_DIR));
}

console.log(twilioAccountSid,twilioAuthToken)
function getTwilioClient() {
  return twilioClient || new Twilio(twilioAccountSid, twilioAuthToken);
}

function deleteMediaItem(mediaItem) {
  const client = getTwilioClient();
  return client
    .api.accounts(twilioAccountSid)
    .messages(mediaItem.MessageSid)
    .media(mediaItem.mediaSid).remove();
}

async function SaveMedia(mediaItem) {
  const { mediaUrl, filename } = mediaItem;
    const fullPath = path.resolve(`${PUBLIC_DIR}/${filename}`);
    if (!fs.existsSync(fullPath)) {
      const response = await fetch(mediaUrl);
      const fileStream = fs.createWriteStream(fullPath);
      response.body.pipe(fileStream);
      deleteMediaItem(mediaItem);
    }
}

async function handler(req, res) {
  // {
  //   SmsMessageSid: 'SM65014a156feb9814b29e2fc677155e8f',
  //   NumMedia: '0',
  //   SmsSid: 'SM65014a156feb9814b29e2fc677155e8f',
  //   SmsStatus: 'received',
  //   Body: 'hi',
  //   To: 'whatsapp:+14155238886',
  //   NumSegments: '1',
  //   MessageSid: 'SM65014a156feb9814b29e2fc677155e8f',
  //   AccountSid: 'AC2c394978aff06467f3b2652dd1887119',
  //   From: 'whatsapp:+917062799435',
  //   ApiVersion: '2010-04-01'
  // }
  const { body } = req;
  storeInfo(body.From)
  console.log(body);
  const { NumMedia, From, MessageSid } = body;
  let saveOperations = [];
  const mediaItems = [];

  for (var i = 0; i < NumMedia; i++) {  // eslint-disable-line
    const mediaUrl = body[`MediaUrl${i}`];
    const contentType = body[`MediaContentType${i}`];
    const extension = extName.mime(contentType)[0].ext;
    console.log(extension);
    
    const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
    const filename = `${mediaSid}.${extension}`;

    mediaItems.push({ mediaSid, MessageSid, mediaUrl, filename });
    saveOperations = mediaItems.map(mediaItem => SaveMedia(mediaItem));
  }

  await Promise.all(saveOperations);

  const messageBody = NumMedia === '0' ? 'Send us an image or file!' : `Hi Munesh!`;
  console.log("hiiiiii")
  const client = getTwilioClient();
  client.messages
    .create({
      from: twilioPhoneNumber,
      to: From || req.body.phoneNumber,
      body: messageBody || req.body.inputMessage,
      //mediaUrl:"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
       //mediaUrl:"http://crashtestdummy.com.au/wp-content/uploads/2010/12/crash-test-dummy-awards.jpg"
      //mediaUrl:"https://geekanddummy.com/wp-content/uploads/2014/02/central-locking-Ford-Mondeo-Mk-3.mp3"
    })
    res.send(`Message has been sent to ${req.body.phoneNumber}`)
  }


function template(req,response){
  console.log("template")
  response.render('./template/index.ejs');
  // fs.readFile('./template/index.html',function(err,data){
  //   if(err){
  //     response.writeHead(400)
  //     response.write('page not found')
  //     response.end()
  //   }else {
  //     //console.log(data)
  //     response.writeHead(200,{'contentType':'text/html'})
  //     response.write(data)
  //     response.end()
  //   }
  //   })
}


function sendMessage(req, res){
  console.log("data",req.body)
  res.send("thanz")
  //return handler(req, res)
}

app.post('/', handler);
app.get('/template',template);
app.post('/send/message',sendMessage)
app.listen(8000, () => console.log(`Magic...Magic On => 3000!`))



function storeInfo(phoneNumber){
fs.readFile('./number.json', 'utf8', function (err, data){
  if (err){
      console.log(err);
  } else {
  obj = JSON.parse(data); //now it an object
  obj.numbers.push({number:phoneNumber,name:""}); //add some data
  json = JSON.stringify(obj); //convert it back to json
  fs.writeFile('./number.json',json,function(){
    return true
  }); // write it back 
}})
}