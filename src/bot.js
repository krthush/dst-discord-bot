require('dotenv').config(); // manage env vars

var exec = require('child_process').execFile;

// constants
const { Client } = require('discord.js'); // discord api
const fs = require('fs');
const readline = require('readline');
const tasklist = require('tasklist');
Tail = require('tail').Tail;
const client = new Client();
const PREFIX = process.env.COMMAND_PREFIX;
const ADMIN_ROLE = process.env.ADMIN_ROLE;
const MAIN_CHANNEL_ID = process.env.MAIN_CHANNEL_ID;
const AHK_SCRIPT = 'DSTServerInput.exe';
const STARTUP_SCRIPT = 'StartDSTServer.bat';
const DST_SERVER_TASK_NAME = 'dontstarve_dedicated_server_nullrenderer.exe'

// vars
var serverStartup = false;
var serverShutdown = false;

client.on('ready', () => {

    console.log(`${client.user.username} has logged in.`);
    const mainChannel = client.channels.cache.find(channel => channel.id === MAIN_CHANNEL_ID);
    mainChannel.send("I'm awake and ready to not starve!");

    tail = new Tail("C:/Users/krthu/Documents/Klei/DoNotStarveTogether/MyDediServer/Master/server_log.txt");

    tail.on("line", function(data) {
        console.log(data);
    });

    // const rl = readline.createInterface({
    //     input: fs.createReadStream("C:/Users/krthu/Documents/Klei/DoNotStarveTogether/MyDediServer/Master/server_log.txt"),
    //     crlfDelay: Infinity
    // });

    // rl.on('line', (line) => {
    //     console.log(`Line from file: ${line}`);
    // });

});

client.on('message', (message) => {

    // ignore bot messages
    if (message.author.bot) return; 

    // check if admin
    if (message.member.roles.cache.some(r => r.name === ADMIN_ROLE)) {
        // check if admin command
        if (message.content.startsWith(PREFIX)) {

            // get command and args
            var [command, ...args] = message.content
                .trim()
                .substring(PREFIX.length)
                .split(/\s+/);

            // startup command
            if (command === "startup") {
                isDSTServerOnline().then((serverOnline) => {
                    if (!serverOnline) {
                        if (!serverStartup) {
                            serverStartup = true;
                            console.log("Starting up DST server...");
                            message.channel.send("Starting up DST server...");
                            // use child process to run .bat
                            exec(STARTUP_SCRIPT, function(err, data) {  
                                console.log(err)
                                console.log(data.toString());                       
                            });
                            serverStartup = false; // MOVE
                        } else {
                            message.channel.send("Attempting server startup already.");
                        }
                    } else {
                        message.channel.send("Server already online.");
                    }
                }
            }

            // shutdown command
            if (command === "shutdown") {
                isDSTServerOnline().then((serverOnline) => {
                    if (serverOnline) {
                        if (!serverShutdown) {
                            serverShutdown = true;
                            console.log("Shutting down DST server...");
                            message.channel.send("Shutting down DST server...");
                            // use child process to run .exe
                            runDSTServerCommand("caves", "c_shutdown()");
                            // shut master down after small delay
                            setTimeout(function(){ runDSTServerCommand("master", "c_shutdown()"); }, 1000);
                            serverShutdown = false; // MOVE
                        } else {
                            message.channel.send("Attempting server shutdown already.");
                        }
                    } else {
                        message.channel.send("Server already offline.");
                    }
                });
            }

            // general command
            if (command === "general") {
                isDSTServerOnline().then((serverOnline) => {
                    if (serverOnline) {
                        console.log("Running general command.");
                        message.channel.send("Running general command. I hope you know what you're doing.");
                        if (args[0]=="master") {
                            args.shift();
                            // clean string for cmd line parameters
                            const dstCMD = args.join(' ').replace(/["]{2,}/g,'');
                            runDSTServerCommand("master", dstCMD);
                        } else if (args[0]=="caves") {
                            args.shift();
                            // clean string for cmd line parameters
                            const dstCMD = args.join(' ').replace(/["]{2,}/g,'');
                            runDSTServerCommand("caves", dstCMD);
                        } else {
                            message.channel.send("Please specific shard (master/caves) in first parameter");
                        }
                    } else {
                        message.channel.send("The server is shutdown.");
                    }
                }
            }

        }
    };
});

client.login(process.env.DISCORDJS_BOT_TOKEN);

function runDSTServerCommand(shard, command) {
    // use child process to run .exe
    exec(AHK_SCRIPT, [shard, command], function(err, data) {
        if (err) {
            console.log("Error:" + err);
        }                      
    });
}

async function isDSTServerOnline() {
    const filterString = `Imagename eq ${DST_SERVER_TASK_NAME}`;
    const tasks = await tasklist({
        filter: [filterString]
    });
    if (tasks.length > 0) {
        return true;
    } else {
        return false;
    }
}