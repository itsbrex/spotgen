#!/usr/bin/env bun

import * as fs from "fs";
import { execSync } from "node:child_process";
// Importing necessary modules and functions
import { cancel, confirm, intro, isCancel, outro, text } from "@clack/prompts";
import * as eol from "eol";
import * as git from "git-rev";
import { JSDOM } from "jsdom";
import Generator from "../lib/generator";
const pkgVersion = require("../package.json").version;

// Creating a new JSDOM instance
const document = new JSDOM().window.document;

// Help text for the application
const help = `Usage:
    spotgen input.txt [output.txt]

input.txt is a text file containing a generator string,
invoking any number of generator commands. output.txt
will contain the generator's output, a list of Spotify URIs
which can be imported into Spotify. If an output file is not
specified, then the Spotify URIs are written to standard output,
with an option to copy them to the clipboard.`;

// Function to generate Spotify URIs
const generate = async (str: string, output?: string) => {
	const outputFile = output?.trim() || "STDOUT";
	const generator = new Generator(str);
	const result = await generator.generate();
	if (!result) return;

	if (outputFile === "STDOUT") {
		await text({
			message: `********************************************************
* COPY AND PASTE THE BELOW INTO A NEW SPOTIFY PLAYLIST *
********************************************************\n${result}\n`,
		});
		const shouldCopy = await confirm({ message: "Copy to clipboard?" });
		if (shouldCopy) {
			execSync(`echo "${`${result}\n`}" | pbcopy`);
		}
	} else {
		const resultWithEOL = eol.auto(result);
		await fs.promises.writeFile(outputFile, resultWithEOL);
		text({ message: `Wrote to ${outputFile}` });
	}
};

// Function to handle command-line arguments
const handleArgs = async (input: string, output: string) => {
	if (/^-*h(elp)?$|^\/\?$/i.test(input)) {
		intro(help);
		return;
	}
	if (/^-*v(ersion)?$|^\/\?$/i.test(input)) {
		git.short((sha) => {
			intro(pkgVersion + (sha ? `+${sha}` : ""));
		});
		return;
	}

	if (!input) {
		const str = await text({
			message: "Enter generator string (submit with Ctrl-D):",
		} as { message: string });
		if (isCancel(str)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}
		if (str !== "") await generate(str as string);
	} else {
		try {
			// is input a file name?
			const str = eol.lf(fs.readFileSync(input as string, "utf8").toString());
			await generate(str, output);
		} catch (err) {
			// input is generator string; help out primitive shells with newlines
			const str = (input as string).replace(/\\n/gi, "\n");
			await generate(str, output);
		}
	}
};

// Main function to handle the application logic
const main = async () => {
	intro("Welcome to Spotify Playlist Generator");
	const input = process.argv[2];
	const output = process.argv[3];
	await handleArgs(input, output);
	outro("Thank you for using Spotify Playlist Generator");
};

// Check if the script is being run directly
if (require.main === require("node:path").resolve(__dirname)) {
	main();
}

// Exporting the Generator class
export { Generator };
