const io = require("socket.io-client");
process.env.SERVER ??= "https://rmtrollbox.eu-gb.mybluemix.net"
const socket = io(process.env.SERVER);

const hproc = [];

const fs = require("fs");
const ms = require("minimist-string");
const he = require("he");
const fetch = require("node-fetch")
const path = require("path");
const chp = require("child_process");
try{
var cfg = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
fs.watch("./config.json",(e,t)=>{if(e=="change"&&t){
    delete require.cache[path.join(__dirname,"config.json")];
    var home = cfg.homes[0];
    try {
        cfg = require("./config.json");
        cfg.homes[0] = home;
        if(cfg.disabled){
            socket.disconnect();
        } else {
            socket.connect();
            if(cooldown("cfg_cd", 400)) return;
            socket.emit("user joined", cfg.name, cfg.color, "bot", "");
        }
    }catch(e){console.error(e)}
}});
}catch(e){
if(process.env.CONFIG){var cfg = JSON.parse(Buffer.from(process.env.CONFIG,"base64").toString());}else{throw e}
}
var cmds = require("./cmds.js");
var ducks = {};

var cooldown_timer = {};
function cooldown(name="duck",cooldown_time=100){
    if(cooldown_timer[name]) return true;
    cooldown_timer = setInterval(()=>delete cooldown_timer[name], cooldown_time);
}

fs.watch("./cmds.js",(e,t)=>{if(e=="change"&&t){
    delete require.cache[path.join(__dirname,"cmds.js")];
    try {
        cmds = require("./cmds.js");
    }catch(e){console.error(e)}
    console.log("\n\x1b[1mCommands reloaded.\x1b[0m\n\n")
}});


fs.watch("./tools/",(e,t)=>{if(e=="change"&&t){
    delete require.cache[path.join(__dirname,"tools",t)];
}})

fs.watch("./index.js",(e,t)=>{if(e=="change"&&t){
    if(cfg.disabled) process.exit(37);
    if(socket.connected){
        console.log("\n\n\x1b[1mMain file changed, restarting...\x1b[0m\n")
        socket.send("Shutting down (main file changed)...");
        socket.on("lts_msgid", () => process.exit(37));
    }else{
        console.log("\n\n\x1b[1mMain file changed, restarting...\x1b[0m\n")
        process.exit(37)
    }
}});


if (!process.env.DISPLAY) process.env.DISPLAY = ":0";

process.on('SIGINT', () => {
    if(socket.connected) process.exit(130);
    socket.send("Shutting down (quit)...");
    socket.on("lts_msgid", () => process.exit(130));
});
process.on('uncaughtException', (duck) => {
    console.error(duck);
    /*if(socket.disconnected) process.exit(1);
    setInterval(()=>{
        socket.send("Shutting down (uncaught exception)...");
    }, 100)
    socket.on("lts_msgid", () => process.exit(1));
    
    what about ignoring them? browsers do, what prevents me from just ignoring them as well?
    */
});
process.on('unhandledRejection', (reason, p) => {
    console.error(reason);
})

