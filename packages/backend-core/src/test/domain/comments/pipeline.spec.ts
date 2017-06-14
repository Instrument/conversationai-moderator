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

import { assert } from 'chai';
import { groupBy } from 'lodash';
import * as moment from 'moment';
import {
  compileScoresData,
  compileSummaryScoresData,
  completeMachineScoring,
  findOrCreateTagsByKey,
  getCommentsToResendForScoring,
  IScores,
  ISummaryScores,
  processMachineScore,
  recordDecision,
} from '../../../domain/comments/pipeline';
import {
  Article,
  Category,
  Comment,
  CommentScore,
  CommentScoreRequest,
  CommentSummaryScore,
  Decision,
  Tag,
} from '../../../models';
import { ITagInstance } from '../../../models/tag';
import {
  createArticle,
  createCategory,
  createComment,
  createCommentScoreRequest,
  createCommentSummaryScore,
  createModerationRule,
  createServiceUser,
  createTag,
  createUser,
} from './fixture';

describe('Comments Domain Pipeline Tests', () => {
  describe('getCommentsToResendForScoring', () => {
    it('should fetch comments that need to be resent for scoring', async () => {
      const [
        comment,
        notQuiteStaleComment,
        staleComment,
        acceptedComment,
        rejectedComment,
        scoredComment,
        scoredStaleComment,
      ] = await Promise.all([

        // Standard comment
        createComment(),

        // Not quite re-sendable
        createComment({
          isAccepted: null,
          sentForScoring: moment().subtract(5, 'minutes').add(10, 'seconds'),
        }),

        // Freshly re-sendable
        createComment({
          isAccepted: null,
          sentForScoring: moment().subtract(5, 'minutes').subtract(10, 'seconds'),
        }),

        // Accepted comments should be ignored
        createComment({
          isAccepted: true,
        }),

        // Rejected comments should be ignored
        createComment({
          isAccepted: false,
        }),

        // Scored comments should be ignored
        createComment({
          isScored: true,
        }),

        // Scored, stale comments should be ignored
        createComment({
          isScored: true,
          sentForScoring: moment().subtract(5, 'minutes').subtract(10, 'seconds'),
        }),
      ]);

      const comments = await getCommentsToResendForScoring();
      const ids = comments.map((c) => c.get('id'));

      assert.notInclude(ids, comment.get('id'));
      assert.notInclude(ids, notQuiteStaleComment.get('id'));
      assert.include(ids, staleComment.get('id'));
      assert.notInclude(ids, acceptedComment.get('id'));
      assert.notInclude(ids, rejectedComment.get('id'));
      assert.notInclude(ids, scoredComment.get('id'));
      assert.notInclude(ids, scoredStaleComment.get('id'));
    });
  });

  describe('processMachineScore', () => {
    it('should process the passed in score data, updating the request record and adding score records', async () => {

      // Create test data

      const fakeScoreData: any = {
        scores: {
          ATTACK_ON_COMMENTER: [
            {
              score: 0.2,
              begin: 0,
              end: 62,
            },
          ],
          INFLAMMATORY: [
            {
              score: 0.4,
              begin: 0,
              end: 62,
            },
            {
              score: 0.7,
              begin: 63,
              end: 66,
            },
          ],
        },

        summaryScores: {
          ATTACK_ON_COMMENTER: 0.2,
          INFLAMMATORY: 0.55,
        },

        error: '',
      };

      // Put a series of fixture data into the database

      const [comment, serviceUser] = await Promise.all([
        createComment(),
        createServiceUser(),
      ]);

      const commentScoreRequest = await createCommentScoreRequest({
        commentId: comment.get('id'),
        userId: serviceUser.get('id'),
      });

      // Call processMachineScore and start making assertions
      const result = await processMachineScore(comment.get('id'), serviceUser.get('id'), fakeScoreData);

      // This is the only score in the queue, so it should be complete (true).
      assert.isTrue(result);

      // Get scores and score requests from the database
      const [scores, request, summaryScores] = await Promise.all([
        CommentScore.findAll({
          where: {
            commentId: comment.get('id'),
          },
          include: [Tag],
        }),
        CommentScoreRequest.findOne({
          where: {
            id: commentScoreRequest.get('id'),
          },
          include: [Comment],
        }),
        CommentSummaryScore.findAll({
          where: {
            commentId: comment.get('id'),
          },
          include: [Tag],
        }),
      ]);

      // Scores assertions
      assert.lengthOf(scores, 3);

      // Summary scores assertions
      assert.lengthOf(summaryScores, 2);

      // Assertions against test data

      scores.forEach((score) => {
        assert.equal(score.get('sourceType'), 'Machine');
        assert.equal(score.get('userId'), serviceUser.get('id'));

        if (score.get('score') === 0.2) {
          assert.equal(score.get('annotationStart'), 0);
          assert.equal(score.get('annotationEnd'), 62);
          assert.equal(score.get('tag').get('key'), 'ATTACK_ON_COMMENTER');
        }

        if (score.get('score') === 0.4) {
          assert.equal(score.get('annotationStart'), 0);
          assert.equal(score.get('annotationEnd'), 62);
          assert.equal(score.get('tag').get('key'), 'INFLAMMATORY');
        }

        if (score.get('score') === 0.7) {
          assert.equal(score.get('annotationStart'), 63);
          assert.equal(score.get('annotationEnd'), 66);
          assert.equal(score.get('tag').get('key'), 'INFLAMMATORY');
        }
      });

      summaryScores.forEach((score) => {
        if (score.get('score') === 0.2) {
          assert.equal(score.get('tag').get('key'), 'ATTACK_ON_COMMENTER');
        }

        if (score.get('score') === 0.55) {
          assert.equal(score.get('tag').get('key'), 'INFLAMMATORY');
        }
      });

      // Request assertions

      assert.isOk(request.get('doneAt'));
      assert.equal(request.get('commentId'), comment.get('id'));
      assert.isTrue(request.get('comment').get('isScored'));
    });

    it('should short-circuit if error key is present and not falsy in the scoreData', async () => {
      const fakeScoreData: any = {
        scores: {
          SPAM: [
            {
              score: 0.2,
              begin: 0,
              end: 15,
            },
          ],
        },

        summaryScores: {
          SPAM: 0.2,
        },

        error: 'Some error message',
      };

      try {
        await processMachineScore(1, 1, fakeScoreData);
        throw new Error('`processMachineScore` successfully resolved when it should have been rejected');
      } catch (err) {
        assert.instanceOf(err, Error);
      }
    });

    it('should fail for any missed queries', async () => {
      // Create test data

      const fakeScoreData: any = {
        scores: {
          ATTACK_ON_COMMENTER: [
            {
              score: 0.2,
              begin: 0,
              end: 62,
            },
          ],
          INFLAMMATORY: [
            {
              score: 0.4,
              begin: 0,
              end: 62,
            },
            {
              score: 0.7,
              begin: 63,
              end: 66,
            },
          ],
        },

        summaryScores: {
          ATTACK_ON_COMMENTER: 0.2,
          INFLAMMATORY: 0.55,
        },

        error: '',
      };

      // Create similar fixture data as to previous test case, but leave out the score request creation
      const [comment, serviceUser] = await Promise.all([
        createComment(),
        createServiceUser(),
      ]);

      try {
        await processMachineScore(comment.get('id'), serviceUser.get('id'), fakeScoreData);
        throw new Error('`processMachineScore` unexpectedly resolved successfully');
      } catch (err) {
        assert.instanceOf(err, Error);
      }
    });

    it('should not mark the comment as `isScored` when not all score requests have come back', async () => {
      // Test data

      const fakeScoreData: any = {
        scores: {
          ATTACK_ON_COMMENTER: [
            {
              score: 0.2,
              begin: 0,
              end: 62,
            },
          ],
          INFLAMMATORY: [
            {
              score: 0.4,
              begin: 0,
              end: 62,
            },
            {
              score: 0.7,
              begin: 63,
              end: 66,
            },
          ],
        },

        summaryScores: {
          ATTACK_ON_COMMENTER: 0.2,
          INFLAMMATORY: 0.55,
        },

        error: '',
      };

      // Create similar fixture data as to previous test case, but leave out the score request

      const [comment, serviceUser1, serviceUser2] = await Promise.all([
        createComment(),
        createServiceUser(),
        createServiceUser(),
      ]);

      // Make one request for each scorer

      const [commentScoreRequest1] = await Promise.all([
        createCommentScoreRequest({
          commentId: comment.get('id'),
          userId: serviceUser1.get('id'),
        }),
        createCommentScoreRequest({
          commentId: comment.get('id'),
          userId: serviceUser2.get('id'),
        }),
      ]);

      // Receive a score for the first scorer

      await processMachineScore(comment.get('id'), serviceUser1.get('id'), fakeScoreData);

      const commentScoreRequests = await CommentScoreRequest.findAll({
        where: {
          commentId: comment.get('id'),
        },
        include: [Comment],
        order: 'id ASC',
      });

      assert.lengthOf(commentScoreRequests, 2);

      commentScoreRequests.forEach((request) => {
        if (request.get('id') === commentScoreRequest1.get('id')) {
          assert.isOk(request.get('doneAt'));
        } else {
          assert.isNull(request.get('doneAt'));
        }
      });

      assert.isFalse(commentScoreRequests[0].get('comment').get('isScored'));
    });
  });

  describe('completeMachineScoring', () => {
    it('should denormalize', async () => {
      const category = await createCategory();
      const article = await createArticle({ categoryId: category.get('id') });
      const comment = await createComment({ isScored: true, articleId: article.get('id') });
      const tag = await createTag();

      await createCommentSummaryScore({
        commentId: article.get('id'),
        tagId: tag.get('id'),
        score: 0.5,
      });

      await createModerationRule({
        action: 'Reject',
        tagId: tag.get('id'),
        lowerThreshold: 0.0,
        upperThreshold: 1.0,
      });

      await completeMachineScoring(comment.get('id'));

      const updatedCategory = await Category.findById(category.get('id'));
      const updatedArticle = await Article.findById(article.get('id'));
      const updatedComment = await Comment.findById(comment.get('id'));

      assert.isTrue(updatedComment.get('isAutoResolved'), 'comment isAutoResolved');
      assert.equal(updatedComment.get('recommendedCount'), 0, 'comment recommendedCount');
      assert.equal(updatedComment.get('flaggedCount'), 0, 'comment flaggedCount');

      assert.equal(updatedCategory.get('moderatedCount'), 1, 'category moderatedCount');
      assert.equal(updatedCategory.get('rejectedCount'), 1, 'category rejectedCount');

      assert.equal(updatedArticle.get('moderatedCount'), 1, 'article moderatedCount');
      assert.equal(updatedArticle.get('rejectedCount'), 1, 'article rejectedCount');
    });

    it('should record the Reject decision from a rule', async () => {
      const category = await createCategory();
      const article = await createArticle({ categoryId: category.get('id') });
      const comment = await createComment({ articleId: article.get('id') });
      const tag = await createTag();

      await createCommentSummaryScore({
        commentId: article.get('id'),
        tagId: tag.get('id'),
        score: 0.5,
      });

      const rule = await createModerationRule({
        action: 'Reject',
        tagId: tag.get('id'),
        lowerThreshold: 0.0,
        upperThreshold: 1.0,
      });

      await completeMachineScoring(comment.get('id'));

      const decision = await Decision.findOne({
        where: {
          commentId: comment.get('id'),
        },
      });

      assert.equal(decision.get('status'), 'Reject');
      assert.equal(decision.get('source'), 'Rule');
      assert.equal(decision.get('moderationRuleId'), rule.get('id'));
    });
  });

  describe('compileScoresData', () => {
    it('should compile raw score and model data into an array for CommentScore bulk creation', async () => {
      const scoreData: IScores = {
        ATTACK_ON_COMMENTER: [
          {
            score: 0.2,
            begin: 0,
            end: 62,
          },
        ],
        INFLAMMATORY: [
          {
            score: 0.4,
            begin: 0,
            end: 62,
          },
          {
            score: 0.7,
            begin: 63,
            end: 66,
          },
        ],
      };

      const tags = await findOrCreateTagsByKey(Object.keys(scoreData));

      const tagsByKey = groupBy(tags, (tag: ITagInstance) => {
        return tag.get('key');
      }) as any;

      const [comment, serviceUser] = await Promise.all([
        createComment(),
        createServiceUser(),
      ]);

      const commentScoreRequest = await createCommentScoreRequest({
        commentId: comment.get('id'),
        userId: serviceUser.get('id'),
      });

      const sourceType = 'Machine';

      const expected = [
        {
          sourceType,
          userId: serviceUser.get('id'),
          commentId: comment.get('id'),
          commentScoreRequestId: commentScoreRequest.get('id'),
          tagId: tagsByKey.ATTACK_ON_COMMENTER[0].get('id'),
          score: 0.2,
          annotationStart: 0,
          annotationEnd: 62,
        },
        {
          sourceType,
          userId: serviceUser.get('id'),
          commentId: comment.get('id'),
          commentScoreRequestId: commentScoreRequest.get('id'),
          tagId: tagsByKey.INFLAMMATORY[0].get('id'),
          score: 0.4,
          annotationStart: 0,
          annotationEnd: 62,
        },
        {
          sourceType,
          userId: serviceUser.get('id'),
          commentId: comment.get('id'),
          commentScoreRequestId: commentScoreRequest.get('id'),
          tagId: tagsByKey.INFLAMMATORY[0].get('id'),
          score: 0.7,
          annotationStart: 63,
          annotationEnd: 66,
        },
      ];

      const compiled = compileScoresData(sourceType, serviceUser.get('id'), scoreData, {
        comment,
        commentScoreRequest,
        tags,
      });

      assert.deepEqual(compiled, expected);
    });
  });

  describe('compileSummaryScoresData', () => {
    it('should compile raw score and model data into an array for CommentSummaryScore bulk creation', async () => {
      const summarScoreData: ISummaryScores = {
        ATTACK_ON_COMMENTER: 0.2,
        INFLAMMATORY: 0.55,
      };

      const tags = await findOrCreateTagsByKey(Object.keys(summarScoreData));

      const tagsByKey = groupBy(tags, (tag: ITagInstance) => {
        return tag.get('key');
      }) as any;

      const comment = await createComment();

      const expected = [
        {
          commentId: comment.get('id'),
          tagId: tagsByKey.ATTACK_ON_COMMENTER[0].get('id'),
          score: 0.2,
        },
        {
          commentId: comment.get('id'),
          tagId: tagsByKey.INFLAMMATORY[0].get('id'),
          score: 0.55,
        },
      ];

      const compiled = compileSummaryScoresData(summarScoreData, comment, tags);

      assert.deepEqual(compiled, expected);
    });
  });

  describe('findOrCreateTagsByKey', () => {
    it('should create tags not present in the database and resolve their data', async () => {
      const keys = ['ATTACK_ON_AUTHOR'];

      const results = await findOrCreateTagsByKey(keys);

      assert.lengthOf(results, 1);

      const tag = results[0];
      assert.equal(tag.get('key'), keys[0]);
      assert.equal(tag.get('label'), 'Attack On Author');

      const instance = await Tag.findOne({
        where: {
          key: keys[0],
        },
      });

      assert.equal(tag.get('id'), instance.get('id'));
      assert.equal(tag.get('key'), instance.get('key'));
      assert.equal(tag.get('label'), instance.get('label'));
    });

    it('should find existing tags and resolve their data', async () => {
      const key = 'SPAM';

      const dbTag = await Tag.create({
        key,
        label: 'Spam',
      });

      const results = await findOrCreateTagsByKey([key]);

      assert.lengthOf(results, 1);

      const tag = results[0];
      assert.equal(tag.get('id'), dbTag.get('id'));
      assert.equal(tag.get('key'), key);
      assert.equal(tag.get('label'), 'Spam');
    });

    it('should resolve a mix of existing and new tags', async () => {
      const keys = ['INCOHERENT', 'OFF_TOPIC'];

      const dbTag = await Tag.create({
        key: 'INCOHERENT',
        label: 'Incoherent',
      });

      const results = await findOrCreateTagsByKey(keys);

      assert.lengthOf(results, keys.length);

      results.forEach((tag) => {
        if (tag.get('key') === 'INCOHERENT') {
          assert.equal(tag.get('id'), dbTag.get('id'));
        } else {
          assert.isNumber(tag.get('id'));
          assert.equal(tag.get('key'), 'OFF_TOPIC');
          assert.equal(tag.get('label'), 'Off Topic');
        }
      });
    });
  });

  describe('recordDecision', () => {
    it('should record the descision to accept', async () => {
      const comment = await createComment();
      const user = await createUser();
      await recordDecision(comment, 'Accept', user, false);

      const foundDecisions = await Decision.findAll({
        where: {
          commentId: comment.get('id'),
        },
      });

      assert.lengthOf(foundDecisions, 1);

      const firstDecision = foundDecisions[0];

      assert.equal(firstDecision.get('commentId'), comment.get('id'));
      assert.equal(firstDecision.get('source'), 'User');
      assert.equal(firstDecision.get('userId'), user.get('id'));
      assert.equal(firstDecision.get('status'), 'Accept');
      assert.isTrue(firstDecision.get('isCurrentDecision'));
    });

    it('should clear old decisions', async () => {
      const user = await createUser();
      const tag = await createTag();
      const rule = await createModerationRule({
        action: 'Reject',
        tagId: tag.get('id'),
        lowerThreshold: 0.0,
        upperThreshold: 1.0,
      });

      const comment = await createComment();

      await recordDecision(comment, 'Accept', user, false);
      await recordDecision(comment, 'Reject', rule, false);

      const foundDecisions = await Decision.findAll({
        where: {
          commentId: comment.get('id'),
        },
      });

      assert.lengthOf(foundDecisions, 2);

      const currentDecisions = await Decision.findAll({
        where: {
          commentId: comment.get('id'),
          isCurrentDecision: true,
        },
      });

      assert.lengthOf(currentDecisions, 1);

      const firstDecision = currentDecisions[0];

      assert.equal(firstDecision.get('commentId'), comment.get('id'));
      assert.equal(firstDecision.get('source'), 'Rule');
      assert.equal(firstDecision.get('moderationRuleId'), rule.get('id'));
      assert.equal(firstDecision.get('status'), 'Reject');
      assert.isTrue(firstDecision.get('isCurrentDecision'));
    });
  });

});
