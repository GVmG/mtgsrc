const Discord=require('discord.js');
const scryfall=require("scryfall-sdk");
const client = new Discord.Client();

const helpmsg="**MTGSearch**, a Discord bot that searches for Magic: The Gathering cards.\n\n Commands:\n"+
				"- `!mtgsrc card_name |set` search for a card. |set is optional, both set codes and partial/full names *should* work.\n"+
				"    Example: `!mtgsrc sylvan |dominaria` will link Sylvan Awakening, a card from the Dominaria set.\n\n"+
				"- `!mtgtxt card_name |set` same as `!mtgsrc`, but it just displays the card in text format rather than embedding the picture.\n\n"+
				"- `!mtgtap` tap/untap the bot (won't respond when tapped - you can use this in case the bot goes mental to stop it)\n\n"+
				"- `!mtghelp` this command\n\n"+
				"Alternatively, the bot will search cards in the `[[name|set]]` format in any part of a message (and it wont reply at all if it doesnt find one). "+
				"Again, the set is optional, and the bot will autocorrect if there are minor spelling mistakes. "+
				"Note that searching for a lot of cards this way will have the bot spam the chat, so please avoid more than 2 cards at once.\n\n"+
				"For any problem, contact *GV#5559*."

tappedguilds=[{}];

client.on("ready", () => {
    console.log("Logged in as "+client.user.tag);
	mainguild=client.guilds.get(process.env.MAINGUILD); //get the default server for the bot to find the mana emotes.
	mainmana=mainguild.emojis.find(emoji => emoji.name == "unknown");
	CustomLog("info", "BOT GUILD LIST", "The bot is part of the following Guilds:");
	client.guilds.forEach(function(guild) {
		tappedguilds[guild.id.toString()]=false;
		console.log(guild.name+" "+guild.id.toString());
	});
});

client.on("message", msg => {
	if (msg.author.id!=client.user.id) //if it's not the bot itself
	{
		if (msg.content.includes("[[") && msg.content.includes("]]") && !IsTapped(msg.guild.id))
		{
			var requiredcards=GetCardRequirements(msg.content);
			
			requiredcards.forEach(function(cardstr) {
				card=NormalizeCardString(cardstr);
				SendCard(card[0], card[1], msg);
			});
		}
		else if (msg.content.startsWith("!mtgsrc") && !IsTapped(msg.guild.id))
		{
			var card=NormalizeCardString(msg.content.replace("!mtgsrc", ""));
			SendCard(card[0], card[1], msg);
		}
		else if (msg.content.startsWith("!mtgtxt") && !IsTapped(msg.guild.id))
		{
			var card=NormalizeCardString(msg.content.replace("!mtgtxt", ""));
			////text version will take a bit to be worked on, I also need to implement oracle text
			scryfall.Cards.byName(card[0], card[1], true).then(result => {
				var cardmsg="";
				cardmsg+=result.name+" - Mana Cost: "+ManaToEmotes(result.mana_cost)+"\n("+ColorsToEmotes(result.colors)+" "+result.type_line+")\n"+
				"`"+GetOracleString(result)+"`\n"+
				"Set: "+result.set_name+" ("+result.set.toUpperCase()+")"+"\nScryfall Page: <"+result.scryfall_uri+">";
				msg.reply("I found this card:\n"+cardmsg);
			}).catch(error => {
				msg.reply("couldn't find any card matching `"+cardname+"`. You might have typed the name wrong, or maybe there are many cards that fit that and you need to be more specific.");
				
				CustomLog("!!!!", "ERROR FOR "+cardname, error);
			});;
		}
		else if (msg.content==="!mtghelp" && !IsTapped(msg.guild.id))
		{
			msg.reply(helpmsg);	
		}
		else if (msg.content.startsWith("!mtgtap"))
		{
			ToggleTap(msg.guild.id);
			msg.reply("Bot is now "+(IsTapped(msg.guild.id) ? "TAPPED" : "UNTAPPED"));
		}
	}
});

