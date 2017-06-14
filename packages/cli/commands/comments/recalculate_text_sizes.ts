/*
Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { cacheTextSize, Comment, CommentSize, logger } from '@instrument/moderator-backend-core';
import * as Bluebird from 'bluebird';
import * as yargs from 'yargs';

export const command = 'comments:recalculate-text-sizes';
export const describe = 'Using node-canvas, recalculate comment heights at a given width.';

export function builder(yargs: yargs.Argv) {
  return yargs
      .usage('Usage: node $0 comments:recalculate-text-sizes')
      .demand('width')
      .number('width')
      .describe('width', 'The text width');
}

export async function handler(argv: any) {
  const width = argv.width;
  logger.info(`Recalculating comment text sizes at ${width}`);

  try {
    // Clear table.
    await CommentSize.destroy({
      truncate: true,
    });

    const comments = await Comment.findAll({
      attributes: ['id', 'text'],
    });

    await Bluebird.mapSeries(comments, async (comment) => {
      return cacheTextSize(comment, width);
    });
  } catch (err) {
    logger.error('Recalculate comment text sizes error: ', err.name, err.message);
    logger.error(err.errors);
    process.exit(1);
  }

  logger.info('Comment text successfully recalculated');
  process.exit(0);
}
