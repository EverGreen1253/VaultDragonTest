# VaultDragonTest

This repo contains the final code for the Vault Dragon code test.
It consists of:
  1. default - nginx config file
  2. init.js - the node script that is running
  3. package-lock.json - the packages used
  4. ajax_post_tester.html - the HTML file at http://13.229.151.128/ajax_post_tester.html that I use to test AJAX POSTs
  5. vd_test_db.sql - The CREATE statement for the database. Default collation for the table is UTF-8.
    
<b>Note:</b> Due to the location rules in the Nginx config, AJAX POSTs must be sent to http://13.229.151.128/object/.<br/>
The '/' at the end of the url must be present. This can be seen in the source code for ajax_post_tester.html.

In my AWS deployment, I'm using <i>PM2</i> to run the node process.

For the database, I've chosen to use <i>Postgres</i> because I can forsee a lot of benefits if the data to be inserted is stored in jsonb format. Searching the json data directly from the DB should be a lot faster than the common way of SELECTing the rows, iterating over them with a for loop, and then parsing the JSON string every time.

In the node app, I'm using <i>bottleneck</i> to throttle the number of requests.<br />
Error messages are all grouped at the top for ease of modification.

If there are any questions, please do not hesistate to contact me.
And please notify me once the evaluation is finished so I can shut down the <b>EC2</b> and <b>RDS</b> instances being used.
