const express = require('express')
const request = require('request')
const cronJob = require('cron').CronJob;
const fs = require('fs')
const app = express();
const log = console.log;

const downloadAndSave = function(uri, name, cb) {
  return request.head(uri, function(err, res, body) {
    return request(uri).pipe(fs.createWriteStream(name)).on('close', cb);
  })
};

const convertToBase64 = function (file) {
  var bitmap = fs.readFileSync(file);
  return new Buffer(bitmap).toString('base64');
};

app.get('/', (req, res) => {
  res.send('Hello payever nodejs task!')
});

//get user by id
app.get('/user/:userId', (req, res) => {
  const userId = req.params.userId; 
  //make the request to get users
  request('https://reqres.in/api/users/'+userId, {json: true}, (err, result, body) => {
    if (err) { return log(err); }
    log(body);
    return res.send(body.data);
  });
});

//get avatar by userid
app.get('/user/:userId/avatar', (req, res) => {
  const userId = req.params.userId;
  //check if the file already exists in our system
  const filename = './'+userId+'.jpg';
  if (fs.existsSync(filename)) {
    //convert it into base64 and send to the user
    return res.send(convertToBase64(filename));
  }
  //else make the call to get the image
  request('https://reqres.in/api/users/'+userId, {json: true}, (err, result, body) => {
    if (err) { return log(err); }
    log(body.data.avatar);
    const uri = body.data.avatar;
    let isSaved = downloadAndSave(uri, userId+'.jpg', function() {
      log('downloaded and saved into the file system');
      return res.send(convertToBase64(filename));
    });
  });
});

//delete avatar by userid
app.delete('/user/:userId/avatar', (req, res) => {
  const userId = req.params.userId;
  return fs.unlink(userId+'.jpg', function() {
    return res.send('image deleted...');
  });
});

//activating a cronjob for every one minute
let i = 0;
new cronJob('* * * * * *', function() {
  request('https://reqres.in/api/users?page='+i, {json: true}, (err, result, body) => {
    if (err) { return log(err); }
    if (!fs.existsSync('users.json')) {
      fs.writeFile("users.json", JSON.stringify(body.data), function(err){
        if (err) throw err;
        console.log('The data has been added...');
      });
    } else {
      //need to append data
      fs.readFile('users.json', function (err, data) {
        var json = JSON.parse(data); //existing data
        json.push(...body.data);
        fs.writeFile("users.json", JSON.stringify(json), function (err) {
          if (err) throw err;
          console.log('data appended..');
        });
      });
    }
    i++;
  });
}, null, true, 'America/Los_Angeles');



app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
});