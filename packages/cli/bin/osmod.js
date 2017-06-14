#!/usr/bin/env node

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

'use strict';

const path = require('path');
const yargs = require('yargs');

const { migrateCommand, migrateUndoCommand } = require(path.join(__dirname, '..', 'dist', 'db', 'migrate'));

yargs
  .command(migrateCommand)
  .command(migrateUndoCommand)
  .command(require(path.join(__dirname, '..', 'dist', 'users', 'create')))
  .command(require(path.join(__dirname, '..', 'dist', 'users', 'get_token')))
  .command(require(path.join(__dirname, '..', 'dist', 'denormalize')))
  .command(require(path.join(__dirname, '..', 'dist', 'exec')))
  .command(require(path.join(__dirname, '..', 'dist', 'comments', 'recalculate_text_sizes')))
  .command(require(path.join(__dirname, '..', 'dist', 'comments', 'calculate_text_size')))
  .command(require(path.join(__dirname, '..', 'dist', 'comments', 'recalculate_top_scores')))
  .command(require(path.join(__dirname, '..', 'dist', 'comments', 'rescore')))
  .demand(1)
  .usage('Usage: $0')
  .help()
  .argv;
