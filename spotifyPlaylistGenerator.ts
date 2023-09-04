#!/usr/bin/env node

import { cancel, confirm, intro, isCancel, outro, text } from '@clack/prompts';
import { execSync } from 'child_process';
import * as eol from 'eol';
import * as fs from 'fs';
import * as git from 'git-rev';
import { JSDOM } from 'jsdom';
import Generator from './lib/generator';
import { version as pkgVersion } from './package.json';

const document = new JSDOM().window.document;

const help = `Usage:
    spotgen input.txt [output.txt]

input.txt is a text file containing a generator string,
invoking any number of generator commands. output.txt
will contain the generator's output, a list of Spotify URIs
which can be imported into Spotify. If an output file is not
specified, then the Spotify URIs are written to standard output,
with an option to copy them to the clipboard.`;

async function generate(str: string, output?: string) {
  output = output?.trim() || 'STDOUT';
  const generator = new Generator(str);;
  const result = await generator.generate();
  if (!result) return;

  if (output === 'STDOUT') {
    await text({
      message: `********************************************************
* COPY AND PASTE THE BELOW INTO A NEW SPOTIFY PLAYLIST *
********************************************************\n${result}\n`,
    });
    const shouldCopy = await confirm({ message: 'Copy to clipboard?' });
    if (shouldCopy) {
      execSync(`echo "${result + '\n'}" | pbcopy`);
    }
  } else {
    const resultWithEOL = eol.auto(result);
    fs.writeFile(output, resultWithEOL, (err) => {
      if (err) return;
      text({ message: 'Wrote to ' + output });
    });
  }
}

async function main() {
  intro('Welcome to Spotify Playlist Generator');
  const input = process.argv[2];
  const output = process.argv[3];

  if (/^-*h(elp)?$|^\/\?$/i.test(input)) {
    intro(help);
    return;
  } else if (/^-*v(ersion)?$|^\/\?$/i.test(input)) {
    git.short((sha) => {
      intro(pkgVersion + (sha ? '+' + sha : ''));
    });
    return;
  }

  if (!input) {
    const str = await text({ message: 'Enter generator string (submit with Ctrl-D):' } as { message: string });
    if (isCancel(str)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    if (str !== '') await generate(str as string);
  } else {
    try {
      // is input a file name?
      const str = eol.lf(fs.readFileSync(input as string, 'utf8').toString());
      await generate(str, output);
    } catch (err) {
      // input is generator string; help out primitive shells with newlines
      const str = (input as string).replace(/\\n/gi, '\n');
      await generate(str, output);
    }
  }
  outro('Thank you for using Spotify Playlist Generator');
}

if (require.main === module) {
  main();
}

export { Generator };