var tries = 0;
users = {};
socket.on("connect", function () {
    var socket = this;

//     socket.emit("eval", `var socket = io.sockets.connected["${socket.id}"];
// socket._callbacks.$message = [];
// socket._callbacks.$edit_ownid = [];
// socket.on("message", (msg, files, reply)=>{
//     let id = "temp_workaround_"+("00000000"+Math.random().toString(16)).slice(-9)
//     this.broadcast.emit("message", {
//         msg, files, for: reply, nick: this.nick, color: this.color, home: this.home, system: false,
//         id, own: false, date: Date.now()
//     });
//     this.emit("message", {
//         msg, files, for: reply, nick: this.nick, color: this.color, home: this.home, system: false,
//         id, own: true, date: Date.now()
//     });
//     for(let i=0;i<8;i++){
//         this.emit("lts_msgid", id);
//     }
// }).on("edit_ownid", (e,m)=>{
//     io.emit("edited", e, m)
// })`, cfg.login.user, cfg.login.pass)
//    io.emit("eval", `delete connectedusers["${socket.id}"]`, cfg.login.user, cfg.login.pass)

    console.log("connected (socket id: "+socket.id+")");
    clearInterval(global.g);
    if(!cfg.disabled){
        socket.emit("user joined", cfg.name, cfg.color, "bot", "");
        socket.emit("set_status", cfg.status);
    }
    tries = 0;
    socket.once("connectdata", function (data) {
        if (data.banned) { console.error("i got banned :("); process.exit(37) }
        var home = data.home;
        cfg.homes[0] = home;
    });
    if (reason) {
        var msgdelay = false;
        for(let i of socket.sendBuffer){
            if (i.data[0] == "message") {
                msgdelay = true;
                break
            }
        }
        if(reason == "io server disconnect"){
            setTimeout(socket.send.bind(socket, "that was not nice"), msgdelay?1000:0); return;
        }
        setTimeout(socket.send.bind(socket, "Bot was disconnected with the reason of: " + reason), msgdelay?1000:0);
    }
    reason = "";
});
var reason = "";
socket.on("disconnect", function (r) {
    console.log("\x1b[A\x1b[2KReconnecting (disconnect reason: "+r+")... (" + tries + ")"); tries++;
    reason = r;
    clearInterval(global.g);
    global.g = setInterval(() => socket.connect(), 200);
});
socket.on("connect_error", function (error) {
    console.log("Reconnecting (connection error: " + error + ")... (" + tries + ")"); tries++;
    clearInterval(global.g);
    global.g = setInterval(() => socket.connect(), 200);
});
socket.on("update users", sussers => users = sussers)

function randstr(beg, end, len) {
    var res = "";
    for (i = 0; i < len; i++) {
        res += String.fromCharCode(randint(beg, end));
    }
    return res
}
var q = null;
var b = null;

