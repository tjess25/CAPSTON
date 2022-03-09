'use strict';
const cron = require('node-cron');
// express config:
const express = require('express');
const app = express();
const port = process.env.PORT || 1337;
// express config end.

// socket.io config:
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
// socket.io config.

// mqtt config:
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://74.208.131.230');
// mqtt config end.

// mongo config:
const mongoose = require('mongoose');
const { stat } = require('fs');
const uri = "mongodb+srv://artemisa:sJrztsaDar56@artemisa.taohv.gcp.mongodb.net/ZooIoT?retryWrites=true&w=majority";

const habitatSchema = new mongoose.Schema({
    name: String,
    userList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IoTUser' }],
    state: Object,
    config: Object
});
const habitatModel = mongoose.model('IoTHabitat', habitatSchema);
const lectureSchema = new mongoose.Schema({
    habitat: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTHabitat' },
    lecture: Object,
    timeStamp: Date
});
const lectureModel = mongoose.model('IoTLecture', lectureSchema);
const userSchema = new mongoose.Schema({
    userName: String,
    password: String
});
const userModel = mongoose.model('IoTUser', userSchema);
// mongo config end.

// vars:
var mqttConnected = false;
var mongoConnected = false;
var habitatTopics = ['data', 'status_out', 'ping'];
// vars end.

function response(caption, data, success) {
    return {
        caption,
        data,
        success
    };
}

async function sendHabitatUpdates(habitat) {
    try {
        var habitats = await habitatModel.find();
    
        habitats.forEach(h => {
            var room = h._doc.name;
            if (habitat == room || !habitat) {
                var obj = h._doc.config;
                
                var hon = String(obj.h_on).split(':');
                var hoff = String(obj.h_off).split(':');
                obj.h_on = [Number(hon[0]),
                            Number(hon[1])];
                obj.h_off = [Number(hoff[0]),
                             Number(hoff[1])];

                client.publish(`${room}/default`, JSON.stringify(obj), { qos: 1 }, (err) => {
                    if (err)
                        console.error(err);
                    else
                        console.log(`Habitat config sent to: ${room}.`);
                });
            }
        });
    } catch (error) {
        console.error(error);
    }
}

mongoose.connect(uri, (err) => {
    if (!err) {
        mongoConnected = true;
        console.log('Connected to mongodb.');
    }
    else {
        mongoConnected = false;
        console.error(err);
    }
});

// Express events:

app.use(express.json());
app.use(express.static('html'));

app.get('/status', (req, res) => {
    var room = req.query.room;

    client.publish(`${room}/status_in`, 'true', { qos: 1 }, (err) => {
        if (err)
            res.send(response('Error al pedir status.', null, false));
        else
            res.send(response('Status pedido.', null, true));
    });
});

app.get('/uvLight', (req, res) => {
    var room = req.query.room;
    var st = req.query.st;
    console.log(room, st, 'uv');

    client.publish(`${room}/uv`, st, { qos: 1 }, (err) => {
        if (err)
            res.send(response('Error al mandar mensaje.', null, false));
        else
            res.send(response(`Luz UV ${st} a ${room}`, null, true));
    });
});
app.get('/heater', (req, res) => {
    var room = req.query.room;
    var st = req.query.st;

    client.publish(`${room}/calor`, st, { qos: 1 }, (err) => {
        if (err)
            res.send(response('Error al mandar mensaje.', null, false));
        else
            res.send(response(`Calefaccion ${st} a ${room}`, null, true));
    });
});
app.get('/water', (req, res) => {
    var room = req.query.room;
    var st = req.query.st;

    client.publish(`${room}/pump`, st, { qos: 1 }, (err) => {
        if (err)
            res.send(response('Error al mandar mensaje.', null, false));
        else
            res.send(response(`Agua ${st} a ${room}`, null, true));
    });
});
app.get('/lastRecord', async (req, res) => {
    var room = req.query.room;
    var rDoc = await habitatModel.findOne({ name: room });

    var doc = await lectureModel.findOne({ habitat: rDoc._id }).sort({ $natural: -1 }).limit(1);
    res.send(response(`Ultimo registro`, doc, true));
});

