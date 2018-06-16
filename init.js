#!/usr/bin/env nodejs

var key_regex = /[a-z0-9.-_]+/; //lowercase alphanumeric, dot, dash, underscore. Needs to be the same as the rule in nginx config

var http = require('http');
const querystring = require('querystring');

const { Pool } = require('pg');
/*
//localhost
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});
*/

//live
const pool = new Pool({
  user: 'yemightybum',
  host: 'mypostgresql.c4siytbqghex.ap-southeast-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'watermelonpapaya',
  port: 5432,
});

const Bottleneck = require('bottleneck');
const limiter = new Bottleneck({
  minTime: 200 //200ms - 5 requests per second
});

var messages = {
	error: {
		timestamp: 'Invalid timestamp value provided',
		parameter: 'Unrecognised parameter specified: ',
		key_invalid: 'Key value contains invalid characters',
		key_empty: 'Key value not specified',
		data_retrieve: 'An error occurred while trying to retrieve the data',
		data_empty: 'There is no data associated with the key provided',
		data_too_long: 'Data length is too long',
		insert: 'An error occurred while trying to insert the data',
		key_alphanum: 'The key provided must only contain lowercase alphanumeric characters',
		data_invalid: 'The data provided is not a valid JSON string',
		page_blank: 'This is an empty page that hopefully will one day be filled with something...',
	}
}

var apiObject = {
	parseJson: function(data) {
		var json_valid = true;

		try {
			JSON.parse(data);
		} catch (e) {
			json_valid = false;
		}

		return json_valid;
	},

	get: function(res, req, getCallback) {

		var paths = req.url.split('/');
		if ((typeof(paths[2]) != 'undefined')&&(paths[2].trim() != '')) //e.g. /object/abc123
		{
			apikey_params = paths[2];

			//apikey_params example: test2?timestamp=1440568980

			var apikey = '';
			var where_string = '';

			//check for question mark
			if (apikey_params.indexOf('?') != -1)
			{
				var temp = apikey_params.split('?');

				if (key_regex.exec(temp[0]) == temp[0])
				{
					apikey = temp[0];

					var params = temp[1].split('&'); //in case more than one parameter 
					for(var i=0; i<params.length; i++)
					{
						var pair = params[i].split('=');
						switch(pair[0])
						{
							case 'timestamp':
							{
								//test for NaN
								var timestamp = parseInt(pair[1]);
								if (!isNaN(timestamp))
								{
									where_string += ' AND (EXTRACT(epoch FROM date_added) <= ' + parseInt(pair[1]) + ') ';
								}
								else
								{
									getCallback(messages.error.timestamp);
								}
							}
							break;

							default:
								getCallback(messages.error.parameter + '"' + pair[0] + '"');
							break;
						}
					}
				}
				else //key_regex failed
				{
					getCallback(messages.error.key_invalid);
				}
			}
			else //no additional params after key
			{
				if (key_regex.exec(apikey_params) == apikey_params)
				{
					apikey = apikey_params;
				}
				else //key_regex failed
				{
					getCallback(messages.error.key_invalid);
				}
			}

			if (apikey != '')
			{
				const text = 'SELECT obj_value FROM vd_test WHERE obj_key = $1 ' + where_string + ' ORDER BY date_added DESC LIMIT 1';
				const values = [apikey];

				pool.query(text, values, function(err, resp) {
					if (err)
					{
						//console.log(err.stack);
						getCallback(messages.error.data_retrieve);
					}
					else
					{
						if (resp.rows.length != 0)
						{
							var resp_string = '{"value":' + resp.rows[0]['obj_value'] + '}';
							getCallback(resp_string);
						}
						else
						{
							getCallback(messages.error.data_empty);
						}
					}
				});
			}
		}
		else
		{
			getCallback(messages.error.key_empty);
		}
	}, //end get function

	post: function(res, req, postCallback) {

		var queryData = "";

        req.on('data', function(data) {
            queryData += data;
            if(queryData.length > 1e6)
            {
                queryData = "";

                res.writeHead(413, {'Content-Type': 'text/plain; charset=utf-8'});
                postCallback(messages.error.data_too_long);

                req.connection.destroy();
            }
        });

        req.on('end', function() {

            var postdata = querystring.parse(queryData);
			for (var key in postdata)
			{
				//console.log(key, postdata[key]);

				var key_valid = (key_regex.exec(key) == key);
				var json_valid = apiObject.parseJson(postdata[key]);

				if (key_valid&&json_valid)
				{
					//Insert into db
					const text = 'INSERT INTO vd_test(obj_key, obj_value) VALUES($1, $2) RETURNING *';
					const values = [key, postdata[key]];

					pool.query(text, values, function(err, resp) {
						if (err)
						{
							//console.log(err.stack);
							postCallback(messages.error.insert);
						}
						else
						{
							var unix_time = ((new Date(resp.rows[0]['date_added']).getTime()) / 1000).toFixed(0);
							var resp_string = '{"key":"' + key + '", "value":' + JSON.stringify(postdata[key]) + ', "timestamp": ' + unix_time + ' }';

							postCallback(resp_string);
						}
					});
				}
				else
				{
					if (!key_valid)
					{
						postCallback(messages.error.key_alphanum);
					}

					if (!json_valid)
					{
						postCallback(messages.error.data_invalid);
					}
				}
			}
        });
	}, //end post function
};

var server = http.createServer(function (req, res) {

	res.setHeader('Content-Type', 'text/plain; charset=utf-8');

	var paths = req.url.split('/'); //('http://localhost/object/').split('/') -> [ '', 'object', '' ]

	switch(paths[1].toLowerCase())
	{
		case 'object':
			switch(req.method)
			{
				case 'POST':
					limiter.submit(apiObject.post, res, req, function(message){
						res.end(message);
					});
				break;

				case 'GET':
					limiter.submit(apiObject.get, res, req, function(message){
						res.end(message);
					});
				break;
			}
		break;

		default:
			res.end(messages.error.page_blank);
		break;
	}
});

server.listen(8080, 'localhost');
console.log('Node server running at http://localhost:8080/');