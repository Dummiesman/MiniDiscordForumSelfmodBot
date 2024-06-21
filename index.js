/*
    Discord Forum Pin Bot
    Created by Dummiesman, 2024
    Automatically pins the first message when a forum thread in 'parentChannelId' is created, and provivides a couple self-moderation commands
    Permission is granted to modify and use this code for both personal and commercial use
    Created on discord.js 14.15.2, node.js v20.13.1
*/

const { Partials, GatewayIntentBits, ChannelType, Events } = require('discord.js');
const { SlashCommandBuilder, REST, Routes } = require('discord.js');
const { Client } = require('discord.js');
const { token, parentChannelId } = require('./config.json');

// Create slash commands
const pinCommand = new SlashCommandBuilder()
    .setName("pin")
    .setDescription("Pin the first message in this forum thread.")

const lockCommand = new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock this forum thread. Note that a moderator will be required to reverse this action.")

// Create client
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel],
});
const rest = new REST({version: 10});

// Helper functions
function CheckChannel(channel)
{
    return channel.type === ChannelType.PublicThread && channel.parent?.type === ChannelType.GuildForum && channel.parent?.id === parentChannelId;
}

async function CheckOwner(user, channel)
{
    try
    {
        let starterMessage = await channel.fetchStarterMessage();
        return starterMessage.author.id === user.id
    } catch(error) {
        // Probably deleted
        return false;
    }
}

// Command handlers
async function HandlePinCommand(interaction)
{
    // Check if this reaction happened in the forum channel we want
    if(!CheckChannel(interaction.channel))
    {
        interaction.reply({content: "This command must be used in a forum channel.", ephemeral: true})
        return;
    }

    // Fetch the starter message, and compare the user id
    if(await CheckOwner(interaction.user, interaction.channel))
    {
        let starterMessage = await interaction.channel.fetchStarterMessage();
        starterMessage.pin();
        interaction.reply({content: "Success! The original post has been pinned.", ephemeral: true});
    } else {
        interaction.reply({content: "Could not pin the original post. Either you don't have permission, or it has been deleted.", ephemeral: true});
    }
}

async function HandleLockCommand(interaction)
{
    // Check if this reaction happened in the forum channel we want
    if(!CheckChannel(interaction.channel))
    {
        interaction.reply({content: "This command must be used in a forum channel.", ephemeral: true})
        return;
    }

    // Fetch the starter message, and compare the user id
    if(await CheckOwner(interaction.user, interaction.channel))
    {
        await interaction.channel.setLocked(true);
        interaction.reply({content: "Success! Your thread has been locked.", ephemeral: true});
    } else {
        interaction.reply({content: "Could not lock this thread. Either you don't have permission, or the original post has been deleted.", ephemeral: true});
    }
}

// Client events
client.on(Events.ThreadCreate, async (channel) => {
    // Check if this reaction happened in the forum channel we want
    if(!CheckChannel(channel))
    {
        return;
    }

    // Creation occurred in the correct spot, fetch first message and pin it!
    // fetchStarterMessage will fail if the message was deleted  before we got to it
    console.log(`Pinning first message in new forum channel ${channel.name} ${channel.id}`)
    await channel.fetchStarterMessage().then(msg => msg.pin()).catch(err => void err);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if(interaction.isChatInputCommand())
    {
        if(interaction.commandName === pinCommand.name)
        {
            await HandlePinCommand(interaction);
        }
        else if(interaction.commandName === lockCommand.name)
        {
            await HandleLockCommand(interaction);
        }
    }
});

client.on(Events.ClientReady, async () => {
    console.log("Bot is ready")
    try
    {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [pinCommand.toJSON(), lockCommand.toJSON()] }
        );
    } catch(error) {
        console.error(`Failed to register bot commands: ${error}`);
    }
});

// Process events
process.on('uncaughtException', (error) => {
    console.error(`Uncaught exception: ${error}\n` + `Exception origin: ${error.stack}`);
});

// Main bot login
console.log("Bot is logging in...");
rest.setToken(token);
client.login(token);