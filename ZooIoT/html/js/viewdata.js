function updateLecture(data) {
    var temp = document.getElementById('temp');
    var hum = document.getElementById('hum');
    var water = document.getElementById('water');

    temp.innerText = data.temp;
    hum.innerText = data.hum;
    water.innerText = data.wlevel;
}
async function latestRecord() {
    var l = await sendCmd(`lastRecord?room=${activeHabitat}`);

    if (l.data.lecture != null)
        updateLecture(l.data.lecture);
}

latestRecord();