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

import {
  Article,
  Comment,
  ICommentInstance,
  ITopScores,
  TaggingSensitivity,
} from '@instrument/moderator-backend-core';
import { IFields, IListDetails }from '@instrument/moderator-jsonapi';
import * as Bluebird from 'bluebird';
import { list } from './SequelizeHandler';

export async function filterTopScoresByTaggingSensitivity(maxScores: ITopScores, tagId?: number, getComment?: (commentId: string) => Promise<ICommentInstance>): Promise<ITopScores> {
  // Omit scores below defined sensitivities.
  const allTaggingSensitivities = await TaggingSensitivity.findAll();

  const globalTaggingSensitivity = allTaggingSensitivities.find((ts) => {
    return !ts.get('categoryId') && !ts.get('tagId');
  });

  const fetchComment = getComment || (async (commentId: string): Promise<ICommentInstance> => {
    const id = parseInt(commentId, 10);

    return await Comment.findById(
      parseInt(maxScores[id].commentId.toString(), 10),
      { include: [Article] },
    );
  });

  const comments = await Bluebird.mapSeries(
    Object.keys(maxScores),
    fetchComment,
  );

  return Object.keys(maxScores).reduce((sum, commentId) => {
    const id = parseInt(commentId, 10);
    const scoreDetails = maxScores[id];
    const comment = comments.find((c) => c.get('id') === id) as ICommentInstance;
    const tagIdToFilter = tagId || comment.get('maxSummaryScoreTagId');

    const categoryTaggingSensitivity = allTaggingSensitivities.find((ts) => {
      return comment.get('article') && ts.get('categoryId') === comment.get('article').get('categoryId') && !ts.get('tagId');
    });

    const completeTaggingSensitivity = allTaggingSensitivities.find((ts) => {
      return comment.get('article') && ts.get('categoryId') === comment.get('article').get('categoryId') && ts.get('tagId') === tagIdToFilter;
    });

    const tagTaggingSensitivity = allTaggingSensitivities.find((ts) => {
      return !ts.get('categoryId') && ts.get('tagId') === tagIdToFilter;
    });

    const matchesSensitivity = completeTaggingSensitivity || categoryTaggingSensitivity || tagTaggingSensitivity || globalTaggingSensitivity;

    if (
      matchesSensitivity &&
      (
        scoreDetails.score < matchesSensitivity.get('lowerThreshold') ||
        scoreDetails.score > matchesSensitivity.get('upperThreshold')
      )
    ) {
      // Remove comment from set.
      delete sum[id];
    }

    return sum;
  }, maxScores);
}

export async function handleQueryComments(
  commentIds: Array<number>,
  include: Array<string>,
  sort: Array<string> | null,
  fields: IFields,
): Promise<IListDetails> {
  // We'll need it for `filterTopScoresByTaggingSensitivity` later
  if (include.indexOf('article') === -1) {
    include.push('article');
  }

  return list(
    'comments',
    {
      page: {
        offset: 0,
        limit: -1,
      },
      include,
      filters: {
        id: {
          $in: commentIds,
        },
      },
      fields,
      sort: sort || [],
    },
    async (params) => {
      params.where = {
        ...params.where,
        id: {
          $in: commentIds,
        },
      };

      delete params.offset;
      delete params.limit;

      let comments = await Comment.findAll(params);

      if (!sort) {
        comments = comments.sort((a, b) => {
          return commentIds.indexOf(a.get('id')) - commentIds.indexOf(b.get('id'));
        });
      }

      return comments;
    },
    async () => commentIds.length,
  );
}
