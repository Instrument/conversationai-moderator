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

import { List, Map } from 'immutable';
import { ICommentModel } from '../../models';
import { IQueuedModelStateRecord, listCommentsById, makeQueuedModelStore } from '../util';
import { IThunkAction } from './index';

const {
  reducer,
  loadModel: loadComment,
  getModel: getComment,
  setModel: setComment,
} = makeQueuedModelStore<string, ICommentModel>(
  async (commentIds: List<string>) => {
    const comments = await listCommentsById(commentIds);

    return comments.reduce((sum, comment) => {
      return sum.set(comment.get('id'), comment);
    }, Map<string, ICommentModel>());
  },
  300,
  12,
  ['global', 'comments'],
);

export type IState = IQueuedModelStateRecord<number, ICommentModel>;

function updateComment(comment: ICommentModel): IThunkAction<void> {
  return async (dispatch) => {
    dispatch(setComment({ key: comment.id, model: comment }));
  };
}

function approveComment(commentIds: Array<string>): IThunkAction<void> {
  return async (dispatch, getState) => {
    const state = getState();
    commentIds.forEach((commentId) => {
      const comment = getComment(state,  commentId);
      if (!comment) {
        return;
      }
      const updatedComment = comment
          .set('isAccepted', true)
          .set('isModerated', true)
          .set('isDeferred', false)
          .set('updatedAt', new Date());

      dispatch(setComment({ key: commentId, model: updatedComment }));
    });
  };
}

function highlightComment(commentIds: Array<string>): IThunkAction<void> {
  return async (dispatch, getState) => {
    const state = getState();
    commentIds.forEach((commentId) => {
      const comment = getComment(state,  commentId);
      if (!comment) {
        return;
      }
      const updatedComment = comment
          .set('isAccepted', true)
          .set('isHighlighted', true)
          .set('updatedAt', new Date());

      dispatch(setComment({ key: commentId, model: updatedComment }));
    });
  };
}

function rejectComment(commentIds: Array<string>): IThunkAction<void> {
  return async (dispatch, getState) => {
    const state = getState();
    commentIds.forEach((commentId) => {
      const comment = getComment(state,  commentId);
      if (!comment) {
        return;
      }
      const updatedComment = comment
          .set('isAccepted', false)
          .set('isModerated', true)
          .set('isDeferred', false);

      dispatch(setComment({ key: commentId, model: updatedComment }));
    });
  };
}

function deferComment(commentIds: Array<string>): IThunkAction<void> {
  return async (dispatch, getState) => {
    const state = getState();
    commentIds.forEach((commentId) => {
      const comment = getComment(state,  commentId);
      if (!comment) {
        return;
      }
      const updatedComment = comment
          .set('isAccepted', null)
          .set('isModerated', true)
          .set('isDeferred', true)
          .set('updatedAt', new Date());

      dispatch(setComment({ key: commentId, model: updatedComment }));
    });
  };
}

function resetComment(commentIds: Array<string>): IThunkAction<void> {
  return async (dispatch, getState) => {
    const state = getState();
    commentIds.forEach((commentId) => {
      const comment = getComment(state,  commentId);
      if (!comment) {
        return;
      }
      const updatedComment = comment
          .set('isAccepted', null)
          .set('isModerated', false)
          .set('isHighlighted', false)
          .set('isDeferred', false)
          .set('updatedAt', new Date());

      dispatch(setComment({ key: commentId, model: updatedComment }));
    });
  };
}

export {
  reducer,
  loadComment,
  getComment,
  setComment,
  approveComment,
  highlightComment,
  rejectComment,
  updateComment,
  deferComment,
  resetComment,
};