app.get('/habitatUsers', async (req, res) => {
    var room = req.query.room;

    var fullHab = await habitatModel.findOne({ name: room }).populate('userList');
    var usrs = fullHab.userList.map(u => u._doc.userName);

    res.send(response(`Usuarios de ${room}.`, usrs, true));
});

app.get('/allHabitats', async (req, res) => {
    var hs = await habitatModel.find();

    res.send(response('Habitats', hs.map(h => h.name), true));
});

app.get('/addUser', async (req, res) => {
    var room = req.query.room;
    var usr = req.query.usr;

    var fullHab = await habitatModel.findOne({ name: room }).populate('userList');
    var usrs = fullHab.userList.map(u => u._doc.userName);

    if (usrs.includes(usr))
        res.send(response('Usuario agregado.', null, true));
    else {
        var newUsr = await userModel.findOne({ userName: usr });
        fullHab.userList.push(newUsr);

        fullHab.save((err) => {
            if (err)
                res.send(response('Ocurri� un error al agregar el usuario.', null, false));
            else
                res.send(response('Usuario agregado.', null, true));
        });
    }
});

app.get('/removeUser', async (req, res) => {
    var room = req.query.room;
    var usr = req.query.usr;

    var fullHab = await habitatModel.findOne({ name: room }).populate('userList');
    var usrs = fullHab.userList.map(u => u._doc.userName);

    if (!usrs.includes(usr))
        res.send(response('Usuario agregado.', null, true));
    else {
        var thisUser = await userModel.findOne({ userName: usr });
        var indx = fullHab.userList.indexOf(thisUser._id);

        fullHab.userList.splice(indx, 1);

        fullHab.save((err) => {
            if (err)
                res.send(response('Ocurrió un error al agregar el usuario.', null, false));
            else
                res.send(response('Usuario agregado.', null, true));
        });
    }
});

app.post('/addHabitat', async (req, res) => {
    var name = req.body.name;
    var config = req.body.config;

    var hab = await habitatModel.findOne({ name: name });

    if (hab)
        res.send(response('Habitat creada.', null, true));
    else {
        var newHab = new habitatModel({
            name,
            config
        });

        newHab.save(err => {
            if (err)
                res.send(response('Ocurrió un error al crear el habitat.', null, false));
            else
                res.send(response('Habitat creada.', null, true));
        });
    }
});

app.post('/updateHabitat', async (req, res) => {
    var room = req.body.name;

    var hab = await habitatModel.findOne({ name: room });
    if (hab) {
        // {“maxtemp”:30.5, “mintemp”:18.2, “minhum”:60.9, “h_on”:”07:30”, “h_off”:”22:00”}
        hab.config = req.body.config;
        hab.save(err => {
            if (!err) {
                sendHabitatUpdates(room);
                res.send(response('Configuración actualizada.', null, true));
            }
            else
                res.send(response('Ocurrió un error al actualizar la configuración.', null, false));
        });
    } else {
        res.send(response('No existe el habitat.', null, false));
    }
});

app.get('/graph', async (req, res) => {
    var room = req.query.room;
    var startDate = new Date(req.query.date);
    var endDate = new Date(req.query.date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 9999);

    var lectures = await lectureModel.find({
        timeStamp: {
            $gte: startDate,
            $lte: endDate
        },
        name: room
    }).sort({ timeStamp: 1}).lean();

    if (lectures) {
        res.send(response('Datos', lectures, true));
    } else
        res.send(response('Datos', null, true));
});

