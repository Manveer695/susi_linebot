'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
var request = require('request');
var http = require('http');

// create LINE SDK config from env variables
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result));
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

// event handler
function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }
    
    var options1 = {
        method: 'GET',
        url: 'http://api.susi.ai/susi/chat.json',
        qs: {
            timezoneOffset: '-330',
            q: event.message.text
        }
    };

    if (event.message.text.toLowerCase() === "get started") {
    	options1.qs.q = "Welcome";
    	request(options1, function(error1, response1, body1) {
            if (error1) throw new Error(error1);
            
            var welMessage = (JSON.parse(body1)).answers[0].actions[0].expression;
        
	        options1.qs.q = "Get started";
	        request(options1, function(error2, response2, body2) {
		        if (error2) throw new Error(error2);
		        
		        console.log(body2);
		        var introMessage = (JSON.parse(body2)).answers[0].actions[0].expression;
		        console.log(welMessage+" "+introMessage);
		        const sampleQ = {
		            "type": "template",
		            "altText": "template",
		            "template": {
		                "type": "buttons",
		                "title": ""+welMessage,
		                "text": ""+introMessage,
		                "actions": [
		                	{
		                        "type": "uri",
		                        "label": "What is FOSSASIA?",
		                        "uri": "https://www.github.com"
		                    },
		                    {
		                        "type": "message",
		                        "label": "Who is Einstein?",
		                        "text": "Who is Einstein?"
		                    },
		                    {
		                        "type": "message",
		                        "label": "Borders with INDIA",
		                        "text": "Borders with INDIA"
		                    }
		                ]
		            }
		        };
	        	return client.replyMessage(event.replyToken, sampleQ);
			});
		});
    } else {
        request(options1, function(error1, response1, body1) {
            if (error1) throw new Error(error1);
            // answer fetched from susi
            //console.log(body1);
            var type = (JSON.parse(body1)).answers[0].actions;
            var ans = (JSON.parse(body1)).answers[0].actions[0].expression;
            if (type.length == 1 && type[0].type == "answer") {
                const answer = {
                    type: 'text',
                    text: ans
                };
                // use reply API
                return client.replyMessage(event.replyToken, answer);
            } else if (type.length == 3 && type[2].type == "map") {
                var lat = type[2].latitude;
                var lon = type[2].longitude;
                var address = JSON.parse(body1).answers[0].data[0].place

                const answer = [{
                        type: 'text',
                        text: ans
                    },
                    {
                        "type": "location",
                        "title": "Location",
                        "address": address,
                        "latitude": lat,
                        "longitude": lon
                    }
                ]

                // use reply API
                return client.replyMessage(event.replyToken, answer);

            } else if (type.length == 1 && type[0].type == "table") {
                var data = JSON.parse(body1).answers[0].data;
                var columns = type[0].columns;
                var key = Object.keys(columns);
                var msg = [];
                console.log(key);

                for (var i = 0; i < 5; i++) {
                    msg[i] = "";
                    msg[i] = {
                        type: 'text',
                        text: key[0].toUpperCase() + ": " + data[i][key[0]] + "\n" + key[1].toUpperCase() + ": " + data[i][key[1]] + "\n" + key[2].toUpperCase() + ": " + data[i][key[2]]
                    }
                }
                return client.replyMessage(event.replyToken, msg);

            } else if (type.length == 2 && type[1].type == "rss") {
                var data = JSON.parse(body1).answers[0].data;
                var columns = type[1];
                var key = Object.keys(columns);
                var msg, title, link, query;
                var carousel = [];
                console.log(key);

                for (var i = 1; i < 4; i++) {
                    title = key[1].toUpperCase() + ": " + data[i][key[1]];
                    query = title;
                    msg = key[2].toUpperCase() + ": " + data[i][key[2]];
                    link = data[i][key[3]]
                    if (title.length >= 40) {
                        title = title.substring(0, 36);
                        title = title + "...";
                    }

                    if (msg.length >= 60) {
                        msg = msg.substring(0, 56);
                        msg = msg + "...";
                    }

                    carousel[i] = {
                        "title": title,
                        "text": msg,
                        "actions": [{
                                "type": "uri",
                                "label": "View detail",
                                "uri": link
                            },
                            {
                                "type": "message",
                                "label": "Ask SUSI again",
                                "text": query
                            }
                        ]
                    };
                }
                const answer = [{
                        type: 'text',
                        text: ans
                    },
                    {
                        "type": "template",
                        "altText": "Web Search",
                        "template": {
                            "type": "carousel",
                            "columns": [
                                carousel[1],
                                carousel[2],
                                carousel[3]
                            ]
                        }
                    }
                ]
                return client.replyMessage(event.replyToken, answer);
            }

        })
    }

}

// listen on port
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
