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
  IUserInstance,
  UserSocialAuth,
} from '../../models';
import { IUserSocialAuthAttributes, IUserSocialAuthInstance } from '../../models/user_social_auth';

/**
 * Indicates whether a user is valid to be authenticated
 *
 * @param {object} user User model instance
 */
export function isValidUser(user: IUserInstance): boolean {
  return user.get('isActive');
}

/**
 * Find or create user social auth based on passed in data
 *
 * @param {object} user     User model instance to associate with
 * @param {object} data     Object of data formatted for UserSocialAuth model
 * @return {object}         Promise object that resolves to `instance` (UserSocialAuth instance) and
 *                          `created` (boolean) (use .spread())
 */
export async function findOrCreateUserSocialAuth(
  user: IUserInstance,
  data: IUserSocialAuthAttributes,
): Promise<[IUserSocialAuthInstance, boolean]> {
  const socialAuthData = {
    ...data,
    userId: user.get('id'),
  };

  const [userSocialAuth, created] = await UserSocialAuth.findOrCreate({
    where: {
      userId: socialAuthData.userId,
      provider: socialAuthData.provider,
      socialId: socialAuthData.socialId,
    },
    defaults: socialAuthData,
  });

  return [userSocialAuth, created];
}
