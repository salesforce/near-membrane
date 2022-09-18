#!/usr/bin/env node

import fs from 'node:fs';
import globby from 'globby';
import meow from 'meow';
import trash from 'trash';

const cli = meow(
  `
  Usage
    $ locker-trash <path|glob> [...]

  Options
    --test, -t  Test and display the paths to be trashed, but don't do it

  Examples
    $ locker-trash dist types
    $ locker-trash **/dist/** **/types/**
    $ locker-trash '*.png' '!keep.png'
  `,
  {
    flags: {
      test: {
        type: 'boolean',
        alias: 't',
      },
    },
    importMeta: import.meta,
  }
);

async function lockerTrash(args, flags) {
  const argPaths = [];
  const argGlobs = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (fs.existsSync(arg)) {
      // Path exists, capture as-is.
      argPaths.push(arg);
    } else {
      // Path does not exist, assume it may be a glob pattern.
      argGlobs.push(arg);
    }
  }
  // Resolve all potential glob patterns.
  const globPaths = await globby(argGlobs, {
    nodir: false,
  });

  // This is the full list of paths to trash.
  const trashPaths = argPaths.concat(globPaths);
  if (flags.test) {
    // eslint-disable-next-line no-console
    console.log({ trashPaths });
  } else {
    await Promise.all(
      trashPaths.map(async (thePath) => {
        try {
          await trash(thePath, { glob: false });
        } catch (e) {
          if (e?.code === 'EACCES') {
            process.exitCode = e.code;
          }
        }
      })
    );
  }
}

lockerTrash(cli.input, cli.flags);
