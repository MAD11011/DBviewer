const express = require('express');
const app = express();
const fuzzysort = require('fuzzysort');
const sqlite3 = require('sqlite3');
const path = require('path');
const bodyParser = require('body-parser');

const port = 3000;
let dbcount = 0;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname,'assets')));
app.use('/',express.static(path.join(__dirname,'views')));

let names = new Array;
names.id = new Array;
names.prepared = new Array;
let db = new sqlite3.Database('./maindb.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    db.all(`SELECT id,first_name,last_name FROM data`,(err,rows) =>{
        if(err){
            console.error(err.message);
        }

        rows.forEach((row) => {
            names.id.push(row.id);
            let fullname = row.first_name + ' ' + row.last_name;
            names.push(fullname);
            names.prepared.push(fuzzysort.prepare(fullname));
        });
    });
    console.log('Connected to the main database.');
});


app.post('/query',(req,res) => {

    const {search} = req.body;
    if(search.toString().length >= 3){
        const options = {
            limit: 50,
            threshold: -10000,
        }
        const result = fuzzysort.go(search,names.prepared,options);
        if (result.length == 0){
            res.send(`<html><li><label>no matches found</labe></li></html>`);

        }
        else{
            let newlist = '<html>';
            result.forEach((name,i) => {
                newlist = newlist.concat(`<li><label hx-get="/personnel/${names.id[names.indexOf(name.target)]}" hx-target="body" hx-trigger="click">`+fuzzysort.highlight(name,'<mark>','</mark>')+'</label></li>');
            });

            newlist = newlist.concat('</html>');
            res.send(newlist);
        }
    }
    else{
        res.end();
    }
});


app.get('/personnel/:id', (req, res) => {
    const { id } = req.params;
    let sql = `SELECT first_name,last_name,email,phone_e_164,rfid FROM data WHERE id = ?;`;
    db.get(sql,[id],(err,row) =>{
        if(err){
            console.log(err);
        }
        const firstname = row.first_name;
        const lastname  = row.last_name;
        const email     = row.email;
        const phone     = row.phone_e_164;
        const rfid      = row.rfid.toString(16);
    res.send(`<html>
                <section class="dbform">
                    <section class="main">
                    <label><b> firstname :</b> ${firstname}</label>
                    <label><b> lastname :</b> ${lastname}</label>
                    <label><b> email :</b> ${email}</label>
                    <label><b> phone :</b> ${phone}</label>
                    <label><b> rfid :</b> ${rfid}</label>
                    </section>
                </section>
              </html>`);
    });
});


app.put('/count',(req,res) => {
    db.get(`SELECT COUNT(*) count FROM data`,function(err,row){
        dbcount = row.count;
        res.send(row.count.toString());
    });
});


app.listen(port,() => {
    console.log(`Server started at ${port}`);
});
