const express = require('express');
const app = express()
const { google } = require('googleapis');
var cloudbilling = google.cloudbilling('v1');
const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

//This uses a connection to my google account, with my authorized project/account IDs. 
function authorize(callback) {
    google.auth.getClient({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    }).then(client => {
        callback(client);
    }).catch(err => {
        console.error('authentication failed: ', err);
    });
}

//I've set up this project so that daily usage bills will automatically be sent to BigQuery
//I had no bills on my project so I created a mock csv with accountID, cost, and date columns.
async function query() {

    //adds up all from the cost column of this test dataset 
    const query = 'SELECT SUM(cost) as cost FROM nimbellaquiz.bill';

    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
        query: query,
    };

    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);

    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    // Print the results and return promise
    console.log(rows[0].cost);
    return rows[0].cost;
}

app.set('view engine', 'pug')

app.get('/', (req, res) => {
    authorize(function (authClient) {
        var request = {
            // name: 'billingAccounts/01D01B-5F360B-0F357C', //billing account ID for other api uses.
            name: 'projects/safealert-1548351736683', //project name/ID for the getBillingInfo method
            auth: authClient,
        };

        //asks for generic billing information based on GCloud Billing API. No actual bill is returned through this API.
        cloudbilling.projects.getBillingInfo(request, function (err, response) { 
            if (err) {
                console.error(err);
                return;
            }
            //Calls aformentioned query function and once the promise is resolved the sum of the cost column is "result"
            query().then(result => {
                //Now that all my information is loaded and ready, render the pug template with the variables plugged in.
                res.render('index', {
                    name: "Samba",
                    projectName: response.data.name,
                    projectId: response.data.projectId,
                    billingAccountName: response.data.billingAccountName,
                    billingEnabled: response.data.billingEnabled,
                    cost: result
                })
            }).catch(err =>{
                console.error(err);
            });
        })


    });

})

//load the website at localhost:3000
app.listen(process.env.PORT || 3000, function () {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