let lastcmd, cmdtimes = 0;
function nosuchcmd(cmd, socket, {home,sid}){
    function genrstr(len,chars){
        if(!chars) chars = "1234567890qazwsxedcrfvtgbyhnujmikolpPLOKIMJUNHYBGTVFRCDEXSWZQA-=[]\;',./_+{}|:?!@#$%^&*()`~";
        var q = "";
        for(let i=0;i<len;i++){
            q+=chars[Math.floor(Math.random()*chars.length)];
        }
        return q;
    }
    if(cfg.bannedHomes.includes(home)){
        return !!socket.emit("eval", `io.sockets.sockets["${sid}"].emit("message", {
    "sid": ${JSON.stringify(socket.id)},
    "bot": true,
    "date": Date.now(),
    "nick": ${JSON.stringify(cfg.name)},
    "color": "green",
    "style": "",
    "home": "w7FNBCXDsyfDvyZeagtBwotNwp/Dg1XCksKNwqHDgHIrFwbDtnrCsMOrw5HCiw==",
    "msg": "You are unfortunately banned from using this bot. <em>(go use tor or something)</em>",
    "id": ${JSON.stringify(genrstr(32,"0123456789abcdef"))},
    "channel": "general",
    "system": false,
    "own": false,
    "reply": false
})`, cfg.login.user, cfg.login.pass)
    }
    let nosuchcmdresp = [
        "%p%s: No such file or directory",
        "there is no \"%p%s\" command",
        "dude there is literally no command named %p%s",
        "HTTP/1.1 404 Not Found",
        "bro stop there isn't a command that is named %p%s",
        "you ducker..."
    ];
    if(cmds[cmd]) return;
    if(lastcmd == cmd) {
        cmdtimes++;
        if(cmdtimes < nosuchcmdresp.length) {
            socket.send(nosuchcmdresp[cmdtimes].replace(/%p/g, cfg.prefix).replace(/%s/g, cmd));
        } else {
            socket.send(".".repeat(Math.random()*30+3));
        }
    }else{
        cmdtimes = 0;
        socket.send("uhh... no such command?");
    }
    lastcmd = cmd;
    return true;
}
socket.on("message", function (data) {
    var socket = this;
    console.log(data);
    if (typeof data.msg != "string") data.msg = he.decode((data.msg || "").toString());
    if (typeof data.sid != "string") data.sid = (data.sid || "").toString();
    if (typeof data.home != "string") data.home = (data.home || "").toString();
    if (typeof data.color != "string") data.color = (data.color || "").toString();
    if (typeof data.date != "number") data.date = Date.now();
    if (data.msg.startsWith(cfg.prefix)) {
        let msg = data.msg.substring(cfg.prefix.length).split(" ");
        let cmd = msg.shift();
        if(!cmd.match(/^[a-z][a-z0-9]*$/) || !cmd){
            return // stop replying to messages which don't contain a command
        }
        if (nosuchcmd(cmd, this, data)) {
            return
        }
        if(data.nick.startsWith("DM | ")){
            socket.emit("eval", `for(let i of Object.values(io.sockets.connected)){
    if(i.home != "${data.home}" && i.id != "${socket.id}")
        i.emit("message", ${JSON.stringify(data)})
}`, cfg.login.user, cfg.login.pass)
        }
        let args = msg.join(" ");
        socket.emit("type", true);
        setTimeout(() => {
            try {
                var ifprms = cmds[cmd](socket, args, data, cfg);
                if (typeof ifprms == "object" && ifprms.then && ifprms.catch) {
                    ifprms.then(e => socket.emit("type", false))
                    ifprms.catch(e => { socket.send("Some error happened inside an async function, details below:\n<div style=\"background:#000;color:#FFF\">" + he.encode(e.stack)); socket.emit("type", false) })
                } else {
                    socket.emit("type", false);
                }
            } catch (e) {
                socket.emit("type", false);
                socket.send("Some error happened, details below:\n<div style=\"background:#000;color:#FFF\">" + he.encode(e.stack));
            }
        }); return
    }
    if (data.msg.includes("@" + cfg.name)) {
        socket.send(`use my prefix pls (${cfg.prefix})`);
    }
    if (data.msg.includes("@everyone")) {
//        socket.send(`p i n g`);
    }
})



// setInterval(() => { // keep sus repls alive
//     console.log('');
//     for(let k of Object.keys(cfg.replitkeepalive)) {
//         fetch(cfg.replitkeepalive[k]).then(e=>{
//         if(!e.ok){
//             console.log("[repl_keepalive] pinging "+k+" failed ("+e.status+" "+e.statusText+")")
//         } else {
//             console.log("[repl_keepalive] pinging "+k+" succeeded ("+e.status+" "+e.statusText+")")
//         }
//     }).catch(e=>{console.log("[repl_keepalive] pinging "+k+" failed")});
//     }
// }, 30000)



function rrange(min, max) {
    return min + Math.random() * (max - min);
}
function tocsp(sec) { d = ~~(sec / 86400); h = ~~(sec / 3600) % 24; m = ~~(sec / 60) % 60; s = ~~(sec % 60); res = lz(s) + ""; res = lz(m) + ":" + res; if (h) { res = lz(h) + ":" + res; if (d) { res = d + "d " + res; } }; return res; }
function lz(m, t = 2, x = "0") { x = x.repeat(t); return (x + m).slice(-t)};
setInterval(() => {
    socket.emit("set_custom_status", `duckbot [.help]
uptime: ${tocsp(process.uptime())}`)
}, 3000);

global.sus = {
    socket, hproc,
    // cfg        exposing cfg was a mistake
    cmds
}/*
global.require = null;
global.process.mainModule = null;
global.process.exit = () => "Nope.";
global.process.reallyExit = () => "Nope.";
global.process.pid = -1
global.process.abort = () => "Nope.";*/
