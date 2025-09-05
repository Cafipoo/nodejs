var http = require('http');
const fs = require('fs');
http.createServer(function (req, res) {
    fs.readFile('demofile.html', 'utf8', (err, data) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(data);
  return res.end();
});
}).listen(8080);
