const Discord=require('discord.js');
const scryfall=require("scryfall-sdk");
const client = new Discord.Client();

tapped=false;

client.on("ready", () => {
    console.log("Logged in as ${client.user.tag}!");
	mainguild=client.guilds.get(process.env.MAINGUILD); //get the default server for the bot to find the mana emotes.
	mainmana=mainguild.emojis.find(emoji => emoji.name == "unknown");
});

client.on("message", msg => {
	if (msg.author.id!=client.user.id) //if it's not the bot itself
	{
		if (msg.content.includes("[[") && msg.content.includes("]]") && !tapped)
		{
			required=GetCardRequirements(msg.content);
			required.forEach(function(cardstr) {
				card=cardstr.split("?").map(s => s.trim()); //lemme just get the string, remove the command, split it into name and set, and then remove extra spaces.
				cardname=card[0];
				cardset=card[1];
				scryfall.Cards.byName(card[0], card[1], true).then(result => {
					//CustomLog("info", "RESULT FOR "+card, result);
					var embed=new Discord.RichEmbed();
					embed.setImage(result.image_uris.png);
					embed.setTitle(result.name+" "+ManaToEmotes(result.mana_cost));
					embed.setURL(result.scryfall_uri);
					embed.setDescription(result.type_line);
					embed.setFooter("Set: "+result.set_name+" ("+result.set.toUpperCase()+")");
					msg.reply("", {embed:embed});
				}).catch(error => {
					CustomLog("!!!!", "ERROR FOR "+cardname, error);
				});;
			});
		}
		else if (msg.content.startsWith("!mtgsrc") && !tapped)
		{
			card=msg.content.replace("!mtgsrc", "").split("?").map(s => s.trim()); //lemme just get the string, remove the command, split it into name and set, and then remove extra spaces.
			cardname=card[0];
			cardset=card[1];
			scryfall.Cards.byName(card[0], card[1], true).then(result => {
				//CustomLog("info", "RESULT FOR "+card, result);
				var embed=new Discord.RichEmbed();
				embed.setImage(result.image_uris.png);
				embed.setTitle(result.name+" "+ManaToEmotes(result.mana_cost));
				embed.setURL(result.scryfall_uri);
				embed.setDescription(result.type_line);
				embed.setFooter("Set: "+result.set_name+" ("+result.set.toUpperCase()+")");
				msg.reply("I found this card:", {embed:embed});
			}).catch(error => {
				msg.reply("couldn't find any card matching '"+cardname+"'. You might have typed the name wrong, or maybe there are many cards that fit that and you need to be more specific.");
				
				CustomLog("!!!!", "ERROR FOR "+cardname, error);
			});;
		}
		else if (msg.content.startsWith("!mtgtxt") && !tapped)
		{
			card=msg.content.replace("!mtgtxt", "").split("?").map(s => s.trim()); //lemme just get the string, remove the command, split it into name and set, and then remove extra spaces.
			cardname=card[0];
			cardset=card[1];
			scryfall.Cards.byName(card[0], card[1], true).then(result => {
				//CustomLog("info", "RESULT FOR "+card, result);
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
		else if (msg.content.startsWith("!mtgtap"))
		{
			tapped=!tapped;
			msg.reply("Bot is now "+(tapped ? "TAPPED" : "UNTAPPED"));
		}
		else if (msg.content==="!mtghelp" && !tapped)
		{
			msg.reply("`!mtgsrc <card name> (?set)` search for a card (?set is optional, both set codes and partial/full names *should* work)\n"+
				"    Example: `!mtgsrc sylvan ?dominaria` will link Sylvan Awakening\n\n"+
				"`!mtgtxt <card name> (?set)` same as `!mtgsrc`, but it just displays the card in text format rather than embedding the picture.\n\n"+
				"`!mtgtap` tap/untap the bot (won't respone when tapped - you can use this in case the bot goes mental to stop it)\n\n"+
				"`!mtghelp` this command\n\n"+
				"Alternatively, the bot will recognize cards with [[names written this way]] in any part of a message, and will search for those. Please note that searching for a lot of cards this way will have the bot spam the chat, so please avoid it.");	
		}
	}
});

client.login(process.env.TOKEN);

function GetOracleString(card)
{
	return "oracle text to be implemented";
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
	console.log("("+type+") [MTGSearch] "+text+":")
	console.log(obj);
	console.log("\n");
}