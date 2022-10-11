const util = require("util");
const fs = require("fs");
const he = require("he");
const ansihtml = require('ansi-html');
const fetch = require("node-fetch")
const FormData = require("form-data");
const Jimp = require('jimp');
const { spawnSync, spawn } = require("child_process")
const { SocksProxyAgent } = require("socks-proxy-agent");
const torAgent = new SocksProxyAgent({
    hostname: "localhost:9050"
});
const ytdl = require("ytdl-core")
const bftp = require("basic-ftp")
const os = require("os");
const vm = require("vm");
const ms = require("minimist-string");
const hexdump = require("./tools/hexdump");

var ducks = {};


var commands = {
    help(socket, args, msg, cfg) {
        const prefixplhd = " ".repeat(cfg.prefix.length);
        socket.send(`  ${cfg.name} v${cfg.version}
Commands (26 total: 25 available, 1 admin):
 .  <b>Help</b>
 ├─ ${cfg.prefix}help             says this text
 ├─ ${cfg.prefix}stats            display stats for my phone
 │  <b>Sus</b>
 ├─ ${cfg.prefix}susgen           generate a new SUS password
 ├─ ${cfg.prefix}randsus          a random SUS image (https://github.com/NT-Cat-1/sus-archive)
 │  <b>RMTB-specific commands</b>
 ├─ ${cfg.prefix}becomefirst      moves you to the beginning of the userlist
 ├─ ${cfg.prefix}becomelast       moves you to the end of the userlist
 ├─ ${cfg.prefix}becomeduck       quack
 ├─ ${cfg.prefix}becomesus        amogus
 │  <b>Fun</b>
 ├─ ${cfg.prefix}brainfuck        run some random esolang
 ├─ ${cfg.prefix}bsod             Your PC ran into a problem and needs to restart.
 ├─ ${cfg.prefix}growsay          say but text grows
 ├─ ${cfg.prefix}leakmyfuckingip  sure
 ├─ ${cfg.prefix}pcow             dancing polish cow
 ├─ ${cfg.prefix}safeeval         runs js in s e c u r e context
 │  ${prefixplhd}                 Don't even try to escape it.
 ├─ ${cfg.prefix}say              say something
 ├─ ${cfg.prefix}typesay          say but text types itself
 ├─ ${cfg.prefix}udtree           something... (stolen from NT_Cat)
 ├─ ${cfg.prefix}urban            urbanup some text
 │  <b>Videos</b>
 ├─ ${cfg.prefix}lowbit           duckify your videos
 │  <b>Images</b>
 ├─ ${cfg.prefix}duck             random duck!
 ├─ ${cfg.prefix}jimp             see ${cfg.prefix}jimp help
 ├─ ${cfg.prefix}rule34           actually no
 ├─ ${cfg.prefix}tenor            tenor search api is duck
 ├─ ${cfg.prefix}vnc              vnc resolver results (thx computernewb)
 │  <b>Only for devs:</b>
 ╰─ ${cfg.prefix}seval            runs js in server`);
    },
    async tenor(socket, args, msg, cfg) {
        const token = cfg.tokens.tenor;
        args = ms(args);
        if (args.h) {
            socket.send("USAGE: " + cfg.prefix + "tenor [-r RESULT] [QUERY]"); return;
        }
        nsfw = !!args.n;
        socket.send("Please wait...");
        var query = args._.join(" ");
        var msgid = await new Promise(res => socket.once("lts_msgid", res));
        var json = await fetch("https://g.tenor.com/v1/search?media_filter=basic&contentfilter=" + (nsfw ? "off" : "medium") + "&q=" + encodeURIComponent(query) + "&key=" + token + "&limit=50").then(d => d.json());
        var res = typeof args.r == "number" ? args.r - 1 : 0;
        console.log(args);
        var url = json.results[res].media[0].gif.url
        socket.emit("delet_ownid", msgid);
        setTimeout(() => socket.emit("message", "tenor query: " + query + " (result " + (res + 1) + ")", { name: "tenor.gif", nsfw: nsfw, url, mime: "image/gif" }), 500);
    },
    bsod(socket, args, msg, cfg) {
        function randhex(len = 2) { var hex = "0123456789abcdef"; var res = ""; for (i = 0; i < len; i++) { res += hex[Math.floor(Math.random() * hex.length)] }; return res }
        var bsodWithPlaceholders = `<div style='user-select:contain;width:440px;height:330px;background:#009;color:#fff;'>A problem has been detected and Windows has been shut down to prevent damage to your computer.\n\nIf this is the first time you've seen this stop error screen, restart your computer. if this screen appears again, follow these steps:\n\nCheck to make sure any new hardware or software is properly installed. If this is a new installation, ask your hardware or software manufacturer for and Windows updates you might need.\n\nIf problems continue, disable or remove any newly installed hardware or software. Disable BIOS memory options such as caching or shadowing. If you need to use Safe Mode to remove or disable components, restart your computer, press F8 to select Advanced Startup Options, and then select Safe Mode.\n\nTechnical information:\n\n*** STOP: 0x%1 (0x%2, 0x%3, 0x%4, 0x%5)`;
        var b1 = "000000" + randhex(2).toUpperCase();
        var b2 = randhex(8).toLowerCase();
        var b3 = randhex(8).toLowerCase();
        var b4 = randhex(8).toLowerCase();
        var b5 = randhex(8).toLowerCase();
        socket.send(bsodWithPlaceholders
            .replace("%1", b1)
            .replace("%2", b2)
            .replace("%3", b3)
            .replace("%4", b4)
            .replace("%5", b5));
    },
    async duck(socket, args, msg, cfg) {
        //socket.send("Uploading the duck...");
        //var msgid = await new Promise(res => socket.once("lts_msgid", res));
        var resp = await fetch("https://random-d.uk/api/v2/quack");
        var json = await resp.json();
        //socket.emit("delet_ownid", msgid);
        socket.emit("message", "quack", { name: json.url, url: json.url, mime: "image/" });
    },
    async cat(socket, args, msg, cfg) {
        //socket.send("Uploading the duck...");
        //var msgid = await new Promise(res => socket.once("lts_msgid", res));
        var resp = await fetch("https://api.thecatapi.com/v1/images/search");
        var json = await resp.json();
        //socket.emit("delet_ownid", msgid);
        socket.emit("message", "m e o w", { name: json[0].url, url: json[0].url, mime: "image/" });
    },

    stats(socket, args, msg, cfg) {
        function tocsp(sec) { d = ~~(sec / 86400); h = ~~(sec / 3600) % 24; m = ~~(sec / 60) % 60; s = ~~(sec % 60); res = lz(s) + ""; res = lz(m) + ":" + res; if (h) { res = lz(h) + ":" + res; if (d) { res = d + "d " + res; } }; return res; }
        function lz(m, t = 2, x = "0") { x = x.repeat(t); return (x + m).slice(-t) }
        var batt = JSON.parse(spawnSync("termux-battery-status").stdout.toString());
        var date = new Date();
        socket.send(` Phone status:
    Memory usage        ${os.freemem() / 1000000} MB free, ${os.totalmem() / 1000000} MB total
    Local time          ${lz(date.getHours())}:${lz(date.getMinutes())}:${lz(date.getSeconds())}
    Process uptime      ${tocsp(process.uptime())}
    OS uptime           ${tocsp(os.uptime())}

    Battery level:      ${batt.percentage} %
    Battery charging?   ${batt.status == "CHARGING" ? "Yes" : "No"}`);
    },
    pcow(socket, args, msg, cfg) {
        socket.send(`<div style="width:fit-content"><img src="//external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fmedia1.tenor.com%2Fimages%2Fa59641f45948d86a771d0dba91a97b0e%2Ftenor.gif%3Fitemid%3D16570099&amp;f=1&amp;nofb=1">` + `<audio style="width:100%" controls="" src="//cdn.discordapp.com/attachments/904656916502949958/947105787250110464/polish.mp3"></audio></div>`);
    },
    say(socket, args, msg, cfg) {
        if (args.startsWith("/")) {
            socket.send("\u200b" + args);
        } else {
            socket.send(args);
        }
    },
    susgen(socket, args, msg, cfg) {
        function password(cnt, words) {
            var str = "";
            for (var i = 0; i < cnt; i++) {
                var randkey = words[randint(0, words.length)];
                if (randkey == "_") {
                    str = str + randint(0, 999999);
                } else {
                    str = str + randkey;
                }
            }
            return str;
        }
        function randint(min, max) { return Math.floor(min + Math.random() * (max - min)) }
        //         args = ms(args);
        //         if (args.h) {
        //             socket.send("USAGE: " + cfg.prefix + "susgen [-b COUNT] [-k KEYWORDS]\nArguments:\n -b  Set the number of keywords (default: 5)\n -k  Specify the keywords to use (_ = random number) (default: imposter,duck,vent,sus,is,ducked,_)");
        //             return;
        //         }
        socket.send("Sus password: " + password(5, ["lamp", "imposter", "duck", "vent", "goose", "how", "sus", "is", "ducked", "duckister", "h", "hmm", "bruh", "reverse", "i", "short", "long", "quack", "green", "yellow", "red", "metal", "_"]))
    },
    async safeeval(socket, args, msg, cfg) {
        var res = await (await fetch("https://jsrunner-ybbow2zesq9z.runkit.sh/js?ansi=true", { method: "POST", body: args })).text();
        socket.send(`> ${he.encode(args)}\n<div style=\"background:#000;color:#FFF;overflow-y:scroll;max-width:95%;min-width:50%;width:fit-content;max-height:30vh\">${ansihtml(he.encode(res + "").replace(/\&\#x1B;/g, "\x1b"))}</div>`)
    },
    async seval(socket, args, msg, cfg) {
        if (msg.nick.startsWith("DM | ")) msg.nick = msg.nick.substring(5)
        socket.emit("delet_adm", msg.id, cfg.login.user, cfg.login.pass);
        if (!(cfg.homes.includes(msg.home) || (users[msg.sid] && users[msg.sid].admin))) { socket.send("no"); return }
        socket.emit("eval", `let sc01=io.to("${socket.id}");try{let e=eval(Buffer.from("${Buffer.from(args, "utf-8").toString("base64")}","base64").toString("utf-8"));sc01.emit("js_result",[1,require("util").inspect(e,!1,1,!0)])}catch(t){sc01.emit("js_result",[0,t.stack])}`, cfg.login.user, cfg.login.pass);
        var b = await new Promise(r => socket.once("js_result", r));
        socket.send("sys!dm " + `> ${he.encode(args)}\n<div style="background:#000;color:#FFF;overflow-y:scroll;max-width:95%;min-width:50%;width:fit-content;max-height:30vh">${ansihtml(he.encode(b[1]).replace(/\&\#x1B;/g, "\x1b"))}</div>`.replaceAll("|", "&#124;") + "|" + msg.nick);
    },
    async vnc(socket, args, msg, cfg) {
        var resp = await fetch("https://computernewb.com/vncresolver/api/random").then(e => e.json());
        socket.send("<img style=\"float:right;max-width:50vw;max-height:50vh\" alt=\"The screenshot got sussed!\" src=\"//computernewb.com/vncresolver/screenshots/" + resp.ip + "_" + resp.port + ".jpg\">Random VNC server: (<a target=\"_blank\" href=\"//computernewb.com/vncresolver/dark/browse/?id=" + resp.id + "\">view on computernewb</a>)\nInfo:\n  IP/Port: " + resp.ip + ":" + resp.port + "\n" + (resp.hostname ? "         : " + resp.hostname + ":" + resp.port + "\n" : "") + "  Client name: " + resp.clientname + "\n  Location:\n    Country: " + resp.country + "\n    State: " + resp.state + "\n    City: " + resp.city);
    },
    brainfuck(socket, args, msg, cfg) {
        var result = `let d=[0x69,0x66,0x20,0x79,0x6f,0x75,0x20,0x73,0x65,0x65,0x20,0x74,0x68,0x69,0x73,0x20,0x79,0x6f,0x75,0x20,0x61,0x72,0x65,0x20,0x73,0x75,0x73],c=30000,a=new Uint8Array(30000),e=[],b=0;`;
        if (!args) {
            socket.send("Usage: " + cfg.prefix + "brainfuck [program]");
            return
        }
        args.split("").forEach(key => {
            switch (key) {
                case "+":
                    result += ";a[b]++"
                    break;
                case "-":
                    result += ";a[b]--"
                    break;
                case ">":
                    result += ";b++;b%=c"
                    break;
                case "<":
                    result += ";b+=c-1;b%=c"
                    break;
                case "[":
                    result += ";while(a[b]){"
                    break;
                case "]":
                    result += "}"
                    break;
                case ",":
                    result += ";a[b]=d.shift()||0"
                    break;
                case ".":
                    result += ";e.push(a[b])"
                    break;
            }
        });
        try {
            var ctx = ducks.bfctx ||= new vm.Context({})
                (new vm.Script(result)).runInContext(ctx, { timeout: 3000 });
            socket.send(`Result: <div style="background:#000;color:#FFF;overflow-y:scroll;max-width:95%;min-width:50%;width:fit-content;max-height:30vh">${he.encode(Buffer.from(ctx.e).toString("ascii"))}<div>`);
        } catch (e) {
            if (e.message.startsWith("Script execution timed out after")) {
                socket.send(`Result (not full - execution timed out): <div style="background:#000;color:#FFF;overflow-y:scroll;max-width:95%;min-width:50%;width:fit-content;max-height:30vh">${he.encode(Buffer.from(ctx.e).toString("ascii"))}<div>`);
            } else {
                throw e;
            }
        }
    },
    growsay(socket, args, msg, cfg) {
        socket.send(`<style>@keyframes textgrow{0%{font-size:0px}100%{font-size:30px}}.textgrow{animation:textgrow 9s linear forwards}</style><span class="textgrow">${args}`)
    },
    async typesay(socket, args, msg, cfg) {
        let b = 0;
        function sleep(v) { return new Promise(e => setTimeout(e, v)) }
        args = args.split(new RegExp(`(<.+?>|${".".repeat(1 + args.length / 40)}|&.+;)`, "g"));
        socket.send("OK.")
        let w = ``;
        for (v of args) {
            b++;
            w += v;
            socket.emit("edit", w + "<blink>_</blink>");
            await sleep(100);
        }
    },
    jimp(socket, args, msg, cfg) {
        function clamp(min, val, max) {
            if (val < min) val = min;
            if (val > max) val = max;
            return val;
        }

        args = args.split(" ");
        let cmd = args.shift();
        args = args.join(" ");
        if (!cmd.match(/^[a-z0-9]*$/) || !cmd) {
            return
        }
        if (cmd == "help") {
            socket.send(`<b>J</b>avaScript <b>I</b>mage <b>M</b>anipulation <b>P</b>rogram
  Available commands:
help test test2 obscure dither`);
            return
        }
        if (cmd == "test") {
            new Jimp(256, 256, async (err, img) => {
                img.scanQuiet(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
                    img.bitmap.data[idx] = x;
                    img.bitmap.data[idx + 1] = y;
                    img.bitmap.data[idx + 2] = Math.min(x, y);
                    img.bitmap.data[idx + 3] = 255;
                });


                var buff = await img.getBufferAsync("image/png");
                var form = new FormData();
                form.append('upload', buff, {
                    contentType: 'image/png',
                    name: 'file',
                    filename: "duck.png",
                });
                var json = await (await fetch(process.env.SERVER + '/fileapi/upload', { method: 'POST', body: form })).json();
                socket.emit("message", "done", { name: "duck.png", url: "/fileapi/get?file=" + json.url, mime: 'image/png' });
            });
        }
        if (cmd == "test2") {
            new Jimp(256, 256, async (err, img) => {
                img.scanQuiet(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
                    img.bitmap.data[idx + 0] = Math.sin(x / 10) * 127 + 128;
                    img.bitmap.data[idx + 1] = Math.sin(y / 10) * 127 + 128;
                    img.bitmap.data[idx + 2] = Math.sin(x * y / 15) * 127 + 128;
                    img.bitmap.data[idx + 3] = 255;
                });


                var buff = await img.getBufferAsync("image/png");
                var form = new FormData();
                form.append('upload', buff, {
                    contentType: 'image/png',
                    name: 'file',
                    filename: "duck.png",
                });
                var json = await (await fetch(process.env.SERVER + '/fileapi/upload', { method: 'POST', body: form })).json();
                socket.emit("message", "done", { name: "duck.png", url: "/fileapi/get?file=" + json.url, mime: 'image/png' });
            });
        }
        if (cmd == "obscure") {
            if (!msg.files) return socket.send("please upload a fucking file");
            Jimp.read((new URL(msg.files ? msg.files.url : args, process.env.SERVER)).toString(), async (err, img) => {
                if (err) {
                    console.error(err);
                    socket.send("something went wrong");
                    return
                }
                let xobs = Math.random() * img.bitmap.width / 30;
                let yobs = Math.random() * img.bitmap.height / 30;
                img.scanQuiet(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
                    let ax = Math.floor(Math.random() * xobs * 2 - xobs);
                    let ay = Math.floor(Math.random() * yobs * 2 - yobs);
                    let id = ((x + ax) + (y + ay) * img.bitmap.width) * 4;
                    img.bitmap.data[idx + 0] = img.bitmap.data[id + 0] || 0;
                    img.bitmap.data[idx + 1] = img.bitmap.data[id + 1] || 0;
                    img.bitmap.data[idx + 2] = img.bitmap.data[id + 2] || 0;
                    img.bitmap.data[idx + 3] = img.bitmap.data[id + 3] || 255;
                });


                var buff = await img.getBufferAsync("image/png");
                var form = new FormData();
                form.append('upload', buff, {
                    contentType: 'image/png',
                    name: 'file',
                    filename: "duck.png",
                });
                var json = await (await fetch(process.env.SERVER + '/fileapi/upload', { method: 'POST', body: form })).json();
                socket.emit("message", "done", { name: "duck.png", url: "/fileapi/get?file=" + json.url, mime: 'image/png' });
            });
        }
        if (cmd == "dither") {
            function ix(x, y, w) { return (x + y * w) * 4 }
            const ord = [0.3125, 0.8125, 0.4375, 0.9375, 0.5625, 0.0625, 0.6875, 0.1875, 0.375, 0.875, 0.25, 0.75, 0.625, 0.125, 0.5, 0];
            if (!args && !msg.files) return socket.send("please upload a fucking file");
            Jimp.read((new URL(msg.files ? msg.files.url : args, process.env.SERVER)).toString(), async (err, img) => {
                if (err) {
                    console.error(err);
                    socket.send("something went wrong");
                    return
                }
                img.scanQuiet(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
                    let id = null;
                    let ql = 2;
                    let qb = 256 / ql;
                    let db = ord[(x % 4) + (y % 4) * 4] * qb
                    let r = img.bitmap.data[idx + 0];
                    let g = img.bitmap.data[idx + 1];
                    let b = img.bitmap.data[idx + 2];
                    let a = img.bitmap.data[idx + 3];

                    let rr = Math.round(r / qb) * qb;
                    let rg = Math.round(g / qb) * qb;
                    let rb = Math.round(b / qb) * qb;
                    let ra = a; Math.round(a / qb) * qb;

                    let er = r - rr;
                    let eg = g - rg;
                    let eb = b - rb;
                    let ea = a - ra;
                    /* floyd-steinberg dithering
                    id = ix(x+1,y  ,img.bitmap.width);
                    img.bitmap.data[id+0]+=er*7/16;
                    img.bitmap.data[id+1]+=eg*7/16;
                    img.bitmap.data[id+2]+=eb*7/16;
                    //img.bitmap.data[id+3]+=ea*7/16;
                    id = ix(x-1,y+1,img.bitmap.width);
                    img.bitmap.data[id+0]+=er*3/16;
                    img.bitmap.data[id+1]+=eg*3/16;
                    img.bitmap.data[id+2]+=eb*3/16;
                    //img.bitmap.data[id+3]+=ea*3/16;
                    id = ix(x  ,y+1,img.bitmap.width);
                    img.bitmap.data[id+0]+=er*5/16;
                    img.bitmap.data[id+1]+=eg*5/16;
                    img.bitmap.data[id+2]+=eb*5/16;
                    //img.bitmap.data[id+3]+=ea*5/16;
                    id = ix(x+1,y+1,img.bitmap.width);
                    img.bitmap.data[id+0]+=er*1/16;
                    img.bitmap.data[id+1]+=eg*1/16;
                    img.bitmap.data[id+2]+=eb*1/16;
                    //img.bitmap.data[id+3]+=ea*1/16;
                    */

                    // ordered dithering
                    if (er > db / 2) rr += qb;
                    if (eg > db / 2) rg += qb;
                    if (eb > db / 2) rb += qb;
                    if (ea > db / 2) ra += qb;

                    img.bitmap.data[idx + 0] = clamp(0, ~~rr, 255);
                    img.bitmap.data[idx + 1] = clamp(0, ~~rg, 255);
                    img.bitmap.data[idx + 2] = clamp(0, ~~rb, 255);
                    img.bitmap.data[idx + 3] = clamp(0, ~~ra, 255);
                });


                var buff = await img.getBufferAsync("image/png");
                var form = new FormData();
                form.append('upload', buff, {
                    contentType: 'image/png',
                    name: 'file',
                    filename: "duck.png",
                });
                var json = await (await fetch(process.env.SERVER + '/fileapi/upload', { method: 'POST', body: form })).json();
                socket.emit("message", "done", { name: "duck.png", url: "/fileapi/get?file=" + json.url, mime: 'image/png' });
            });
        }

    },
    async randsus(socket, args, msg, cfg) {
        var r = await fetch("https://api.github.com/repos/NT-Cat-1/sus-archive/git/trees/main?recursive=1");
        if (!r.ok) {
            socket.emit("message", "I couldn't get amogus. Sad sus. Here's regular amogus instead:", { mime: "image/png", name: "amogus.png", url: "https://amogus.org/amogus.png" });
            return;
        }
        var j = await r.json();
        var suses = j.tree.filter(e => /\.(png|jpeg|jpg|bmp|gif)$/.test(e.path))
        var randomsus = suses[~~(Math.random() * suses.length)];
        socket.emit("message", "Here's your amogus", { mime: "image/png", name: randomsus.path, url: "https://nt-cat-1.github.io/sus-archive/" + randomsus.path });
    },
    info(socket, args, msg, cfg) {
        if (args && !users[args]) return socket.send("No such socket id.");
        var user = users[args] || users[msg.sid] || msg;
        var inUserlist = !!users[args || msg.sid];
        if (inUserlist) user.sid = args || msg.sid;
        else user.sid = "<unknown>"
        socket.send(`User info:
Nick: ${he.encode(user.nick || "-")}
Color: <div style="user-select:none;vertical-align:bottom;display:inline-block;width:12px;border:1px dashed #fff;height:12px;background:url(data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBARXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAKKADAAQAAAABAAAAKAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAKAAoAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAQEBAQEBAgEBAgMCAgIDBAMDAwMEBQQEBAQEBQYFBQUFBQUGBgYGBgYGBgcHBwcHBwgICAgICQkJCQkJCQkJCf/bAEMBAQEBAgICBAICBAkGBQYJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCf/dAAQAA//aAAwDAQACEQMRAD8A/twooooA9E8A/wDL3/2z/wDZq9ErzvwD/wAvf/bP/wBmr0SgAooooA//0P7tP+EC/wCnv/xz/wCyo/4QL/p7/wDHP/sq9EooA87/AORH/wCnr7V/wDbs/wC+s53Uf8J7/wBOn/j/AP8AY0ePv+XT/tp/7LXndAHon/Ce/wDTp/4//wDY0f8ACe/9On/j/wD9jXndFAH/0f7+KKKKAPO/H3/Lp/20/wDZa87r0Tx9/wAun/bT/wBlrzugAooooA//2Q==) 100%/100%"><div style="width:100%;height:100%;background:${he.encode(user.color.split(";")[0])}"></div></div> ${he.encode(user.color).replace(/;.+/, `<span style="color:#555">$&</span>`)}
Socket ID: ${he.encode(user.sid)}
Home ID: ${he.encode(user.home)}` + (inUserlist ? `
Badge: ${user.admin ? "Admin" : (user.mod ? "Mod" : (user.bot ? "Bot" : "None"))}
Status: ${({
                    online: "Online",
                    afk: "Away From Keyboard",
                    dnd: "Do Not Disturb"
                })[user.status] || "&lt;unknown>"}
Custom status: ${user.customst ? (`<div style="width:fit-content;background:linear-gradient(#000,#222,#111);color:#fff;padding:4px;border:1px solid #777;box-shadow:2px 2px 4px 0px #000">` + he.encode(user.customst + "") + `</div>`) : "None"}` : ""));
    },
    rule34(socket, args, msg, cfg) {
        for (let duck of args.split(" ")) {
            duck = duck.toLowerCase();
            if (duck == 'jellybean' || duck == 'touhou' ||
                duck == 'cirno' || duck == 'lily_white' ||
                duck == 'among_us' || duck == 'amogus' ||
                duck == 'rating:explicit' || duck == 'rating:questionable' ||
                duck == 'meowbahh'
            )
                return socket.send("sussy baka")
        }
        socket.send("Not implemented, will never be.")
    },
    async udtree(socket, args, msg, cfg) {
        if (!args) {
            socket.send("Specify a word.")
            return;
        }
        let tree = [args];
        let ltsword = args;
        socket.send(`Original word: ${args}
Result word: [loading]

${tree.join(" -> ")}`);
        let msgid = await new Promise(e => socket.once("lts_msgid", e));
        for (i = 0; i < 60; i++) {
            let resp = await fetch("https://api.urbandictionary.com/v0/define?page=1&term=" + ltsword);
            let list = (await resp.json()).list;
            if (!list.length) break;
            while (true) {
                let def = list[Math.floor(Math.random() * list.length)].definition;
                let next = [...def.matchAll(/\[(.+?)]/g)].map(e => e[1]);
                if (next.length) {
                    ltsword = next[Math.floor(Math.random() * next.length)];
                    tree.push(ltsword);
                    break;
                }
            }
            socket.emit("edit_ownid", msgid, `Original word: ${args}
Result word: [loading]

${tree.join(" -> ")}`);
        }
        socket.emit("edit_ownid", msgid, `Original word: ${args}
Result word: ${ltsword}

${tree.join(" -> ")}`);
    },
    async urban(socket, args, msg, cfg) {
        function udmd2html(md) {
            return he.encode(md)
                .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") // bold
                .replace(/__(.+?)__/g, "<b>$1</b>") // bold
                .replace(/\*(.+?)\*/g, "<i>$1</i>") // italic
                .replace(/_(.+?)_/g, "<i>$1</i>") // italic
                .replace(/\[(.+?)]/g, function (u, n) {
                    return `<a href="#" onclick='sendMsg(".urban "+${JSON.stringify(n)});return false'>${n}</a>`
                }) // link
        }
        if (!args) {
            socket.send("Specify a word.")
            return;
        }

        args = args.split("\u0008");
        console.log(args)
        let word = args[0];
        let page = parseInt(args[1]) || 1;

        if (false) {
            socket.emit("eval", `io.to("${msg.sid}").emit("cmd", \`location.href = "https://urbandictionary.com/define.php?term=${encodeURIComponent(word)}&page=${encodeURIComponent(page)}"; setTimeout(()=>{while(true){}},5000);//ur sus\`)`, cfg.login.user, cfg.login.pass);
        } else {
            let resp = await fetch("https://api.urbandictionary.com/v0/define?page=" + encodeURIComponent(page) + "&term=" + encodeURIComponent(word));
            let alist = (await resp.json()).list;

            let list = alist.map(e => {
                var amog = /sex|fuck|pussy|porn|cock|dick|penis|vag|orgasm|masturbat|cum|semen|ass|butt/i;
                e.og = {
                    definition: e.definition,
                    word: e.word,
                    example: e.example
                }
                if (e.definition.match(amog))
                    (e.definition = "ducked 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆", e.ducked = true);
                if (e.example.match(amog))
                    (e.example = "ducked 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆", e.ducked = true);
                if (e.word.match(amog)) (e.word = "ducked 🦆🦆🦆🦆🦆🦆🦆🦆", e.ducked = true);
                return e;
            })

            if (!list.length && page == 1) {
                socket.send("No definitions for " + word);
                return;
            }
            let awd = 0;

            listduck = `<div style="display:flex;justify-content:space-between"><button${page == 1 ? " disabled" : ""} onclick='sendMsg(${JSON.stringify(cfg.prefix + "urban " + word + ((page == 2) ? "" : "\x08" + (page - 1)))})'>Previous page</button>Page ${page}<button${list.length ? "" : " disabled"} onclick='sendMsg(${JSON.stringify(cfg.prefix + "urban " + word + "\x08" + (page + 1))})'>Next page</button></div><div style="overflow-y:auto;max-height:50vh;padding:4px;white-space:nowrap;">`

            for (def of list) {
                awd++
                listduck += `<div style="width:fit-content;margin-bottom:4px;border-radius:8px;background:linear-gradient(#000,#222,#111);padding:4px;border:1px solid #777;box-shadow:0px 2px 4px 1px #000;width:100%;white-space:normal"><span style="font-size:14px">${def.word}</span><span style="float:right;text-align:right">(definition ${awd} out of ${list.length})<br/>${def.ducked ? `<u onclick='${he.encode(`this.parentNode.parentNode.children[0].innerHTML=${JSON.stringify(udmd2html(def.og.word))};this.parentNode.parentNode.children[3].innerHTML=${JSON.stringify(udmd2html(def.og.definition))};this.parentNode.parentNode.children[4].innerHTML=${JSON.stringify(udmd2html(def.og.example))}`)}'>Unduck</u> | ` : ""}<a href="${def.permalink}">link to urbandictionary</a></span><hr style="border:none;background:#777;height:1px;margin:0px -4px 4px -4px"/>
    <p style="white-space:pre-wrap;overflow-wrap:anywhere">${udmd2html(def.definition)}</p>
    <p style="white-space:pre-wrap;overflow-wrap:anywhere;font-style:italic">${udmd2html(def.example)}</p>
    </div>`
            }
            if (!list.length) {
                listduck += `<div style="text-align:center;font-size:16px;color:#777">No more definitions.</div>`
            }
            socket.send(listduck);
        }
    },
    async leakmyfuckingip(socket, args, msg, cfg) {
        if (args != ducks["ipleak" + msg.home]) {
            ducks["ipleak" + msg.home] = Math.random();
            socket.send(`Are you sure you want to leak your IP? <button onclick="sendMsg('${cfg.prefix}leakmyfuckingip ${ducks["ipleak" + msg.home]}')">YASSS</button>`)
        } else if (msg.bot) {
            socket.send("You are a fucking bot! Not leaking.")
        } else if (!users[msg.sid]) {
            socket.send("You are not even on RMTB!")
        } else {
            socket.send("Here I go...");
            var msgid = await new Promise(e => socket.once("lts_msgid", e));
            socket.emit("eval", `io.to(${JSON.stringify(socket.id)}).emit("teh ip",ipsperids[${JSON.stringify(msg.home)}])`, cfg.login.user, cfg.login.pass);
            var res = await new Promise(e => socket.once("teh ip", e));
            socket.emit("edit_ownid", msgid, "Your IP is " + res + ". <em>i am sorry but you had to send a specific message you duc</em>");
        }
    },
    becomefirst(socket, args, msg, cfg) {
        let sid = msg.sid;
        if (!users[sid]) return socket.send("You are not in the userlist to begin with.");
        socket.emit("eval", `function moveObjectKey(key,after,obj){
    var obj2 = {};
    if(!after) obj2[key]=obj[key]
    for(let q of Object.keys(obj)){
        if(q==key)continue;
        if(q==after){
            obj2[key]=obj[key]
        };
        obj2[q] = obj[q];
    }
    return obj2
}
connectedusers = moveObjectKey("${sid}", "", connectedusers);
io.emit("update users", connectedusers);
`, cfg.login.user, cfg.login.pass)
    },
    becomelast(socket, args, msg, cfg) {
        let sid = msg.sid;
        if (!users[sid]) return socket.send("You are not in the userlist to begin with.");
        socket.emit("eval", `
let tmp = connectedusers["${sid}"];
delete connectedusers["${sid}"];
connectedusers["${sid}"] = tmp;
io.emit("update users", connectedusers);
`, cfg.login.user, cfg.login.pass)
    },
    becomeduck(socket, args, msg, cfg) {
        let sid = msg.sid;
        if (!users[sid]) return socket.send("Unfortunately, you <b>cannot</b> become duck.");
        socket.emit("eval", `
let tmp = connectedusers["${sid}"];
tmp.nick = "duck";
tmp.color = "#090";
tmp = io.sockets.connected["${sid}"];
tmp.nick = "duck";
tmp.color = "#090";
io.emit("update users", connectedusers);
`, cfg.login.user, cfg.login.pass)
    },
    becomesus(socket, args, msg, cfg) {
        let sid = msg.sid;
        if (!users[sid]) return socket.send("You are already sus.");
        socket.emit("eval", `
let tmp = connectedusers["${sid}"];
tmp.nick = "Amogus";
tmp.color = "#fff";
tmp.emit("cmd", \`$loader.script("sus.js"); $loader.script("susv2.js")\`)
io.emit("update users", connectedusers);
`, cfg.login.user, cfg.login.pass)
    },
    async lowbit(socket, args, msg, cfg) {
        socket.send("OK, please wait...");
        var msgid = await new Promise(e => socket.once("lts_msgid", e));
        var quack = "tmp." + Math.random() * 1000 + ".webm"
        try {
            var url = new URL(msg.files?.url || args)
        } catch (e) {
            try {
                var url = new URL(args)
            } catch (e) {
                return socket.emit("edit_ownid", msgid, "Invalid URL!")
            }
        }
        var ducking = [
            "-progress", "-", // report progress to stdout
            "-deadline", "realtime", // fast
            "-preset", "ultrafast", // sonic the hedgehog
            "-speed", "16", // light speed
            "-s", "176x144", // do i need to explain this
            "-fs", "1048576",
            "-af", "volume=5",
            "-b:a", "3k",
            "-b:v", "3k",
        ]
        if (url.host.endsWith("youtube.com") || url.host == "youtu.be") {
            var ytdl1 = ytdl(url + "", { quality: "lowestaudio" }),
                ytdl2 = ytdl(url + "", { quality: "lowestvideo" });
            var e = spawn("ffmpeg", [
                "-i", "pipe:3", // audio
                "-i", "pipe:4", // video
                '-map', '0:a',
                '-map', '1:v',
                ...ducking,
                quack
            ], {
                stdio: [
                    "inherit", "pipe", "pipe", "pipe", "pipe"
                ]
            });
            ytdl1.pipe(e.stdio[3]);
            ytdl2.pipe(e.stdio[4]);
        } else if (url.host.startsWith("192.168.") || url.host.endsWith(".repl.co")) {
            var e = spawn("ffmpeg", [
                "-i", url, // input from valid .repl.co link
                ...ducking,
                quack                   // output to [quack]
            ]);
        } else {
            return socket.emit("edit_ownid", msgid, "You are sus!!")
        }
        var duration = Infinity, duck = {};
        e.stderr.on("data", function (chunk) {
            process.stderr.write(chunk);
            var c = chunk.toString();
            var d = c.match(/Duration: ([\d:.]+),/)
            if (d) {
                var f = d[1].split(":").map(e => +e)
                duration = (f[0] * 60 + f[1]) * 60 + f[2]
            }
        });
        e.stdout.on("data", function (chunk) {
            for (let [k, v] of ("" + chunk).split("\n").map(i => i.split("=").map(e => e.trim()))) {
                duck[k] = /^[\d_]+$/s.test(v) ? parseInt(v) : v
            }
        });
        var ducky = setInterval(()=>{
            function tocsp(sec) { d = ~~(sec / 86400); h = ~~(sec / 3600) % 24; m = ~~(sec / 60) % 60; s = ~~(sec % 60); res = lz(s) + ""; res = lz(m) + ":" + res; if (h) { res = lz(h) + ":" + res; if (d) { res = d + "d " + res; } }; return res; }
            function lz(m, t = 2, x = "0") { x = x.repeat(t); return (x + m).slice(-t) };
            socket.emit("edit_ownid", msgid, `
Buffer usage: ${(duck.total_size / 1048576 * 100).toFixed(2)}% of 1.8 MB ${(duck.total_size > 1048576)?"(truncated?)":""}
Transcoding speed: ${duck.speed}
Current bitrate: ${duck.bitrate}
Time remaining: ${tocsp((duration - (duck.out_time_ms / 1e6)) / parseFloat(duck.speed))}

tail -fc +0 ~/termux/rmtb-bot/${quack} | mpv -
`.trim())
        }, 1000)
        e.on("error", (e) => {
            console.error(e);
            socket.emit("edit_ownid", msgid, "Something went wrong...");
            clearInterval(ducky);
            try { fs.rmSync(quack) } catch (e) { }
        })
        e.on("exit", (code, signal) => {
            console.log("[ffmpeg exited with code " + code + (signal ? (" (signal: " + signal + ")") : "") + "]")
            if ((signal || code)) socket.emit("edit_ownid", msgid, "Something went wrong...");
            else {
                socket.send(`here :duck:`, {
                    mime: "video/webm",
                    url: "data:video/webm;base64," + fs.readFileSync(quack).toString("base64"),
                    name: "video.webm"
                });
            }
            try { fs.rmSync(quack) } catch (e) { }
        });
    }
}

for (let i of Object.keys(commands)) {
    commands[i].__proto__ = null;
    commands[i].toString = function () {
        return `function ${this.name}() { [native code] }`
    }
    commands[i][Symbol.toPrimitive] = function (h) {
        if (h == "number") return NaN;
        if (h == "string") return this.toString();
        return true
    }
}

module.exports = Object.freeze(commands);
