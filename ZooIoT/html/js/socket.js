var socket = io();
var habitats = [];
var myHabitats = [];
var activeHabitat = '';
var loggedIn = sessionStorage.getItem('habitats') != null;

function setMyHabitats(data) {
    myHabitats = Array.isArray(data) ? data : [data];
    sessionStorage.setItem('habitats', myHabitats);
}
function setActiveHabitat(h) {
    sessionStorage.setItem('active', h);
}
myHabitats = Array.isArray(sessionStorage.getItem('habitats')) ? sessionStorage.getItem('habitats') : [sessionStorage.getItem('habitats')];
activeHabitat = sessionStorage.getItem('active');

function logout() {
    sessionStorage.clear();

    location.href = '/';
}

function toggleMenu() {
    var login = document.getElementById('login');
    var register = document.getElementById('register');
    var panel = document.getElementById('panel');

    if (loggedIn) {
        if (!login) return;
        login.style = 'display: none;';
        register.style = 'display: none;';
        panel.style = 'display: block;';
    } else {
        if (!login) return;
        login.style = 'display: block;';
        register.style = 'display: block;';
        panel.style = 'display: none;';
    }
}

async function sendCmd(cmd) {
    try {
        var result = await fetch(`/${cmd}`);
        var oResult = await result.json();

        console.log(oResult);
        return oResult;
    } catch (e) {
        console.error(e);
        return null;
    }
}

async function postCmd(cmd, data) {
    try {
        var result = await fetch(`/${cmd}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        var oResult = await result.json();

        console.log(oResult);
        return oResult;
    } catch (e) {
        console.error(e);
        return null;
    }
}

function redirect(d) {
    window.location.href = `/${d}.html`;
}

function getElement(id) {
    return document.getElementById(id);
}

function getOffset(date) {
    return -date.getTimezoneOffset() / 60;
}

toggleMenu();

socket.on('habitatUpdate', (data) => {
    console.log(data);
    var habitat = habitats.findIndex(h => h.habitat == data.habitat);

    if (habitat > -1)
        habitats[habitat].status = data.status;
    else {
        if (myHabitats.includes(data.habitat)) {
            habitats.push(data);
        }
    }

    if (myHabitats.includes(data.habitat) && (data.habitat == activeHabitat)) {
        if (window.updateHabitat) {
            updateHabitat(data);
        }
    }
});

socket.on('lecture', data => {
    if (myHabitats.includes(data.habitat) && (data.habitat == activeHabitat)) {
        if (window.updateLecture) {
            updateLecture(data.lecture);
        }
    }
});