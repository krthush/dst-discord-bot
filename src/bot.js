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
const MASTER_SERVER_LOG = process.env.MASTER_SERVER_LOG;
const CAVES_SERVER_LOG = process.env.CAVES_SERVER_LOG;
const CHAT_SERVER_LOG = process.env.CHAT_SERVER_LOG;
const AHK_SCRIPT = 'DSTServerInput.exe';
const STARTUP_SCRIPT = 'StartDSTServer.bat';
const DST_SERVER_TASK_NAME = 'dontstarve_dedicated_server_nullrenderer.exe';
const SERVER_ACTION_DELAY = 1000;
const SERVER_ONLINE_STRING = "Registering master server";
const SERVER_OFFLINE_STRING = "Shutting down";

// vars
var serverStartingUp = false;
var serverShuttingDown = false;

client.on('ready', () => {

    console.log(`${client.user.username} has logged in.`);
    const mainChannel = client.channels.cache.find(channel => channel.id === MAIN_CHANNEL_ID);
    mainChannel.send("I'm awake and ready to not starve!");

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
                        if (!serverStartingUp) {
                            serverStartingUp = true;
                            console.log("Starting up DST server...");
                            message.channel.send("Starting up DST server...");
                            // use child process to run .bat
                            exec(STARTUP_SCRIPT, function(err, data) {  
                                console.log(err)
                                console.log(data.toString());                       
                            });
                            setupLogTails(message);
                        } else {
                            message.channel.send("Attempting server startup already.");
                        }
                    } else {
                        message.channel.send("Server already online.");
                    }
                });
            }

            // shutdown command
            if (command === "shutdown") {
                isDSTServerOnline().then((serverOnline) => {
                    if (serverOnline) {
                        if (!serverShuttingDown) {
                            serverShuttingDown = true;
                            console.log("Shutting down DST server...");
                            message.channel.send("Shutting down DST server...");
                            // use child process to run .exe
                            runDSTServerCommand("caves", "c_shutdown()");
                            // shut master down after small delay
                            setTimeout(function(){ runDSTServerCommand("master", "c_shutdown()"); }, SERVER_ACTION_DELAY);
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
                });
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

function setupLogTails(message) {
    console.log("Tails added.");
    var masterTail = new Tail(MASTER_SERVER_LOG);
    var cavesTail = new Tail(CAVES_SERVER_LOG);
    var chatTail = new Tail(CHAT_SERVER_LOG);
    masterTail.on("line", function(data) {
        if (data.includes(SERVER_ONLINE_STRING)) {
            console.log(data);
            serverStartingUp = false;
            console.log("Server is now online.");
            message.channel.send("Server is now online.");
        }
        if (data.includes(SERVER_OFFLINE_STRING)) {
            console.log(data);
            serverShuttingDown = false;
            console.log("Server is now offline.");
            message.channel.send("Server is now offline.");
            unwatchTails();
        }
    });
}

function unwatchTails() {
    masterTail.unwatch();
    cavesTail.unwatch();
    chatTail.unwatch();
}

async function isDSTServerOnline() {
    console.log("Checking if server online.");
    const filterString = `Imagename eq ${DST_SERVER_TASK_NAME}`;
    const tasks = await tasklist({
        filter: [filterString]
    });
    if (tasks.length > 0) {
        console.log("Server online.");
        return true;
    } else {
        console.log("Server offline.");
        return false;
    }
}