app.get('/config', async (req, res) => {
    var room = req.query.room;

    var hab = await habitatModel.findOne({ name: room });
    if (hab) {
        res.send(response('Configuración', hab._doc.config, true));
    } else {
        res.send(response('No existe el habitat.', null, false));
    }
});

app.post('/register', async (req, res) => {
    var username = String(req.body.username);
    var password = String(req.body.password);

    console.log(username, password);

    var existing = await userModel.findOne({ userName: username });

    if (existing) {
        if (existing._doc.userName == username) {
            console.log(existing);
            res.send(response('Usuario invalido.', null, false));
            return;
        }
    }

    var userEntity = new userModel({
        userName: username,
        password: password
    });

    userEntity.save((err) => {
        if (!err) {
            res.send(response('Usuario creado correctamente.', null, true));
        } else {
            res.send(response('Usuario no creado.', null, false));
        }
    });
});

app.post('/login', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    var usr = await userModel.findOne({ userName: username, password: password });

    if (usr) {
        var allHabitats = await habitatModel.find();
        var myHabitats = allHabitats.find(x => x.userList.includes(usr._id));

        if (!myHabitats) {
            res.send(response('Usuario correcto.', [], true));
            return;
        }

        var filteredHabitats = Array.isArray(myHabitats) ? myHabitats.map(x => x.name) : [myHabitats].map(x => x.name);

        res.send(response('Usuario correcto.', usr._doc.userName == 'admin' ? ['admin'] : filteredHabitats, true));
    } else
        res.send(response('Credenciales invalidas.', null, false));
});

// Express events.

server.listen(port, () => {
    console.log(`ZooIoT app listening at http://localhost:${port}`);
});

// MQTT events:
client.on('connect', async () => {
    mqttConnected = true;
    console.log('Connected to MQTT broker.');

    var habitats = mongoConnected ? await habitatModel.find() : [{
        name: 'habitat1'
    }];

    habitats.forEach(habitat => {
        var habitatName = habitat.name;
        habitatTopics.forEach(topic => {
            client.subscribe(`${habitatName}/${topic}`,
                {
                    qos: 2
                }, err => {
                if (!err)
                    console.log(`Subscribed to ${habitatName}/${topic}.`);
                else
                    console.error(err);
            });
        });
    });
});

client.on('message', async (topic, payload, packet) => {
    // Payload is Buffer
    var msg = payload.toString();
    var habitat = String(topic).split('/')[0];
    var reference = String(topic).split('/')[1];

    console.log(`Habitat: ${habitat}, Lecture: ${reference} Value: ${msg}, QoS: ${packet.qos}`);

    if (reference == 'status_out') {
        try {
            var lastStatus = JSON.parse(msg);

            if (mongoConnected)
                await habitatModel.findOneAndUpdate({ name: habitat }, { status: lastStatus });

            io.sockets.emit('habitatUpdate', {
                habitat: habitat,
                status: lastStatus
            });
        } catch (e) {
            console.error(e);
        }
    } else if (reference == 'data') {
        var lecture = JSON.parse(msg);

        var habitatInstance = mongoConnected ? await habitatModel.findOne({ name: habitat }) : null;
        var lectureInstance = mongoConnected ? new lectureModel({
            habitat: habitatInstance,
            lecture,
            timeStamp: new Date()
        }) : null;

        if (mongoConnected)
            lectureInstance.save((err) => {
                if (err) {
                    console.error(err);
                } else {
                    io.sockets.emit('lecture', {
                        habitat: habitat,
                        lecture
                    });
                }
            });
        else
            io.sockets.emit('lecture', {
                habitat: habitat,
                lecture
            });
    }
});
// MQTT events.

// Socket.io events:
io.on('connection', (socket) => {
    console.log('Client connected to Socket.io');
    socket.on('disconnect', () => {
        console.log('Client disconnected from Socket.io');
    });
});
// Socket.io events.

sendHabitatUpdates();

cron.schedule('0 0 * * *', function() {
    sendHabitatUpdates();
});  