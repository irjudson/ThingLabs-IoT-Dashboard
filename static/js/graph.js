var io = io.connect();


var n = 60,
    limit = n + 1,
    duration = 5000,
    now = new Date(Date.now() - duration),
    lastDataSeen = new Date(),
    data = {},
    timeDeltas = [],
    accumulatedTime = 0,
    averageWindowTime = 0,
    sampleCount = 0,
    labels = ['maxtempf', 'mintempf', 'avgtempf', 'maxtempc', 'mintempc', 'avgtempc', 'maxhumidity', 'minhumidity', 'avghumidity'];
                       
function selectColor(colorNum, colors){
    if (colors < 1) colors = 1; // defaults to one color - avoid divide by zero
    return 'hsl(' + (colorNum * (360 / colors) % 360) + ',100%,50%)';
}
                 
labels.forEach(function (label, index, labels) {
    data[label] = {
        color : selectColor(labels.indexOf(label), labels.length),
        data : d3.range(n).map(function() { return 0; })
    }
});

var margin = {top: 6, right: 0, bottom: 20, left: 40},
    width = 680 - margin.right,
    height = 200 - margin.top - margin.bottom;

var x = d3.time.scale()
    .domain([now - (n - 2) * duration, now - duration])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, 100])
    .range([height, 0]);

var line = d3.svg.line()
    .interpolate('basis')
    .x(function(d, i) { return x(now - (n - 1 - i) * duration); })
    .y(function(d, i) { return y(d); });

var svg = d3.select('body').append('p').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .style('margin-left', -margin.left + 'px')
.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

svg.append('defs').append('clipPath')
    .attr('id', 'clip')
.append('rect')
    .attr('width', width)
    .attr('height', height);

var axis = svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(x.axis = d3.svg.axis().scale(x).orient('bottom'));

var paths = svg.append('g')
    .attr('clip-path', 'url(#clip)')

for (var name in data) {
    var group = data[name]
    group.path = paths.append('path')
        .data([group.data])
        .attr('class', 'line')
        .style('stroke', group.color)
}

io.on('data', function(incomingData) {
    now = new Date();
    var timeDelta = now - lastDataSeen;
    var firstTimeDelta = timeDeltas.shift();
    accumulatedTime += timeDelta;
    accumulatedTime -= firstTimeDelta;
        
    // Skip the first one to avoid skew
    if (sampleCount > 0) {
        averageWindowTime = averageWindowTime + (timeDelta - averageWindowTime)/sampleCount;
        var guess = Math.round(averageWindowTime/1000) * 1000 * n;
        
        // We could have more!
        timeDeltas.push(timeDelta);

        for (var name in data) {
            var group = data[name]
            group.data.push(incomingData[name])
            group.path.attr('d', line)
        }
        
        // update the domains
        x.domain([now - guess, lastDataSeen]);

        // redraw and shift line(s) left
        paths.attr('transform', null)
            .transition()
            .duration(750)
            .ease('linear')
            .attr('transform', 'translate(' + x(now - guess) + ',0)')

        // slide the x-axis left
        axis.transition()
            .duration(750)
            .ease('linear')
            .call(x.axis);

        for (var name in data) {
            var group = data[name]
            if(group.data.length > limit) {
                group.data.shift()                            
            }
        }
    }
    sampleCount += 1;

    // Update for delta calculation
    lastDataSeen = now;
});

// Listen for session event.
io.emit('ready');