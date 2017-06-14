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

import React from 'react';
import { AddIcon } from '../../../../components';
import {
  DARK_PRIMARY_TEXT_COLOR,
  GUTTER_DEFAULT_SPACING,
  INPUT_DROP_SHADOW,
  OFFSCREEN,
  PALE_COLOR,
} from '../../../../styles';
import { css, stylesheet } from '../../../../util';

const STYLES = stylesheet({
  button: {
    backgroundColor: PALE_COLOR,
    margin: `${GUTTER_DEFAULT_SPACING}px 0`,
    border: 'none',
    textAlign: 'left',
    padding: '6px 12px',
    height: 40,
    borderRadius: 2,
    boxShadow: INPUT_DROP_SHADOW,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
});

export interface IAddButtonProps {
  width: number;
  onClick(e: React.MouseEvent<any>): any;
  label?: string;
}

export class AddButton extends React.Component<IAddButtonProps, void> {

  stringToId(str: string): string {
    return str.split(' ').join('_');
  }

  render() {
    const { width, onClick, label } = this.props;

    return (
      <div>
        <label htmlFor={this.stringToId(label)} {...css(OFFSCREEN)}>{label}</label>
        <button id={this.stringToId(label)} type="button" {...css(STYLES.button, { width })} onClick={onClick} >
          <AddIcon size={20} fill={DARK_PRIMARY_TEXT_COLOR} />
        </button>
      </div>
    );
  }
}
