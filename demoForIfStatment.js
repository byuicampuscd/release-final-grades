/* eslint-env node, browser*/
/* eslint no-console:0 */

var Nightmare = require('nightmare');
//switch to nightmare-download-manager for more control and feed back on download proccess
require('./main.js')(Nightmare);


var nightmare = Nightmare({
    show: true,
    typeInterval: 20,
    alwaysOnTop: false,
    //    openDevTools: {
    //        mode: 'detach'
    //    },
    waitTimeout: 2 * 60 * 1000
});


function doTrue(nm) {
    console.log("did true");
    nm.goto('https://www.google.com')
        .then(function () {
            after(nm);
        });
}

function doFalse(nm) {
    console.log("did false");
    nm.goto('https://www.byui.edu')
        .then(function () {
            after(nm);
        });
}

function after(nm) {
    nm.goto('https://www.youtube.com')
        .end()
        .then(function () {
            console.log("make it to the end");
        })
        .catch(function (error) {
            console.error(error);
        });
}


nightmare
    .goto('https://www.lds.org')
    .exists(".pf-header")
    .then(function (isThere) {
        if (isThere) {
            doTrue(nightmare);
        } else {
            doFalse(nightmare);
        }
    })
    .catch(function (error) {
        console.error(error);
    });
