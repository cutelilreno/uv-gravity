/*Periodically adjusts gravity on minecraft server via pterodactyl api
Copyright (C) 2024-2025  lordpipe, cutelilreno

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/

// use node.js's builtin WHATWG websocket object if available
global.WebSocket = global.WebSocket || require("ws");
const Sockette = require("sockette");

async function retoken() {
    const res = await fetch("https://control.heavynode.com/api/client/servers/<SERVERID>/websocket", {
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer <APIKEY>"
        },
    });
    if(res.ok) {
        const json = await res.json();
        return json.data;
    } else {
        throw new Error("Failed to authenticate.");
    }

}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function runGravitySequence(ws) {
    const minSeconds = 60;
    const maxSeconds = 120;
    const randomSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    console.log("runGravitySequence started");

    ws.json({event: "send command", args: ["tellraw @a {\"text\":\"A mysterious gravitational anomaly has been detected! Watch your step\u2014or don't.\",\"italic\":true,\"color\":\"white\"}"]});
    await sleep (5000);
    ws.json({event: "send command", args: ["execute as @a run attribute @s minecraft:gravity base set 0.01"]});
    ws.json({event: "send command", args: ["execute as @a run attribute @s minecraft:fall_damage_multiplier base set 0"]});
    await sleep(randomSeconds*1000);
    ws.json({event: "send command", args: ["tellraw @a {\"text\":\"Gravity stabilizing soon! Prepare for landing\u2014or falling.\",\"color\":\"gold\"}"]});
    await sleep(5000);
    ws.json({event: "send command", args: ["execute as @a run attribute @s minecraft:fall_damage_multiplier base reset"]});
    ws.json({event: "send command", args: ["execute as @a run attribute @s minecraft:gravity base reset"]});
    console.log("runGravitySequence completed");
}
async function scheduleGravitySequence(ws) {
    const minInterval = 20 * 60 * 1000; // 20 minutes in ms
    const maxInterval = 30 * 60 * 1000; // 30 minutes in ms
  
    while (true) {
      await runGravitySequence(ws);
      // Generate a random delay between 20 and 30 minutes:
      const randomDelay = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
      console.log(`Waiting ${randomDelay / 60000} minutes until next gravity sequence...`);
      await sleep(randomDelay);
    }
}


async function main() {
    const { token, socket } = await retoken();

    const ws = new Sockette(socket, {
        protocols: {
            headers: {
                "Origin": "https://control.heavynode.com"
            }
        },
        async onmessage(event) {
            let data = JSON.parse(event.data);

            if (data.event === "token expiring" || data.event === "token expired") {
                const { token, socket } = await retoken();
                ws.json({
                    event: "auth",
                    args: [token]
                });
            } else if (data.event === "console output") {
                console.log(new Date().toISOString() + " " + data.args.join("\n"))
            } else if (data.event != "stats") {
                console.log(data);
            } else {
                //console.log(data);
            }
        },
        onopen() {
            ws.json({
                event: "auth",
                args: [token]
            });
        },
        async onreconnect() {
            const { token, socket } = await retoken();
            ws.json({
                event: "auth",
                args: [token]
            });
        },
        onerror(err) {
            throw err;
        }
    });
    await sleep(5000); //cos im lazy
    scheduleGravitySequence(ws);
    }

main();