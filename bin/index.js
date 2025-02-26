#!/usr/bin/env node

/**
 * @license
 *
 * Copyright (c) 2019, Jesús Rubio <jesusprubio@member.fsf.org>
 *
 * This source code is licensed under the MIT License found in
 * the LICENSE.txt file in the root directory of this source tree.
 */

'use strict';

// const { spawn } = require('child_process')
const path = require('path');

const escExit = require('esc-exit');
const prompts = require('prompts');
const chalk = require('chalk');
const tlink = require('terminal-link');
const pMapSeries = require('p-map-series');
const spawn = require('await-spawn');

const { version } = require('../package.json');
const tools = require('../tools');

escExit();
const choices = Object.entries(tools).map(pair => {
  const info = pair[1];
  const title = chalk.bold(info.title);
  const link = tlink(
    chalk.cyan(info.pkg),
    `https://www.npmjs.com/package/${info.pkg}`,
  );

  return {
    title: `${title} (${link})`,
    value: pair[0],
  };
});

async function main() {
  const selection = await prompts([
    {
      type: 'select',
      name: 'value',
      message: `${chalk.yellow('⚡')} ${chalk.magenta.bold(`pwr`)}`,
      choices,
      hint: `'esc' to quit (v${version})`,
    },
  ]);
  const selected = selection.value;

  let { param, comm } = tools[selected];

  if (!comm) {
    throw new Error(`Command not found for '${selected}'`);
  }

  // Accepted arrays or single object for convenience.
  if (param && !Array.isArray(param)) {
    param = [param];
  }
  if (!Array.isArray(comm)) {
    comm = [comm];
  }

  const params = await prompts(param);

  await pMapSeries(comm, async command => {
    const { bin } = command;
    let { args } = command;

    // Also accepting single objects here for convenience.
    if (args) {
      if (!Array.isArray(args)) {
        args = [args];
      }
    } else {
      args = [];
    }

    const argsFilled = args.map(arg => {
      const argLower = arg.toLowerCase();

      if (params[argLower]) {
        return params[argLower];
      }

      return arg;
    });

    let binPath = bin;

    if (bin !== 'npm') {
      binPath = path.resolve(__dirname, '../node_modules/.bin', bin);
    }

    // Will use process .stdout, .stdin, .stderr.
    await spawn(binPath, argsFilled, { stdio: 'inherit' });
  });
}

main()
  // The CLIs print their own output.
  .then(() => {})
  .catch(() => {});
