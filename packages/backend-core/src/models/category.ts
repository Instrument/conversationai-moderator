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

import * as Sequelize from 'sequelize';
import { sequelize } from '../sequelize';
import { IUserInstance } from './user';

export interface ICategoryAttributes {
  label: string;
  isActive?: boolean;
  extra?: any;
  unprocessedCount?: number;
  unmoderatedCount?: number;
  moderatedCount?: number;
  highlightedCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  deferedCount?: number;
  flaggedCount?: number;
  batchedCount?: number;
  recommendedCount?: number;
}

export interface ICategoryInstance
    extends Sequelize.Instance<ICategoryAttributes> {
  id: number;
  createdAt: string;
  updatedAt: string;

  getAssignedModerators: Sequelize.BelongsToManyGetAssociationsMixin<IUserInstance>;
  countAssignedModerators: Sequelize.BelongsToManyCountAssociationsMixin;
}

/**
 * Category model
 */
export const Category = sequelize.define<ICategoryInstance, ICategoryAttributes>('category', {
  id: {
    type: Sequelize.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },

  label: {
    type: Sequelize.CHAR(255),
    allowNull: false,
  },

  isActive: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },

  unprocessedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  unmoderatedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  moderatedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  highlightedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  approvedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  rejectedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  deferedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  flaggedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  batchedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  recommendedCount: {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  },

  extra: {
    type: Sequelize.JSON,
    allowNull: true,
  },
}, {
  indexes: [
    {
      name: 'label_index',
      fields: ['label'],
      unique: true,
    },
  ],

  classMethods: {

    /**
     * Category relationships
     */
    associate(models: any) {
      Category.hasMany(models.Article, {
        // These work around a weird sequelize bug which adds a unique constraint
        // only on article for seemingly no reason.
        constraints: false,
        foreignKeyConstraint: false,
      });

      Category.belongsToMany(models.User, {
        through: {
          model: models.UserCategoryAssignment,
          unique: false,
        },
        foreignKey: 'categoryId',
        as: 'assignedModerators',
      });
    },
  },
});
