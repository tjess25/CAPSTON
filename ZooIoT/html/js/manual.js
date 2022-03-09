var lastStatus = {};

async function uvlight(ev) {
    disableBtns();
    await sendCmd(`uvLight?st=${!lastStatus.uv}&room=${activeHabitat}`);
    setTimeout(askStatus, 3000);
}
async function heater(ev) {
    disableBtns();
    await sendCmd(`heater?st=${!lastStatus.calor}&room=${activeHabitat}`);
    setTimeout(askStatus, 3000);
}
async function water(ev) {
    disableBtns();
    await sendCmd(`water?st=${!lastStatus.pump}&room=${activeHabitat}`);
    setTimeout(askStatus, 3000);
}

async function updateBtns() {
    var uvl = document.getElementById('uvl');
    var htr = document.getElementById('htr');
    var wtr = document.getElementById('wtr');

    uvl.className = `btn ${lastStatus.uv ? 'btn-success' : 'btn-warning'}`;
    htr.className = `btn ${lastStatus.calor ? 'btn-success' : 'btn-warning'}`;
    wtr.className = `btn ${lastStatus.pump ? 'btn-success' : 'btn-warning'}`;
}

function disableBtns() {
    var uvl = document.getElementById('uvl');
    var htr = document.getElementById('htr');
    var wtr = document.getElementById('wtr');

    uvl.className = `btn ${lastStatus.uv ? 'btn-success' : 'btn-warning'} disabled`;
    htr.className = `btn ${lastStatus.calor ? 'btn-success' : 'btn-warning'} disabled`;
    wtr.className = `btn ${lastStatus.pump ? 'btn-success' : 'btn-warning'} disabled`;
}

async function askStatus() {
    await sendCmd(`status?&room=${activeHabitat}`);
}

function updateHabitat(d) {
    console.log(d);
    lastStatus = d.status;

    updateBtns();
}

askStatus();