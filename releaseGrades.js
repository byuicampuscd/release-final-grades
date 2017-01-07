/* eslint-env node, browser*/
/* eslint no-console:0 */

var fs = require('fs'),
    dsv = require('d3-dsv'),
    Nightmare = require('nightmare');

require('nightmare-helpers')(Nightmare);


var nightmare = Nightmare({
    show: true,
    typeInterval: 20,
    alwaysOnTop: false,
    //    openDevTools: {
    //        mode: 'detach'
    //    },
    waitTimeout: 2 * 60 * 1000
});

var courses = dsv.csvParse(fs.readFileSync("./ous.csv", "utf8")),
    authData = JSON.parse(fs.readFileSync("./auth.json", "utf8")),
    errors = [];

function catchConsole() {
    nightmare.on('console', function (type, data) {
        //console.log('Catch Window Log ------------------------');

        console.log(data);
        //console.log('End Window Log   ------------------------\n');
    });
}

function getCheckCounts() {
    return {
        studentCount: document.querySelectorAll("form div>table[summary] td:nth-child(8) input").length,
        checkedCount: document.querySelectorAll("form div>table[summary] td:nth-child(8) input:checked").length
    };

}


function done(nightmare) {
    var errFileName = "Errors.json";
    var coursesFileName = "courses.csv";
    nightmare
        .end()
        .then(function () {
            //write out the errors
            if (errors.length > 0) {
                console.log("Some OUs didn't work. Look in the file " + errFileName);
                fs.writeFileSync(errFileName, JSON.stringify(errors, null, 4), "utf8");
            }

            //write out the successes
            fs.writeFileSync(coursesFileName, dsv.csvFormat(courses, ["name", "ou", "studentCountB", "checkedCountB", "studentCount", "checkedCount"]), "utf8");
            console.log('See "' + coursesFileName + '" for data.');
            console.log("Finished All");
        });
}

function releaseFinalGrade(index, nightmare) {
    nightmare
        .click('.d2l-heading a:first-of-type')
        .click('.vui-dropdown-menu ul li:last-of-type a')
        .click('table a.vui-button-primary')
        .wait(function () {

            var i,
                eles = document.querySelectorAll('[role="alert"]'),
                done = false;
            for (i = 0; i < eles.length; ++i) {
                done = done || eles[i].innerText.search(/Saved successfully/i) > -1;
            }

            return done;
        })
        .evaluate(getCheckCounts)
        .then(function (data) {

            courses[index].studentCount = data.studentCount;
            courses[index].checkedCount = data.checkedCount;

            console.log("Done with " + courses[index].name);
            goToNextCourse(index, nightmare);
        })
        .catch(function (e) {
            console.log("Error with " + courses[index].name);
            errors.push({
                index: index,
                course: courses[index],
                error: e
            });
            console.log("Done with " + courses[index].name);
            goToNextCourse(index, nightmare);
        });

}


function goToNextCourse(index, nightmare) {
    index += 1;
    if (index === courses.length) {
        done(nightmare);
        return;
    }
    //not done

    nightmare
        .run(function () {
            console.log((index + 1) + ":", "Starting " + courses[index].name);
        })
        .goto("https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_final_edit.d2l?ou=" + courses[index].ou)
        //make sure there are students in the course
        .evaluate(getCheckCounts)
        .then(function (data) {
            courses[index].studentCountB = data.studentCount;
            courses[index].checkedCountB = data.checkedCount;

            //are there students here?
            if (data.studentCount === 0) {
                courses[index].studentCount = data.studentCount;
                courses[index].checkedCount = data.checkedCount;
                console.log("Done with " + courses[index].name);
                goToNextCourse(index, nightmare);

            } else {
                releaseFinalGrade(index, nightmare);
            }

        })
        .catch(function (e) {
            console.log("Error with " + courses[index].name);
            errors.push({
                index: index,
                course: courses[index],
                error: e
            });
            goToNextCourse(index, nightmare);
        });
}

//Comment this out if you don't want it to catch the console.log's
//catchConsole();

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

    //.click("a.vui-button-primary")
    .wait("#ILoggedIn")
    .waitURL("https://byui.brightspace.com/d2l/home")
    //set it to 200 students a screen
    .goto("https://byui.brightspace.com/d2l/lms/grades/admin/enter/grade_final_edit.d2l?ou=10011")
    .select('[title="Results Per Page"]', "200")
    .waitURL("d2l_change=0")
    .then(function () {
      console.log("Set 200 students per page");
        goToNextCourse(-1, nightmare);
    })
    .catch(function (e) {
        errors.push(e);
        goToNextCourse(-1, nightmare);
    });