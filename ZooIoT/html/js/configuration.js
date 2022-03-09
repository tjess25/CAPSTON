async function setSettings() {
    var conf = await sendCmd(`config?room=${activeHabitat}`);

    var name = getElement('nameInput');
    var mintemp = getElement('tempminInput');
    var maxtemp = getElement('tempmaxInput');
    var minhum = getElement('humInput');
    var h_on = getElement('timeinitInput');
    var h_off = getElement('timeendInput');

    name.value = activeHabitat;

    if (conf.success) {
        if (conf.data) {
            mintemp.value = conf.data.mintemp;
            maxtemp.value = conf.data.maxtemp;
            minhum.value = conf.data.minhum;
            h_on.value = conf.data.h_on;
            h_off.value = conf.data.h_off;
        }
    }
}

async function sendUpdate(ev) {
    ev.preventDefault();

    var mintemp = getElement('tempminInput').value;
    var maxtemp = getElement('tempmaxInput').value;
    var minhum = getElement('humInput').value;
    var h_on = getElement('timeinitInput').value;
    var h_off = getElement('timeendInput').value;

    var response = await postCmd('updateHabitat', {
        name: activeHabitat,
        config: {
            mintemp,
            maxtemp,
            minhum,
            h_on,
            h_off
        }
    });

    if (response.success)
        alert('Configuración actualizada.');
    else
        alert('Ocurrió un error al intentar actualizar la configuración.');
}

setSettings();