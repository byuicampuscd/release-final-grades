/* eslint-env node, browser*/
/* eslint no-console:0 */

var fs = require('fs'),
    Nightmare = require('nightmare');
//switch to nightmare-download-manager for more control and feed back on download proccess
require('./main.js')(Nightmare);


var nightmare = Nightmare({
    show: true,
    typeInterval: 20,
    alwaysOnTop: false,
    openDevTools: {
        mode: 'detach'
    },
    waitTimeout: 2 * 60 * 1000
});


function catchConsole() {
    nightmare.on('console', function (type, data) {
        //console.log('Catch Window Log ------------------------');

        console.log(data);
        //console.log('End Window Log   ------------------------\n');
    });
}

//catchConsole
catchConsole();

//until the user interface works, we will use this for now.
var authData = JSON.parse(fs.readFileSync("./auth.json"));
var ous = [
    "10011",
    "21077"
]
var errors = [];

function done(nightmare) {
    var errFileName = "Errors.txt";
    nightmare
        .end()
        .then(function () {
            console.log("Finished All");
            if (errors.length > 0) {
                console.log("Some OUs didn't work. Look in the file " + errFileName);
                fs.writeFileSync(errFileName, JSON.stringify(errors, null, 4), "utf8");
            }
        });
}



function releaseFinalGrade(index, nightmare) {
    index += 1;
    if (index === ous.length) {
        done(nightmare);
        return;
    }
    //not done

    nightmare
        .run(function () {
            console.log("Starting " + ous[index]);
        })
        .goto("https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_final_edit.d2l?ou=" + ous[index])
        .wait(function () {
            console.log("checkboxes count: " + $("form div>table[summary] td:nth-child(8) input").length);
            console.log("checked    count: " + $("form div>table[summary] td:nth-child(8) input:checked").length);
            return true;
        })
        //        .click('.d2l-heading a:first-of-type')
        //        .click('.vui-dropdown-menu ul li:last-of-type a')
        //        .click('table a.vui-button-primary')
        //        .wait(function () {
        //
        //            var i,
        //                eles = document.querySelectorAll('[role="alert"]'),
        //                done = false;
        //            for (i = 0; i < eles.length; ++i) {
        //                done = done || eles[i].innerText.search(/Saved successfully/i) > -1;
        //            }
        //
        //            return done;
        //        })
        .then(function () {
            console.log("Done with " + ous[index]);
            releaseFinalGrade(index, nightmare);
        })
        .catch(function (e) {
            console.log("Error with " + ous[index]);
            errors.push({
                index: index,
                ou: ous[index],
                error: e
            });
            releaseFinalGrade(index, nightmare);
        });
}

nightmare
    .goto('https://byui.brightspace.com/d2l/login?noredirect=1')
    .evaluate(function () {
        document.querySelector('a.vui-button-primary').addEventListener('click', function addClick() {
            var ele = document.createElement("div");
            ele.setAttribute('id', "ILoggedIn")
            document.body.appendChild(ele);
        }, {
            once: true
        });
    })
    .type("#userName", authData.username)
    .type("#password", authData.password)
    //    .click("a.vui-button-primary")
    .wait("#ILoggedIn")
    .waitURL("https://byui.brightspace.com/d2l/home")
    .then(function () {
        releaseFinalGrade(-1, nightmare);
    })





//go to check box page 
/*
.goto("https://byui.brightspace.com/d2l/lms/importExport/export/export_select_components.d2l?ou=" + ou)
    .wait('input[name="checkAll"]')
    .click('input[name="checkAll"]')
    .click('a.vui-button-primary')
    //go to confirm page
    .wait(function (ou) {
        return document.location.href === "https://byui.brightspace.com/d2l/lms/importExport/export/export_select_confirm.d2l?ou=" + ou;
    }, ou)
*/