client.login(process.env.TOKEN);

function ToggleTap(guildid) {tappedguilds[guildid.toString()]=!tappedguilds[guildid.toString()];}

function IsTapped(guildid) {return tappedguilds[guildid.toString()];}

function GetOracleString(card)
{
	return "oracle text to be implemented";
}

function SendCard(cardname, cardset, msg)
{
	scryfall.Cards.byName(cardname, cardset, true).then(result => {
		CustomLog("info", "REQUESTED A CARD ", cardname+" ("+cardset+")");
		var embed=new Discord.RichEmbed();
		embed.setImage(result.image_uris.png);
		embed.setTitle(result.name+" "+ManaToEmotes(result.mana_cost));
		embed.setURL(result.scryfall_uri);
		embed.setDescription(result.type_line);
		embed.setFooter("Set: "+result.set_name+" ("+result.set.toUpperCase()+")");
		msg.reply("", {embed:embed});
	}).catch(error => {
		CustomLog("!!!!", "ERROR FOR "+cardname+" ("+cardset+")", error);
	});
}

function ManaToEmotes(manastring)
{
	manavals=manastring.split(/[{}]/g).filter(Boolean); //split the string with some regex sorcery I don't understand
	emotestr=""; //basic string (containing the emotes)
	manavals.forEach(function(mana) { //for each part of the mana string
		normalizedmanastr=NormalizeManaString(mana); //normalize it (remove slashes from hybrid mana, make it lowercase, pad mana strings that aren't 2 chars)
		manaemote=mainguild.emojis.find(emoji => emoji.name == normalizedmanastr); //attempt to obtain an emote
		if (manaemote) {emotestr+=manaemote;} //if there is one, add it to the string
		else if (normalizedmanastr=="__") {emotestr+="//";} //if for some reason it turned out to be "__" (two underscores) it was a "//" separating in split cards
		else {emotestr+=mainmana;} //otherwise just add the unknown mana emote.
	});
	return emotestr;
}

function ColorsToEmotes(colors)
{
	emotestr=""; //basic string (containing the emotes)
	if (colors===undefined || colors.length==0)
	{
		colemote=mainguild.emojis.find(emoji => emoji.name == "c_"); //attempt to obtain an emote
		if (manaemote) {emotestr+=colemote;}
		else {emotestr+=mainmana;} //otherwise just add the unknown mana emote.
	}
	else
	{
		colors.forEach(function(col) { //for each item of the colors array
			normalizedcolstr=NormalizeManaString(col); //normalize it (remove slashes from hybrid mana, make it lowercase, pad mana strings that aren't 2 chars)
			colemote=mainguild.emojis.find(emoji => emoji.name == normalizedcolstr); //attempt to obtain an emote
			if (colemote) {emotestr+=colemote;} //if there is one, add it to the string
			else if (normalizedcolstr=="__") {emotestr+="//";} //if for some reason it turned out to be "__" (two underscores) it was a "//" separating in split cards
			else {emotestr+=mainmana;} //otherwise just add the unknown mana emote.
		});
	}
	return emotestr;
}

function NormalizeCardString(str)
{
	return str.split("|").map(s => s.trim()); //lemme just get the string, split it into name and set, and then remove extra spaces.
}

function NormalizeManaString(str)
{
	return str.replace(/\//g, "").trim().toLowerCase().padEnd(2, "_");
}

function GetCardRequirements(str)
{
	var step1=str.split("[["); //in theory I can just split/match/whatever with /\[\[(-*?)\]\]/g but for some reason that doesnt work on my local machine, so I'll stick to string parsing.
	var step2=[];
	step1.forEach(function(entry) {
		step2.push(entry.substring(0, entry.indexOf("]")));
	});
	return step2.filter(Boolean);
}

function CustomLog(type, text, obj)
{
	console.log("("+type+") [MTGSearch] "+text+"")
	console.log(obj);
	console.log("\n");
}
