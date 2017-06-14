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

import { createAction, handleAction } from 'redux-actions';
import { makeTypedFactory, TypedRecord} from 'typed-immutable-record';
import { IAppStateRecord } from '../stores';

let currentPagingIdentifierReducer = 0;

export interface ICurrentPagingIdentifierState {
  currentPagingIdentifier: string;
}

export interface ICurrentPagingIdentifierStateRecord extends TypedRecord<ICurrentPagingIdentifierStateRecord>, ICurrentPagingIdentifierState {}

const CurrentPagingIdentifierStateFactory = makeTypedFactory<ICurrentPagingIdentifierState, ICurrentPagingIdentifierStateRecord>({
  currentPagingIdentifier: null,
});

// Return infered
export function makeCurrentPagingIdentifierReducer(prefix: Array<string>) {
  currentPagingIdentifierReducer += 1;

  const identifierPath = [...prefix, 'currentPagingIdentifier'];

  type IPayload = { currentPagingIdentifier: string };

  const setCurrentPagingIdentifier = createAction<IPayload>(
    `new-comments-list/SET_CURRENT_PAGING_IDENTIFIER_${currentPagingIdentifierReducer}`,
  );

  const reducer = handleAction<ICurrentPagingIdentifierStateRecord, IPayload>(
    setCurrentPagingIdentifier.toString(),
    (state, { payload: { currentPagingIdentifier } }) => (
      state.set('currentPagingIdentifier', currentPagingIdentifier)
    ),
    CurrentPagingIdentifierStateFactory(),
  );

  function getCurrentPagingIdentifier(state: IAppStateRecord): string | null {
    return state.getIn(identifierPath);
  }

  return  {
    reducer,
    setCurrentPagingIdentifier,
    getCurrentPagingIdentifier,
  };
}
