#!/usr/bin/env bun
/* global document:true, window:true */

const eol = require("eol");
const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM();
global.document = dom.window.document;
global.window = dom.window;
const clipboardy = require("clipboardy");
const git = require("git-rev");
const prompt = require("cli-input");

const Generator = require("./lib/generator");
const pkg = require("./package.json");

const help =
	"Usage:\n" +
	"\n" +
	"    spotgen input.txt [output.txt]\n" +
	"\n" +
	"input.txt is a text file containing a generator string,\n" +
	"invoking any number of generator commands. output.txt\n" +
	"will contain the generator's output, a list of Spotify URIs\n" +
	"which can be imported into Spotify. If an output file is not\n" +
	"specified, then the Spotify URIs are written to standard output,\n" +
	"with an option to copy them to the clipboard.\n" +
	"\n" +
	"Alternatively, you can pass a generator string as a single argument:\n" +
	"\n" +
	'    spotgen "#artist Bowery Electric"\n' +
	'    spotgen "#similar Beach House\\n#similar Hooverphonic"\n' +
	"    spotgen http://www.last.fm/user/username/library\n" +
	"\n" +
	'Make sure to surround the string with quotes (") if it contains\n' +
	"spaces or special characters. Line breaks can be expressed as \\n.\n" +
	"\n" +
	"You can also run the generator with no arguments and enter commands\n" +
	"interactively. This saves you the trouble of quoting strings and\n" +
	"escaping newlines.\n" +
	"\n" +
	"To import the playlist into Spotify:\n" +
	"\n" +
	"1.  Copy the output of the generator:\n" +
	"    Choose Edit -> Copy (Ctrl + C).\n" +
	"2.  Create a new playlist in Spotify:\n" +
	"    Choose File -> New Playlist (Ctrl + N).\n" +
	"3.  Paste into the playlist:\n" +
	"    Select the playlist and choose Edit -> Paste (Ctrl + V).";

/**
 * Generator function.
 * @param {string} str - Generator string.
 * @param {output} [output] - Output file.
 * @return {Promise} A promise.
 */
async function generate(str, output) {
	const outputFile = (output || "STDOUT").trim();
	const generator = new Generator(str);
	let result = await generator.generate();
	if (!result) {
		return;
	}
	if (outputFile === "STDOUT") {
		console.log("");
		if (generator.format === "uri") {
			console.log(
				"********************************************************\n" +
					"* COPY AND PASTE THE BELOW INTO A NEW SPOTIFY PLAYLIST *\n" +
					"********************************************************\n",
			);
		}
		console.log(`${result}\n`);
		const ps = prompt({ format: "Copy to clipboard? (Y/n) " });
		ps.prompt(null, (err, val) => {
			if (err) {
				return;
			}
			if (val[0].toLowerCase().trim() !== "n") {
				clipboardy.write(`${result}\n`);
			}
			ps.close();
		});
	} else {
		result = eol.auto(result);
		fs.writeFile(outputFile, result, (err) => {
			if (err) {
				return;
			}
			console.log(`Wrote to ${outputFile}`);
		});
	}
}

/**
 * Main method.
 * Invoked when run from the command line.
 */
async function main() {
	const input = process.argv[2];
	const output = process.argv[3];
	let str = input;
	if (typeof input === "string" && input.match(/(^-*h(elp)?$)|(^\/\?$)/gi)) {
		console.log(help);
		return;
	}
	if (typeof input === "string" && input.match(/(^-*v(ersion)?$)|(^\/\?$)/gi)) {
		process.chdir(__dirname);
		git.short((sha) => {
			console.log(pkg.version + (sha ? `+${sha}` : ""));
		});
		return;
	}
	if (!input) {
		console.log("Enter generator string (submit with Ctrl-D):");
		const ps = prompt();
		ps.multiline((err, lines, str) => {
			ps.close();
			if (err) {
				return;
			}
			if (str !== "" && str.slice(-1) !== "\n") {
				console.log("");
			}
			generate(str);
		});
	} else {
		try {
			// is input a file name?
			str = fs.readFileSync(input, "utf8").toString();
			str = eol.lf(str);
			await generate(str, output);
		} catch (err) {
			// input is generator string; help out primitive shells
			// (e.g., Windows') with newlines
			str = str.replace(/\\n/gi, "\n");
			await generate(str, output);
		}
	}
}

if (require.main === module) {
	main();
}

module.exports = Generator;
