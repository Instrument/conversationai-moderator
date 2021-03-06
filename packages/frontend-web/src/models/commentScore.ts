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

import { Record } from 'immutable';
import { TypedRecord } from 'typed-immutable-record';
import { ITagModel } from './tag';

export interface ICommentScoreAttributes {
  id: string;
  commentId: string;
  confirmedUserId?: string;
  tagId?: string;
  tag?: ITagModel;
  score: number;
  annotationStart?: number;
  annotationEnd?: number;
  sourceType?: string;
  isConfirmed: boolean;
}

export interface ICommentScoreModel extends TypedRecord<ICommentScoreModel>, ICommentScoreAttributes {}

const CommentScoreModelRecord = Record({
  id: null,
  commentId: null,
  confirmedUserId: null,
  tagId: null,
  tag: null,
  score: null,
  annotationStart: null,
  annotationEnd: null,
  sourceType: null,
  isConfirmed: null,
});

export function CommentScoreModel(keyValuePairs?: ICommentScoreAttributes): ICommentScoreModel {
  return new CommentScoreModelRecord(keyValuePairs) as ICommentScoreModel;
}
