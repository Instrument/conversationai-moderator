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
  CommentScoreRequest,
  sequelize,
} from '@instrument/moderator-backend-core';
import {
  expect,
  makeComment,
  makeUser,
} from '../../test_helper';
import {
  apiClient,
} from './test_helper';

const BASE_URL = `/assistant`;
const prefixed = `${BASE_URL}/`;

describe(prefixed, () => {
  const url = `${prefixed}scores/:id`;

  describe('/scores/:id', () => {
    beforeEach(async () => {
      const comment = await makeComment();
      const user = await makeUser();

      this.request = await CommentScoreRequest.create({
        commentId: comment.get('id'),
        userId: user.get('id'),
        sentAt: sequelize.fn('now'),
      });

      this.score = {
        score: 1,
        begin: 0,
        end: 1,
      };
    });

    it('should return success with valid commentScoreRequest', async () => {
      let was200 = false;

      try {
        const { status } = await apiClient.post(url.replace(':id', this.request.get('id'))).send({
          scores: {
            SCORE_TAG: [this.score],
          },
          summaryScores: {
            SCORE_TAG: this.score.score,
          },
        });

        expect(status).to.be.equal(200);
        was200 = true;
      } finally {
        expect(was200).to.be.true;
      }
    });

    it('should fail with invalid schema of score data', async () => {
      let was422 = false;

      try {
        await apiClient.post(url.replace(':id', this.request.get('id'))).send({
          scores: {
            SCORE_TAG: this.score, // should be an array
          },
          summaryScores: {
            SCORE_TAG: this.score.score,
          },
        });

      } catch (e) {
        was422 = true;
        expect(e.response.status).to.be.equal(422);
      } finally {
        expect(was422).to.be.true;
      }
    });

    it('should fail without summary score data', async () => {
      let was422 = false;

      try {
        await apiClient.post(url.replace(':id', this.request.get('id'))).send({
          scores: {
            SCORE_TAG: [this.score],
          },
          // Below is missing on purpose.
          // summaryScores: {
          //   SCORE_TAG: this.score.score,
          // },
        });
      } catch (e) {
        was422 = true;
        expect(e.response.status).to.be.equal(422);
      } finally {
        expect(was422).to.be.true;
      }
    });

    it('should fail with invalid comment score id', async () => {
      let was400 = false;

      try {
        await apiClient.post(url.replace(':id', 'fake')).send({
          scores: {
            SCORE_TAG: [this.score],
          },
          summaryScores: {
            SCORE_TAG: this.score.score,
          },
        });
      } catch (e) {
        was400 = true;
        expect(e.response.status).to.be.equal(400);
      } finally {
        expect(was400).to.be.true;
      }
    });
  });
});
