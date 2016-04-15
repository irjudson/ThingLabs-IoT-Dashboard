express = require('express.io')
app = express().http().io()

var connectionString = process.env.THINGLABS_EVENTHUB_CONNSTRING || '<eventhub connection string>'
// Setup your sessions, just like normal.
app.use(express.cookieParser())
app.use(express.session({secret: 'thinglabs'}))

// Session is automatically setup on initial request.
app.get('/', function(req, res) {
    req.session.loginDate = new Date().toString()
    res.sendfile(__dirname + '/client.html')
});

app.get('/style.css', function(req, res) {
    res.sendfile(__dirname + '/style.css')
});

app.get('/graph.js', function(req, res) {
    res.sendfile(__dirname + '/graph.js')
});

// Instantiate an eventhub client
eventHubClient = require('azure-event-hubs').Client;
var client = eventHubClient.fromConnectionString(connectionString, 'thinglabseventhub')

app.io.route('ready', function(req) {
    // For each partition, register a callback function
    client.getPartitionIds().then(function(ids) {
        ids.forEach(function(id) {
            var minutesAgo = 5;
            var before = (minutesAgo*60*1000);
            client.createReceiver('$Default', id, { startAfterTime: Date.now() - before })
                .then(function(rx) {
                    rx.on('errorReceived', function(err) { console.log(err); });
                    rx.on('message', function(message) {
                        console.log(message.body);
                        var body = message.body;
                        try {
                            app.io.broadcast('data', body);
                        } catch (err) {
                            console.log("Error sending: " + body);
                            console.log(typeof(body));
                        }
                    });
                });
        });
    });
});

app.listen(7076)